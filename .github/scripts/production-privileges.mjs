import assert from "node:assert/strict";

export const applicationTables = ["locales", "ui_translation_bundles", "ui_translations"];

const dangerousAttributes = ["rolsuper", "rolcreatedb", "rolcreaterole", "rolreplication", "rolbypassrls"];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function assertProductionPrivilegeContract(
  snapshot,
  { migrationRole, runtimeRole, migrationMemberships = [] },
) {
  assert.notEqual(runtimeRole, migrationRole, "Runtime and migration roles must be distinct");

  const roles = new Map(snapshot.roles.map((role) => [role.rolname, role]));
  const runtime = roles.get(runtimeRole);
  const migration = roles.get(migrationRole);
  assert.ok(runtime, `Expected runtime role ${runtimeRole} to exist`);
  assert.ok(migration, `Expected migration role ${migrationRole} to exist`);
  assert.equal(runtime.rolcanlogin, true, `Runtime role ${runtimeRole} must be able to log in`);
  assert.equal(migration.rolcanlogin, true, `Migration role ${migrationRole} must be able to log in`);
  for (const attribute of dangerousAttributes) {
    assert.equal(runtime[attribute], false, `Runtime role ${runtimeRole} must not have ${attribute}`);
    assert.equal(migration[attribute], false, `Migration role ${migrationRole} must not directly have ${attribute}`);
  }

  const runtimeMemberships = snapshot.memberships.filter(({ member }) => member === runtimeRole);
  assert.deepEqual(runtimeMemberships, [], `Runtime role ${runtimeRole} must not inherit from another role`);
  assert.deepEqual(
    sorted(snapshot.memberships.filter(({ member }) => member === migrationRole).map(({ role }) => role)),
    sorted(migrationMemberships),
    `Unexpected memberships for migration role ${migrationRole}`,
  );

  assert.equal(
    snapshot.ownedObjects.some(({ owner }) => owner === runtimeRole),
    false,
    `Runtime role ${runtimeRole} must not own schemas, tables, sequences, or views`,
  );
  for (const table of applicationTables) {
    assert.ok(
      snapshot.ownedObjects.some(
        ({ schema, name, kind, owner }) =>
          schema === "public" && name === table && kind === "table" && owner === migrationRole,
      ),
      `Expected migration role ${migrationRole} to own public.${table}`,
    );
  }

  const runtimeSchemaPrivileges = sorted(
    snapshot.schemaPrivileges
      .filter(({ grantee }) => grantee === runtimeRole)
      .map(({ schema, privilege }) => `${schema}.${privilege}`),
  );
  assert.deepEqual(runtimeSchemaPrivileges, ["public.USAGE"], "Unexpected runtime schema privileges");

  const runtimeRelationPrivileges = sorted(
    snapshot.relationPrivileges
      .filter(({ grantee }) => grantee === runtimeRole)
      .map(({ schema, name, kind, privilege }) => `${schema}.${name}.${kind}.${privilege}`),
  );
  assert.deepEqual(
    runtimeRelationPrivileges,
    applicationTables.map((table) => `public.${table}.table.SELECT`).sort(),
    "Runtime relation privileges must be exactly SELECT on the localization tables",
  );

  const publicSchemaPrivileges = sorted(
    snapshot.schemaPrivileges
      .filter(({ grantee }) => grantee === "PUBLIC")
      .map(({ schema, privilege }) => `${schema}.${privilege}`),
  );
  assert.deepEqual(publicSchemaPrivileges, ["public.USAGE"], "Unexpected PUBLIC schema privileges");
  assert.deepEqual(
    snapshot.relationPrivileges.filter(({ grantee }) => grantee === "PUBLIC"),
    [],
    "PUBLIC must not have table, sequence, or view privileges",
  );

  assert.deepEqual(
    snapshot.defaultPrivileges.filter(
      ({ grantee }) => grantee === runtimeRole || grantee === "PUBLIC",
    ),
    [],
    "Default privileges must not grant future objects to runtime or PUBLIC",
  );
}

export async function readProductionPrivilegeSnapshot(client, roles) {
  const roleRows = await client.query(
    `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolreplication, rolbypassrls
     FROM pg_catalog.pg_roles
     WHERE rolname = ANY($1::name[])
     ORDER BY rolname`,
    [roles],
  );
  const memberships = await client.query(
    `SELECT member.rolname AS member, granted.rolname AS role
     FROM pg_catalog.pg_auth_members membership
     JOIN pg_catalog.pg_roles member ON member.oid = membership.member
     JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
     WHERE member.rolname = ANY($1::name[])
     ORDER BY member.rolname, granted.rolname`,
    [roles],
  );
  const ownedObjects = await client.query(
    `SELECT namespace.nspname AS schema, namespace.nspname AS name, 'schema' AS kind, owner.rolname AS owner
     FROM pg_catalog.pg_namespace namespace
     JOIN pg_catalog.pg_roles owner ON owner.oid = namespace.nspowner
     WHERE namespace.nspname = 'public' OR owner.rolname = ANY($1::name[])
     UNION ALL
     SELECT namespace.nspname, relation.relname,
       CASE relation.relkind WHEN 'S' THEN 'sequence' WHEN 'v' THEN 'view' WHEN 'm' THEN 'view' ELSE 'table' END,
       owner.rolname
     FROM pg_catalog.pg_class relation
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
     JOIN pg_catalog.pg_roles owner ON owner.oid = relation.relowner
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_toast'
       AND relation.relkind IN ('r', 'p', 'S', 'v', 'm')
     ORDER BY 1, 2, 3, 4`,
    [roles],
  );
  const schemaPrivileges = await client.query(
    `SELECT namespace.nspname AS schema,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege
     FROM pg_catalog.pg_namespace namespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(namespace.nspacl, pg_catalog.acldefault('n', namespace.nspowner))
     ) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_'
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3`,
    [roles],
  );
  const relationPrivileges = await client.query(
    `SELECT namespace.nspname AS schema, relation.relname AS name,
       CASE relation.relkind WHEN 'S' THEN 'sequence' WHEN 'v' THEN 'view' WHEN 'm' THEN 'view' ELSE 'table' END AS kind,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege
     FROM pg_catalog.pg_class relation
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(relation.relacl, pg_catalog.acldefault(CASE WHEN relation.relkind = 'S' THEN 's'::char ELSE 'r'::char END, relation.relowner))
     ) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_toast'
       AND relation.relkind IN ('r', 'p', 'S', 'v', 'm')
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3, 4, 5`,
    [roles],
  );
  const defaultPrivileges = await client.query(
    `SELECT owner.rolname AS owner, COALESCE(namespace.nspname, '*') AS schema,
       defaults.defaclobjtype AS object_type,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege
     FROM pg_catalog.pg_default_acl defaults
     JOIN pg_catalog.pg_roles owner ON owner.oid = defaults.defaclrole
     LEFT JOIN pg_catalog.pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE acl.grantee = 0 OR grantee.rolname = ANY($1::name[])
     ORDER BY 1, 2, 3, 4, 5`,
    [roles],
  );

  return {
    roles: roleRows.rows,
    memberships: memberships.rows,
    ownedObjects: ownedObjects.rows,
    schemaPrivileges: schemaPrivileges.rows,
    relationPrivileges: relationPrivileges.rows,
    defaultPrivileges: defaultPrivileges.rows,
  };
}
