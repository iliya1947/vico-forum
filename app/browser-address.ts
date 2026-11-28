/** Native document address operations. Production keeps the browser's own
 * URL and history; the isolated Pages runtime supplies the same virtual URL
 * used by its router, including native history replacement without revalidation.
 */
export interface BrowserAddressPort {
  read(): URL;
  replace(path: string): void;
  href(path: string): string;
  observeHashChange(listener: () => void): () => void;
}

const nativeAddress: BrowserAddressPort = {
  read: () => new URL(window.location.href),
  replace: (path) => window.history.replaceState(window.history.state, "", path),
  href: (path) => path,
  observeHashChange(listener) {
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  },
};
let activeAddress = nativeAddress;

export function browserAddress(): BrowserAddressPort {
  return activeAddress;
}

/** Single runtime owner. Disposal cannot remove a different generation's port. */
export function installBrowserAddress(port: BrowserAddressPort): () => void {
  if (activeAddress !== nativeAddress) throw new Error("Browser address port already installed");
  activeAddress = port;
  return () => {
    if (activeAddress === port) activeAddress = nativeAddress;
  };
}
