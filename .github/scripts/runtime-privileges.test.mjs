import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRuntimeCapabilityPrivilegeContract,
  runtimeCapabilityContracts,
} from "./runtime-privileges.mjs";

const roles = {
  localizationRole: "localization_runtime",
  webRole: "web_runtime",
};

function relationRows(role, contract) {
  return Object.entries(contract.relations).flatMap(([name, privileges]) =>
    privileges.map((privilege) => ({
      schema: "public",
      name,
      kind: "table",
      grantee: role,
      privilege,
      is_grantable: false,
    }))
  );
}

function fixture() {
  return {
    roles: [
      {
        rolname: roles.localizationRole,
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolcanlogin: true,
        rolreplication: false,
        rolbypassrls: false,
      },
      {
        rolname: roles.webRole,
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolcanlogin: true,
        rolreplication: false,
        rolbypassrls: false,
      },
    ],
    databaseOwnerRole: "database_owner",
    databaseCreatePrivileges: [],
    effectiveDatabaseConnect: [
      { role: roles.localizationRole, has_connect: true },
      { role: roles.webRole, has_connect: true },
    ],
    effectiveDatabaseCreate: [
      { role: roles.localizationRole, has_create: false },
      { role: roles.webRole, has_create: false },
    ],
    memberships: [
      {
        member: "database_owner",
        role: roles.localizationRole,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
      {
        member: "database_owner",
        role: roles.webRole,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
    ],
    ownedObjects: [],
    schemaPrivileges: [
      { schema: "public", grantee: "PUBLIC", privilege: "USAGE", is_grantable: false },
      { schema: "public", grantee: roles.localizationRole, privilege: "USAGE", is_grantable: false },
      { schema: "public", grantee: roles.webRole, privilege: "USAGE", is_grantable: false },
    ],
    relationPrivileges: [
      ...relationRows(roles.localizationRole, runtimeCapabilityContracts["localization-read"]),
      ...relationRows(roles.webRole, runtimeCapabilityContracts.web),
    ],
    columnPrivileges: [],
    functionPrivileges: [],
    defaultPrivileges: [],
  };
}

test("accepts exact localization-read and web runtime capability contracts", () => {
  assert.doesNotThrow(() =>
    assertRuntimeCapabilityPrivilegeContract(fixture(), roles)
  );
});

test("requires distinct runtime roles", () => {
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(fixture(), {
      localizationRole: roles.localizationRole,
      webRole: roles.localizationRole,
    }),
    /must be distinct/,
  );
});

test("requires both runtime roles to exist and LOGIN", () => {
  const missing = fixture();
  missing.roles = missing.roles.filter(({ rolname }) => rolname !== roles.webRole);
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(missing, roles),
    /Expected runtime role web_runtime/,
  );

  const noLogin = fixture();
  noLogin.roles.find(({ rolname }) => rolname === roles.webRole).rolcanlogin = false;
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(noLogin, roles),
    /must be able to log in/,
  );
});

test("requires effective database CONNECT for both runtime roles", () => {
  for (const role of [roles.localizationRole, roles.webRole]) {
    const candidate = fixture();
    candidate.effectiveDatabaseConnect.find(
      ({ role: candidateRole }) => candidateRole === role,
    ).has_connect = false;
    assert.throws(
      () => assertRuntimeCapabilityPrivilegeContract(candidate, roles),
      /must have effective database CONNECT/,
    );
  }
});

test("rejects dangerous attributes, database ownership and CREATE", () => {
  const dangerous = fixture();
  dangerous.roles.find(({ rolname }) => rolname === roles.webRole).rolbypassrls = true;
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(dangerous, roles),
    /rolbypassrls/,
  );

  const databaseOwner = fixture();
  databaseOwner.databaseOwnerRole = roles.webRole;
  databaseOwner.memberships = [];
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(databaseOwner, roles),
    /must not own the current database/,
  );

  const effectiveCreate = fixture();
  effectiveCreate.effectiveDatabaseCreate.find(({ role }) => role === roles.webRole).has_create = true;
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(effectiveCreate, roles),
    /must not have effective database CREATE/,
  );

  const directCreate = fixture();
  directCreate.databaseCreatePrivileges.push({
    grantee: roles.webRole,
    grantor: "database_owner",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(directCreate, roles),
    /must not have direct database CREATE/,
  );

  const publicCreate = fixture();
  publicCreate.databaseCreatePrivileges.push({
    grantee: "PUBLIC",
    grantor: "database_owner",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(publicCreate, roles),
    /PUBLIC must not have database CREATE/,
  );
});

test("rejects outbound memberships and unsafe inbound memberships", () => {
  const outbound = fixture();
  outbound.memberships.push({
    member: roles.webRole,
    role: "other_role",
    admin_option: false,
    inherit_option: true,
    set_option: true,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(outbound, roles),
    /must not inherit from another role/,
  );

  const wrongInbound = fixture();
  wrongInbound.memberships.push({
    member: "unexpected_owner",
    role: roles.webRole,
    admin_option: true,
    inherit_option: false,
    set_option: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(wrongInbound, roles),
    /Only database owner/,
  );

  for (const option of ["admin_option", "inherit_option", "set_option"]) {
    const candidate = fixture();
    const membership = candidate.memberships.find(({ role }) => role === roles.webRole);
    membership[option] = !membership[option];
    assert.throws(
      () => assertRuntimeCapabilityPrivilegeContract(candidate, roles),
      option === "admin_option"
        ? /retain ADMIN OPTION/
        : option === "inherit_option"
          ? /must not inherit privileges/
          : /must not SET ROLE/,
    );
  }
});

test("rejects runtime object ownership", () => {
  for (const ownedObject of [
    {
      schema: "public",
      name: "forum_topics",
      kind: "table",
      owner: roles.webRole,
    },
    {
      schema: "public",
      name: "helper",
      kind: "function",
      owner: roles.localizationRole,
    },
  ]) {
    const candidate = fixture();
    candidate.ownedObjects.push(ownedObject);
    assert.throws(
      () => assertRuntimeCapabilityPrivilegeContract(candidate, roles),
      /must not own schemas, tables, sequences, views, or functions/,
    );
  }
});

test("requires exact public schema USAGE without grant option", () => {
  const missing = fixture();
  missing.schemaPrivileges = missing.schemaPrivileges.filter(
    ({ grantee }) => grantee !== roles.webRole,
  );
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(missing, roles),
    /Unexpected schema privileges/,
  );

  const create = fixture();
  create.schemaPrivileges.push({
    schema: "public",
    grantee: roles.webRole,
    privilege: "CREATE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(create, roles),
    /Unexpected schema privileges/,
  );

  const grantable = fixture();
  grantable.schemaPrivileges.find(({ grantee }) => grantee === roles.webRole).is_grantable = true;
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(grantable, roles),
    /Unexpected schema privileges/,
  );
});

test("requires exact localization and web relation ACLs", () => {
  const missing = fixture();
  missing.relationPrivileges = missing.relationPrivileges.filter(
    ({ grantee, name, privilege }) =>
      !(grantee === roles.webRole && name === "forum_topics" && privilege === "UPDATE"),
  );
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(missing, roles),
    /Unexpected relation privileges/,
  );

  const crossDomain = fixture();
  crossDomain.relationPrivileges.push({
    schema: "public",
    name: "translation_tasks",
    kind: "table",
    grantee: roles.webRole,
    privilege: "SELECT",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(crossDomain, roles),
    /Unexpected relation privileges/,
  );

  const mutation = fixture();
  mutation.relationPrivileges.push({
    schema: "public",
    name: "locales",
    kind: "table",
    grantee: roles.localizationRole,
    privilege: "UPDATE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(mutation, roles),
    /Unexpected relation privileges/,
  );

  const sequence = fixture();
  sequence.relationPrivileges.push({
    schema: "public",
    name: "future_id_seq",
    kind: "sequence",
    grantee: roles.webRole,
    privilege: "USAGE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(sequence, roles),
    /Unexpected relation privileges/,
  );

  const grantable = fixture();
  grantable.relationPrivileges.find(
    ({ grantee, name }) => grantee === roles.webRole && name === "user",
  ).is_grantable = true;
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(grantable, roles),
    /Unexpected relation privileges/,
  );
});

test("rejects direct column, function and default privileges", () => {
  const column = fixture();
  column.columnPrivileges.push({
    schema: "public",
    name: "user",
    column: "email",
    grantee: roles.webRole,
    privilege: "UPDATE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(column, roles),
    /column-level privileges/,
  );

  const fn = fixture();
  fn.functionPrivileges.push({
    schema: "public",
    name: "helper",
    grantee: roles.webRole,
    privilege: "EXECUTE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(fn, roles),
    /function privileges/,
  );

  const defaults = fixture();
  defaults.defaultPrivileges.push({
    owner: "migration",
    schema: "public",
    object_type: "r",
    grantee: roles.webRole,
    privilege: "SELECT",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(defaults, roles),
    /default privileges/,
  );
});

test("allows only hard-wired-equivalent PUBLIC function/type defaults", () => {
  const candidate = fixture();
  candidate.defaultPrivileges.push(
    {
      owner: "migration",
      schema: "*",
      object_type: "f",
      grantee: "PUBLIC",
      privilege: "EXECUTE",
      is_grantable: false,
    },
    {
      owner: "migration",
      schema: "*",
      object_type: "T",
      grantee: "PUBLIC",
      privilege: "USAGE",
      is_grantable: false,
    },
  );
  assert.doesNotThrow(() =>
    assertRuntimeCapabilityPrivilegeContract(candidate, roles)
  );
});

test("allows PUBLIC schema USAGE to be absent", () => {
  const candidate = fixture();
  candidate.schemaPrivileges = candidate.schemaPrivileges.filter(
    ({ grantee }) => grantee !== "PUBLIC",
  );
  assert.doesNotThrow(() =>
    assertRuntimeCapabilityPrivilegeContract(candidate, roles)
  );
});

test("rejects unexpected PUBLIC privileges", () => {
  const schema = fixture();
  schema.schemaPrivileges.push({
    schema: "public",
    grantee: "PUBLIC",
    privilege: "CREATE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(schema, roles),
    /Unexpected PUBLIC schema privileges/,
  );

  const relation = fixture();
  relation.relationPrivileges.push({
    schema: "public",
    name: "user",
    kind: "table",
    grantee: "PUBLIC",
    privilege: "SELECT",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(relation, roles),
    /PUBLIC must not have relation/,
  );

  const fn = fixture();
  fn.functionPrivileges.push({
    schema: "public",
    name: "helper",
    grantee: "PUBLIC",
    privilege: "EXECUTE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(fn, roles),
    /PUBLIC must not have explicit function privileges/,
  );

  const defaults = fixture();
  defaults.defaultPrivileges.push({
    owner: "migration",
    schema: "public",
    object_type: "r",
    grantee: "PUBLIC",
    privilege: "SELECT",
    is_grantable: false,
  });
  assert.throws(
    () => assertRuntimeCapabilityPrivilegeContract(defaults, roles),
    /PUBLIC must not receive unexpected custom default privileges/,
  );
});
