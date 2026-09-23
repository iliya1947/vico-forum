import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import { DrizzleUiTranslationBundleStore } from "../db/ui-translation-bundle-store";

const ACCEPTED_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);
const DISPOSABLE_DATABASE_SUFFIX = "_test";

function safetyReject(message: string): never {
  throw new Error(`R4 bundle reconciliation safety rejection: ${message}`);
}

function requireDisposableLocalDatabaseUrl(value: string | undefined): string {
  if (!value) safetyReject("DATABASE_URL is required");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    safetyReject("DATABASE_URL must be a valid absolute PostgreSQL URL");
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    !parsed.pathname.startsWith("/")
  ) {
    safetyReject("DATABASE_URL must be a valid absolute PostgreSQL URL");
  }

  if (!ACCEPTED_HOSTNAMES.has(parsed.hostname)) {
    safetyReject("DATABASE_URL hostname must be exactly 127.0.0.1 or localhost");
  }

  const databaseName = parsed.pathname.slice(1);
  if (!databaseName.endsWith(DISPOSABLE_DATABASE_SUFFIX)) {
    safetyReject(`DATABASE_URL database name must end with ${DISPOSABLE_DATABASE_SUFFIX}`);
  }

  return value;
}

async function main(): Promise<void> {
  const databaseUrl = requireDisposableLocalDatabaseUrl(process.env.DATABASE_URL);

  const client = new Client({
    connectionString: databaseUrl,
    options: process.env.PGOPTIONS,
  });

  await client.connect();
  try {
    const store = new DrizzleUiTranslationBundleStore(drizzle(client));
    const identities = await store.listPersistedBundleIdentities();
    const outcomes = { current: 0, deleted: 0, absent: 0 };

    for (const identity of identities) {
      const outcome = await store.reconcilePersistedBundle(identity.locale, identity.namespace);
      outcomes[outcome] += 1;
    }

    console.log(JSON.stringify({
      event: "ui_translation_bundle_reconciliation_complete",
      scanned: identities.length,
      ...outcomes,
    }));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
