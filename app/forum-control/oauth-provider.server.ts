import { oauthProvider } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "../auth/lifecycle-transaction.server";
import { isBoundOwner } from "../authorization/owner";
import {
  ForumControlDenied, requireLiveSession, validForumControlScopes,
  type ForumControlBinding,
} from "./delegation-admission.server";
import { hashForumControlToken } from "./delegation-store.server";
import { forumControlScopes } from "./write-tool-contract";
import {
  oauthClient, oauthResource, oauthClientResource, oauthRefreshToken,
  oauthAccessToken, oauthConsent, oauthClientAssertion,
} from "../../db/schema";

export interface ForumControlOAuthConfig extends ForumControlBinding {
  readonly redirectUri: string;
  readonly loginPage: string;
  readonly consentPage: string;
}

/** Supplied only by a server-owned composition. No production activation or
 * request-derived configuration is present in Stage A. */
export interface ForumControlOAuthInvocation {
  readonly config: ForumControlOAuthConfig;
  readonly operation: "code" | "refresh" | "revoke" | "other";
  mintAttempted: boolean;
}

export const forumControlOAuthSchema = {
  oauthClient, oauthResource, oauthClientResource, oauthRefreshToken,
  oauthAccessToken, oauthConsent, oauthClientAssertion,
};

export function forumControlOAuthError(): APIError {
  return new APIError("BAD_REQUEST", { error: "invalid_grant" }, { "Cache-Control": "no-store" });
}

function absoluteUrl(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.href !== value ||
    (url.protocol !== "https:" && !(url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("Invalid forum control OAuth URL");
  }
  return url;
}

export function validateForumControlOAuthConfig(config: ForumControlOAuthConfig, baseURL: string): void {
  const issuer = absoluteUrl(config.issuer);
  const resource = absoluteUrl(config.resource);
  const redirect = absoluteUrl(config.redirectUri);
  const login = absoluteUrl(config.loginPage);
  const consent = absoluteUrl(config.consentPage);
  if (issuer.href !== new URL("/api/auth", baseURL).href || issuer.search ||
    resource.search || login.origin !== issuer.origin || consent.origin !== issuer.origin ||
    redirect.href === resource.href || !isBoundOwner(config.ownerUserId, config.ownerUserId) ||
    !config.clientId || !config.repositoryId ||
    config.clientId.trim() !== config.clientId || config.repositoryId.trim() !== config.repositoryId) {
    throw new Error("Invalid forum control OAuth binding");
  }
}

export function createForumControlOAuthProvider(connection: Pick<Client, "query">,
  lifecycle: AuthLifecycleTransaction, config: ForumControlOAuthConfig) {
  const scopes = [forumControlScopes.read, forumControlScopes.write, "offline_access"];
  return oauthProvider({
    scopes,
    loginPage: config.loginPage,
    consentPage: config.consentPage,
    grantTypes: ["authorization_code", "refresh_token"],
    disableJwtPlugin: true,
    storeTokens: { hash: hashForumControlToken },
    accessTokenExpiresIn: 300,
    refreshTokenReuseInterval: 0,
    allowDynamicClientRegistration: false,
    allowUnauthenticatedClientRegistration: false,
    allowPublicClientPrelogin: false,
    clientPrivileges: () => false,
    resourcePrivileges: () => false,
    enforcePerClientResources: true,
    resources: [{ identifier: config.resource, name: "Vico Forum control",
      accessTokenTtl: 300, allowedScopes: scopes }],
    postLogin: {
      page: config.consentPage,
      shouldRedirect: () => false,
      consentReferenceId: async ({ user, session, scopes: requested }) => {
        if (!user || !session || !isBoundOwner(user.id, config.ownerUserId) ||
          session.userId !== user.id || !validForumControlScopes(requested)) throw forumControlOAuthError();
        try {
          await lifecycle.runAdapterOperation(() => requireLiveSession(connection, user.id, session.id, false));
        } catch (error) {
          if (error instanceof ForumControlDenied) throw forumControlOAuthError();
          throw error;
        }
        // Native consent is scoped to the actual source session, not another
        // login for the same user. Code/refresh rows preserve this reference.
        return session.id;
      },
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The native verification adapter sees the validated authorization query.
 * Guard that persisted code even for internal post-login continuation paths.
 * Unrelated Better Auth verification values pass through unchanged.
 */
export async function admitForumControlAuthorizationCode(connection: Pick<Client, "query">,
  config: ForumControlOAuthConfig, data: unknown): Promise<void> {
  if (!isRecord(data) || typeof data.value !== "string") return;
  let value: unknown;
  try { value = JSON.parse(data.value); } catch { return; }
  if (!isRecord(value) || value.type !== "authorization_code") return;
  const query = value.query;
  const resources = value.resource;
  if (!isRecord(query) || query.client_id !== config.clientId ||
    query.redirect_uri !== config.redirectUri || query.response_type !== "code" ||
    query.code_challenge_method !== "S256" || typeof query.code_challenge !== "string" ||
    !query.code_challenge || typeof query.scope !== "string" ||
    !validForumControlScopes(query.scope.split(" ")) ||
    !Array.isArray(resources) || resources.length !== 1 || resources[0] !== config.resource ||
    typeof value.userId !== "string" || !isBoundOwner(value.userId, config.ownerUserId) ||
    typeof value.sessionId !== "string" || value.referenceId !== value.sessionId) {
    throw new ForumControlDenied();
  }
  await requireLiveSession(connection, value.userId, value.sessionId, true);
}

/** Consent mutations have their own session/client/resource checks, including
 * native updates of previously stored consent. No caller-supplied reference.
 */
export async function admitForumControlConsent(connection: Pick<Client, "query">,
  config: ForumControlOAuthConfig, data: unknown): Promise<void> {
  if (!isRecord(data) || typeof data.userId !== "string" ||
    !isBoundOwner(data.userId, config.ownerUserId) ||
    data.clientId !== config.clientId || typeof data.referenceId !== "string" ||
    !Array.isArray(data.resources) || data.resources.length !== 1 || data.resources[0] !== config.resource ||
    !Array.isArray(data.scopes) || !validForumControlScopes(data.scopes)) throw new ForumControlDenied();
  await requireLiveSession(connection, data.userId, data.referenceId, true);
}
