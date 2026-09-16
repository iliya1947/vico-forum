import type { ResolvedLocaleContext } from "./locale";
import { compileNamespaceBundle } from "./bundles";
import type {
  ResourceBundle,
  TranslationSource,
  TranslationSourceBundle,
} from "./sources";

export interface TranslationSnapshot {
  locale: ResolvedLocaleContext;
  fallbackLocales: string[];
  resourcesByLocale: Record<string, ResourceBundle>;
  bundleVersions: Record<string, Record<string, string>>;
  staleKeys: Record<string, string[]>;
}

export class TranslationResourceLoader {
  constructor(private readonly sources: readonly TranslationSource[]) {}

  async load(locale: ResolvedLocaleContext, namespaces: readonly string[]): Promise<TranslationSnapshot> {
    const chain = [...new Set([locale.translationLocale, ...locale.fallbackLocales, "en"])];
    const requestedNamespaces = [...new Set(namespaces)];
    const resourcesByLocale: Record<string, ResourceBundle> = {};
    const bundleVersions: Record<string, Record<string, string>> = {};
    const staleKeys: Record<string, string[]> = {};

    for (const tag of chain) {
      const logicalBundle: TranslationSourceBundle = {};
      for (const source of this.sources) {
        const result = await source.load(tag, requestedNamespaces);
        for (const [namespace, messages] of Object.entries(result.resources)) {
          const target = (logicalBundle[namespace] ??= {});
          for (const [key, value] of Object.entries(messages)) target[key] ??= value;
        }
        if (result.staleKeys.length) (staleKeys[tag] ??= []).push(...result.staleKeys);
      }

      const runtimeBundle: ResourceBundle = {};
      const versions: Record<string, string> = {};
      for (const namespace of requestedNamespaces) {
        const compiled = await compileNamespaceBundle(tag, namespace, logicalBundle[namespace] ?? {});
        runtimeBundle[namespace] = compiled.resources;
        versions[namespace] = compiled.bundleVersion;
      }

      resourcesByLocale[tag] = runtimeBundle;
      bundleVersions[tag] = versions;
    }

    return {
      locale,
      fallbackLocales: chain.slice(1),
      resourcesByLocale,
      bundleVersions,
      staleKeys,
    };
  }
}
