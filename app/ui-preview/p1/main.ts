import { RouterContextProvider } from "react-router";
import { importRoute, routeManifest } from "virtual:vico-ui-preview-routes";
import { createPreviewDataRoutes } from "../p0/route-adapter";
import { installPreviewResourceTransport } from "../p0/resource-transport";

/**
 * Isolated P1 import proof, not the published preview and not a second UI.
 * Import every real route module after installing the fail-closed transport.
 */
const mount = document.getElementById("root");
if (!mount) throw new Error("P1 import diagnostic root is missing");

function ids(route: typeof routeManifest): string[] {
  return [route.id, ...(route.children ?? []).flatMap(ids)];
}

const routeIds = ids(routeManifest);
const transport = installPreviewResourceTransport({
  manifest: routeManifest,
  createContext: () => new RouterContextProvider(),
});

void (async () => {
  const modules = new Map<string, Record<string, unknown>>();
  for (const id of routeIds) {
    try {
      modules.set(id, await importRoute(id));
    } catch (error) {
      throw new Error(
        "P1 route module import failed for " + id + ": " +
        (error instanceof Error ? error.message : String(error)),
        { cause: error },
      );
    }
    console.info("P1_MODULE_IMPORTED", id);
  }
  const routes = createPreviewDataRoutes(routeManifest, modules);
  transport.configure(routes, modules);
  // Real catch-all module: prove HTTP interception with no Pages/backend fetch.
  const unknownApi = await fetch(new URL("/api/vico-preview-resource-probe", window.location.origin));
  if (unknownApi.status !== 404) {
    throw new Error("P1 resource dispatch returned unexpected HTTP " + unknownApi.status);
  }
  console.info("P1_RESOURCE_DISPATCH_404", unknownApi.status);
  if (modules.size !== routeIds.length) {
    throw new Error("P1 import registry is missing modules");
  }
  mount.dataset.status = "complete";
  mount.dataset.routes = String(modules.size);
  mount.textContent = "Imported original modules: " + modules.size;
  console.info("P1_ALL_MODULES_IMPORTED", modules.size);
})().catch((error: unknown) => {
  transport.dispose();
  mount.dataset.status = "failed";
  mount.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("P1_IMPORT_FAILURE", error);
});
