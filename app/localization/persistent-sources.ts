import { catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider, type LocaleRulesProvider } from "./locale-rules";
import {
  canonicalPayload,
  type TranslationSource,
  type TranslationSourceBundle,
  type TranslationSourceResult,
} from "./sources";
import {
  TranslationValidationError,
  validateProviderOutput,
  type ProviderTranslationValue,
} from "./translation-validation";

export type PersistentTranslationOrigin = "persistent_manual" | "machine";

export interface PersistentUiTranslationRow {
  locale: unknown;
  namespace: unknown;
  key: unknown;
  origin: unknown;
  status: unknown;
  sourceFingerprint: unknown;
  translatedPayload: unknown;
  generationPolicyVersion?: unknown;
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

export type PersistentTranslationRowIssueReason =
  | "invalid-locale"
  | "invalid-identity"
  | "invalid-origin"
  | "invalid-status"
  | "invalid-fingerprint"
  | "unknown-key"
  | "invalid-payload"
  | "invalid-translation";

export interface PersistentTranslationRowIssueSummary {
  readonly origin: PersistentTranslationOrigin;
  readonly skippedRows: number;
  readonly reasons: Readonly<Partial<Record<PersistentTranslationRowIssueReason, number>>>;
}

export type PersistentTranslationRowIssueReporter = (summary: PersistentTranslationRowIssueSummary) => void;

class PersistentTranslationRowError extends PersistentTranslationIntegrityError {
  constructor(
    readonly reason: PersistentTranslationRowIssueReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PersistentTranslationRowError";
  }
}

const knownDescriptors = new Map(
  catalogDescriptors().map((descriptor) => [`${descriptor.namespace}:${descriptor.key}`, descriptor]),
);
const defaultLocaleRules = new IntlLocaleRulesProvider();

const defaultRowIssueReporter: PersistentTranslationRowIssueReporter = (summary) => {
  console.warn(JSON.stringify({ event: "persistent_ui_translation_rows_skipped", ...summary }));
};

abstract class DatabaseTranslationSource implements TranslationSource {
  constructor(
    private readonly store: UiTranslationStore,
    private readonly origin: PersistentTranslationOrigin,
    private readonly reportRowIssues: PersistentTranslationRowIssueReporter = defaultRowIssueReporter,
    private readonly requiredGenerationPolicyVersion?: string,
    private readonly localeRules: LocaleRulesProvider = defaultLocaleRules,
  ) {}

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale === "en" || namespaces.length === 0) return emptyResult();

    const resources: TranslationSourceBundle = {};
    const staleKeys: string[] = [];
    const versionParts: string[] = [];
    const requestedNamespaces = new Set(namespaces);
    const rowIssues = new Map<PersistentTranslationRowIssueReason, number>();
    const rows = await this.store.readApproved(locale, namespaces);

    for (const rawRow of rows) {
      assertRequestedScope(rawRow, locale, requestedNamespaces);

      if (isPersistentTranslationOrigin(rawRow.origin) && rawRow.origin !== this.origin) continue;

      let row: ReturnType<typeof parseApprovedRow>;
      try {
        row = parseApprovedRow(rawRow);
      } catch (error) {
        if (!recordRowIssue(rowIssues, error)) throw error;
        continue;
      }

      if (row.origin !== this.origin) continue;

      const identity = `${row.namespace}:${row.key}`;
      const descriptor = knownDescriptors.get(identity);
      if (!descriptor) {
        incrementIssue(rowIssues, "unknown-key");
        continue;
      }

      const currentFingerprint = await sourceFingerprint(descriptor);
      if (row.sourceFingerprint !== currentFingerprint) {
        staleKeys.push(identity);
        continue;
      }
      if (
        row.origin === "machine" &&
        this.requiredGenerationPolicyVersion !== undefined &&
        row.generationPolicyVersion !== this.requiredGenerationPolicyVersion
      ) {
        staleKeys.push(identity);
        continue;
      }

      let value: ProviderTranslationValue;
      try {
        value = currentPayload(descriptor, locale, row.translatedPayload, this.localeRules);
      } catch (error) {
        if (error instanceof TranslationValidationError) {
          incrementIssue(rowIssues, "invalid-translation");
          continue;
        }
        if (!recordRowIssue(rowIssues, error)) throw error;
        continue;
      }

      (resources[row.namespace] ??= {})[row.key] = value;
      versionParts.push(JSON.stringify([identity, row.sourceFingerprint, canonicalPayload(value)]));
    }

    reportRowIssueSummary(this.origin, rowIssues, this.reportRowIssues);

    return {
      resources,
      staleKeys,
      version: await resourceVersion(versionParts),
    };
  }
}

export class DatabaseManualTranslationSource extends DatabaseTranslationSource {
  constructor(
    store: UiTranslationStore,
    reportRowIssues?: PersistentTranslationRowIssueReporter,
    localeRules?: LocaleRulesProvider,
  ) {
    super(store, "persistent_manual", reportRowIssues, undefined, localeRules);
  }
}

export class DatabaseMachineTranslationSource extends DatabaseTranslationSource {
  constructor(
    store: UiTranslationStore,
    reportRowIssues?: PersistentTranslationRowIssueReporter,
    requiredGenerationPolicyVersion?: string,
    localeRules?: LocaleRulesProvider,
  ) {
    super(store, "machine", reportRowIssues, requiredGenerationPolicyVersion, localeRules);
  }
}

function assertRequestedScope(
  row: PersistentUiTranslationRow,
  locale: string,
  requestedNamespaces: ReadonlySet<string>,
): void {
  if (typeof row.locale === "string" && row.locale.trim() && row.locale !== locale) {
    throw new PersistentTranslationIntegrityError("persistent translation store returned data outside the requested scope");
  }
  if (
    typeof row.namespace === "string" &&
    row.namespace.trim() &&
    !requestedNamespaces.has(row.namespace)
  ) {
    throw new PersistentTranslationIntegrityError("persistent translation store returned data outside the requested scope");
  }
}

function parseApprovedRow(row: PersistentUiTranslationRow) {
  const locale = requiredString(row.locale, "locale", "invalid-locale");
  const namespace = requiredString(row.namespace, "namespace", "invalid-identity");
  const key = requiredString(row.key, "key", "invalid-identity");
  const origin = requiredString(row.origin, "origin", "invalid-origin");
  const status = requiredString(row.status, "status", "invalid-status");
  const fingerprint = requiredString(row.sourceFingerprint, "sourceFingerprint", "invalid-fingerprint");

  if (!locale.trim() || locale.toLowerCase() === "en") {
    throw new PersistentTranslationRowError("invalid-locale", "persistent translation locale is invalid");
  }
  if (!namespace.trim() || !key.trim()) {
    throw new PersistentTranslationRowError("invalid-identity", "persistent translation identity is blank");
  }
  if (!isPersistentTranslationOrigin(origin)) {
    throw new PersistentTranslationRowError("invalid-origin", "persistent translation origin is invalid");
  }
  if (status !== "approved") {
    throw new PersistentTranslationRowError("invalid-status", "persistent translation store returned a non-approved row");
  }
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
    throw new PersistentTranslationRowError("invalid-fingerprint", "persistent translation fingerprint is invalid");
  }

  return {
    locale,
    namespace,
    key,
    origin,
    sourceFingerprint: fingerprint,
    translatedPayload: row.translatedPayload,
    generationPolicyVersion: row.generationPolicyVersion,
  };
}

function currentPayload(
  descriptor: UiMessageDescriptor,
  locale: string,
  payload: unknown,
  localeRules: LocaleRulesProvider,
): ProviderTranslationValue {
  if (descriptor.messageKind === "plural") {
    if (!isStringRecord(payload)) {
      throw new PersistentTranslationRowError(
        "invalid-payload",
        `structured persistent payload is invalid: ${descriptor.namespace}:${descriptor.key}`,
      );
    }
  } else if (typeof payload !== "string") {
    throw new PersistentTranslationRowError(
      "invalid-payload",
      `structured persistent payload is not supported for current message ${descriptor.namespace}:${descriptor.key}`,
    );
  }

  validateProviderOutput(descriptor, locale, payload, localeRules);
  return canonicalPayload(payload);
}

function requiredString(
  value: unknown,
  field: string,
  reason: PersistentTranslationRowIssueReason,
): string {
  if (typeof value !== "string") {
    throw new PersistentTranslationRowError(reason, `${field} must be a string`);
  }
  return value;
}

function isPersistentTranslationOrigin(value: unknown): value is PersistentTranslationOrigin {
  return value === "persistent_manual" || value === "machine";
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string");
}

function recordRowIssue(
  issues: Map<PersistentTranslationRowIssueReason, number>,
  error: unknown,
): boolean {
  if (!(error instanceof PersistentTranslationRowError)) return false;
  incrementIssue(issues, error.reason);
  return true;
}

function incrementIssue(
  issues: Map<PersistentTranslationRowIssueReason, number>,
  reason: PersistentTranslationRowIssueReason,
): void {
  issues.set(reason, (issues.get(reason) ?? 0) + 1);
}

function reportRowIssueSummary(
  origin: PersistentTranslationOrigin,
  issues: ReadonlyMap<PersistentTranslationRowIssueReason, number>,
  reporter: PersistentTranslationRowIssueReporter,
): void {
  if (issues.size === 0) return;
  const reasons = Object.fromEntries([...issues.entries()].sort(([left], [right]) => left.localeCompare(right)));
  const skippedRows = [...issues.values()].reduce((total, count) => total + count, 0);
  reporter({ origin, skippedRows, reasons });
}

async function resourceVersion(parts: readonly string[]): Promise<string> {
  if (!parts.length) return "empty";
  return sha256Text(JSON.stringify([...parts].sort()));
}

function emptyResult(): TranslationSourceResult {
  return { resources: {}, staleKeys: [], version: "empty" };
}
