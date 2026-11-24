import type { RouterContextProvider } from "react-router";
import type {
  AuthRuntime, AuthSession, AuthSessionResolution,
} from "../../auth/request-context";
import { initializeAuthContext } from "../../auth/session-context";
import { createP2PublicReadContext } from "./public-read-context";
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

function sessionForActor(baseline: PreviewRawBaseline, actor: PreviewActor): AuthSession | null {
  if (!previewActors.includes(actor)) throw new Error("P2 unknown preview actor");
  const actorId = previewActorId(baseline, actor);
  if (actorId === null) return null;

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

const authResponseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
} as const;

/** Normal Browser/Beter Auth session endpoints; no provider or credential transport. */
export function createP2AuthRuntime(baseline: PreviewRawBaseline, actor: PreviewActor): AuthRuntime {
  const selected = sessionForActor(baseline, actor);
  let signedOut = false;
  const current = () => signedOut ? null : selected;

  return {
    async getSession(headers: Headers): Promise<AuthSessionResolution> {
      void headers; // Only the trusted preview actor is authoritative.
      return { session: current(), headers: new Headers() };
    },
    async handle(request: Request): Promise<Response> {
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
        signedOut = true;
        // Match the pinned Better Auth core sign-out envelope and expired cookie
        // names. The preview does not issue or accept any authentication token.
        const headers = new Headers(authResponseHeaders);
        for (const name of ["session_token", "session_data", "dont_remember"]) {
          headers.append("Set-Cookie",
            "better-auth." + name + "=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
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
export function createP2AuthSessionFlow(baseline: PreviewRawBaseline, actor: PreviewActor) {
  const runtime = createP2AuthRuntime(baseline, actor);
  return {
    runtime,
    async createRequestContext(request: Request): Promise<P2SessionReadContext> {
      const context = createP2PublicReadContext(baseline);
      const authHeaders = await initializeAuthContext(context, request, runtime);
      return { context, authHeaders };
    },
  };
}
