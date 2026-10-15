import pg from "pg";

const EXPECTED_ROLE = "vico_forum_migrator";

export function assertMigrationRole(actualRole) {
  if (actualRole !== EXPECTED_ROLE) {
    throw new Error(`Unexpected migration database role: expected ${EXPECTED_ROLE}`);
  }
}

export function assertMigrationDatabaseCreateCapability(canCreate) {
  if (canCreate !== true) {
    throw new Error(
      `Migration database role ${EXPECTED_ROLE} must have effective CREATE privilege on the current database`,
    );
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
    const result = await client.query(`
      SELECT
        current_user AS current_user,
        pg_catalog.has_database_privilege(
          current_user,
          current_database(),
          'CREATE'
        ) AS can_create
    `);

    if (
      result.rowCount !== 1
      || typeof result.rows[0]?.current_user !== "string"
      || typeof result.rows[0]?.can_create !== "boolean"
    ) {
      throw new Error("Could not determine migration database identity and CREATE capability");
    }

    assertMigrationRole(result.rows[0].current_user);
    assertMigrationDatabaseCreateCapability(result.rows[0].can_create);
    console.log(`Migration database identity and CREATE capability verified: ${EXPECTED_ROLE}`);
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
