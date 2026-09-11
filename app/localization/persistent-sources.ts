import { canonicalEnglishCatalog, catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";
import { validateTranslation, type ResourceBundle, type TranslationSource, type TranslationSourceResult } from "./sources";

export type PersistentTranslationOrigin = "persistent_manual" | "machine";

export interface PersistentUiTranslationRow {
  locale: unknown;
  namespace: unknown;
  key: unknown;
  origin: unknown;
  status: unknown;
  sourceFingerprint: unknown;
  translatedPayload: unknown;
}

export interface UiTranslationStore {
  readApproved(locale: string, namespaces: readonly string[]): Promise<readonly PersistentUiTranslationRow[]>;
}

export class PersistentTranslationIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistentTranslationIntegrityError";
  }
}

const knownDescriptors = new Map(
  catalogDescriptors().map((descriptor) => [`${descriptor.namespace}:${descriptor.key}`, descriptor]),
);

abstract class DatabaseTranslationSource implements TranslationSource {
  constructor(
    private readonly store: UiTranslationStore,
    private readonly origin: PersistentTranslationOrigin,
  ) {}

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale === "en" || namespaces.length === 0) return emptyResult();

    const resources: ResourceBundle = {};
    const staleKeys: string[] = [];
    const versionParts: string[] = [];
    const requestedNamespaces = new Set(namespaces);
    const rows = await this.store.readApproved(locale, namespaces);

    for (const rawRow of rows) {
      const row = parseApprovedRow(rawRow);
      if (row.origin !== this.origin) continue;
      if (row.locale !== locale || !requestedNamespaces.has(row.namespace)) {
        throw new PersistentTranslationIntegrityError("persistent translation store returned data outside the requested scope");
      }

      const identity = `${row.namespace}:${row.key}`;
      const descriptor = knownDescriptors.get(identity);
      if (!descriptor) continue;

      const currentFingerprint = await sourceFingerprint(descriptor);
      if (row.sourceFingerprint !== currentFingerprint) {
        staleKeys.push(identity);
        continue;
      }

      const value = currentStringPayload(descriptor, row.translatedPayload);
      validateTranslation(descriptor, value);
      (resources[row.namespace] ??= {})[row.key] = value;
      versionParts.push(JSON.stringify([identity, row.sourceFingerprint, value]));
    }

    return {
      resources,
      staleKeys,
      version: await resourceVersion(versionParts),
    };
  }
}

export class DatabaseManualTranslationSource extends DatabaseTranslationSource {
  constructor(store: UiTranslationStore) {
    super(store, "persistent_manual");
  }
}

export class DatabaseMachineTranslationSource extends DatabaseTranslationSource {
  constructor(store: UiTranslationStore) {
    super(store, "machine");
  }
}

function parseApprovedRow(row: PersistentUiTranslationRow) {
  const locale = requiredString(row.locale, "locale");
  const namespace = requiredString(row.namespace, "namespace");
  const key = requiredString(row.key, "key");
  const origin = requiredString(row.origin, "origin");
  const status = requiredString(row.status, "status");
  const fingerprint = requiredString(row.sourceFingerprint, "sourceFingerprint");

  if (!locale.trim() || locale.toLowerCase() === "en") {
    throw new PersistentTranslationIntegrityError("persistent translation locale is invalid");
  }
  if (!namespace.trim() || !key.trim()) {
    throw new PersistentTranslationIntegrityError("persistent translation identity is blank");
  }
  if (origin !== "persistent_manual" && origin !== "machine") {
    throw new PersistentTranslationIntegrityError("persistent translation origin is invalid");
  }
  if (status !== "approved") {
    throw new PersistentTranslationIntegrityError("persistent translation store returned a non-approved row");
  }
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
    throw new PersistentTranslationIntegrityError("persistent translation fingerprint is invalid");
  }

  return {
    locale,
    namespace,
    key,
    origin: origin as PersistentTranslationOrigin,
    sourceFingerprint: fingerprint,
    translatedPayload: row.translatedPayload,
  };
}

function currentStringPayload(descriptor: UiMessageDescriptor, payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    throw new PersistentTranslationIntegrityError(
      `structured persistent payload is not supported for current message ${descriptor.namespace}:${descriptor.key}`,
    );
  }
  throw new PersistentTranslationIntegrityError(
    `persistent translation payload is invalid: ${descriptor.namespace}:${descriptor.key}`,
  );
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new PersistentTranslationIntegrityError(`${field} must be a string`);
  }
  return value;
}

async function resourceVersion(parts: readonly string[]): Promise<string> {
  if (!parts.length) return "empty";
  return sha256Text(JSON.stringify([...parts].sort()));
}

function emptyResult(): TranslationSourceResult {
  return { resources: {}, staleKeys: [], version: "empty" };
}

export function isCanonicalNamespace(namespace: string): boolean {
  return namespace in canonicalEnglishCatalog;
}
