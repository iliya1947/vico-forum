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
 * The build plugin is the only place where Framework routes become browser
 * imports. P0 limits which modules are bundled, not which paths/IDs exist:
 * subsequent runtime stages can use the same manifest without a second router.
 */
export function createPreviewRouteModuleSource(
  manifest: PreviewRouteDescriptor,
  appDirectory: string,
  moduleIds: readonly string[],
): string {
  const byId = new Map(collectRoutes(manifest).map((route) => [route.id, route]));
  if (new Set(moduleIds).size !== moduleIds.length) {
    throw new Error("UI preview proof contains duplicate module IDs");
  }

  const entries = moduleIds.map((id) => {
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
    '  if (!load) throw new Error("UI preview route is not bundled in P0: " + id);',
    '  return load();',
    "}",
  ].join("\n");
}

export function previewRoutesPlugin(
  config: readonly RouteConfigEntry[],
  appDirectory: string,
  moduleIds: readonly string[],
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
