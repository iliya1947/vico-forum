import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import type { PreviewRouteDescriptor } from "../build/route-manifest";
import { previewAction } from "./action-bridge";

/**
 * Convert the generated Framework descriptor tree into Data Router routes.
 * P0 supplies only the selected real modules; unbundled paths are pruned.
 * No product route path, component or loader is rewritten here.
 */
export function createPreviewDataRoutes(
  manifest: PreviewRouteDescriptor,
  modules: ReadonlyMap<string, Record<string, unknown>>,
): RouteObject[] {
  const used = new Set<string>();

  function convert(descriptor: PreviewRouteDescriptor): RouteObject | null {
    const children = (descriptor.children ?? [])
      .map(convert)
      .filter((route): route is RouteObject => route !== null);
    const module = modules.get(descriptor.id);
    if (!module) {
      if (children.length) {
        throw new Error("UI preview cannot omit ancestor route module: " + descriptor.id);
      }
      return null;
    }
    used.add(descriptor.id);
    const hasComponent = typeof module.default === "function";
    const isResource = !hasComponent && !children.length
      && (typeof module.loader === "function" || typeof module.action === "function");
    if (!hasComponent && !isResource) {
      throw new Error("UI preview route lacks real component or resource handler: " + descriptor.id);
    }
    for (const field of ["loader", "action", "clientAction"] as const) {
      if (module[field] !== undefined && typeof module[field] !== "function") {
        throw new Error("UI preview route has invalid " + field + ": " + descriptor.id);
      }
    }
    if (module.middleware !== undefined && !Array.isArray(module.middleware)) {
      throw new Error("UI preview route has invalid middleware: " + descriptor.id);
    }

    const route = {
      id: descriptor.id,
      ...(descriptor.path === undefined ? {} : { path: descriptor.path }),
      ...(descriptor.index === undefined ? {} : { index: descriptor.index }),
      ...(descriptor.caseSensitive === undefined ? {} : { caseSensitive: descriptor.caseSensitive }),
      ...(hasComponent ? { Component: module.default as ComponentType } : {}),
      ...(typeof module.loader === "function" ? { loader: module.loader } : {}),
      ...(typeof module.clientAction === "function"
        ? { action: previewAction(descriptor.id, module) }
        : typeof module.action === "function" ? { action: module.action } : {}),
      ...(module.middleware ? { middleware: module.middleware } : {}),
      ...(typeof module.ErrorBoundary === "function"
        ? { ErrorBoundary: module.ErrorBoundary as ComponentType } : {}),
      ...(module.handle === undefined ? {} : { handle: module.handle }),
      ...(typeof module.shouldRevalidate === "function"
        ? { shouldRevalidate: module.shouldRevalidate } : {}),
      ...(children.length ? { children } : {}),
    } as RouteObject;
    return route;
  }

  const root = convert(manifest);
  if (!root || root.id !== "root") throw new Error("UI preview generated root route is missing");
  for (const id of modules.keys()) {
    if (!used.has(id)) throw new Error("UI preview module not present in generated route tree: " + id);
  }
  return [root];
}
