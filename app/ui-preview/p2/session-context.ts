import type { RouterContextProvider } from "react-router";
import type {
  AuthRuntime, AuthSession, AuthSessionResolution,
} from "../../auth/request-context";
import { initializeAuthContext } from "../../auth/session-context";
import { createP2PublicReadContext } from "./public-read-context";
import { previewActorId, type PreviewActor, type PreviewRawBaseline } from "./raw-baseline";

/**
 * B2 server-side session adapter. The preview controller selects a fixture actor
 * BEFORE request routing; request cookies, headers and account names never choose it.
 * It is not a Better Auth HTTP/provider emulator (that belongs to later P2 work).
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

/** One immutable selected actor for this request. A later request may select another. */
export function createP2AuthRuntime(baseline: PreviewRawBaseline, actor: PreviewActor): AuthRuntime {
  const selected = sessionForActor(baseline, actor);
  return {
    async getSession(headers: Headers): Promise<AuthSessionResolution> {
      void headers; // Session authority is selected by the preview controller, never by request headers.
      // Deliberately do not trust an incoming Cookie or return Set-Cookie.
      return { session: selected, headers: new Headers() };
    },
    async handle(request: Request): Promise<Response> {
      // Do not fabricate sign-in, sign-out, account security or OAuth success
      // until their original HTTP transport contracts are implemented in P2.
      throw new P2AuthEndpointNotConfiguredError(
        request.method, new URL(request.url).pathname,
      );
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
  const context = createP2PublicReadContext(baseline);
  const authHeaders = await initializeAuthContext(context, request, createP2AuthRuntime(baseline, actor));
  return { context, authHeaders };
}
