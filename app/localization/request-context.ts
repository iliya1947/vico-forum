import { createContext, type RouterContextProvider } from "react-router";
import type { ResolvedLocaleContext } from "./locale";
import type { LoadedLocaleRegistry } from "./persistent-registry";
import type { UiTranslationStore } from "./persistent-sources";
import type { TranslationBundleReader } from "./bundles";
import type { ContentTranslationPresentationService } from "./content-translation-presentation";

export const localeContext = createContext<ResolvedLocaleContext>();
export const registryLoaderContext = createContext<() => Promise<LoadedLocaleRegistry>>();
export type RuntimeUiTranslationStore = UiTranslationStore & TranslationBundleReader;
export const uiTranslationStoreContext = createContext<RuntimeUiTranslationStore>();
export const contentTranslationPresentationContext = createContext<ContentTranslationPresentationService>();

export class RegistryLoaderConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("registry loader is not configured", options);
    this.name = "RegistryLoaderConfigurationError";
  }
}


export class ContentTranslationPresentationConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("content translation presentation is not configured", options);
    this.name = "ContentTranslationPresentationConfigurationError";
  }
}

export class UiTranslationStoreConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("UI translation store is not configured", options);
    this.name = "UiTranslationStoreConfigurationError";
  }
}

export async function registryForRequest(context: RouterContextProvider) {
  let load: () => Promise<LoadedLocaleRegistry>;
  try {
    load = context.get(registryLoaderContext);
  } catch (error) {
    throw new RegistryLoaderConfigurationError({ cause: error });
  }
  return load();
}

export function uiTranslationStoreForRequest(context: RouterContextProvider): RuntimeUiTranslationStore {
  try {
    return context.get(uiTranslationStoreContext);
  } catch (error) {
    throw new UiTranslationStoreConfigurationError({ cause: error });
  }
}

export function contentTranslationPresentationForRequest(
  context: RouterContextProvider,
): ContentTranslationPresentationService {
  try {
    return context.get(contentTranslationPresentationContext);
  } catch (error) {
    throw new ContentTranslationPresentationConfigurationError({ cause: error });
  }
}
