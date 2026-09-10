import type { ResolvedLocaleContext } from "./locale";
import type { TranslationSource, ResourceBundle } from "./sources";

export interface TranslationSnapshot {
  locale: ResolvedLocaleContext;
  fallbackLocales: string[];
  resourcesByLocale: Record<string, ResourceBundle>;
  bundleVersions: Record<string, string[]>;
  staleKeys: Record<string, string[]>;
}

export class TranslationResourceLoader {
  constructor(private readonly sources: readonly TranslationSource[]) {}

  async load(locale: ResolvedLocaleContext, namespaces: readonly string[]): Promise<TranslationSnapshot> {
    const chain = [...new Set([locale.translationLocale, ...locale.fallbackLocales, "en"])];
    const resourcesByLocale: Record<string, ResourceBundle> = {};
    const bundleVersions: Record<string, string[]> = {};
    const staleKeys: Record<string, string[]> = {};

    for (const tag of chain) {
      const bundle: ResourceBundle = {};
      for (const source of this.sources) {
        const result = await source.load(tag, namespaces);
        for (const [namespace, messages] of Object.entries(result.resources)) {
          const target = (bundle[namespace] ??= {});
          for (const [key, value] of Object.entries(messages)) target[key] ??= value;
        }
        (bundleVersions[tag] ??= []).push(result.version);
        if (result.staleKeys.length) (staleKeys[tag] ??= []).push(...result.staleKeys);
      }
      resourcesByLocale[tag] = bundle;
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
