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
    memberships: [{ member: "migration", role: "managed_service_admin" }],
    ownedObjects: [
      { schema: "public", name: "public", kind: "schema", owner: "pg_database_owner" },
      ...applicationTables.map((name) => ({ schema: "public", name, kind: "table", owner: "migration" })),
    ],
    schemaPrivileges: [
      { schema: "public", grantee: "PUBLIC", privilege: "USAGE" },
      { schema: "public", grantee: "runtime", privilege: "USAGE" },
    ],
    relationPrivileges: applicationTables.map((name) => ({
      schema: "public",
      name,
      kind: "table",
      grantee: "runtime",
      privilege: "SELECT",
    })),
    defaultPrivileges: [],
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
  membership.memberships.push({ member: "runtime", role: "writer" });
  assert.throws(() => assertProductionPrivilegeContract(membership, contract), /must not inherit/);

  const migrationMembership = fixture();
  migrationMembership.memberships.push({ member: "migration", role: "unexpected_admin" });
  assert.throws(() => assertProductionPrivilegeContract(migrationMembership, contract), /Unexpected memberships/);
});

test("rejects runtime ownership and wrong application-table ownership", () => {
  const runtimeOwner = fixture();
  runtimeOwner.ownedObjects.push({ schema: "other", name: "leak", kind: "table", owner: "runtime" });
  assert.throws(() => assertProductionPrivilegeContract(runtimeOwner, contract), /must not own/);

  const wrongOwner = fixture();
  wrongOwner.ownedObjects.find(({ name }) => name === "locales").owner = "someone_else";
  assert.throws(() => assertProductionPrivilegeContract(wrongOwner, contract), /own public.locales/);
});

test("rejects schema CREATE, table mutation, sequence, and cross-domain grants", () => {
  for (const grant of [
    { schema: "public", grantee: "runtime", privilege: "CREATE" },
    { schema: "private", grantee: "runtime", privilege: "USAGE" },
  ]) {
    const candidate = fixture();
    candidate.schemaPrivileges.push(grant);
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /schema privileges/);
  }

  for (const grant of [
    { schema: "public", name: "locales", kind: "table", grantee: "runtime", privilege: "UPDATE" },
    { schema: "public", name: "future_id_seq", kind: "sequence", grantee: "runtime", privilege: "USAGE" },
    { schema: "auth", name: "users", kind: "table", grantee: "runtime", privilege: "SELECT" },
  ]) {
    const candidate = fixture();
    candidate.relationPrivileges.push(grant);
    assert.throws(() => assertProductionPrivilegeContract(candidate, contract), /exactly SELECT/);
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
  });
  assert.throws(() => assertProductionPrivilegeContract(publicGrant, contract), /PUBLIC/);

  const defaults = fixture();
  defaults.defaultPrivileges.push({
    owner: "migration",
    schema: "public",
    object_type: "r",
    grantee: "runtime",
    privilege: "SELECT",
  });
  assert.throws(() => assertProductionPrivilegeContract(defaults, contract), /Default privileges/);
});
