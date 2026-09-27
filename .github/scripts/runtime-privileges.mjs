import assert from "node:assert/strict";

export const runtimeCapabilityContracts = Object.freeze({
  "localization-read": Object.freeze({
    relations: Object.freeze({
      locales: Object.freeze(["SELECT"]),
      ui_translation_bundles: Object.freeze(["SELECT"]),
      ui_translations: Object.freeze(["SELECT"]),
    }),
  }),
  web: Object.freeze({
    relations: Object.freeze({
      account: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      authz_mutation_lock: Object.freeze(["SELECT", "UPDATE"]),
      authz_role_permissions: Object.freeze(["DELETE", "INSERT", "SELECT"]),
      authz_roles: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      authz_user_permission_overrides: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      authz_user_roles: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
      forum_categories: Object.freeze(["SELECT"]),
      forum_post_body_translations: Object.freeze(["SELECT"]),
      forum_post_revisions: Object.freeze(["INSERT", "SELECT"]),
      forum_posts: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
      forum_sections: Object.freeze(["SELECT"]),
      forum_topic_title_revisions: Object.freeze(["INSERT", "SELECT"]),
      forum_topic_title_translations: Object.freeze(["SELECT"]),
      forum_topics: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
      rate_limit: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      session: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      user: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
      verification: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
    }),
  }),
});

const dangerousAttributes = [
  "rolsuper",
  "rolcreatedb",
  "rolcreaterole",
  "rolreplication",
  "rolbypassrls",
];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function expectedRelationPrivileges(contract) {
  return sorted(
    Object.entries(contract.relations).flatMap(([name, privileges]) =>
      privileges.map((privilege) =>
        `public.${name}.table.${privilege}.grantable=false`
      )
    ),
  );
}

export function assertRuntimeCapabilityPrivilegeContract(
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
  assert.ok(snapshot.databaseOwnerRole, "Expected current database owner role to exist");

  const roleContracts = new Map([
    [localizationRole, runtimeCapabilityContracts["localization-read"]],
    [webRole, runtimeCapabilityContracts.web],
  ]);
  const runtimeRoles = [...roleContracts.keys()];
  const roles = new Map(snapshot.roles.map((role) => [role.rolname, role]));

  for (const runtimeRole of runtimeRoles) {
    const role = roles.get(runtimeRole);
    assert.ok(role, `Expected runtime role ${runtimeRole} to exist`);
    assert.equal(
      role.rolcanlogin,
      true,
      `Runtime role ${runtimeRole} must be able to log in`,
    );
    assert.notEqual(
      runtimeRole,
      snapshot.databaseOwnerRole,
      `Runtime role ${runtimeRole} must not own the current database`,
    );
    for (const attribute of dangerousAttributes) {
      assert.equal(
        role[attribute],
        false,
        `Runtime role ${runtimeRole} must not have ${attribute}`,
      );
    }

    assert.equal(
      snapshot.effectiveDatabaseCreate.find(({ role: candidate }) => candidate === runtimeRole)?.has_create,
      false,
      `Runtime role ${runtimeRole} must not have effective database CREATE`,
    );
    assert.deepEqual(
      snapshot.databaseCreatePrivileges.filter(({ grantee }) => grantee === runtimeRole),
      [],
      `Runtime role ${runtimeRole} must not have direct database CREATE`,
    );

    const outboundMemberships = snapshot.memberships.filter(
      ({ member }) => member === runtimeRole,
    );
    assert.deepEqual(
      outboundMemberships,
      [],
      `Runtime role ${runtimeRole} must not inherit from another role`,
    );
    for (const membership of snapshot.memberships.filter(
      ({ role: grantedRole }) => grantedRole === runtimeRole,
    )) {
      assert.equal(
        membership.member,
        snapshot.databaseOwnerRole,
        `Only database owner ${snapshot.databaseOwnerRole} may hold inbound admin membership in runtime role ${runtimeRole}`,
      );
      assert.equal(
        membership.admin_option,
        true,
        `Database owner membership in ${runtimeRole} must retain ADMIN OPTION`,
      );
      assert.equal(
        membership.inherit_option,
        false,
        `Database owner must not inherit privileges from ${runtimeRole}`,
      );
      assert.equal(
        membership.set_option,
        false,
        `Database owner must not SET ROLE to ${runtimeRole}`,
      );
    }

    assert.equal(
      snapshot.ownedObjects.some(({ owner }) => owner === runtimeRole),
      false,
      `Runtime role ${runtimeRole} must not own schemas, tables, sequences, views, or functions`,
    );

    const schemaPrivileges = sorted(
      snapshot.schemaPrivileges
        .filter(({ grantee }) => grantee === runtimeRole)
        .map(
          ({ schema, privilege, is_grantable }) =>
            `${schema}.${privilege}.grantable=${is_grantable}`,
        ),
    );
    assert.deepEqual(
      schemaPrivileges,
      ["public.USAGE.grantable=false"],
      `Unexpected schema privileges for runtime role ${runtimeRole}`,
    );

    const relationPrivileges = sorted(
      snapshot.relationPrivileges
        .filter(({ grantee }) => grantee === runtimeRole)
        .map(
          ({ schema, name, kind, privilege, is_grantable }) =>
            `${schema}.${name}.${kind}.${privilege}.grantable=${is_grantable}`,
        ),
    );
    assert.deepEqual(
      relationPrivileges,
      expectedRelationPrivileges(roleContracts.get(runtimeRole)),
      `Unexpected relation privileges for runtime role ${runtimeRole}`,
    );

    assert.deepEqual(
      snapshot.columnPrivileges.filter(({ grantee }) => grantee === runtimeRole),
      [],
      `Runtime role ${runtimeRole} must not have column-level privileges`,
    );
    assert.deepEqual(
      snapshot.functionPrivileges.filter(({ grantee }) => grantee === runtimeRole),
      [],
      `Runtime role ${runtimeRole} must not have direct function privileges`,
    );
    assert.deepEqual(
      snapshot.defaultPrivileges.filter(({ grantee }) => grantee === runtimeRole),
      [],
      `Runtime role ${runtimeRole} must not receive default privileges`,
    );
  }

  assert.deepEqual(
    snapshot.databaseCreatePrivileges.filter(({ grantee }) => grantee === "PUBLIC"),
    [],
    "PUBLIC must not have database CREATE",
  );

  const publicSchemaPrivileges = sorted(
    snapshot.schemaPrivileges
      .filter(({ grantee }) => grantee === "PUBLIC")
      .map(
        ({ schema, privilege, is_grantable }) =>
          `${schema}.${privilege}.grantable=${is_grantable}`,
      ),
  );
  assert.deepEqual(
    publicSchemaPrivileges,
    ["public.USAGE.grantable=false"],
    "Unexpected PUBLIC schema privileges",
  );
  assert.deepEqual(
    snapshot.relationPrivileges.filter(({ grantee }) => grantee === "PUBLIC"),
    [],
    "PUBLIC must not have relation or sequence privileges",
  );
  assert.deepEqual(
    snapshot.columnPrivileges.filter(({ grantee }) => grantee === "PUBLIC"),
    [],
    "PUBLIC must not have column-level privileges",
  );
  assert.deepEqual(
    snapshot.functionPrivileges.filter(({ grantee }) => grantee === "PUBLIC"),
    [],
    "PUBLIC must not have explicit function privileges",
  );
  const publicDefaults = snapshot.defaultPrivileges.filter(
    ({ grantee }) => grantee === "PUBLIC",
  );
  for (const privilege of publicDefaults) {
    const allowedHardWiredEquivalent =
      privilege.schema === "*"
      && privilege.is_grantable === false
      && (
        (privilege.object_type === "f" && privilege.privilege === "EXECUTE")
        || (privilege.object_type === "T" && privilege.privilege === "USAGE")
      );
    assert.equal(
      allowedHardWiredEquivalent,
      true,
      "PUBLIC must not receive unexpected custom default privileges",
    );
  }
}

export async function readRuntimeCapabilityPrivilegeSnapshot(
  client,
  {
    localizationRole,
    webRole,
  },
) {
  const runtimeRoles = [localizationRole, webRole];
  assert.equal(
    new Set(runtimeRoles).size,
    runtimeRoles.length,
    "Runtime role names must be distinct",
  );

  const roleRows = await client.query(
    `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolreplication, rolbypassrls
     FROM pg_catalog.pg_roles
     WHERE rolname = ANY($1::name[])
     ORDER BY rolname`,
    [runtimeRoles],
  );
  const databaseOwner = await client.query(
    `SELECT owner.rolname AS role
     FROM pg_catalog.pg_database database
     JOIN pg_catalog.pg_roles owner ON owner.oid = database.datdba
     WHERE database.datname = current_database()`,
  );
  const databaseCreatePrivileges = await client.query(
    `SELECT
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       grantor.rolname AS grantor,
       acl.is_grantable
     FROM pg_catalog.pg_database database
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(database.datacl, pg_catalog.acldefault('d', database.datdba))
     ) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     LEFT JOIN pg_catalog.pg_roles grantor ON grantor.oid = acl.grantor
     WHERE database.datname = current_database()
       AND acl.privilege_type = 'CREATE'
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3`,
    [runtimeRoles],
  );
  const effectiveDatabaseCreate = await client.query(
    `SELECT role_name AS role,
       pg_catalog.has_database_privilege(role_name, current_database(), 'CREATE') AS has_create
     FROM unnest($1::text[]) role_name
     ORDER BY role_name`,
    [runtimeRoles],
  );
  const memberships = await client.query(
    `SELECT member.rolname AS member, granted.rolname AS role,
       membership.admin_option, membership.inherit_option, membership.set_option
     FROM pg_catalog.pg_auth_members membership
     JOIN pg_catalog.pg_roles member ON member.oid = membership.member
     JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
     WHERE member.rolname = ANY($1::name[]) OR granted.rolname = ANY($1::name[])
     ORDER BY member.rolname, granted.rolname`,
    [runtimeRoles],
  );
  const ownedObjects = await client.query(
    `SELECT namespace.nspname AS schema, namespace.nspname AS name, 'schema' AS kind, owner.rolname AS owner
     FROM pg_catalog.pg_namespace namespace
     JOIN pg_catalog.pg_roles owner ON owner.oid = namespace.nspowner
     WHERE owner.rolname = ANY($1::name[])
     UNION ALL
     SELECT namespace.nspname, relation.relname,
       CASE relation.relkind
         WHEN 'S' THEN 'sequence'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'view'
         ELSE 'table'
       END,
       owner.rolname
     FROM pg_catalog.pg_class relation
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
     JOIN pg_catalog.pg_roles owner ON owner.oid = relation.relowner
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_toast'
       AND relation.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
       AND owner.rolname = ANY($1::name[])
     UNION ALL
     SELECT namespace.nspname, routine.proname, 'function', owner.rolname
     FROM pg_catalog.pg_proc routine
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = routine.pronamespace
     JOIN pg_catalog.pg_roles owner ON owner.oid = routine.proowner
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_'
       AND owner.rolname = ANY($1::name[])
     ORDER BY 1, 2, 3, 4`,
    [runtimeRoles],
  );
  const schemaPrivileges = await client.query(
    `SELECT namespace.nspname AS schema,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege, acl.is_grantable
     FROM pg_catalog.pg_namespace namespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(namespace.nspacl, pg_catalog.acldefault('n', namespace.nspowner))
     ) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_'
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3`,
    [runtimeRoles],
  );
  const relationPrivileges = await client.query(
    `SELECT namespace.nspname AS schema, relation.relname AS name,
       CASE relation.relkind
         WHEN 'S' THEN 'sequence'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'view'
         ELSE 'table'
       END AS kind,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege, acl.is_grantable
     FROM pg_catalog.pg_class relation
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(relation.relacl, pg_catalog.acldefault(
         CASE WHEN relation.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END,
         relation.relowner
       ))
     ) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_toast'
       AND relation.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3, 4, 5`,
    [runtimeRoles],
  );
  const columnPrivileges = await client.query(
    `SELECT namespace.nspname AS schema, relation.relname AS name, attribute.attname AS column,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege, acl.is_grantable
     FROM pg_catalog.pg_attribute attribute
     JOIN pg_catalog.pg_class relation ON relation.oid = attribute.attrelid
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_toast'
       AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND attribute.attnum > 0 AND NOT attribute.attisdropped
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3, 4, 5, 6`,
    [runtimeRoles],
  );
  const functionPrivileges = await client.query(
    `SELECT namespace.nspname AS schema, routine.proname AS name,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege, acl.is_grantable
     FROM pg_catalog.pg_proc routine
     JOIN pg_catalog.pg_namespace namespace ON namespace.oid = routine.pronamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(routine.proacl) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE routine.proacl IS NOT NULL
       AND namespace.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace.nspname !~ '^pg_'
       AND (acl.grantee = 0 OR grantee.rolname = ANY($1::name[]))
     ORDER BY 1, 2, 3, 4`,
    [runtimeRoles],
  );
  const defaultPrivileges = await client.query(
    `SELECT owner.rolname AS owner, COALESCE(namespace.nspname, '*') AS schema,
       defaults.defaclobjtype AS object_type,
       CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
       acl.privilege_type AS privilege, acl.is_grantable
     FROM pg_catalog.pg_default_acl defaults
     JOIN pg_catalog.pg_roles owner ON owner.oid = defaults.defaclrole
     LEFT JOIN pg_catalog.pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) acl
     LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
     WHERE acl.grantee = 0 OR grantee.rolname = ANY($1::name[])
     ORDER BY 1, 2, 3, 4, 5, 6`,
    [runtimeRoles],
  );

  return {
    roles: roleRows.rows,
    databaseOwnerRole: databaseOwner.rows[0]?.role ?? null,
    databaseCreatePrivileges: databaseCreatePrivileges.rows,
    effectiveDatabaseCreate: effectiveDatabaseCreate.rows,
    memberships: memberships.rows,
    ownedObjects: ownedObjects.rows,
    schemaPrivileges: schemaPrivileges.rows,
    relationPrivileges: relationPrivileges.rows,
    columnPrivileges: columnPrivileges.rows,
    functionPrivileges: functionPrivileges.rows,
    defaultPrivileges: defaultPrivileges.rows,
  };
}
