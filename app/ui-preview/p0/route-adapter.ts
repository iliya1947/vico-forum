import { createElement, type ComponentType } from "react";
import { useActionData, useMatches, useParams, useRouteError, useRouteLoaderData } from "react-router";
import type { RouteObject } from "react-router";
import type { PreviewRouteDescriptor } from "../build/route-manifest";
import { previewAction } from "./action-bridge";

/** Framework Mode gives route components props; Data Mode does not. */
function withFrameworkComponentProps(id: string, Component: ComponentType<Record<string, unknown>>): ComponentType {
  return function PreviewFrameworkComponent() {
    const loaderData = useRouteLoaderData(id);
    const actionData = useActionData();
    const params = useParams();
    const matches = useMatches();
    return createElement(Component, { loaderData, actionData, params, matches });
  };
}

/** Preserve Framework ErrorBoundary props while keeping the original useRouteError hook working. */
function withFrameworkErrorBoundaryProps(
  id: string,
  ErrorBoundary: ComponentType<Record<string, unknown>>,
): ComponentType {
  return function PreviewFrameworkErrorBoundary() {
    const error = useRouteError();
    const loaderData = useRouteLoaderData(id);
    const actionData = useActionData();
    const params = useParams();
    return createElement(ErrorBoundary, { error, loaderData, actionData, params });
  };
}

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
    // Framework clientLoader has no direct Data Router export; dropping it would
    // silently change the production loader contract.
    if (module.clientLoader !== undefined) {
      throw new Error("UI preview cannot adapt Framework clientLoader: " + descriptor.id);
    }
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
      ...(hasComponent ? {
        Component: withFrameworkComponentProps(descriptor.id, module.default as ComponentType<Record<string, unknown>>),
      } : {}),
      ...(typeof module.loader === "function" ? { loader: module.loader } : {}),
      ...(typeof module.clientAction === "function"
        ? { action: previewAction(descriptor.id, module) }
        : typeof module.action === "function" ? { action: module.action } : {}),
      ...(module.middleware ? { middleware: module.middleware } : {}),
      ...(typeof module.ErrorBoundary === "function"
        ? {
          ErrorBoundary: withFrameworkErrorBoundaryProps(
            descriptor.id, module.ErrorBoundary as ComponentType<Record<string, unknown>>,
          ),
        } : {}),
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
