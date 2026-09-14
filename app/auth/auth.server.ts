import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type { AuthRuntime, AuthSession } from "./request-context";
import {
  account,
  betterAuthUserAdditionalFields,
  rateLimit,
  session,
  user,
  verification,
} from "../../db/schema";

export interface BetterAuthEnvironment {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
}

export const betterAuthSchema = { user, session, account, verification, rateLimit };
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

export function betterAuthOptions(database: NodePgDatabase, env: BetterAuthEnvironment) {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg" as const,
      schema: betterAuthSchema,
    }),
    user: { additionalFields: betterAuthUserAdditionalFields },
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

function createAuth(database: NodePgDatabase, env: BetterAuthEnvironment) {
  return betterAuth(betterAuthOptions(database, env));
}

/** A request capability: every operation owns and closes its Hyperdrive PostgreSQL client. */
export function createHyperdriveAuthRuntime(
  connectionString: string,
  env: BetterAuthEnvironment,
  createClient: (connectionString: string) => Client = (value) => new Client({ connectionString: value }),
): AuthRuntime {
  async function useAuth<T>(operation: (auth: ReturnType<typeof createAuth>) => Promise<T>): Promise<T> {
    const client = createClient(connectionString);
    try {
      await client.connect();
      return await operation(createAuth(drizzle(client), env));
    } finally {
      await client.end();
    }
  }

  return {
    getSession: (headers) => useAuth(async (auth) => {
      const value = await auth.api.getSession({ headers });
      return value as AuthSession | null;
    }),
    handle: (request) => useAuth((auth) => auth.handler(request)),
  };
}
