import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import {
  AccountSecurityError,
  AuthSessionUnavailableError,
  type AccountSecurityIdentity,
  type AccountSecuritySession,
  type AuthRuntime,
  type AuthSession,
} from "./request-context";
import { createRegistrationAdmission } from "./registration-admission";
import {
  account,
  betterAuthUserAdditionalFields,
  rateLimit,
  session,
  user,
  verification,
} from "../../db/schema";
import { bestEffortDiscardClient, createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "../../db/postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../localization/persistent-registry";

export interface BetterAuthEnvironment {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
}

export const betterAuthSchema = { user, session, account, verification, rateLimit };
export const betterAuthEmailPasswordOptions = {
  enabled: true,
  requireEmailVerification: false,
  minPasswordLength: 8,
  maxPasswordLength: 128,
} as const;

export const betterAuthRequestHooks: NonNullable<BetterAuthOptions["hooks"]> = {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path === "/link-social") {
      // The endpoint reuses this request-local session when it creates OAuth state.
      const current = await getAuthoritativeSessionFromCtx(ctx);
      if (!current) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
      const expectedUserId = ctx.headers?.get("x-vico-link-user");
      if (!expectedUserId || expectedUserId !== current.user.id) {
        throw new APIError("CONFLICT", { code: "VICO_LINK_IDENTITY_CHANGED", message: "Account changed. Refresh before connecting Google." });
      }
      return;
    }
    if (ctx.path !== "/sign-up/email") return;
    const suppliedName = ctx.body?.name;
    if (typeof suppliedName !== "string") {
      throw new APIError("BAD_REQUEST", { message: "Invalid display name" });
    }
    const name = suppliedName.trim();
    if (!name || name.length > 100) {
      throw new APIError("BAD_REQUEST", { message: "Invalid display name" });
    }
    return { context: { ...ctx, body: { ...ctx.body, name } } };
  }),
};

export const betterAuthRateLimitOptions = {
  enabled: true,
  storage: "database" as const,
  modelName: "rateLimit",
};
export const betterAuthIpAddressOptions = {
  // Cloudflare removes spoofed values and supplies this header at the Worker boundary.
  ipAddressHeaders: ["cf-connecting-ip"],
};
export const betterAuthAdvancedOptions = { ipAddress: betterAuthIpAddressOptions };

export function betterAuthOptions(database: NodePgDatabase, env: BetterAuthEnvironment): BetterAuthOptions {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg" as const,
      schema: betterAuthSchema,
    }),
    user: { additionalFields: betterAuthUserAdditionalFields, validateUserInfo: createRegistrationAdmission(database) },
    account: { accountLinking: { disableImplicitLinking: true } },
    emailAndPassword: betterAuthEmailPasswordOptions,
    hooks: betterAuthRequestHooks,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    rateLimit: betterAuthRateLimitOptions,
    advanced: betterAuthAdvancedOptions,
  };
}

function createAuth(
  database: NodePgDatabase,
  env: BetterAuthEnvironment,
  onDatabaseError?: (error: unknown) => void,
  onAdmissionError?: (error: unknown) => void,
) {
  const options = betterAuthOptions(database, env);
  if (onAdmissionError && options.user?.validateUserInfo) {
    const validateUserInfo = options.user.validateUserInfo;
    options.user = {
      ...options.user,
      validateUserInfo: async (data, ctx) => {
        try {
          return await validateUserInfo(data, ctx);
        } catch (error) {
          // Better Auth 1.7.7 converts any thrown validation error to a cause-less 403.
          // Preserve the actual registration-policy failure for this one auth request.
          onAdmissionError(error);
          throw error;
        }
      },
    };
  }
  if (onDatabaseError) {
    const factory = options.database as ReturnType<typeof drizzleAdapter>;
    options.database = (authOptions: BetterAuthOptions) => new Proxy(factory(authOptions), {
      get(adapter, property, receiver) {
        const value = Reflect.get(adapter, property, receiver);
        if (typeof value !== "function") return value;
        return async (...args: unknown[]) => {
          try { return await Reflect.apply(value, adapter, args); }
          catch (error) { onDatabaseError(error); throw error; }
        };
      },
    });
  }
  return betterAuth(options);
}

function sessionStorageUnavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function betterAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const body = (error as { body?: { code?: unknown } }).body;
  return typeof body?.code === "string" ? body.code : null;
}

function translateSecurityError(error: unknown): never {
  if (error instanceof AccountSecurityError) throw error;
  if (sessionStorageUnavailable(error)) throw new AccountSecurityError("unavailable");
  switch (betterAuthErrorCode(error)) {
    case "SESSION_NOT_FRESH": throw new AccountSecurityError("not-fresh");
    case "INVALID_PASSWORD": throw new AccountSecurityError("invalid-password");
    case "CREDENTIAL_ACCOUNT_NOT_FOUND": throw new AccountSecurityError("no-password");
  }
  if (error instanceof APIError && error.status === "UNAUTHORIZED") {
    throw new AccountSecurityError("unauthenticated");
  }
  throw error;
}

function safeDeviceLabel(agent: unknown): string {
  if (typeof agent !== "string") return "Unknown device";
  const label = Array.from(agent, character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("").trim().slice(0, 160);
  return label || "Unknown device";
}

async function hasCredentialPassword(database: NodePgDatabase, userId: string): Promise<boolean> {
  const rows = await database.select({ id: account.id }).from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential"),
      isNotNull(account.password), ne(account.password, "")))
    .limit(1);
  return rows.length > 0;
}

/** A request capability: every operation owns and closes its Hyperdrive PostgreSQL client. */
export function createHyperdriveAuthRuntime(
  connectionString: string,
  env: BetterAuthEnvironment,
  createClient: (connectionString: string) => Client = createWebClient,
): AuthRuntime {
  async function useAuth<T>(
    operation: (auth: ReturnType<typeof createAuth>, database: NodePgDatabase) => Promise<T>,
    preserveDatabaseError = false,
    onAdmissionError?: (error: unknown) => void,
  ): Promise<T> {
    const client = createClient(connectionString);
    let databaseError: unknown;
    try {
      await client.connect();
      const database = drizzle(client);
      return await operation(createAuth(database, env,
        preserveDatabaseError ? (error) => { databaseError ??= error; } : undefined,
        onAdmissionError), database);
    } catch (error) {
      // Better Auth 1.7.7 replaces session-query failures with a cause-less APIError.
      // Retain the adapter failure for classification; never infer availability from HTTP 500.
      throw databaseError ?? error;
    } finally {
      bestEffortDiscardClient(client);
    }
  }

  async function securityCall<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) { return translateSecurityError(error); }
  }

  async function verifyIdentity(auth: ReturnType<typeof createAuth>,
    headers: Headers, identity: AccountSecurityIdentity) {
    const current = await auth.api.getSession({ headers });
    if (!current) throw new AccountSecurityError("unauthenticated");
    if (current.user.id !== identity.userId || current.session.id !== identity.sessionId) {
      throw new AccountSecurityError("account-changed");
    }
    return current;
  }

  return {
    security: {
      read: (headers, identity) => securityCall(() => useAuth(async (auth, database) => {
        const current = await verifyIdentity(auth, headers, identity);
        const accounts = await auth.api.listUserAccounts({ headers });
        const hasPassword = await hasCredentialPassword(database, current.user.id);
        const linkedMethods = [
          ...(hasPassword ? ["password" as const] : []),
          ...(accounts.some(link => link.providerId === "google") ? ["google" as const] : []),
        ];
        let sessionAccess: "ready" | "not-fresh" = "ready";
        let sessions: AccountSecuritySession[] = [];
        try {
          const owned = await auth.api.listSessions({ headers });
          sessions = owned.map(session => ({
            id: session.id,
            createdAt: new Date(session.createdAt).toISOString(),
            expiresAt: new Date(session.expiresAt).toISOString(),
            current: session.id === current.session.id,
            deviceLabel: safeDeviceLabel(session.userAgent),
          }));
        } catch (error) {
          if (betterAuthErrorCode(error) !== "SESSION_NOT_FRESH") throw error;
          sessionAccess = "not-fresh";
        }
        return { linkedMethods, hasPassword, sessionAccess, sessions };
      }, true)),
      changePassword: (headers, identity, currentPassword, newPassword) =>
        securityCall(() => useAuth(async (auth, database) => {
          const current = await verifyIdentity(auth, headers, identity);
          if (!await hasCredentialPassword(database, current.user.id)) {
            throw new AccountSecurityError("no-password");
          }
          await auth.api.changePassword({
            headers, body: { currentPassword, newPassword, revokeOtherSessions: false },
          });
        }, true)),
      revokeOneOther: (headers, identity, sessionId) =>
        securityCall(() => useAuth(async (auth) => {
          const current = await verifyIdentity(auth, headers, identity);
          if (sessionId === current.session.id) throw new AccountSecurityError("current-session");
          // listSessions is fresh-session gated. Keep Better Auth's freshness policy.
          const sessions = await auth.api.listSessions({ headers });
          const target = sessions.find(session => session.id === sessionId);
          if (!target) throw new AccountSecurityError("session-not-found");
          // Only a server-resolved, same-user token is sent to Better Auth.
          await auth.api.revokeSession({ headers, body: { token: target.token } });
        }, true)),
      revokeAllOthers: (headers, identity) =>
        securityCall(() => useAuth(async (auth) => {
          await verifyIdentity(auth, headers, identity);
          await auth.api.revokeOtherSessions({ headers });
        }, true)),
    },
    async getSession(headers) {
      try {
        return await useAuth(async (auth) => {
          const result = await auth.api.getSession({ headers, returnHeaders: true });
          return { session: result.response as AuthSession | null, headers: result.headers ?? new Headers() };
        }, true);
      } catch (error) {
        if (sessionStorageUnavailable(error)) throw new AuthSessionUnavailableError({ cause: error });
        throw error;
      }
    },
    handle: (request) => {
      const admission = { failure: undefined as { error: unknown } | undefined };
      return useAuth(async (auth) => {
        const response = await auth.handler(request);
        if (!admission.failure) return response;
        if (sessionStorageUnavailable(admission.failure.error)) {
          return new Response("Service unavailable. Please try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        // Missing policy singleton, unexpected schema/configuration and programming errors
        // must follow the normal unexpected-error path, not Better Auth's validation_failed 403.
        throw admission.failure.error;
      }, false, (error) => { admission.failure ??= { error }; });
    },
  };
}
