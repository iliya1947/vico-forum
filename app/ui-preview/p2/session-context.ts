import type { RouterContextProvider } from "react-router";
import {
  AccountSecurityError, type AuthRuntime, type AuthSession, type AuthSessionResolution,
} from "../../auth/request-context";
import { initializeAuthContext } from "../../auth/session-context";
import { createP2PublicReadContext } from "./public-read-context";
import { authorizationOwnerContext } from "../../authorization/request-context";
import { createP2AccountSecurityRuntime } from "./account-security";
import { createP2GoogleSocialAdapter, type P2GoogleScenario } from "./google-auth";
import { previewActorId, type PreviewActor, type PreviewRawBaseline } from "./raw-baseline";

/**
 * Preview controller selects a fixture actor before request routing; incoming
 * cookies and headers never choose it. B3 provides only canonical read/sign-out
 * HTTP semantics, not a second Better Auth/provider implementation.
 */
const previewActors: readonly PreviewActor[] = [
  "guest", "member", "moderator", "admin", "owner", "inactive",
];

export class P2AuthEndpointNotConfiguredError extends Error {
  constructor(method: string, pathname: string) {
    super("P2 Auth API not configured: " + method + " " + pathname);
    this.name = "P2AuthEndpointNotConfiguredError";
  }
}

function sessionForUser(baseline: PreviewRawBaseline, actorId: string): AuthSession | null {
  const account = baseline.users.find((user) => user.identity.id === actorId);
  if (!account || account.state.userId !== actorId) {
    throw new Error("P2 selected account identity is missing or mismatched");
  }
  // An existing signed Better Auth session is NOT sufficient for a deactivated
  // account in production; retain the raw record but reject authenticated identity.
  if (account.state.status !== "active") return null;

  const now = baseline.referenceTime.getTime();
  if (!Number.isFinite(now)) throw new Error("P2 invalid session reference time");
  const sessions = baseline.domains.sessions.filter((session) =>
    session.userId === actorId
    && session.issuedAt.getTime() <= now
    && session.expiresAt.getTime() > now);
  if (sessions.length > 1) {
    // A future multi-session fixture needs an explicit session selector.
    throw new Error("P2 ambiguous active session for selected actor");
  }
  const record = sessions[0];
  if (!record) return null;

  return {
    user: {
      ...account.identity,
      createdAt: new Date(account.identity.createdAt),
      updatedAt: new Date(account.identity.updatedAt),
    },
    session: {
      id: record.id,
      // Fixture-only server token. Never used as a cookie or provider credential.
      token: "p2-internal-only:" + record.id,
      userId: actorId,
      createdAt: new Date(record.issuedAt),
      updatedAt: new Date(record.issuedAt),
      expiresAt: new Date(record.expiresAt),
    },
  };
}

function sessionForActor(baseline: PreviewRawBaseline, actor: PreviewActor): AuthSession | null {
  if (!previewActors.includes(actor)) throw new Error("P2 unknown preview actor");
  const actorId = previewActorId(baseline, actor);
  return actorId === null ? null : sessionForUser(baseline, actorId);
}

const authResponseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
} as const;

/** Local fixture-only Auth endpoints; provider result is selected by trusted preview scenario. */
export function createP2AuthRuntime(
  baseline: PreviewRawBaseline, actor: PreviewActor, googleScenario: P2GoogleScenario = "existing",
): AuthRuntime {
  let activeSession = sessionForActor(baseline, actor);
  // Registrations are transient to this preview flow; published seed users and
  // authorship never change, and another instance starts from the same baseline.
  const registered = new Map<string, {
    readonly account: PreviewRawBaseline["users"][number];
    readonly session: AuthSession;
  }>();
  let registrationSequence = 0;
  // Never mutate the shared baseline or registered account records on password change.
  // Both the original Settings action and canonical Auth HTTP read this same overlay.
  const changedPasswords = new Map<string, string>();
  const passwordChangeAttempts: number[] = [];
  // Revoke only from this preview controller; raw fixture sessions stay immutable.
  const revokedSessionIds = new Set<string>();
  const current = () => activeSession;
  const transientGoogle = new Map<string, PreviewRawBaseline["users"][number]>();
  const google = createP2GoogleSocialAdapter(baseline, actor, googleScenario, (session) => {
    activeSession = session;
    if (!baseline.users.some((item) => item.identity.id === session.user.id)) {
      transientGoogle.set(session.user.id, {
        identity: session.user,
        state: { status: "active", userId: session.user.id },
        methods: ["google"], credentialPassword: null,
      });
    }
  });
  const security = createP2AccountSecurityRuntime(baseline, current, (userId) =>
    [...registered.values()].find((item) => item.account.identity.id === userId)?.account
      ?? transientGoogle.get(userId), {
    passwordFor: (userId) => {
      const account = baseline.users.find((item) => item.identity.id === userId)
        ?? [...registered.values()].find((item) => item.account.identity.id === userId)?.account;
      return changedPasswords.get(userId) ?? account?.credentialPassword ?? null;
    },
    storePassword: (userId, password) => { changedPasswords.set(userId, password); },
    admitAttempt: () => {
      // There is no trusted client-IP transport in preview: use a per-flow
      // 3-per-10-second window rather than trusting spoofable request headers.
      const now = Date.now();
      while (passwordChangeAttempts.length && passwordChangeAttempts[0]! <= now - 10_000) {
        passwordChangeAttempts.shift();
      }
      if (passwordChangeAttempts.length >= 3) {
        throw new AccountSecurityError("rate-limited",
          Math.max(1, Math.ceil((passwordChangeAttempts[0]! + 10_000 - now) / 1000)));
      }
      passwordChangeAttempts.push(now);
    },
  }, revokedSessionIds);

  return {
    security,
    async getSession(headers: Headers): Promise<AuthSessionResolution> {
      void headers; // Only the trusted preview actor is authoritative.
      return { session: current(), headers: new Headers() };
    },
    async handle(request: Request): Promise<Response> {
      const googleResponse = await google.handle(request);
      if (googleResponse) return googleResponse;
      const url = new URL(request.url);
      if (url.pathname === "/api/auth/get-session") {
        if (request.method !== "GET") {
          return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), {
            status: 405, headers: { ...authResponseHeaders, Allow: "GET" },
          });
        }
        // Better Auth 1.7.7 exposes { session, user } or JSON null; no wrapper.
        const session = current();
        return new Response(JSON.stringify(session), { headers: authResponseHeaders });
      }
      if (url.pathname === "/api/auth/change-password") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), {
            status: 405, headers: { ...authResponseHeaders, Allow: "POST" },
          });
        }
        const origin = request.headers.get("Origin");
        if (origin) {
          let valid = false;
          try { valid = new URL(origin).origin === url.origin; } catch { /* malformed */ }
          if (!valid) return new Response(JSON.stringify({ code: "INVALID_ORIGIN" }), {
            status: 403, headers: authResponseHeaders,
          });
        }
        if (request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
          return new Response(JSON.stringify({ code: "UNSUPPORTED_MEDIA_TYPE" }), {
            status: 415, headers: authResponseHeaders,
          });
        }
        let input: unknown;
        try { input = await request.json(); }
        catch { return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
          status: 400, headers: authResponseHeaders,
        }); }
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const body = input as Record<string, unknown>;
        if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string"
          || (body.revokeOtherSessions !== undefined && body.revokeOtherSessions !== false)) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const selected = current();
        if (!selected) return new Response(JSON.stringify({ code: "UNAUTHORIZED" }), {
          status: 401, headers: authResponseHeaders,
        });
        try {
          await security.changePassword(request.headers, {
            userId: selected.user.id, sessionId: selected.session.id,
          }, body.currentPassword, body.newPassword);
        } catch (error) {
          if (!(error instanceof AccountSecurityError)) throw error;
          const codes = {
            "invalid-password": ["INVALID_PASSWORD", 400],
            "no-password": ["CREDENTIAL_ACCOUNT_NOT_FOUND", 400],
            unauthenticated: ["UNAUTHORIZED", 401],
            "account-changed": ["UNAUTHORIZED", 401],
            "rate-limited": ["RATE_LIMITED", 429],
          } as const;
          if (!(error.code in codes)) throw error;
          const [code, status] = codes[error.code as keyof typeof codes];
          const headers = new Headers(authResponseHeaders);
          if (status === 429) {
            headers.set("Retry-After", String(error.retryAfterSeconds ?? 10));
            headers.set("X-Retry-After", String(error.retryAfterSeconds ?? 10));
          }
          return new Response(JSON.stringify({ code }), { status, headers });
        }
        // Pinned Better Auth 1.7.7 response when revokeOtherSessions=false:
        // password updated; existing current/other sessions preserved.
        return new Response(JSON.stringify({ token: null, user: selected.user }), {
          headers: authResponseHeaders,
        });
      }
      if (url.pathname === "/api/auth/sign-up/email") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), {
            status: 405, headers: { ...authResponseHeaders, Allow: "POST" },
          });
        }
        const origin = request.headers.get("Origin");
        if (origin) {
          let sameOrigin = false;
          try { sameOrigin = new URL(origin).origin === url.origin; } catch { /* invalid */ }
          if (!sameOrigin) return new Response(JSON.stringify({ code: "INVALID_ORIGIN" }), {
            status: 403, headers: authResponseHeaders,
          });
        }
        const media = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
        let input: unknown;
        try {
          if (media === "application/json") input = await request.json();
          else if (media === "application/x-www-form-urlencoded") {
            const form = new URLSearchParams(await request.text());
            input = {
              name: form.get("name"), email: form.get("email"), password: form.get("password"),
              ...(form.has("callbackURL") ? { callbackURL: form.get("callbackURL") } : {}),
            };
          } else return new Response(JSON.stringify({ code: "UNSUPPORTED_MEDIA_TYPE" }), {
            status: 415, headers: authResponseHeaders,
          });
        } catch {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const body = input as Record<string, unknown>;
        if (typeof body.name !== "string" || typeof body.email !== "string"
          || typeof body.password !== "string"
          || (body.callbackURL !== undefined && typeof body.callbackURL !== "string")
          || (body.rememberMe !== undefined && typeof body.rememberMe !== "boolean")) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const name = body.name.trim();
        if (!name || name.length > 100) {
          return new Response(JSON.stringify({ code: "INVALID_NAME" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
          return new Response(JSON.stringify({ code: "INVALID_EMAIL" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (body.password.length < 8 || body.password.length > 128) {
          return new Response(JSON.stringify({ code: "INVALID_PASSWORD" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (body.callbackURL !== undefined && (!body.callbackURL.startsWith("/")
          || body.callbackURL.startsWith("//") || body.callbackURL.includes("\\"))) {
          return new Response(JSON.stringify({ code: "INVALID_CALLBACK_URL" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const email = body.email.toLowerCase();
        if (baseline.users.some((user) => user.identity.email.toLowerCase() === email)
          || registered.has(email)) {
          return new Response(JSON.stringify({
            code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists",
          }), { status: 422, headers: authResponseHeaders });
        }
        // This is the current server-side creation gate, not a UI flag. Do not
        // cache it at runtime creation or default an invalid setting to open.
        const settings = baseline.domains.registrationSettings;
        if (typeof settings.emailRegistrationEnabled !== "boolean"
          || !Number.isSafeInteger(settings.version) || settings.version < 1) {
          throw new Error("P2 registration settings are missing or invalid");
        }
        if (!settings.emailRegistrationEnabled) {
          return new Response(JSON.stringify({
            code: "vico_email_registration_closed", message: "New email registrations are closed.",
          }), { status: 403, headers: authResponseHeaders });
        }
        // The pinned Better Auth 1.7.7 sign-up contract returns {token,user}
        // with an automatically established session (verification not required).
        // Generated identities exist ONLY in this preview flow's transient map.
        const number = ++registrationSequence;
        const userId = "preview-registered-" + number;
        if (baseline.users.some((entry) => entry.identity.id === userId)) {
          throw new Error("P2 generated user ID collides with the raw baseline");
        }
        const now = new Date(baseline.referenceTime);
        const user = {
          id: userId, name, email, emailVerified: false, image: null,
          createdAt: new Date(now), updatedAt: new Date(now),
        };
        const sessionId = "preview-registered-session-" + number;
        const session: AuthSession = {
          user,
          session: {
            id: sessionId, token: "p2-internal-only:" + sessionId, userId,
            createdAt: new Date(now), updatedAt: new Date(now),
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        };
        registered.set(email, {
          account: { identity: user, state: { status: "active", userId },
            methods: ["password"], credentialPassword: body.password },
          session,
        });
        activeSession = session;
        const headers = new Headers(authResponseHeaders);
        headers.append("Set-Cookie", "better-auth.session_token="
          + encodeURIComponent(session.session.token) + "; Path=/; HttpOnly; SameSite=Lax"
          + (url.protocol === "https:" ? "; Secure" : ""));
        return new Response(JSON.stringify({ token: session.session.token, user }), { headers });
      }
      if (url.pathname === "/api/auth/sign-in/email") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), {
            status: 405, headers: { ...authResponseHeaders, Allow: "POST" },
          });
        }
        const origin = request.headers.get("Origin");
        if (origin) {
          let valid = false;
          try { valid = new URL(origin).origin === url.origin; } catch { /* invalid */ }
          if (!valid) {
            return new Response(JSON.stringify({ code: "INVALID_ORIGIN" }), {
              status: 403, headers: authResponseHeaders,
            });
          }
        }
        // The pinned Better Auth client sends JSON; original endpoint also accepts
        // URL-encoded form data. Never accept a client-provided actor/user ID.
        const media = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
        let raw: unknown;
        try {
          if (media === "application/json") raw = await request.json();
          else if (media === "application/x-www-form-urlencoded") {
            const params = new URLSearchParams(await request.text());
            raw = {
              email: params.get("email"), password: params.get("password"),
              ...(params.has("callbackURL") ? { callbackURL: params.get("callbackURL") } : {}),
            };
          } else {
            return new Response(JSON.stringify({ code: "UNSUPPORTED_MEDIA_TYPE" }), {
              status: 415, headers: authResponseHeaders,
            });
          }
        } catch {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const body = raw as Record<string, unknown>;
        if (typeof body.email !== "string" || typeof body.password !== "string"
          || (body.callbackURL !== undefined && typeof body.callbackURL !== "string")
          || (body.rememberMe !== undefined && typeof body.rememberMe !== "boolean")) {
          return new Response(JSON.stringify({ code: "INVALID_BODY" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
          return new Response(JSON.stringify({ code: "INVALID_EMAIL" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        // Only a local callback path may become an HTTP Location. Real provider,
        // cross-origin and scheme-relative callbacks are deliberately out of B4.
        if (body.callbackURL !== undefined && (!body.callbackURL.startsWith("/")
          || body.callbackURL.startsWith("//") || body.callbackURL.includes("\\"))) {
          return new Response(JSON.stringify({ code: "INVALID_CALLBACK_URL" }), {
            status: 400, headers: authResponseHeaders,
          });
        }
        const normalizedEmail = body.email.toLowerCase();
        const created = registered.get(normalizedEmail);
        const account = baseline.users.find((user) =>
          user.identity.email.toLowerCase() === normalizedEmail) ?? created?.account;
        if (!account || !account.methods.includes("password")
          || (changedPasswords.get(account.identity.id) ?? account.credentialPassword) !== body.password
          || account.state.status !== "active") {
          return new Response(JSON.stringify({
            code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password",
          }), { status: 401, headers: authResponseHeaders });
        }
        const resolved = created?.account === account
          ? created.session : sessionForUser(baseline, account.identity.id);
        if (!resolved) {
          return new Response(JSON.stringify({ code: "FAILED_TO_CREATE_SESSION" }), {
            status: 401, headers: authResponseHeaders,
          });
        }
        activeSession = resolved;
        const headers = new Headers(authResponseHeaders);
        headers.append("Set-Cookie", "better-auth.session_token="
          + encodeURIComponent(resolved.session.token) + "; Path=/; HttpOnly; SameSite=Lax"
          + (url.protocol === "https:" ? "; Secure" : ""));
        if (body.callbackURL) headers.set("Location", body.callbackURL);
        return new Response(JSON.stringify({
          redirect: Boolean(body.callbackURL),
          token: resolved.session.token,
          ...(body.callbackURL ? { url: body.callbackURL } : {}),
          user: resolved.user,
        }), { headers });
      }
      if (url.pathname === "/api/auth/sign-out") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), {
            status: 405, headers: { ...authResponseHeaders, Allow: "POST" },
          });
        }
        // The real Better Auth endpoint checks same-origin requests. Never let a
        // foreign Origin trigger a local actor transition.
        const origin = request.headers.get("Origin");
        if (origin) {
          let sameOrigin = false;
          try { sameOrigin = new URL(origin).origin === url.origin; } catch { /* invalid */ }
          if (!sameOrigin) {
            return new Response(JSON.stringify({ code: "INVALID_ORIGIN" }), {
              status: 403, headers: authResponseHeaders,
            });
          }
        }
        activeSession = null;
        // Match the pinned Better Auth core sign-out envelope and expired cookie
        // names. The preview does not issue or accept any authentication token.
        const headers = new Headers(authResponseHeaders);
        for (const name of ["session_token", "session_data", "dont_remember"]) {
          headers.append("Set-Cookie",
            "better-auth." + name + "=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
              + (url.protocol === "https:" ? "; Secure" : ""));
        }
        return new Response(JSON.stringify({ success: true }), { headers });
      }
      throw new P2AuthEndpointNotConfiguredError(request.method, url.pathname);
    },
  };
}

export interface P2SessionReadContext {
  readonly context: RouterContextProvider;
  readonly authHeaders: Headers;
}

/**
 * Reuse the original pre-routing Worker initialization with an actual typed
 * AuthRuntime and the existing raw public read services. No extra role claim,
 * Owner binding, endpoint transport or privilege context is supplied here.
 */
export async function createP2SessionReadContext(
  baseline: PreviewRawBaseline,
  actor: PreviewActor,
  request: Request,
): Promise<P2SessionReadContext> {
  return createP2AuthSessionFlow(baseline, actor).createRequestContext(request);
}

/**
 * A controller-owned flow reuses the same AuthRuntime across fresh requests.
 * Sign-out persists as Guest within that flow; a new preview instance resets it.
 */
export function createP2AuthSessionFlow(
  baseline: PreviewRawBaseline, actor: PreviewActor, googleScenario: P2GoogleScenario = "existing",
) {
  const runtime = createP2AuthRuntime(baseline, actor, googleScenario);
  return {
    runtime,
    async createRequestContext(request: Request): Promise<P2SessionReadContext> {
      const context = createP2PublicReadContext(baseline);
      context.set(authorizationOwnerContext, baseline.ownerUserId);
      const authHeaders = await initializeAuthContext(context, request, runtime);
      return { context, authHeaders };
    },
  };
}
