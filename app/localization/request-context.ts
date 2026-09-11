import { createContext, type RouterContextProvider } from "react-router";
import type { ResolvedLocaleContext } from "./locale";
import type { LoadedLocaleRegistry } from "./persistent-registry";

export const localeContext = createContext<ResolvedLocaleContext>();
export const registryLoaderContext = createContext<() => Promise<LoadedLocaleRegistry>>();

export class RegistryLoaderConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("registry loader is not configured", options);
    this.name = "RegistryLoaderConfigurationError";
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
