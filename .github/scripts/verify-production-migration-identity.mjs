import pg from "pg";

const EXPECTED_ROLE = "vico_forum_migrator";

export function assertMigrationRole(actualRole) {
  if (actualRole !== EXPECTED_ROLE) {
    throw new Error(`Unexpected migration database role: expected ${EXPECTED_ROLE}`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  let connected = false;

  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN READ ONLY");
    const result = await client.query("SELECT current_user AS current_user");

    if (result.rowCount !== 1 || typeof result.rows[0]?.current_user !== "string") {
      throw new Error("Could not determine migration database role");
    }

    assertMigrationRole(result.rows[0].current_user);
    console.log(`Migration database identity verified: ${EXPECTED_ROLE}`);
  } finally {
    if (connected) {
      try {
        await client.query("ROLLBACK");
      } finally {
        await client.end();
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration database identity verification failed");
    process.exitCode = 1;
  });
}
