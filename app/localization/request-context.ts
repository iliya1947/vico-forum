import { createContext, type RouterContextProvider } from "react-router";
import type { ResolvedLocaleContext } from "./locale";
import type { LoadedLocaleRegistry } from "./persistent-registry";
import type { UiTranslationStore } from "./persistent-sources";

export const localeContext = createContext<ResolvedLocaleContext>();
export const registryLoaderContext = createContext<() => Promise<LoadedLocaleRegistry>>();
export const uiTranslationStoreContext = createContext<UiTranslationStore>();

export class RegistryLoaderConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("registry loader is not configured", options);
    this.name = "RegistryLoaderConfigurationError";
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

export function uiTranslationStoreForRequest(context: RouterContextProvider): UiTranslationStore {
  try {
    return context.get(uiTranslationStoreContext);
  } catch (error) {
    throw new UiTranslationStoreConfigurationError({ cause: error });
  }
}
