export type CredentialRequestResult = "ok" | "invalid" | "unavailable" | "rate-limited";

export async function credentialRequest(endpoint: "request-password-reset" | "reset-password" | "request-password-create" | "create-password",
  body: Record<string, string>, identity?: { userId: string; sessionId: string }): Promise<CredentialRequestResult> {
  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (identity) {
      headers.set("x-vico-credential-user", identity.userId);
      headers.set("x-vico-credential-session", identity.sessionId);
    }
    const response = await fetch("/api/auth/" + endpoint, {
      method: "POST", headers, body: JSON.stringify(body), credentials: "same-origin",
      cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
    });
    if (response.status === 429) return "rate-limited";
    if (response.status >= 500) return "unavailable";
    if (!response.ok) return "invalid";
    const result: unknown = await response.json();
    return result && typeof result === "object" && "status" in result && result.status === true ? "ok" : "unavailable";
  } catch { return "unavailable"; }
}

export function takeCredentialProof(purpose = "password-create"): string | null {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (fragment.has("purpose") && fragment.get("purpose") !== purpose) return null;
  const values = fragment.getAll("token");
  if (values.length === 0) return null;
  try { window.history.replaceState(window.history.state, "", url.pathname + url.search); }
  catch { return null; }
  return values.length === 1 && /^[A-Za-z0-9._~-]{1,2048}$/.test(values[0]) ? values[0] : null;
}
