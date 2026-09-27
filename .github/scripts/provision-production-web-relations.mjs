import assert from "node:assert/strict";

import pg from "pg";

import {
  assertRuntimeCapabilityPrivilegeContract,
  readRuntimeCapabilityPrivilegeSnapshot,
  runtimeCapabilityContracts,
} from "./runtime-privileges.mjs";

export const OWNER_PHASE_CONFIRMATION_TOKEN =
  "owner-phase-password-null-confirmed";
export const EXPECTED_MIGRATOR_ROLE = "vico_forum_migrator";

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function expectedWebRelationNames() {
  return sorted(Object.keys(runtimeCapabilityContracts.web.relations));
}

export function buildWebRelationGrantStatements(webRole) {
  assert.ok(webRole, "webRole is required");

  return Object.entries(runtimeCapabilityContracts.web.relations).map(
    ([name, privileges]) =>
      `GRANT ${privileges.join(", ")} ON TABLE public.${quoteIdentifier(name)} TO ${quoteIdentifier(webRole)}`,
  );
}

export function assertOwnerPhaseConfirmation(actual) {
  assert.equal(
    actual,
    OWNER_PHASE_CONFIRMATION_TOKEN,
    `OWNER_PHASE_CONFIRMATION must equal ${OWNER_PHASE_CONFIRMATION_TOKEN}`,
  );
}

export function assertRelationProvisioningPrerequisites(
  snapshot,
  {
    localizationRole,
    webRole,
  },
) {
  assert.ok(localizationRole, "localizationRole is required");
  assert.ok(webRole, "webRole is required");
  assert.notEqual(
    localizationRole,
    webRole,
    "Localization-read and web runtime roles must be distinct",
  );

  assert.equal(
    snapshot.currentUser,
    EXPECTED_MIGRATOR_ROLE,
    `Relation grants must execute as exact ${EXPECTED_MIGRATOR_ROLE}`,
  );
  assert.ok(snapshot.databaseOwnerRole, "Expected current database owner role");

  assert.equal(snapshot.webRoleRows.length, 1, "Expected exactly one target web role");
  const role = snapshot.webRoleRows[0];
  assert.equal(role.rolname, webRole, "Unexpected target web role");
  assert.equal(role.rolcanlogin, true, "Target web role must LOGIN");
  assert.equal(role.rolinherit, false, "Target web role must be NOINHERIT");
  for (const attribute of [
    "rolsuper",
    "rolcreatedb",
    "rolcreaterole",
    "rolreplication",
    "rolbypassrls",
  ]) {
    assert.equal(
      role[attribute],
      false,
      `Target web role must not have ${attribute}`,
    );
  }

  assert.deepEqual(
    snapshot.memberships,
    [
      {
        member: snapshot.databaseOwnerRole,
        role: webRole,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
    ],
    "Target web role must have only the automatic database-owner admin membership",
  );

  assert.equal(
    snapshot.effectiveDatabaseConnect,
    true,
    "Target web role must have effective database CONNECT",
  );
  assert.equal(
    snapshot.effectiveDatabaseCreate,
    false,
    "Target web role must not have effective database CREATE",
  );

  assert.deepEqual(
    sorted(
      snapshot.databasePrivileges.map(
        ({ privilege, is_grantable }) =>
          `${privilege}.grantable=${is_grantable}`,
      ),
    ),
    ["CONNECT.grantable=false"],
    "Owner phase must leave exact direct non-grantable database CONNECT",
  );

  assert.deepEqual(
    sorted(
      snapshot.schemaPrivileges.map(
        ({ schema, privilege, is_grantable }) =>
          `${schema}.${privilege}.grantable=${is_grantable}`,
      ),
    ),
    ["public.USAGE.grantable=false"],
    "Owner phase must leave exact public schema USAGE without grant option",
  );

  const expectedNames = expectedWebRelationNames();
  assert.deepEqual(
    sorted(snapshot.relationOwners.map(({ name }) => name)),
    expectedNames,
    "Expected every web capability relation to exist exactly once",
  );
  for (const relation of snapshot.relationOwners) {
    assert.equal(
      relation.owner,
      EXPECTED_MIGRATOR_ROLE,
      `Expected ${relation.name} to be owned by ${EXPECTED_MIGRATOR_ROLE}`,
    );
    assert.ok(
      relation.kind === "r" || relation.kind === "p",
      `Expected ${relation.name} to be a table relation`,
    );
  }
}

export async function readRelationProvisioningPrerequisites(
  client,
  {
    localizationRole,
    webRole,
  },
) {
  const expectedRelations = expectedWebRelationNames();

  const identity = await client.query(
    `SELECT current_user AS current_user`,
  );
  const databaseOwner = await client.query(
    `SELECT owner.rolname AS role
       FROM pg_catalog.pg_database database
       JOIN pg_catalog.pg_roles owner ON owner.oid = database.datdba
      WHERE database.datname = current_database()`,
  );
  const webRoleRows = await client.query(
    `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
            rolcanlogin, rolreplication, rolbypassrls
       FROM pg_catalog.pg_roles
      WHERE rolname = $1`,
    [webRole],
  );
  const memberships = await client.query(
    `SELECT member.rolname AS member, granted.rolname AS role,
            membership.admin_option, membership.inherit_option,
            membership.set_option
       FROM pg_catalog.pg_auth_members membership
       JOIN pg_catalog.pg_roles member ON member.oid = membership.member
       JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
      WHERE member.rolname = $1 OR granted.rolname = $1
      ORDER BY member.rolname, granted.rolname`,
    [webRole],
  );
  const effectiveDatabase = await client.query(
    `SELECT
       pg_catalog.has_database_privilege($1, current_database(), 'CONNECT') AS has_connect,
       pg_catalog.has_database_privilege($1, current_database(), 'CREATE') AS has_create`,
    [webRole],
  );
  const databasePrivileges = await client.query(
    `SELECT acl.privilege_type AS privilege, acl.is_grantable
       FROM pg_catalog.pg_database database
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(database.datacl, pg_catalog.acldefault('d', database.datdba))
       ) acl
       LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
      WHERE database.datname = current_database()
        AND grantee.rolname = $1
      ORDER BY 1, 2`,
    [webRole],
  );
  const schemaPrivileges = await client.query(
    `SELECT namespace.nspname AS schema, acl.privilege_type AS privilege,
            acl.is_grantable
       FROM pg_catalog.pg_namespace namespace
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(namespace.nspacl, pg_catalog.acldefault('n', namespace.nspowner))
       ) acl
       LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
      WHERE grantee.rolname = $1
      ORDER BY 1, 2, 3`,
    [webRole],
  );
  const relationOwners = await client.query(
    `SELECT relation.relname AS name, relation.relkind AS kind,
            owner.rolname AS owner
       FROM pg_catalog.pg_class relation
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
       JOIN pg_catalog.pg_roles owner ON owner.oid = relation.relowner
      WHERE namespace.nspname = 'public'
        AND relation.relname = ANY($1::text[])
      ORDER BY relation.relname`,
    [expectedRelations],
  );

  return {
    currentUser: identity.rows[0]?.current_user ?? null,
    databaseOwnerRole: databaseOwner.rows[0]?.role ?? null,
    webRoleRows: webRoleRows.rows,
    memberships: memberships.rows,
    effectiveDatabaseConnect:
      effectiveDatabase.rows[0]?.has_connect ?? null,
    effectiveDatabaseCreate:
      effectiveDatabase.rows[0]?.has_create ?? null,
    databasePrivileges: databasePrivileges.rows,
    schemaPrivileges: schemaPrivileges.rows,
    relationOwners: relationOwners.rows,
  };
}

export async function executeWebRelationProvisioning(
  client,
  {
    localizationRole,
    webRole,
  },
  dependencies = {},
) {
  const readPrerequisites =
    dependencies.readPrerequisites ?? readRelationProvisioningPrerequisites;
  const readRuntimeSnapshot =
    dependencies.readRuntimeSnapshot ?? readRuntimeCapabilityPrivilegeSnapshot;
  const assertRuntimeContract =
    dependencies.assertRuntimeContract ?? assertRuntimeCapabilityPrivilegeContract;

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const prerequisites = await readPrerequisites(client, {
      localizationRole,
      webRole,
    });
    assertRelationProvisioningPrerequisites(prerequisites, {
      localizationRole,
      webRole,
    });

    for (const statement of buildWebRelationGrantStatements(webRole)) {
      await client.query(statement);
    }

    const snapshot = await readRuntimeSnapshot(client, {
      localizationRole,
      webRole,
    });
    assertRuntimeContract(snapshot, {
      localizationRole,
      webRole,
    });

    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original provisioning failure.
      }
    }
    throw error;
  }
}

export async function provisionProductionWebRelations({
  databaseUrl,
  localizationRole,
  webRole,
  confirmation,
}) {
  assertOwnerPhaseConfirmation(confirmation);
  assert.ok(databaseUrl, "DATABASE_URL is required");
  assert.ok(localizationRole, "RUNTIME_DATABASE_ROLE is required");
  assert.ok(webRole, "WEB_RUNTIME_DATABASE_ROLE is required");

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });

  try {
    await client.connect();
    await executeWebRelationProvisioning(client, {
      localizationRole,
      webRole,
    });
  } finally {
    await client.end();
  }
}

export async function runCli({
  env = process.env,
  logger = console,
  provision = provisionProductionWebRelations,
} = {}) {
  try {
    assertOwnerPhaseConfirmation(env.OWNER_PHASE_CONFIRMATION);
    assert.ok(env.DATABASE_URL, "DATABASE_URL is required");
    assert.ok(env.RUNTIME_DATABASE_ROLE, "RUNTIME_DATABASE_ROLE is required");
    assert.ok(
      env.WEB_RUNTIME_DATABASE_ROLE,
      "WEB_RUNTIME_DATABASE_ROLE is required",
    );

    await provision({
      databaseUrl: env.DATABASE_URL,
      localizationRole: env.RUNTIME_DATABASE_ROLE,
      webRole: env.WEB_RUNTIME_DATABASE_ROLE,
      confirmation: env.OWNER_PHASE_CONFIRMATION,
    });

    logger.log("Production web relation grants verified and committed.");
    return 0;
  } catch {
    logger.error("Production web relation provisioning failed.");
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await runCli();
}
