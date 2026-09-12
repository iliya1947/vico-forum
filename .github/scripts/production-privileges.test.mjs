import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationTables,
  assertProductionPrivilegeContract,
} from "./production-privileges.mjs";

const contract = {
  migrationRole: "migration",
  runtimeRole: "runtime",
  migrationMemberships: ["managed_service_admin"],
};

function fixture() {
  return {
    roles: [
      {
        rolname: "migration",
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolcanlogin: true,
        rolreplication: false,
        rolbypassrls: false,
      },
      {
        rolname: "runtime",
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolcanlogin: true,
        rolreplication: false,
        rolbypassrls: false,
      },
    ],
    memberships: [
      {
        member: "migration",
        role: "managed_service_admin",
        admin_option: false,
        inherit_option: true,
        set_option: true,
      },
    ],
    ownedObjects: [
      { schema: "public", name: "public", kind: "schema", owner: "pg_database_owner" },
      ...applicationTables.map((name) => ({ schema: "public", name, kind: "table", owner: "migration" })),
    ],
    schemaPrivileges: [
      { schema: "public", grantee: "PUBLIC", privilege: "USAGE", is_grantable: false },
      { schema: "public", grantee: "runtime", privilege: "USAGE", is_grantable: false },
    ],
    relationPrivileges: applicationTables.map((name) => ({
      schema: "public",
      name,
      kind: "table",
      grantee: "runtime",
      privilege: "SELECT",
      is_grantable: false,
    })),
    columnPrivileges: [],
    defaultPrivileges: [
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
    ],
    otherDefaultPrivileges: [],
  };
}

test("accepts the current read-only localization privilege contract", () => {
  assert.doesNotThrow(() => assertProductionPrivilegeContract(fixture(), contract));
});

test("rejects dangerous role attributes and runtime memberships", () => {
  const dangerous = fixture();
  dangerous.roles[1].rolbypassrls = true;
  assert.throws(() => assertProductionPrivilegeContract(dangerous, contract), /rolbypassrls/);

  const membership = fixture();
  membership.memberships.push({
    member: "runtime",
    role: "writer",
    admin_option: false,
    inherit_option: true,
    set_option: true,
  });
  assert.throws(() => assertProductionPrivilegeContract(membership, contract), /must not inherit/);

  const migrationMembership = fixture();
  migrationMembership.memberships.push({
    member: "migration",
    role: "unexpected_admin",
    admin_option: false,
    inherit_option: true,
    set_option: true,
  });
  assert.throws(() => assertProductionPrivilegeContract(migrationMembership, contract), /Unexpected memberships/);
});

test("rejects changes to significant migration membership options", () => {
  for (const option of ["admin_option", "inherit_option", "set_option"]) {
    const candidate = fixture();
    candidate.memberships[0][option] = !candidate.memberships[0][option];
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /Unexpected memberships/);
  }
});

test("rejects inbound memberships in runtime and migration roles", () => {
  for (const role of ["runtime", "migration"]) {
    const candidate = fixture();
    candidate.memberships.push({
      member: "unexpected_login",
      role,
      admin_option: false,
      inherit_option: true,
      set_option: true,
    });
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /Other roles/);
  }
});

test("rejects runtime ownership and wrong application-table ownership", () => {
  const runtimeOwner = fixture();
  runtimeOwner.ownedObjects.push({ schema: "other", name: "leak", kind: "table", owner: "runtime" });
  assert.throws(() => assertProductionPrivilegeContract(runtimeOwner, contract), /must not own/);

  const wrongOwner = fixture();
  wrongOwner.ownedObjects.find(({ name }) => name === "locales").owner = "someone_else";
  assert.throws(() => assertProductionPrivilegeContract(wrongOwner, contract), /own public.locales/);

  const foreignTableOwner = fixture();
  foreignTableOwner.ownedObjects.push({
    schema: "external",
    name: "private_users",
    kind: "table",
    owner: "runtime",
  });
  assert.throws(() => assertProductionPrivilegeContract(foreignTableOwner, contract), /must not own/);
});

test("rejects schema CREATE, table mutation, sequence, and cross-domain grants", () => {
  for (const grant of [
    { schema: "public", grantee: "runtime", privilege: "CREATE", is_grantable: false },
    { schema: "private", grantee: "runtime", privilege: "USAGE", is_grantable: false },
  ]) {
    const candidate = fixture();
    candidate.schemaPrivileges.push(grant);
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /schema privileges/);
  }

  for (const grant of [
    { schema: "public", name: "locales", kind: "table", grantee: "runtime", privilege: "UPDATE", is_grantable: false },
    { schema: "public", name: "future_id_seq", kind: "sequence", grantee: "runtime", privilege: "USAGE", is_grantable: false },
    { schema: "auth", name: "users", kind: "table", grantee: "runtime", privilege: "SELECT", is_grantable: false },
    { schema: "external", name: "private_users", kind: "table", grantee: "runtime", privilege: "SELECT", is_grantable: false },
  ]) {
    const candidate = fixture();
    candidate.relationPrivileges.push(grant);
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /exactly SELECT/);
  }
});

test("rejects schema and relation grant options", () => {
  const schemaGrantOption = fixture();
  schemaGrantOption.schemaPrivileges.find(({ grantee }) => grantee === "runtime").is_grantable = true;
  assert.throws(() => assertProductionPrivilegeContract(schemaGrantOption, contract), /schema privileges/);

  const tableGrantOption = fixture();
  tableGrantOption.relationPrivileges[0].is_grantable = true;
  assert.throws(() => assertProductionPrivilegeContract(tableGrantOption, contract), /exactly SELECT/);
});

test("rejects runtime and PUBLIC column-level privileges", () => {
  for (const grantee of ["runtime", "PUBLIC"]) {
    const candidate = fixture();
    candidate.columnPrivileges.push({
      schema: "public",
      name: "locales",
      column: "tag",
      grantee,
      privilege: "UPDATE",
      is_grantable: false,
    });
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /column-level/);
  }
});

test("rejects grants to PUBLIC and broadening default privileges", () => {
  const publicGrant = fixture();
  publicGrant.relationPrivileges.push({
    schema: "public",
    name: "locales",
    kind: "table",
    grantee: "PUBLIC",
    privilege: "SELECT",
    is_grantable: false,
  });
  assert.throws(() => assertProductionPrivilegeContract(publicGrant, contract), /PUBLIC/);

  const applicationDefaults = fixture();
  applicationDefaults.defaultPrivileges.push({
    owner: "migration", schema: "public", object_type: "r", grantee: "runtime",
    privilege: "SELECT", is_grantable: false,
  });
  assert.throws(() => assertProductionPrivilegeContract(applicationDefaults, contract), /effective default/);

  const otherDefaults = fixture();
  otherDefaults.otherDefaultPrivileges.push({
    owner: "other", schema: "public", object_type: "S", grantee: "PUBLIC",
    privilege: "USAGE", is_grantable: false,
  });
  assert.throws(() => assertProductionPrivilegeContract(otherDefaults, contract), /Another role/);

  const otherSchemaDefaults = fixture();
  otherSchemaDefaults.otherDefaultPrivileges.push({
    owner: "other", schema: "*", object_type: "n", grantee: "PUBLIC",
    privilege: "USAGE", is_grantable: false,
  });
  assert.throws(() => assertProductionPrivilegeContract(otherSchemaDefaults, contract), /Another role/);
});
