import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { importRoute, routeManifest } from "virtual:vico-ui-preview-routes";
import { createPreviewDataRoutes } from "./route-adapter";
import { createPreviewDocumentAdapter } from "./document";
import { createP0Context, P0_ACTOR_ID, P0_TOPIC_ID } from "./fixture";
import { createPagesAddressCodec } from "./pages-address";
import { installPagesLocationAdapter } from "./pages-location";
import { installPreviewResourceTransport } from "./resource-transport";

/** P0-only browser proof. This never replaces the published Pages preview. */
const mount = document.getElementById("root");
if (!mount) throw new Error("P0 candidate mount is missing");

// A single transport is installed before dynamically importing product modules.
const resourceRouteIds = ["routes/presence", "routes/mentions"] as const;
const transport = installPreviewResourceTransport({
  manifest: routeManifest, resourceIds: resourceRouteIds, createContext: createP0Context,
});

async function boot() {
  const modules = new Map<string, Record<string, unknown>>();
  for (const id of ["root", "routes/locale-boundary", "routes/topic", ...resourceRouteIds]) {
    const module = await importRoute(id);
    modules.set(id, module);
    console.info("P0_DIAGNOSTIC_IMPORTED", id);
  }

  const routes = createPreviewDataRoutes(routeManifest, modules);
  transport.configure(routes, modules);
  const codec = createPagesAddressCodec(new URL(window.location.href), {
    actor: P0_ACTOR_ID, scenario: "default", initialPath: "/en/topics/" + P0_TOPIC_ID,
  });
  const initialEntry = codec.fromUrl(new URL(window.location.href));
  const router = createMemoryRouter(routes, {
    initialEntries: [initialEntry],
    getContext: createP0Context,
  });
  installPagesLocationAdapter(router, { codec });
  const documentAdapter = createPreviewDocumentAdapter(modules);
  const refreshDocument = () => {
    try {
      documentAdapter.sync(router.state);
    } catch (error) {
      mount!.dataset.status = "document-error";
      console.error("P0_DOCUMENT_FAILURE", error);
      throw error;
    }
  };
  router.subscribe((state) => {
    if (state.errors && Object.keys(state.errors).length) {
      mount!.dataset.status = "route-error";
      console.error("P0_ROUTE_ERRORS", state.errors);
    }
    if (state.navigation.state === "idle" && state.location.hash) {
      console.info("P0_ROUTER_REDIRECTED", state.location.hash);
    }
    refreshDocument();
  });
  refreshDocument();
  createRoot(mount!).render(createElement(RouterProvider, { router }));
  mount!.dataset.status = "router-mounted";
}

void boot().catch((error: unknown) => {
  transport.dispose();
  mount!.dataset.status = "boot-failed";
  mount!.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("P0_BOOT_FAILURE", error);
});
