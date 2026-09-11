import { createContext, type RouterContextProvider } from "react-router";
import type { ResolvedLocaleContext } from "./locale";
import type { LoadedLocaleRegistry } from "./persistent-registry";
import { localeRegistry } from "./registry";

export const localeContext = createContext<ResolvedLocaleContext>();
export const registryLoaderContext = createContext<() => Promise<LoadedLocaleRegistry>>();

export async function registryForRequest(context?: RouterContextProvider) {
  try {
    const load = context!.get(registryLoaderContext);
    return load();
  } catch {
    return {
      registry: localeRegistry,
      semanticIdentity: "config-stage-1",
      health: { status: "healthy" as const },
    };
  }
}
