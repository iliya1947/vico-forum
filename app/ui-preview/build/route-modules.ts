import { resolve } from "node:path";
import type { RouteConfigEntry } from "@react-router/dev/routes";
import type { Plugin } from "vite";
import { createPreviewRouteManifest, type PreviewRouteDescriptor } from "./route-manifest";

export const PREVIEW_ROUTES_MODULE_ID = "virtual:vico-ui-preview-routes";
const resolvedModuleId = "\0" + PREVIEW_ROUTES_MODULE_ID;

function collectRoutes(route: PreviewRouteDescriptor): PreviewRouteDescriptor[] {
  return [route, ...(route.children ?? []).flatMap(collectRoutes)];
}

/**
 * The generated registry always derives route IDs and import paths from the
 * actual Framework descriptor tree. A bounded module selection is optional:
 * P0 uses it for its proof, while the full P1 registry needs no route list.
 */
export function createPreviewRouteModuleSource(
  manifest: PreviewRouteDescriptor,
  appDirectory: string,
  moduleIds?: readonly string[],
): string {
  const allRoutes = collectRoutes(manifest);
  const byId = new Map(allRoutes.map((route) => [route.id, route]));
  if (byId.size !== allRoutes.length) {
    throw new Error("UI preview route registry contains duplicate IDs");
  }
  const includedIds = moduleIds ?? allRoutes.map((route) => route.id);
  if (new Set(includedIds).size !== includedIds.length) {
    throw new Error("UI preview route registry contains duplicate module IDs");
  }

  const entries = includedIds.map((id) => {
    const route = byId.get(id);
    if (!route) throw new Error("UI preview unknown route module ID: " + id);
    // Absolute filesystem imports are resolved by Vite at build time. The
    // emitted module never loads app/routes.ts or @react-router/dev in browser.
    const file = resolve(appDirectory, route.file).replaceAll("\\", "/");
    return JSON.stringify(id) + ": () => import(" + JSON.stringify(file) + ")";
  });

  return [
    "export const routeManifest = " + JSON.stringify(manifest) + ";",
    "export const routeModules = { " + entries.join(", ") + " };",
    "export function importRoute(id) {",
    '  const load = routeModules[id];',
    '  if (!load) throw new Error("UI preview route is not bundled: " + id);',
    '  return load();',
    "}",
  ].join("\n");
}

export function previewRoutesPlugin(
  config: readonly RouteConfigEntry[],
  appDirectory: string,
  moduleIds?: readonly string[],
): Plugin {
  const manifest = createPreviewRouteManifest(config, appDirectory);
  const source = createPreviewRouteModuleSource(manifest, appDirectory, moduleIds);
  return {
    name: "vico-ui-preview-route-modules",
    resolveId(id) {
      if (id === PREVIEW_ROUTES_MODULE_ID) return resolvedModuleId;
    },
    load(id) {
      if (id === resolvedModuleId) return source;
    },
  };
}
