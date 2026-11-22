import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { importRoute, routeManifest } from "virtual:vico-ui-preview-routes";
import { createPreviewDataRoutes } from "./route-adapter";
import { createP0Context, P0_TOPIC_ID } from "./fixture";

/** P0-only browser proof. This never replaces the published Pages preview. */
const mount = document.getElementById("root");
if (!mount) throw new Error("P0 candidate mount is missing");

async function boot() {
  const modules = new Map<string, Record<string, unknown>>();
  for (const id of ["root", "routes/locale-boundary", "routes/topic"]) {
    const module = await importRoute(id);
    modules.set(id, module);
    console.info("P0_DIAGNOSTIC_IMPORTED", id);
  }

  const routes = createPreviewDataRoutes(routeManifest, modules);
  const router = createMemoryRouter(routes, {
    initialEntries: ["/en/topics/" + P0_TOPIC_ID],
    getContext: createP0Context,
  });
  router.subscribe((state) => {
    if (state.errors && Object.keys(state.errors).length) {
      mount!.dataset.status = "route-error";
      console.error("P0_ROUTE_ERRORS", state.errors);
    }
  });
  createRoot(mount!).render(createElement(RouterProvider, { router }));
  mount!.dataset.status = "router-mounted";
}

void boot().catch((error: unknown) => {
  mount!.dataset.status = "boot-failed";
  mount!.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("P0_BOOT_FAILURE", error);
});
