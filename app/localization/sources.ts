import { canonicalEnglishCatalog, catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";

export interface TranslationValue {
  value: string;
  sourceFingerprint: string;
}

export type TranslationPack = Record<string, Record<string, TranslationValue>>;
export type ResourceBundle = Record<string, Record<string, string>>;

export interface TranslationSourceResult {
  resources: ResourceBundle;
  staleKeys: string[];
  version: string;
}

export interface TranslationSource {
  load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult>;
}

export interface TranslationPackValidation {
  staleKeys: Readonly<Record<string, readonly string[]>>;
}

export class TranslationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationValidationError";
  }
}

const EMPTY_RESULT: TranslationSourceResult = { resources: {}, staleKeys: [], version: "empty" };

function descriptorIndex(): Map<string, UiMessageDescriptor> {
  return new Map(catalogDescriptors().map((descriptor) => [`${descriptor.namespace}:${descriptor.key}`, descriptor]));
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]!).sort();
}

async function resourceVersion(parts: readonly string[]): Promise<string> {
  if (!parts.length) return "empty";
  return sha256Text(JSON.stringify([...parts].sort()));
}

export function validateTranslation(descriptor: UiMessageDescriptor, value: string): void {
  if (!value.trim()) throw new TranslationValidationError(`Empty translation: ${descriptor.namespace}:${descriptor.key}`);
  if (value.length > 10_000) {
    throw new TranslationValidationError(`Translation is too long: ${descriptor.namespace}:${descriptor.key}`);
  }
  if (/<\/?[a-z][^>]*>/i.test(value)) {
    throw new TranslationValidationError(`Markup is forbidden: ${descriptor.namespace}:${descriptor.key}`);
  }
  const expected = [...descriptor.placeholders].sort();
  if (JSON.stringify(placeholders(value)) !== JSON.stringify(expected)) {
    throw new TranslationValidationError(`Placeholder mismatch: ${descriptor.namespace}:${descriptor.key}`);
  }
  if (descriptor.messageKind === "plural" && !descriptor.placeholders.includes("count")) {
    throw new TranslationValidationError(`Plural message requires count: ${descriptor.namespace}:${descriptor.key}`);
  }
}

export class CanonicalEnglishSource implements TranslationSource {
  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale !== "en") return EMPTY_RESULT;
    const resources: ResourceBundle = {};
    const versionParts: string[] = [];
    for (const namespace of namespaces) {
      const messages = canonicalEnglishCatalog[namespace as keyof typeof canonicalEnglishCatalog];
      if (!messages) throw new Error(`Unknown canonical namespace: ${namespace}`);
      resources[namespace] = {};
      for (const descriptor of Object.values(messages) as UiMessageDescriptor[]) {
        validateTranslation(descriptor, descriptor.source);
        resources[namespace]![descriptor.key] = descriptor.source;
        const fingerprint = await sourceFingerprint(descriptor);
        versionParts.push(JSON.stringify([namespace, descriptor.key, fingerprint]));
      }
    }
    return { resources, staleKeys: [], version: await resourceVersion(versionParts) };
  }
}

export class LocalTranslationSource implements TranslationSource {
  readonly #packs: Readonly<Record<string, TranslationPack>>;

  constructor(packs: Readonly<Record<string, TranslationPack>>) {
    this.#packs = packs;
  }

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale === "en") return EMPTY_RESULT;
    const pack = this.#packs[locale];
    if (!pack) return EMPTY_RESULT;
    const known = descriptorIndex();
    const resources: ResourceBundle = {};
    const staleKeys: string[] = [];
    const versionParts: string[] = [];

    for (const [namespace, messages] of Object.entries(pack)) {
      if (!namespaces.includes(namespace)) continue;
      if (!(namespace in canonicalEnglishCatalog)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      for (const [key, translation] of Object.entries(messages)) {
        const identity = `${namespace}:${key}`;
        const descriptor = known.get(identity);
        if (!descriptor) throw new Error(`Unknown canonical key: ${identity}`);
        const currentFingerprint = await sourceFingerprint(descriptor);
        if (translation.sourceFingerprint !== currentFingerprint) {
          staleKeys.push(identity);
          continue;
        }
        validateTranslation(descriptor, translation.value);
        (resources[namespace] ??= {})[key] = translation.value;
        versionParts.push(JSON.stringify([identity, translation.sourceFingerprint, translation.value]));
      }
    }
    return { resources, staleKeys, version: await resourceVersion(versionParts) };
  }
}

export async function validateTranslationPacks(
  packs: Readonly<Record<string, TranslationPack>>,
): Promise<TranslationPackValidation> {
  const known = descriptorIndex();
  const staleKeys: Record<string, string[]> = {};

  for (const [locale, pack] of Object.entries(packs)) {
    for (const [namespace, messages] of Object.entries(pack)) {
      if (!(namespace in canonicalEnglishCatalog)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      for (const [key, translation] of Object.entries(messages)) {
        const identity = `${namespace}:${key}`;
        const descriptor = known.get(identity);
        if (!descriptor) throw new Error(`Unknown canonical key: ${identity}`);
        const currentFingerprint = await sourceFingerprint(descriptor);
        if (translation.sourceFingerprint !== currentFingerprint) {
          (staleKeys[locale] ??= []).push(identity);
          continue;
        }
        validateTranslation(descriptor, translation.value);
      }
    }
  }

  return { staleKeys };
}
