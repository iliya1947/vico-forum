import type { CredentialTransition } from "./credential-lifecycle.server";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx, getSessionFromCtx, isAPIError } from "better-auth/api";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";
import { SessionDeletionEvidence } from "./session-deletion-evidence";
import { AuthCreationEvidence } from "./auth-creation-evidence";
import {
  AccountSecurityError,
  AuthSessionUnavailableError,
  type AccountSecurityIdentity,
  type AccountSecuritySession, type AccountSecuritySnapshot,
  type AuthRuntime,
  type AuthSession,
} from "./request-context";
import { createRegistrationAdmission, readRegistrationFlags } from "./registration-admission";
import { safeDeviceLabel } from "./session-label";
import { guardBetterAuthSessionWrites, InactiveSessionWriteError } from "./session-write-guard";
import { AuthLifecycleTransaction, AuthLifecycleTransactionError } from "./lifecycle-transaction.server";
import { authLifecyclePlugin, type AuthLifecycleDependencies } from "./lifecycle-plugin.server";
import { SignupVerificationEvidence } from "./signup-verification-evidence.server";
import { registrationChallengeConfig } from "./registration-challenge.server";
import type { RegistrationChallengeAdmission } from "./registration-challenge-admission.server";
import { isGuestEmailVerificationRequest } from "./session-context";
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
import { AccountStateUnavailableError, AccountStateUnexpectedError, readAccountState } from "../../db/account-state";

export interface BetterAuthEnvironment {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly AUTH_REGISTRATION_CHALLENGE_MODE?: string;
}

export const betterAuthSchema = { user, session, account, verification, rateLimit };

/** Server-owned request collector; no arbitrary client-selected facts. */
export interface AuthCreationObserver {
  capture(fact: AuthTransitionFact, occurredAt?: Date): void;
  trustedActorFor(userId: string): string | null;
  recordGap?(count: number): void;
}
export const betterAuthEmailPasswordOptions = {
  enabled: true,
  requireEmailVerification: true,
  autoSignIn: false,
  minPasswordLength: 8,
  maxPasswordLength: 128,
} as const;

// The authenticated core endpoints shipped by Better Auth 1.7.7.
// Guest sign-in/callback flows remain I3, while /sign-out must remain usable
// by an inactive account so its own retained session can be removed.
const actorProtectedAuthPaths = new Set([
  "/get-session", "/list-sessions", "/revoke-session", "/revoke-sessions",
  "/revoke-other-sessions", "/list-accounts", "/link-social", "/unlink-account",
  "/get-access-token", "/refresh-token", "/account-info", "/verify-password",
  "/update-session", "/update-user", "/change-password", "/delete-user",
  "/delete-user/callback", "/change-email",
]);

export function createBetterAuthRequestHooks(
  database: NodePgDatabase,
  onActorStateError?: (error: unknown) => void,
  preRoutingSessionLookup = false,
  rememberOwnSignOutToken?: (token: string) => void,
): NonNullable<BetterAuthOptions["hooks"]> {
  return {
    before: createAuthMiddleware(async (ctx) => {
      // The pinned sign-out endpoint deletes its verified signed-cookie token,
      // even when the persisted actor is inactive. Authorize that one cleanup
      // token only; no other endpoint or direct adapter delete inherits it.
      if (ctx.path === "/sign-out" && rememberOwnSignOutToken) {
        const token = await ctx.getSignedCookie(
          ctx.context.authCookies.sessionToken.name, ctx.context.secret,
        );
        if (typeof token === "string" && token) rememberOwnSignOutToken(token);
      }
      let current: Awaited<ReturnType<typeof getAuthoritativeSessionFromCtx>> = null;
      // Pathless server-only methods are keyed by operationId in Better Auth's
      // common direct-API dispatcher (e.g. setPassword), not a routed URL.
      if ((ctx as typeof ctx & { operationId?: string }).operationId === "setPassword") {
        throw new APIError("UNAUTHORIZED", { message: "Password creation requires confirmation" },
          { "Cache-Control": "private, no-store" });
      }
      const protectedActorOperation = ctx.path !== undefined && actorProtectedAuthPaths.has(ctx.path);
      if (protectedActorOperation && ctx.headers
        && !(preRoutingSessionLookup && ctx.path === "/get-session")) {
        // Also runs for auth.api.* calls; direct endpoint dispatch shares this
        // pinned Better Auth hook with the canonical HTTP handler.
        // All preliminary actor admission must be read-only, including paths
        // other than /get-session: a due inactive session cannot be refreshed.
        ctx.context.session = null;
        current = await getSessionFromCtx(ctx, { disableCookieCache: true, disableRefresh: true });
        if (current) {
          try {
            const connection = (database as NodePgDatabase & { $client: Client }).$client;
            const state = await readAccountState(connection, current.user.id);
            if (state.status !== "active") {
              ctx.context.session = null;
              throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, { "Cache-Control": "private, no-store" });
            }
            // Reuse this authoritative read for ordinary operations. If the
            // active session is due, let the canonical endpoint perform its
            // original refresh and Set-Cookie after account-state admission.
            // This matches Better Auth 1.7.7's expiresIn/updateAge threshold.
            const { expiresIn, updateAge } = ctx.context.sessionConfig;
            const refreshDueAt = new Date(current.session.expiresAt).getTime()
              - expiresIn * 1000 + updateAge * 1000;
            if (ctx.path !== "/get-session" && refreshDueAt <= Date.now()) {
              ctx.context.session = null;
            }
          } catch (error) {
            if (!(error instanceof APIError)) onActorStateError?.(error);
            throw error;
          }
        }
      }
      if (ctx.path === "/link-social") {
        // Retain the existing current-session/stale-identity check before OAuth state.
        if (!current) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
        const expectedUserId = ctx.headers?.get("x-vico-link-user");
        if (!expectedUserId || expectedUserId !== current.user.id) {
          throw new APIError("CONFLICT", {
            code: "VICO_LINK_IDENTITY_CHANGED", message: "Account changed. Refresh before connecting Google.",
          });
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
}

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

type CanonicalBetterAuthOptions = Omit<BetterAuthOptions, "plugins"> & {
  plugins: [ReturnType<typeof authLifecyclePlugin>];
};

export function betterAuthOptions(
  database: NodePgDatabase & { $client: Client }, env: BetterAuthEnvironment,
  onActorStateError?: (error: unknown) => void,
  preRoutingSessionLookup = false,
  lifecycle = new AuthLifecycleTransaction(database.$client),
  dependencies?: AuthLifecycleDependencies,
): CanonicalBetterAuthOptions {
  // Better Auth is created per request in the Worker runtime; a consumed,
  // signed token never broadens the inactive exception to other deletions.
  const ownSignOutTokens = new Set<string>();
  const signupEvidence = new SignupVerificationEvidence();
  const registrationAdmission = createRegistrationAdmission(database);
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    verification: { storeIdentifier: { default: "plain", overrides: { "reset-password:": "hashed" } } },
    database: guardBetterAuthSessionWrites(database, drizzleAdapter(database, {
      provider: "pg" as const,
      schema: betterAuthSchema,
    }), onActorStateError, token => ownSignOutTokens.delete(token), lifecycle),
    // This gate belongs to the canonical Better Auth configuration, not to
    // optional SA-02 observers or only the HTTP request handler.
    databaseHooks: {
      session: { create: { before: async pending => {
        try {
          const connection = (database as NodePgDatabase & { $client: Client }).$client;
          const state = await readAccountState(connection, pending.userId);
          if (state.status !== "active") {
            throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, { "Cache-Control": "private, no-store" });
          }
        } catch (error) {
          if (!(error instanceof APIError)) onActorStateError?.(error);
          throw error;
        }
      } } },
    },
    user: {
      additionalFields: betterAuthUserAdditionalFields,
      validateUserInfo: async (data, context) => {
        try {
          // The policy reader is raw Drizzle work, not a native adapter call.
          // Track it in the same transaction owner so a native synthetic
          // duplicate acknowledgement cannot swallow a failed SQL read and
          // cause COMMIT to be attempted against a still-blocked connection.
          let result = await lifecycle.runAdapterOperation(async () => registrationAdmission(data, context));
          if (!result && data.source.action === "create-user") {
            const registration = (context.context as unknown as { vicoRegistrationAdmission: RegistrationChallengeAdmission }).vicoRegistrationAdmission;
            result = await registration.admit(data.source.method === "email-password" ? "email" : "google", data.user.email ?? "");
          }
          signupEvidence.noteAdmission(result);
          return result;
        } catch (error) {
          signupEvidence.noteAdmissionFailure(error);
          throw error;
        }
      },
    },
    account: { accountLinking: { disableImplicitLinking: true } },
    emailAndPassword: betterAuthEmailPasswordOptions,
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      // Native calls this only after linkAccount, inside its signup transaction.
      // Record actual creation; the outer endpoint sends only after COMMIT.
      sendVerificationEmail: async ({ user }) => { signupEvidence.noteCreated(user); },
    },
    // The native logger can print raw addresses and adapter errors. Keep
    // structured Vico attempt/fact reporting instead of auth payload logs.
    logger: { disabled: true },
    // Better Call 1.4.0 logs unhandled non-APIError exceptions independently
    // of Better Auth's logger. Its onError catch converts a thrown APIError
    // to a response. Preserve existing API errors; never log raw SQL/params.
    onAPIError: { onError: error => {
      if (!isAPIError(error)) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Authentication failed" });
    } },
    plugins: [authLifecyclePlugin(database.$client, lifecycle, env.BETTER_AUTH_SECRET,
      signupEvidence, error => error instanceof AccountStateUnavailableError || sessionStorageUnavailable(error),
      async () => (await readRegistrationFlags(database)).emailRegistrationEnabled,
      { ...dependencies, registrationChallenge: dependencies?.registrationChallenge ?? registrationChallengeConfig(env.AUTH_REGISTRATION_CHALLENGE_MODE),
        googleEnabled: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET },
      onActorStateError)],
    hooks: createBetterAuthRequestHooks(database, onActorStateError, preRoutingSessionLookup,
      token => { ownSignOutTokens.add(token); }),
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

export function createAuth(
  database: NodePgDatabase & { $client: Client },
  env: BetterAuthEnvironment,
  onDatabaseError?: (error: unknown) => void,
  onAdmissionError?: (error: unknown) => void,
  onAdmissionDenied?: () => void,
  onCreatedFact?: AuthCreationObserver,
  onDeleted?: SessionDeletionEvidence,
  onCreatedProof?: AuthCreationEvidence,
  onActorStateError?: (error: unknown) => void,
  preRoutingSessionLookup = false,
  lifecycle = new AuthLifecycleTransaction(database.$client,
    count => { try { onCreatedFact?.recordGap?.(count); } catch { /* best effort */ } }),
  dependencies?: AuthLifecycleDependencies,
) {
  const options = betterAuthOptions(database, env, onActorStateError, preRoutingSessionLookup, lifecycle, {
    ...dependencies,
    ...(onCreatedFact ? {
      observeAccount: transition => {
        const actorUserId = transition.userId;
        const at = new Date();
        if (transition.kind === "unlink") {
          onCreatedFact.capture({ kind: "auth.methodUnlinked", userId: actorUserId, actorUserId,
            accountId: transition.accountId, method: "google" }, at);
        } else {
          onCreatedFact.capture({ kind: "auth.emailChanged", userId: actorUserId, actorUserId,
            operationId: transition.generation }, at);
          for (const sessionId of transition.revokedSessionIds) onCreatedFact.capture({
            kind: "auth.sessionDeleted", userId: actorUserId, actorUserId, sessionId, reason: "email-change",
          }, at);
        }
      },
      observeVerified: (fact: Extract<AuthTransitionFact, {kind:"auth.emailVerified"}>, at: Date) => onCreatedFact.capture(fact, at),
      observeCredential: (transition: CredentialTransition) => {
        const { userId, accountId, generation, purpose, revokedSessionIds } = transition;
        const occurredAt = new Date();
        const actorUserId = purpose === "password-create" ? userId : null;
        if (purpose === "password-create") {
          onCreatedFact.capture({ kind: "auth.methodLinked", userId, accountId,
            method: "password", linkContext: "password-create", actorUserId }, occurredAt);
        } else {
          onCreatedFact.capture({ kind: "auth.passwordChanged", userId, accountId,
            operationId: generation, context: "reset", actorUserId }, occurredAt);
        }
        for (const sessionId of revokedSessionIds) {
          onCreatedFact.capture({ kind: "auth.sessionDeleted", userId, sessionId,
            reason: purpose, actorUserId }, occurredAt);
        }
      },
    } : {}),
  });
  if (onCreatedFact) {
    // A new user's hook is queued before its credential/Google account hook.
    // This is instance-local to the canonical Better Auth operation.
    const createdUsers = new Set<string>();
    function observe(effect: () => void): void {
      try {
        lifecycle.stageEvidence(effect);
      } catch { try { onCreatedFact?.recordGap?.(1); } catch { /* best effort */ } }
    }
    function emit(fact: AuthTransitionFact, occurredAt = new Date()): void {
      try { onCreatedFact?.capture(fact, occurredAt); onCreatedProof?.noteHook(fact); }
      catch { try { onCreatedFact?.recordGap?.(1); } catch { /* best effort */ } }
    }
    function trustedActor(userId: string): string | null {
      try {
        // An observer cannot elevate the actor to a different account.
        return onCreatedFact?.trustedActorFor(userId) === userId ? userId : null;
      } catch { return null; }
    }
    options.databaseHooks = {
      ...options.databaseHooks,
      user: { create: { after: async created => {
        if (typeof created.id !== "string") return;
        const userId = created.id, occurredAt = new Date();
        observe(() => {
          createdUsers.add(userId);
          emit({ kind: "account.created", userId }, occurredAt);
        });
      } } },
      account: {
        create: { after: async created => {
          const userId = created.userId, accountId = created.id;
          const method = created.providerId === "credential" ? "password"
            : created.providerId === "google" ? "google" : null;
          if (!method || typeof userId !== "string" || typeof accountId !== "string") return;
          const actor = trustedActor(userId);
          const occurredAt = new Date();
          observe(() => emit({
            kind: "auth.methodLinked", userId, accountId, method,
            linkContext: createdUsers.has(userId) ? "registration"
              : actor && method === "google" ? "explicit-link" : "unknown",
            actorUserId: actor,
          }, occurredAt));
        } },
        update: { after: async (updated, context) => {
          // Better Auth 1.7.7 /change-password uses updateAccount(account.id),
          // unlike /reset-password's updatePassword/updateMany path.
          // Only a returned, persisted credential row from this exact route
          // proves a password mutation. Do not copy the hash to telemetry.
          if (context?.path !== "/change-password" || !updated ||
            updated.providerId !== "credential" ||
            typeof updated.id !== "string" ||
            typeof updated.userId !== "string" ||
            typeof updated.password !== "string" ||
            !updated.password) return;
          const userId = updated.userId;
          const actorId = context.context.session?.user?.id;
          if (actorId !== userId) return;
          const fact: AuthTransitionFact = {
            kind: "auth.passwordChanged", userId, accountId: updated.id,
            operationId: crypto.randomUUID(), context: "change", actorUserId: userId,
          };
          const occurredAt = new Date();
          observe(() => emit(fact, occurredAt));
        } },
      },
      session: {
        ...options.databaseHooks?.session,
        create: { ...options.databaseHooks?.session?.create, after: async created => {
          if (typeof created.id !== "string" || typeof created.userId !== "string") return;
          const fact: AuthTransitionFact = {
            kind: "auth.sessionCreated", userId: created.userId, sessionId: created.id,
            actorUserId: trustedActor(created.userId),
          };
          const occurredAt = new Date();
          observe(() => emit(fact, occurredAt));
        } },
        delete: { after: async (deleted, context) => {
          try { onDeleted?.noteAfter(deleted, context); }
          catch { try { onCreatedFact?.recordGap?.(1); } catch { /* best effort */ } }
        } },
      },
    };
  }
  if ((onAdmissionError || onAdmissionDenied) && options.user?.validateUserInfo) {
    const validateUserInfo = options.user.validateUserInfo;
    options.user = {
      ...options.user,
      validateUserInfo: async (data, ctx) => {
        try {
          const result = await validateUserInfo(data, ctx);
          if (result && typeof result === "object" && "error" in result &&
              typeof result.error === "string" && !result.error.startsWith("vico_registration_challenge_")) {
            try { onAdmissionDenied?.(); }
            catch { /* Telemetry must never alter registration admission. */ }
          }
          return result;
        } catch (error) {
          // Better Auth 1.7.7 converts any thrown validation error to a cause-less 403.
          // Preserve the actual registration-policy failure for this one auth request.
          onAdmissionError?.(error);
          throw error;
        }
      },
    };
  }
  // Preserve the same observation/error boundary in Better Auth's transaction
  // callback adapter as in ordinary direct calls. Do not bypass AccountState.
  if (onDeleted || onCreatedProof || onDatabaseError) {
    const factory = options.database as ReturnType<typeof drizzleAdapter>;
    options.database = (authOptions: BetterAuthOptions) => {
      type Adapter = ReturnType<typeof factory>;
      const wrap = (adapter: Adapter): Adapter => new Proxy(adapter, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver);
          if (typeof value !== "function") return value;
          if (property === "transaction") {
            return async <T>(fn: (trx: Adapter) => Promise<T>): Promise<T> => {
              try {
                return await Reflect.apply(value, target, [
                  (trx: Adapter) => fn(wrap(trx)),
                ]);
              } catch (error) { onDatabaseError?.(error); throw error; }
            };
          }
          return async (...args: unknown[]) => {
            let result: unknown;
            try { result = await Reflect.apply(value, target, args); }
            catch (error) { onDatabaseError?.(error); throw error; }
            try {
              if (property === "create") onCreatedProof?.noteAdapterCreate(args[0], result);
              if (property === "delete" || property === "deleteMany") {
                onDeleted?.noteAdapterDelete(property, args[0], result);
              }
            } catch { try { onCreatedFact?.recordGap?.(1); } catch { /* best effort */ } }
            return result;
          };
        },
      });
      return wrap(factory(authOptions));
    };
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
  if (error instanceof AuthLifecycleTransactionError) {
    if (sessionStorageUnavailable(error)) throw new AccountSecurityError("unavailable");
    throw new AccountStateUnexpectedError({ cause: error });
  }
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

async function hasCredentialPassword(database: NodePgDatabase, userId: string): Promise<boolean> {
  const rows = await database.select({ id: account.id }).from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential"),
      isNotNull(account.password), ne(account.password, "")))
    .limit(1);
  return rows.length > 0;
}

/**
 * Observe the original node-postgres results only for Better Auth's three
 * canonical INSERT ... RETURNING tables and session-token DELETE.
 * No SQL or driver return value is replaced. Also usable by native PG tests.
 */
export function observeAuthNativeMutations(
  client: Client,
  creations?: AuthCreationEvidence,
  deletions?: SessionDeletionEvidence,
  onGap?: (count:number)=>void,
): () => void {
  const original=client.query;
  client.query=((...args:unknown[])=>{
    const statement=args[0];
    const sql=typeof statement==="string" ? statement :
      statement && typeof statement==="object" && "text" in statement
        ? (statement as {text:unknown}).text : null;
    const oneDelete=!!deletions && sql==='delete from "session" where "session"."token" = $1';
    const oneInsert=!!creations && typeof sql==="string" &&
      /^insert into "(user|account|session)"\s*\(/i.test(sql) && /\breturning\b/i.test(sql);
    const native=Reflect.apply(original,client,args) as unknown;
    if(!oneDelete && !oneInsert) return native;
    return Promise.resolve(native).then(result=>{
      try {
        if(oneDelete) deletions?.noteNativeDelete(statement,args[1],result);
        if(oneInsert) creations?.noteNativeInsert(statement,result);
      }catch { try{onGap?.(1);}catch{ /* best effort */ } }
      return result;
    });
  }) as typeof client.query;
  return ()=>{client.query=original;};
}

/** A request capability: every operation owns and closes its Hyperdrive PostgreSQL client. */
export function createHyperdriveAuthRuntime(
  connectionString: string,
  env: BetterAuthEnvironment,
  createClient: (connectionString: string) => Client = createWebClient,
  onAdmissionDenied?: () => void,
  onCreatedFact?: AuthCreationObserver,
  dependencies?: AuthLifecycleDependencies,
): AuthRuntime {
  async function useAuth<T>(
    operation: (auth: ReturnType<typeof createAuth>, database: NodePgDatabase, client: Client) => Promise<T>,
    preserveDatabaseError = false,
    onAdmissionError?: (error: unknown) => void,
    preRoutingSessionLookup = false,
  ): Promise<T> {
    const client = createClient(connectionString);
    const lifecycle = new AuthLifecycleTransaction(client, count => {
      try { onCreatedFact?.recordGap?.(count); } catch { /* best effort */ }
    });
    let databaseError: unknown;
    let actorStateError: unknown;
    let deletions: SessionDeletionEvidence | undefined;
    let creations: AuthCreationEvidence | undefined;
    try {
      await client.connect();
      const database = drizzle(client);
      if (onCreatedFact) {
        creations = new AuthCreationEvidence(database,
          (fact, occurredAt) => onCreatedFact.capture(fact, occurredAt),
          userId => { try { return onCreatedFact.trustedActorFor(userId) === userId ? userId : null; }
            catch { return null; } },
          count => { try { onCreatedFact.recordGap?.(count); } catch { /* best effort */ } }, lifecycle);
        deletions = new SessionDeletionEvidence(database,
          (fact, occurredAt) => { try { onCreatedFact.capture(fact, occurredAt); }
            catch { try { onCreatedFact.recordGap?.(1); } catch { /* best effort */ } } },
          count => { try { onCreatedFact.recordGap?.(count); } catch { /* best effort */ } }, lifecycle);
        // Same exact native driver proof for successful inserts and deletions.
        observeAuthNativeMutations(client, creations, deletions,
          count => { try { onCreatedFact.recordGap?.(count); } catch { /* best effort */ } });
      }
      const result = await operation(createAuth(database, env,
        preserveDatabaseError ? (error) => { databaseError ??= error; } : undefined,
        onAdmissionError, onAdmissionDenied, onCreatedFact, deletions, creations,
        (error) => { actorStateError ??= error; }, preRoutingSessionLookup, lifecycle, dependencies), database, client);
      // Discard a library-generated success/redirect/cookie on unconfirmed
      // transaction control, even when Better Auth handled the original error.
      if (lifecycle.controlFailure) throw lifecycle.controlFailure;
      // The HTTP adapter may convert a thrown hook error to a generic response.
      // Restore the classified A2 error before responding to this request.
      if (actorStateError) throw actorStateError;
      return result;
    } catch (error) {
      // Better Auth 1.7.7 replaces session-query failures with a cause-less APIError.
      // Retain the adapter failure for classification; never infer availability from HTTP 500.
      throw lifecycle.controlFailure ?? actorStateError ?? databaseError ?? error;
    } finally {
      // Never query a connection whose transaction status is unknown.
      // The owner has already discarded its unconfirmed evidence.
      if (lifecycle.connectionUsable) {
        try { await creations?.flush(); }
        catch { /* Creation proof must never change an auth outcome. */ }
        try { await deletions?.flush(); }
        catch { /* Proof/telemetry must never change an auth outcome. */ }
      } else if (creations || deletions) {
        // Earlier committed operations in this same call might still have
        // unflushed receipts. Do not silently claim complete recording.
        try { onCreatedFact?.recordGap?.(1); } catch { /* best effort */ }
      }
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
      read: (headers, identity) => securityCall(() => useAuth(async (auth, database, client) => {
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
        const pending = await client.query<{ phase: string; expires_at: Date }>(`
          select value::jsonb->>'phase' phase, expires_at at time zone 'UTC' expires_at
          from verification where id='vico-auth-lifecycle:v1:email-change:' ||
            encode(sha256(convert_to($1,'UTF8')),'hex') and identifier=id
            and expires_at > timezone('UTC',clock_timestamp())
        `, [current.user.id]);
        const change = pending.rows[0];
        const pendingEmailChange: AccountSecuritySnapshot["pendingEmailChange"] = change && (change.phase === "old-address" || change.phase === "new-address")
          ? { phase: change.phase, expiresAt: change.expires_at.toISOString() } : null;
        return { linkedMethods, hasPassword, sessionAccess, sessions, email: current.user.email,
          emailVerified: current.user.emailVerified, googleAccountId: accounts.find(link => link.providerId === "google")?.id,
          pendingEmailChange };
      }, true)),
      changePassword: (headers, identity, currentPassword, newPassword) =>
        securityCall(() => useAuth(async (auth, database) => {
          const current = await verifyIdentity(auth, headers, identity);
          if (!await hasCredentialPassword(database, current.user.id)) {
            throw new AccountSecurityError("no-password");
          }
          // Direct auth.api calls bypass Better Auth's HTTP-router onRequest rate limit.
          // Route through the existing handler to share the canonical /change-password
          // database-backed bucket and trusted client-IP admission.
          const routedHeaders = new Headers({ "Content-Type": "application/json" });
          for (const header of ["cookie", "origin", "cf-connecting-ip", "user-agent"]) {
            const value = headers.get(header);
            if (value) routedHeaders.set(header, value);
          }
          const response = await auth.handler(new Request(
            new URL("/api/auth/change-password", env.BETTER_AUTH_URL), {
              method: "POST",
              headers: routedHeaders,
              body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }),
            },
          ));
          if (response.ok) return;
          if (response.status === 429) {
            const value = response.headers.get("X-Retry-After");
            const retryAfterSeconds = value && /^\d{1,4}$/.test(value) ? Number(value) : undefined;
            throw new AccountSecurityError("rate-limited", retryAfterSeconds);
          }
          const payload: unknown = await response.json().catch(() => null);
          const code = payload && typeof payload === "object" && "code" in payload
            ? payload.code : null;
          if (code === "INVALID_PASSWORD") throw new AccountSecurityError("invalid-password");
          if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") throw new AccountSecurityError("no-password");
          if (code === "SESSION_NOT_FRESH") throw new AccountSecurityError("not-fresh");
          if (response.status === 401) throw new AccountSecurityError("unauthenticated");
          throw new Error("Unexpected Better Auth change-password response");
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
          // revokeOtherSessions alone does not enforce Better Auth's fresh-session policy.
          // Match the session list and single-revoke boundary before this write.
          await auth.api.listSessions({ headers });
          await auth.api.revokeOtherSessions({ headers });
        }, true)),
    },
    async getSession(headers) {
      try {
        return await useAuth(async (auth, _database, client) => {
          const result = await auth.api.getSession({ headers, returnHeaders: true });
          const session = result.response as AuthSession | null;
          // The Better Auth session is not active forum identity until its
          // authoritative account row passes the existing A2 state reader.
          const state = session ? await readAccountState(client, session.user.id) : null;
          return {
            session: state?.status === "active" ? session : null,
            // Preserve BA cleanup/sliding cookies, including their order relative
            // to later endpoint login/logout Set-Cookie headers.
            headers: result.headers ?? new Headers(),
          };
        }, true, undefined, true);
      } catch (error) {
        // The authoritative account may deactivate between I1's initial
        // session read and I4a's locked refresh write. That late denial is
        // still a guest identity at the pre-routing boundary, not a 401 page.
        if (error instanceof InactiveSessionWriteError) {
          return { session: null, headers: new Headers() };
        }
        if (error instanceof AuthLifecycleTransactionError && !sessionStorageUnavailable(error)) {
          throw new AccountStateUnexpectedError({ cause: error });
        }
        if (error instanceof AccountStateUnavailableError || sessionStorageUnavailable(error)) {
          throw new AuthSessionUnavailableError({ cause: error });
        }
        throw error;
      }
    },
    handle: async (request) => {
      const protectGuestResponse = (response: Response): Response => {
        if (!isGuestEmailVerificationRequest(request)) return response;
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "private, no-store");
        headers.set("Referrer-Policy", "no-referrer");
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      };
      const admission = { failure: undefined as { error: unknown } | undefined };
      try {
        return protectGuestResponse(await useAuth(async (auth) => {
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
        }, false, (error) => { admission.failure ??= { error }; }));
      } catch (error) {
        if (error instanceof AuthLifecycleTransactionError) {
          if (!sessionStorageUnavailable(error)) throw new AccountStateUnexpectedError({ cause: error });
          return protectGuestResponse(new Response(error.code === "commit-uncertain"
            ? "Authentication outcome could not be confirmed."
            : "Service unavailable. Please try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          }));
        }
        if (error instanceof AccountStateUnavailableError) {
          return protectGuestResponse(new Response("Service unavailable. Please try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          }));
        }
        throw error;
      }
    },
  };
}
