import { canonicalEnglishCatalog, catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sourceFingerprint } from "./fingerprint";

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

const EMPTY_RESULT: TranslationSourceResult = { resources: {}, staleKeys: [], version: "empty" };

function descriptorIndex(): Map<string, UiMessageDescriptor> {
  return new Map(catalogDescriptors().map((descriptor) => [`${descriptor.namespace}:${descriptor.key}`, descriptor]));
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]!).sort();
}

export function validateTranslation(descriptor: UiMessageDescriptor, value: string): void {
  if (!value.trim()) throw new Error(`Empty translation: ${descriptor.namespace}:${descriptor.key}`);
  if (value.length > 10_000) throw new Error(`Translation is too long: ${descriptor.namespace}:${descriptor.key}`);
  if (/<\/?[a-z][^>]*>/i.test(value)) {
    throw new Error(`Markup is forbidden: ${descriptor.namespace}:${descriptor.key}`);
  }
  const expected = [...descriptor.placeholders].sort();
  if (JSON.stringify(placeholders(value)) !== JSON.stringify(expected)) {
    throw new Error(`Placeholder mismatch: ${descriptor.namespace}:${descriptor.key}`);
  }
  if (descriptor.messageKind === "plural" && !descriptor.placeholders.includes("count")) {
    throw new Error(`Plural message requires count: ${descriptor.namespace}:${descriptor.key}`);
  }
}

export class CanonicalEnglishSource implements TranslationSource {
  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale !== "en") return EMPTY_RESULT;
    const resources: ResourceBundle = {};
    const fingerprints: string[] = [];
    for (const namespace of namespaces) {
      const messages = canonicalEnglishCatalog[namespace as keyof typeof canonicalEnglishCatalog];
      if (!messages) throw new Error(`Unknown canonical namespace: ${namespace}`);
      resources[namespace] = {};
      for (const descriptor of Object.values(messages) as UiMessageDescriptor[]) {
        validateTranslation(descriptor, descriptor.source);
        resources[namespace]![descriptor.key] = descriptor.source;
        fingerprints.push(await sourceFingerprint(descriptor));
      }
    }
    return { resources, staleKeys: [], version: fingerprints.join(".") };
  }
}

export class LocalTranslationSource implements TranslationSource {
  readonly #packs: Readonly<Record<string, TranslationPack>>;

  constructor(packs: Readonly<Record<string, TranslationPack>>) {
    this.#packs = packs;
  }

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    const pack = this.#packs[locale];
    if (!pack) return EMPTY_RESULT;
    const known = descriptorIndex();
    const resources: ResourceBundle = {};
    const staleKeys: string[] = [];
    const versions: string[] = [];

    for (const [namespace, messages] of Object.entries(pack)) {
      if (!namespaces.includes(namespace)) continue;
      if (!(namespace in canonicalEnglishCatalog)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      for (const [key, translation] of Object.entries(messages)) {
        const identity = `${namespace}:${key}`;
        const descriptor = known.get(identity);
        if (!descriptor) throw new Error(`Unknown canonical key: ${identity}`);
        validateTranslation(descriptor, translation.value);
        const currentFingerprint = await sourceFingerprint(descriptor);
        versions.push(translation.sourceFingerprint);
        if (translation.sourceFingerprint !== currentFingerprint) {
          staleKeys.push(identity);
          continue;
        }
        (resources[namespace] ??= {})[key] = translation.value;
      }
    }
    return { resources, staleKeys, version: versions.join(".") || "empty" };
  }
}

