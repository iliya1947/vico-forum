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

/** Email links use the AUTH-01 path-only return contract. Strip query/fragment
 * from ordinary forum destinations and reject auth recursion or ambiguous paths. */
export function verificationReturnPath(locale: string, requested: string | null): string {
  const root = `/${encodeURIComponent(locale)}`;
  if (!requested || requested.length > 8192 || !requested.startsWith("/") ||
      requested.startsWith("//") || requested.trim() !== requested) return root;
  let decoded = requested.split(/[?#]/, 1)[0];
  const original = decoded;
  try {
    for (let i = 0; i < 4; i++) {
      if (/[\\\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(decoded) ||
          /%(?:2f|5c|3f|23)/i.test(decoded) ||
          decoded.split("/").some(part => part === "." || part === "..")) return root;
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        if (decoded !== root && !decoded.startsWith(root + "/")) return root;
        const first = decoded.slice(root.length + 1).split("/")[0];
        if (["sign-in", "sign-up", "verify-email", "resend-verification"].includes(first)) return root;
        return new URL(original, "https://forum.invalid").pathname;
      }
      decoded = next;
    }
  } catch { /* Invalid percent encoding. */ }
  return root;
}

export function verificationPagePath(locale: string, mode: "resend-verification" | "verify-email", returnTo: string): string {
  return `/${encodeURIComponent(locale)}/${mode}?returnTo=${encodeURIComponent(verificationReturnPath(locale, returnTo))}`;
}
