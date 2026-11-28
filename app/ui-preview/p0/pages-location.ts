import { createPath, type createMemoryRouter, type To } from "react-router";
import type { createPagesAddressCodec } from "./pages-address";

type DataRouter = ReturnType<typeof createMemoryRouter>;
type Host = Window & typeof globalThis;
type PagesCodec = ReturnType<typeof createPagesAddressCodec>;

/**
 * Keep Data Router actions, loaders, matching and navigation on virtual URLs.
 * Only public Link href + outer browser history use the Pages bootstrap codec.
 */
export function installPagesLocationAdapter(
  router: DataRouter,
  options: { codec: PagesCodec; host?: Host },
) {
  const host = options.host ?? window;
  const codec = options.codec;
  codec.fromUrl(new URL(host.location.href));
  const originalCreateHref = router.createHref;

  // Link (including relative Link) gets a shareable Pages href, while to/navigate
  // remain the original virtual targets that React Router resolves internally.
  router.createHref = (to: To) => codec.href(to);
  let lastVirtualPath = createPath(router.state.location);
  let restoringFromBrowser = false;
  let disposed = false;

  const canonicalInitial = codec.href(lastVirtualPath);
  host.history.replaceState(host.history.state, "", canonicalInitial);

  const unsubscribe = router.subscribe((state) => {
    if (disposed || !state.initialized || state.navigation.state !== "idle") return;
    const current = createPath(state.location);
    if (current === lastVirtualPath) return;
    lastVirtualPath = current;
    if (restoringFromBrowser) return;
    const nextUrl = codec.href(current);
    if (state.historyAction === "PUSH") {
      host.history.pushState(null, "", nextUrl);
    } else {
      host.history.replaceState(host.history.state, "", nextUrl);
    }
    console.info("P0_PAGES_HISTORY", state.historyAction, current);
  });

  const onPop = () => {
    let target: string;
    try {
      target = codec.fromUrl(new URL(host.location.href));
    } catch (error) {
      console.error("P0_PAGES_INVALID_HISTORY", error);
      return;
    }
    if (target === lastVirtualPath || restoringFromBrowser) return;
    restoringFromBrowser = true;
    void router.navigate(target, { replace: true }).finally(() => {
      restoringFromBrowser = false;
      console.info("P0_PAGES_POP", target);
    });
  };
  host.addEventListener("popstate", onPop);

  return {
    codec,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      host.removeEventListener("popstate", onPop);
      if (router.createHref !== originalCreateHref) router.createHref = originalCreateHref;
    },
  };
}
