import { createPath, type createMemoryRouter, type To } from "react-router";
import { installBrowserAddress } from "../../browser-address";
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
  const readAddress = () => new URL(codec.fromUrl(new URL(host.location.href)), host.location.origin);
  const hashListeners = new Set<() => void>();
  let visible = readAddress();
  const notifyAddressChange = () => {
    const next = readAddress();
    const previous = visible;
    visible = next;
    // A different route mounts its own component, which reads the new URL.
    // A hash change on the same route must reach its existing native listener.
    if (previous.pathname === next.pathname && previous.hash !== next.hash) {
      for (const listener of [...hashListeners]) listener();
    }
  };
  const restoreBrowserAddress = installBrowserAddress({
    read: readAddress,
    href: (path) => codec.href(path),
    replace(path) {
      host.history.replaceState(host.history.state, "", codec.href(path));
      // As with native replaceState, scrubbing a proof is not a hash event.
      visible = readAddress();
    },
    observeHashChange(listener) {
      hashListeners.add(listener);
      return () => { hashListeners.delete(listener); };
    },
  });

  let lastVirtualPath = createPath(router.state.location);
  let restoringFromBrowser = false;
  let disposed = false;

  try {
    host.history.replaceState(host.history.state, "", codec.href(lastVirtualPath));
    visible = readAddress();
  } catch (error) {
    restoreBrowserAddress();
    throw error;
  }
  // Link (including relative Link) gets a shareable Pages href, while to/navigate
  // remain the original virtual targets that React Router resolves internally.
  router.createHref = (to: To) => codec.href(to);

  const unsubscribe = router.subscribe((state) => {
    if (disposed || !state.initialized || state.navigation.state !== "idle") return;
    const current = createPath(state.location);
    if (current === lastVirtualPath) return;
    lastVirtualPath = current;
    if (restoringFromBrowser) {
      notifyAddressChange();
      return;
    }
    const nextUrl = codec.href(current);
    if (state.historyAction === "PUSH") {
      host.history.pushState(null, "", nextUrl);
    } else {
      host.history.replaceState(host.history.state, "", nextUrl);
    }
    notifyAddressChange();
    console.info("P0_PAGES_HISTORY", state.historyAction, current);
  });

  const onPop = () => {
    let target: string;
    try {
      const publicUrl = new URL(host.location.href);
      target = codec.fromUrl(publicUrl);
      if (publicUrl.hash) host.history.replaceState(host.history.state, "", codec.href(target));
    } catch (error) {
      console.error("P0_PAGES_INVALID_HISTORY", error);
      return;
    }
    if (restoringFromBrowser) return;
    if (target === lastVirtualPath) {
      notifyAddressChange();
      return;
    }
    restoringFromBrowser = true;
    void router.navigate(target, { replace: true }).finally(() => {
      restoringFromBrowser = false;
      console.info("P0_PAGES_POP", target);
    });
  };
  const onNativeHash = () => {
    if (host.location.hash) onPop();
  };
  host.addEventListener("popstate", onPop);
  host.addEventListener("hashchange", onNativeHash);

  return {
    codec,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      host.removeEventListener("popstate", onPop);
      host.removeEventListener("hashchange", onNativeHash);
      hashListeners.clear();
      restoreBrowserAddress();
      if (router.createHref !== originalCreateHref) router.createHref = originalCreateHref;
    },
  };
}
