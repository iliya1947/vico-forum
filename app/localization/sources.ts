import { canonicalEnglishCatalog, catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider, type LocaleRulesProvider } from "./locale-rules";
export { TranslationValidationError, validateTranslation } from "./translation-validation";
import {
  validateProviderOutput,
  type ProviderTranslationValue,
} from "./translation-validation";

export interface TranslationValue {
  value: ProviderTranslationValue;
  sourceFingerprint: string;
}

export type TranslationPack = Record<string, Record<string, TranslationValue>>;
export type TranslationSourceBundle = Record<string, Record<string, ProviderTranslationValue>>;
export type ResourceBundle = Record<string, Record<string, string>>;

export interface TranslationSourceResult {
  resources: TranslationSourceBundle;
  staleKeys: string[];
  version: string;
}

export interface TranslationSource {
  load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult>;
}

export interface TranslationPackValidation {
  staleKeys: Readonly<Record<string, readonly string[]>>;
}

const EMPTY_RESULT: TranslationSourceResult = { resources: {}, staleKeys: [], version: "empty" };
const defaultLocaleRules = new IntlLocaleRulesProvider();

function descriptorIndex(): Map<string, UiMessageDescriptor> {
  return new Map(catalogDescriptors().map((descriptor) => [`${descriptor.namespace}:${descriptor.key}`, descriptor]));
}

function isCanonicalUiNamespace(namespace: string): namespace is keyof typeof canonicalEnglishCatalog {
  return Object.hasOwn(canonicalEnglishCatalog, namespace);
}

async function resourceVersion(parts: readonly string[]): Promise<string> {
  if (!parts.length) return "empty";
  return sha256Text(JSON.stringify([...parts].sort()));
}

export class CanonicalEnglishSource implements TranslationSource {
  constructor(private readonly localeRules: LocaleRulesProvider = defaultLocaleRules) {}

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale !== "en") return EMPTY_RESULT;
    const resources: TranslationSourceBundle = {};
    const versionParts: string[] = [];
    for (const namespace of namespaces) {
      if (!isCanonicalUiNamespace(namespace)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      const messages = canonicalEnglishCatalog[namespace];
      resources[namespace] = {};
      for (const descriptor of Object.values(messages) as UiMessageDescriptor[]) {
        const source = descriptor.source;
        validateProviderOutput(descriptor, "en", source, this.localeRules);
        resources[namespace]![descriptor.key] = source;
        const fingerprint = await sourceFingerprint(descriptor);
        versionParts.push(JSON.stringify([namespace, descriptor.key, fingerprint]));
      }
    }
    return { resources, staleKeys: [], version: await resourceVersion(versionParts) };
  }
}

export class LocalTranslationSource implements TranslationSource {
  readonly #packs: Readonly<Record<string, TranslationPack>>;

  constructor(
    packs: Readonly<Record<string, TranslationPack>>,
    private readonly localeRules: LocaleRulesProvider = defaultLocaleRules,
  ) {
    this.#packs = packs;
  }

  async load(locale: string, namespaces: readonly string[]): Promise<TranslationSourceResult> {
    if (locale === "en") return EMPTY_RESULT;
    const pack = this.#packs[locale];
    if (!pack) return EMPTY_RESULT;
    const known = descriptorIndex();
    const resources: TranslationSourceBundle = {};
    const staleKeys: string[] = [];
    const versionParts: string[] = [];

    for (const [namespace, messages] of Object.entries(pack)) {
      if (!namespaces.includes(namespace)) continue;
      if (!isCanonicalUiNamespace(namespace)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      for (const [key, translation] of Object.entries(messages)) {
        const identity = `${namespace}:${key}`;
        const descriptor = known.get(identity);
        if (!descriptor) throw new Error(`Unknown canonical key: ${identity}`);
        const currentFingerprint = await sourceFingerprint(descriptor);
        if (translation.sourceFingerprint !== currentFingerprint) {
          staleKeys.push(identity);
          continue;
        }
        validateProviderOutput(descriptor, locale, translation.value, this.localeRules);
        (resources[namespace] ??= {})[key] = translation.value;
        versionParts.push(JSON.stringify([
          identity,
          translation.sourceFingerprint,
          canonicalPayload(translation.value),
        ]));
      }
    }
    return { resources, staleKeys, version: await resourceVersion(versionParts) };
  }
}

export async function validateTranslationPacks(
  packs: Readonly<Record<string, TranslationPack>>,
  localeRules: LocaleRulesProvider = defaultLocaleRules,
): Promise<TranslationPackValidation> {
  const known = descriptorIndex();
  const staleKeys: Record<string, string[]> = {};

  for (const [locale, pack] of Object.entries(packs)) {
    for (const [namespace, messages] of Object.entries(pack)) {
      if (!isCanonicalUiNamespace(namespace)) throw new Error(`Unknown canonical namespace: ${namespace}`);
      for (const [key, translation] of Object.entries(messages)) {
        const identity = `${namespace}:${key}`;
        const descriptor = known.get(identity);
        if (!descriptor) throw new Error(`Unknown canonical key: ${identity}`);
        const currentFingerprint = await sourceFingerprint(descriptor);
        if (translation.sourceFingerprint !== currentFingerprint) {
          (staleKeys[locale] ??= []).push(identity);
          continue;
        }
        validateProviderOutput(descriptor, locale, translation.value, localeRules);
      }
    }
  }

  return { staleKeys };
}

export function canonicalPayload(value: ProviderTranslationValue): ProviderTranslationValue {
  if (typeof value === "string") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => deterministicCompare(left, right)));
}

function deterministicCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
