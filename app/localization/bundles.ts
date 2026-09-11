import { canonicalEnglishCatalog, type UiMessageDescriptor } from "./catalog";
import { sha256Text, sourceFingerprint } from "./fingerprint";

const BUNDLE_VERSION_FORMAT = "vico-ui-bundle-v1";
const BUNDLE_CACHE_FORMAT = "vico-ui-bundle-cache-v1";
const SHA256_HEX = /^[0-9a-f]{64}$/;

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

export async function compileNamespaceBundle(
  locale: string,
  namespace: string,
  resources: Readonly<Record<string, string>>,
): Promise<CompiledNamespaceBundle> {
  if (!locale.trim()) throw new Error("bundle locale must not be blank");
  if (!namespace.trim()) throw new Error("bundle namespace must not be blank");

  const canonicalNamespace = canonicalEnglishCatalog[namespace as keyof typeof canonicalEnglishCatalog];
  if (!canonicalNamespace) throw new Error(`Unknown canonical namespace: ${namespace}`);

  const canonicalDescriptors = new Map(
    (Object.values(canonicalNamespace) as UiMessageDescriptor[]).map((descriptor) => [descriptor.key, descriptor]),
  );
  const normalizedResources: Record<string, string> = {};
  const versionEntries: Array<[string, string, string]> = [];

  for (const key of Object.keys(resources).sort(deterministicCompare)) {
    const descriptor = canonicalDescriptors.get(key);
    if (!descriptor) throw new Error(`Unknown canonical key: ${namespace}:${key}`);
    const value = resources[key];
    if (typeof value !== "string") throw new Error(`Invalid compiled resource: ${namespace}:${key}`);

    normalizedResources[key] = value;
    versionEntries.push([key, await sourceFingerprint(descriptor), value]);
  }

  const bundleVersion = await sha256Text(JSON.stringify({
    format: BUNDLE_VERSION_FORMAT,
    locale,
    namespace,
    resources: versionEntries,
  }));

  return {
    locale,
    namespace,
    resources: normalizedResources,
    bundleVersion,
  };
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
