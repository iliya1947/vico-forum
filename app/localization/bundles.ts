import { canonicalEnglishCatalog, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider, type LocaleRulesProvider } from "./locale-rules";
import {
  validateProviderOutput,
  type ProviderTranslationValue,
} from "./translation-validation";
import type { TranslationSource, TranslationSourceBundle } from "./sources";

const BUNDLE_VERSION_FORMAT = "vico-ui-bundle-v1";
const BUNDLE_CACHE_FORMAT = "vico-ui-bundle-cache-v1";
const SHA256_HEX = /^[0-9a-f]{64}$/;
const defaultLocaleRules = new IntlLocaleRulesProvider();

export interface CompiledNamespaceBundle {
  locale: string;
  namespace: string;
  resources: Record<string, string>;
  bundleVersion: string;
}

export interface TranslationBundleStore {
  read(locale: string, namespace: string): Promise<CompiledNamespaceBundle | undefined>;
  put(bundle: CompiledNamespaceBundle): Promise<void>;
}

export interface TranslationBundleCache {
  read(cacheIdentity: string): Promise<CompiledNamespaceBundle | undefined>;
  put(cacheIdentity: string, bundle: CompiledNamespaceBundle): Promise<void>;
}

export async function compileExactLocaleNamespaceBundle(
  locale: string,
  namespace: string,
  sources: readonly TranslationSource[],
): Promise<CompiledNamespaceBundle> {
  const logicalResources: TranslationSourceBundle[string] = {};
  for (const source of sources) {
    const result = await source.load(locale, [namespace]);
    for (const [key, value] of Object.entries(result.resources[namespace] ?? {})) {
      logicalResources[key] ??= value;
    }
  }
  return compileNamespaceBundle(locale, namespace, logicalResources);
}

export async function compileNamespaceBundle(
  locale: string,
  namespace: string,
  resources: Readonly<Record<string, ProviderTranslationValue>>,
  localeRules: LocaleRulesProvider = defaultLocaleRules,
): Promise<CompiledNamespaceBundle> {
  assertBundleScope(locale, namespace);
  const descriptors = descriptorMap(namespace);
  const runtimeResources: Record<string, string> = {};

  for (const key of Object.keys(resources).sort(deterministicCompare)) {
    const descriptor = descriptors.get(key);
    if (!descriptor) throw new Error(`Unknown canonical key: ${namespace}:${key}`);
    const value = resources[key]!;
    validateProviderOutput(descriptor, locale, value, localeRules);

    if (descriptor.messageKind === "plural") {
      if (typeof value === "string") throw new Error(`Invalid structured resource: ${namespace}:${key}`);
      for (const branch of Object.keys(value).sort(deterministicCompare)) {
        runtimeResources[`${key}_${branch}`] = value[branch]!;
      }
    } else {
      if (typeof value !== "string") throw new Error(`Invalid compiled resource: ${namespace}:${key}`);
      runtimeResources[key] = value;
    }
  }

  return verifyCompiledNamespaceBundle(locale, namespace, runtimeResources, localeRules);
}

export async function verifyCompiledNamespaceBundle(
  locale: string,
  namespace: string,
  resources: Readonly<Record<string, string>>,
  localeRules: LocaleRulesProvider = defaultLocaleRules,
): Promise<CompiledNamespaceBundle> {
  assertBundleScope(locale, namespace);
  const descriptors = descriptorMap(namespace);
  const resourceKeys = Object.keys(resources);
  const consumed = new Set<string>();
  const normalizedResources: Record<string, string> = {};
  const versionEntries: Array<[string, string, string]> = [];

  for (const descriptor of [...descriptors.values()].sort((left, right) => deterministicCompare(left.key, right.key))) {
    const fingerprint = await sourceFingerprint(descriptor);
    if (descriptor.messageKind !== "plural") {
      if (!Object.hasOwn(resources, descriptor.key)) continue;
      const value = resources[descriptor.key];
      if (typeof value !== "string") throw new Error(`Invalid compiled resource: ${namespace}:${descriptor.key}`);
      validateProviderOutput(descriptor, locale, value, localeRules);
      consumed.add(descriptor.key);
      normalizedResources[descriptor.key] = value;
      versionEntries.push([descriptor.key, fingerprint, value]);
      continue;
    }

    const pluralPrefix = `${descriptor.key}_`;
    if (!resourceKeys.some((key) => key.startsWith(pluralPrefix))) continue;

    const branches = [...localeRules.pluralBranches(locale)].sort(deterministicCompare);
    const runtimeKeys = branches.map((branch) => `${descriptor.key}_${branch}`);
    const structured: Record<string, string> = {};
    for (let index = 0; index < branches.length; index++) {
      const branch = branches[index]!;
      const runtimeKey = runtimeKeys[index]!;
      if (!Object.hasOwn(resources, runtimeKey)) continue;
      const value = resources[runtimeKey];
      if (typeof value !== "string") throw new Error(`Invalid compiled resource: ${namespace}:${runtimeKey}`);
      structured[branch] = value;
    }
    validateProviderOutput(descriptor, locale, structured, localeRules);
    for (const branch of branches) {
      const runtimeKey = `${descriptor.key}_${branch}`;
      const value = structured[branch]!;
      consumed.add(runtimeKey);
      normalizedResources[runtimeKey] = value;
      versionEntries.push([runtimeKey, fingerprint, value]);
    }
  }

  for (const key of resourceKeys) {
    if (!consumed.has(key)) throw new Error(`Unknown compiled resource key: ${namespace}:${key}`);
  }

  const bundleVersion = await sha256Text(JSON.stringify({
    format: BUNDLE_VERSION_FORMAT,
    locale,
    namespace,
    resources: versionEntries.sort(([left], [right]) => deterministicCompare(left, right)),
  }));

  return { locale, namespace, resources: normalizedResources, bundleVersion };
}

export function bundleCacheIdentity(locale: string, namespace: string, bundleVersion: string): string {
  assertBundleVersion(bundleVersion);
  return JSON.stringify([BUNDLE_CACHE_FORMAT, locale, namespace, bundleVersion]);
}

/** Semantic bundle identity is representation-independent, so expose it as a weak ETag. */
export function translationBundleEtag(bundleVersion: string): string {
  assertBundleVersion(bundleVersion);
  return `W/"vico-ui-${bundleVersion}"`;
}

function assertBundleScope(locale: string, namespace: string): void {
  if (!locale.trim()) throw new Error("bundle locale must not be blank");
  if (!namespace.trim()) throw new Error("bundle namespace must not be blank");
  if (!canonicalEnglishCatalog[namespace as keyof typeof canonicalEnglishCatalog]) {
    throw new Error(`Unknown canonical namespace: ${namespace}`);
  }
}

function descriptorMap(namespace: string): Map<string, UiMessageDescriptor> {
  const canonicalNamespace = canonicalEnglishCatalog[namespace as keyof typeof canonicalEnglishCatalog];
  if (!canonicalNamespace) throw new Error(`Unknown canonical namespace: ${namespace}`);
  return new Map(
    (Object.values(canonicalNamespace) as UiMessageDescriptor[]).map((descriptor) => [descriptor.key, descriptor]),
  );
}

function assertBundleVersion(bundleVersion: string): void {
  if (!SHA256_HEX.test(bundleVersion)) throw new Error("bundle version must be a lowercase SHA-256 hex digest");
}

function deterministicCompare(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  for (let index = 0; index < Math.min(leftBytes.length, rightBytes.length); index++) {
    if (leftBytes[index] !== rightBytes[index]) return leftBytes[index]! - rightBytes[index]!;
  }
  return leftBytes.length - rightBytes.length;
}
