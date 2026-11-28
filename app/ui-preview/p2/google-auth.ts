import type { AuthSession, AuthUser } from "../../auth/request-context";
import type { PreviewActor, PreviewRawBaseline } from "./raw-baseline";

/**
 * One preview-only provider result, chosen by the trusted scenario controller.
 * Never process real Google tokens/codes or infer identity from callback params.
 */
export type P2GoogleScenario = "existing" | "new-account" | "provider-denied";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
} as const;

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of new Headers(extra)) headers.set(key, value);
  return new Response(JSON.stringify(body), { status, headers });
}

function localReturn(value: unknown, origin: string): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")
    || value.includes("\\")) return null;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}

function redirect(path: string, headers?: Headers): Response {
  const output = new Headers(privateHeaders);
  if (headers) for (const cookie of headers.getSetCookie()) output.append("Set-Cookie", cookie);
  output.set("Location", path);
  return new Response(null, { status: 302, headers: output });
}

function failurePath(callback: string, code: string, origin: string): string {
  const url = new URL(callback, origin);
  url.searchParams.set("error", code);
  return url.pathname + url.search + url.hash;
}

function sessionForGoogleUser(baseline: PreviewRawBaseline, user: AuthUser, sequence: number): AuthSession {
  const issuedAt = new Date(baseline.referenceTime);
  const id = "preview-google-session-" + sequence;
  return {
    user: {
      ...user, createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt),
    },
    session: {
      id, token: "p2-internal-only:" + id, userId: user.id,
      createdAt: issuedAt, updatedAt: new Date(issuedAt),
      expiresAt: new Date(issuedAt.getTime() + 7 * 86_400_000),
    },
  };
}

/**
 * Simulates the provider boundary, not Google OAuth validation. The returned
 * callback URL remains on the local preview origin and never contacts Google.
 * A single pending flow is consumed at most once and belongs to this instance.
 */
export function createP2GoogleSocialAdapter(
  baseline: PreviewRawBaseline,
  actor: PreviewActor,
  scenario: P2GoogleScenario,
  establishSession: (session: AuthSession) => void,
) {
  if (!["existing", "new-account", "provider-denied"].includes(scenario)) {
    throw new Error("P2 unknown Google preview scenario");
  }
  let pending: {
    state: string;
    origin: string;
    callback: string;
    errorCallback: string;
    newUserCallback: string | null;
  } | null = null;
  let registeredGoogleUser: AuthUser | null = null;
  let sessionSequence = 0;

  function resolveExisting(): AuthUser | null {
    // The controller may deliberately select bound Owner or Admin; guest
    // receives the distinct raw Google fixture author, never elevated Owner.
    if (actor === "inactive") return null;
    const userId = actor === "owner" || actor === "admin"
      ? baseline.actorIds[actor] : "sample-author";
    const account = baseline.users.find((row) => row.identity.id === userId);
    if (!account || !account.methods.includes("google") || account.state.status !== "active"
      || account.state.userId !== userId) return null;
    return account.identity;
  }

  function callbackResult(url: URL): Response {
    const state = url.searchParams.get("state");
    if (!pending || !state || state !== pending.state || url.origin !== pending.origin) {
      return json({ code: "INVALID_OAUTH_STATE" }, 400);
    }
    const attempt = pending;
    pending = null; // consume before any provider/policy result
    const problem = url.searchParams.get("error");
    if (problem || url.searchParams.get("code") !== "preview-local-google-approved") {
      return redirect(failurePath(attempt.errorCallback,
        problem === "access_denied" ? "access_denied" : "invalid_code", url.origin));
    }

    let user: AuthUser | null = null;
    let isNew = false;
    if (scenario === "existing") {
      user = resolveExisting();
    } else if (scenario === "new-account") {
      if (registeredGoogleUser) {
        user = registeredGoogleUser;
      } else {
        const settings = baseline.domains.registrationSettings;
        if (typeof settings.googleRegistrationEnabled !== "boolean"
          || !Number.isSafeInteger(settings.version) || settings.version < 1) {
          throw new Error("P2 Google registration settings are missing or invalid");
        }
        if (!settings.googleRegistrationEnabled) {
          return redirect(failurePath(attempt.errorCallback,
            "vico_google_registration_closed", url.origin));
        }
        const id = "preview-google-registered";
        const email = "preview-google-new@preview.invalid";
        if (baseline.users.some((entry) => entry.identity.id === id
          || entry.identity.email.toLowerCase() === email)) {
          throw new Error("P2 Google fixture registration conflicts with baseline");
        }
        const now = new Date(baseline.referenceTime);
        registeredGoogleUser = {
          id, name: "Preview Google newcomer", email, emailVerified: true,
          image: null, createdAt: now, updatedAt: new Date(now),
        };
        user = registeredGoogleUser;
        isNew = true;
      }
    }
    if (!user) return redirect(failurePath(attempt.errorCallback,
      "account_unavailable", url.origin));

    establishSession(sessionForGoogleUser(baseline, user, ++sessionSequence));
    const headers = new Headers();
    headers.append("Set-Cookie", "better-auth.session_token="
      + encodeURIComponent("p2-internal-only:preview-google-session-" + sessionSequence)
      + "; Path=/; HttpOnly; SameSite=Lax" + (url.protocol === "https:" ? "; Secure" : ""));
    return redirect(isNew ? attempt.newUserCallback ?? attempt.callback : attempt.callback, headers);
  }

  return {
    async handle(request: Request): Promise<Response | null> {
      const url = new URL(request.url);
      if (url.pathname === "/api/auth/sign-in/social") {
        if (request.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED" }, 405, { Allow: "POST" });
        const origin = request.headers.get("Origin");
        if (origin) {
          let valid = false;
          try { valid = new URL(origin).origin === url.origin; } catch { /* invalid origin */ }
          if (!valid) return json({ code: "INVALID_ORIGIN" }, 403);
        }
        if (request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
          return json({ code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
        }
        let data: unknown;
        try { data = await request.json(); } catch { return json({ code: "INVALID_BODY" }, 400); }
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return json({ code: "INVALID_BODY" }, 400);
        }
        const body = data as Record<string, unknown>;
        if (body.provider !== "google") return json({ code: "PROVIDER_NOT_FOUND" }, 404);
        if (body.idToken !== undefined || body.link !== undefined) {
          return json({ code: "UNSUPPORTED_GOOGLE_TOKEN_FLOW" }, 400);
        }
        const callback = localReturn(body.callbackURL ?? "/en", url.origin);
        const errorCallback = localReturn(body.errorCallbackURL ?? "/en/sign-up", url.origin);
        const newUserCallback = body.newUserCallbackURL === undefined ? null
          : localReturn(body.newUserCallbackURL, url.origin);
        if (!callback || !errorCallback
          || (body.newUserCallbackURL !== undefined && !newUserCallback)
          || (body.disableRedirect !== undefined && typeof body.disableRedirect !== "boolean")) {
          return json({ code: "INVALID_CALLBACK_URL" }, 400);
        }
        const state = crypto.randomUUID();
        pending = { state, origin: url.origin, callback, errorCallback, newUserCallback };
        const target = new URL("/api/auth/callback/google", url.origin);
        target.searchParams.set("state", state);
        if (scenario === "provider-denied") target.searchParams.set("error", "access_denied");
        else target.searchParams.set("code", "preview-local-google-approved");
        const redirectTo = target.toString();
        return json({ url: redirectTo, redirect: body.disableRedirect !== true }, 200,
          body.disableRedirect === true ? undefined : { Location: redirectTo });
      }
      if (url.pathname === "/api/auth/callback/google") {
        if (request.method === "POST") {
          const origin = request.headers.get("Origin");
          if (origin && origin !== url.origin) return json({ code: "INVALID_ORIGIN" }, 403);
          const media = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
          if (media !== "application/json" && media !== "application/x-www-form-urlencoded") {
            return json({ code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
          }
          let body: Record<string, unknown>;
          try {
            if (media === "application/json") {
              const input: unknown = await request.json();
              if (!input || typeof input !== "object" || Array.isArray(input)) {
                return json({ code: "INVALID_BODY" }, 400);
              }
              body = input as Record<string, unknown>;
            } else {
              body = Object.fromEntries(new URLSearchParams(await request.text()));
            }
          } catch { return json({ code: "INVALID_BODY" }, 400); }
          const target = new URL(url);
          for (const key of ["state", "code", "error"]) {
            if (!target.searchParams.has(key) && typeof body[key] === "string") {
              target.searchParams.set(key, body[key]);
            }
          }
          return redirect(target.pathname + target.search);
        }
        if (request.method !== "GET") return json({ code: "METHOD_NOT_ALLOWED" }, 405, { Allow: "GET, POST" });
        return callbackResult(url);
      }
      return null;
    },
  };
}
