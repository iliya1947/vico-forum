import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { AuthSessionUnavailableError, type AuthRuntime, type AuthSession } from "./request-context";
import {
  account,
  betterAuthUserAdditionalFields,
  rateLimit,
  session,
  user,
  verification,
} from "../../db/schema";
import { createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "../../db/postgres-deadlines";
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

export const betterAuthRegistrationHooks: NonNullable<BetterAuthOptions["hooks"]> = {
  before: createAuthMiddleware(async (ctx) => {
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
    user: { additionalFields: betterAuthUserAdditionalFields },
    emailAndPassword: betterAuthEmailPasswordOptions,
    hooks: betterAuthRegistrationHooks,
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

function createAuth(database: NodePgDatabase, env: BetterAuthEnvironment, onDatabaseError?: (error: unknown) => void) {
  const options = betterAuthOptions(database, env);
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

/** A request capability: every operation owns and closes its Hyperdrive PostgreSQL client. */
export function createHyperdriveAuthRuntime(
  connectionString: string,
  env: BetterAuthEnvironment,
  createClient: (connectionString: string) => Client = createWebClient,
): AuthRuntime {
  async function useAuth<T>(operation: (auth: ReturnType<typeof createAuth>) => Promise<T>, preserveDatabaseError = false): Promise<T> {
    const client = createClient(connectionString);
    let databaseError: unknown;
    try {
      await client.connect();
      return await operation(createAuth(drizzle(client), env,
        preserveDatabaseError ? (error) => { databaseError ??= error; } : undefined));
    } catch (error) {
      // Better Auth 1.7.7 replaces session-query failures with a cause-less APIError.
      // Retain the adapter failure for classification; never infer availability from HTTP 500.
      throw databaseError ?? error;
    } finally {
      await client.end();
    }
  }

  return {
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
    handle: (request) => useAuth((auth) => auth.handler(request)),
  };
}
