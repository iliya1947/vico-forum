export type CredentialMode = "sign-in" | "sign-up";

export function safeForumReturnPath(locale: string, pathname: string, search = "", hash = ""): string {
  const localeRoot = `/${encodeURIComponent(locale)}`;
  const localPath = pathname.startsWith("/") && !pathname.startsWith("//")
    && (pathname === localeRoot || pathname.startsWith(`${localeRoot}/`));
  return localPath ? `${pathname}${search.startsWith("?") ? search : ""}${hash.startsWith("#") ? hash : ""}` : localeRoot;
}

export function credentialPagePath(locale: string, mode: CredentialMode, returnTo: string): string {
  return `/${encodeURIComponent(locale)}/${mode}?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Remap only a destination already accepted by the old locale's redirect guard. */
export function credentialLocaleSearch(locale: string, targetLocale: string, search: string): string {
  const query = new URLSearchParams(search);
  if (!query.has("returnTo")) return search;
  const safe = credentialReturnPath(locale, query.get("returnTo"));
  const oldRoot = `/${encodeURIComponent(locale)}`;
  const newRoot = `/${encodeURIComponent(targetLocale)}`;
  const remapped = `${newRoot}${safe.slice(oldRoot.length)}`;
  query.set("returnTo", credentialReturnPath(targetLocale, remapped));
  return `?${query}`;
}

/** Never follow an outside-origin or cross-locale redirect supplied by a client. */
export function credentialReturnPath(locale: string, requested: string | null): string {
  const fallback = `/${encodeURIComponent(locale)}`;
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return fallback;
  try {
    const url = new URL(requested, "https://forum.invalid");
    if (url.origin !== "https://forum.invalid") return fallback;
    return safeForumReturnPath(locale, url.pathname, url.search, url.hash);
  } catch {
    return fallback;
  }
}
