import type { ResolvedLocaleContext } from "./locale";
import { compileNamespaceBundle } from "./bundles";
import type { TranslationBundleReader } from "./bundles";
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
  constructor(
    private readonly sources: readonly TranslationSource[],
    private readonly bundleStore?: TranslationBundleReader,
  ) {}

  async load(locale: ResolvedLocaleContext, namespaces: readonly string[]): Promise<TranslationSnapshot> {
    const chain = [...new Set([locale.translationLocale, ...locale.fallbackLocales, "en"])];
    const requestedNamespaces = [...new Set(namespaces)];
    const resourcesByLocale: Record<string, ResourceBundle> = {};
    const bundleVersions: Record<string, Record<string, string>> = {};
    const staleKeys: Record<string, string[]> = {};

    for (const tag of chain) {
      const logicalBundle: TranslationSourceBundle = {};
      const runtimeBundle: ResourceBundle = {};
      const versions: Record<string, string> = {};
      const missingNamespaces: string[] = [];

      for (const namespace of requestedNamespaces) {
        const persisted = tag === "en" ? undefined : await this.bundleStore?.read(tag, namespace);
        if (persisted) {
          runtimeBundle[namespace] = persisted.resources;
          versions[namespace] = persisted.bundleVersion;
        } else {
          missingNamespaces.push(namespace);
        }
      }

      if (missingNamespaces.length) {
        for (const source of this.sources) {
          const result = await source.load(tag, missingNamespaces);
          for (const [namespace, messages] of Object.entries(result.resources)) {
            const target = (logicalBundle[namespace] ??= {});
            for (const [key, value] of Object.entries(messages)) target[key] ??= value;
          }
          if (result.staleKeys.length) (staleKeys[tag] ??= []).push(...result.staleKeys);
        }
      }

      for (const namespace of missingNamespaces) {
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
