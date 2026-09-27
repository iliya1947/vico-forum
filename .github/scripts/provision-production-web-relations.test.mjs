import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_MIGRATOR_ROLE,
  OWNER_PHASE_CONFIRMATION_TOKEN,
  assertOwnerPhaseConfirmation,
  assertRelationProvisioningPrerequisites,
  buildWebRelationGrantStatements,
  executeWebRelationProvisioning,
  expectedWebRelationNames,
  runCli,
} from "./provision-production-web-relations.mjs";
import { runtimeCapabilityContracts } from "./runtime-privileges.mjs";

const roles = {
  localizationRole: "vico_forum_runtime",
  webRole: "vico_forum_web",
};

function prerequisiteFixture() {
  return {
    currentUser: EXPECTED_MIGRATOR_ROLE,
    databaseOwnerRole: "vico_forum_owner",
    webRoleRows: [
      {
        rolname: roles.webRole,
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolinherit: false,
        rolcanlogin: true,
        rolreplication: false,
        rolbypassrls: false,
      },
    ],
    memberships: [
      {
        member: "vico_forum_owner",
        role: roles.webRole,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
    ],
    effectiveDatabaseConnect: true,
    effectiveDatabaseCreate: false,
    databasePrivileges: [
      {
        privilege: "CONNECT",
        is_grantable: false,
      },
    ],
    schemaPrivileges: [
      {
        schema: "public",
        privilege: "USAGE",
        is_grantable: false,
      },
    ],
    relationOwners: expectedWebRelationNames().map((name) => ({
      name,
      kind: "r",
      owner: EXPECTED_MIGRATOR_ROLE,
    })),
  };
}

test("derives every relation grant directly from the shared web contract", () => {
  const statements = buildWebRelationGrantStatements(roles.webRole);
  const entries = Object.entries(runtimeCapabilityContracts.web.relations);

  assert.equal(statements.length, entries.length);
  for (const [index, [name, privileges]] of entries.entries()) {
    assert.equal(
      statements[index],
      `GRANT ${privileges.join(", ")} ON TABLE public."${name}" TO "vico_forum_web"`,
    );
  }
  assert.match(
    statements.find((statement) => statement.includes('public."user"')),
    /GRANT DELETE, INSERT, SELECT, UPDATE/,
  );
});

test("requires the exact owner-phase confirmation token", () => {
  assert.doesNotThrow(() =>
    assertOwnerPhaseConfirmation(OWNER_PHASE_CONFIRMATION_TOKEN)
  );
  for (const value of [undefined, "", "confirmed", "password-null-confirmed"]) {
    assert.throws(
      () => assertOwnerPhaseConfirmation(value),
      /OWNER_PHASE_CONFIRMATION/,
    );
  }
});

test("accepts exact observable owner-phase prerequisites", () => {
  assert.doesNotThrow(() =>
    assertRelationProvisioningPrerequisites(prerequisiteFixture(), roles)
  );
});

test("rejects wrong execution identity and unsafe visible role attributes", () => {
  const identity = prerequisiteFixture();
  identity.currentUser = "vico_forum_owner";
  assert.throws(
    () => assertRelationProvisioningPrerequisites(identity, roles),
    /must execute as exact vico_forum_migrator/,
  );

  for (const [attribute, value] of [
    ["rolcanlogin", false],
    ["rolinherit", true],
    ["rolsuper", true],
    ["rolcreatedb", true],
    ["rolcreaterole", true],
    ["rolreplication", true],
    ["rolbypassrls", true],
  ]) {
    const candidate = prerequisiteFixture();
    candidate.webRoleRows[0][attribute] = value;
    assert.throws(
      () => assertRelationProvisioningPrerequisites(candidate, roles),
      /Target web role/,
    );
  }
});

test("rejects missing or unsafe owner membership", () => {
  const missing = prerequisiteFixture();
  missing.memberships = [];
  assert.throws(
    () => assertRelationProvisioningPrerequisites(missing, roles),
    /automatic database-owner admin membership/,
  );

  for (const option of ["admin_option", "inherit_option", "set_option"]) {
    const candidate = prerequisiteFixture();
    candidate.memberships[0][option] = !candidate.memberships[0][option];
    assert.throws(
      () => assertRelationProvisioningPrerequisites(candidate, roles),
      /automatic database-owner admin membership/,
    );
  }
});

test("rejects database and schema prerequisite drift", () => {
  const noConnect = prerequisiteFixture();
  noConnect.effectiveDatabaseConnect = false;
  assert.throws(
    () => assertRelationProvisioningPrerequisites(noConnect, roles),
    /effective database CONNECT/,
  );

  const create = prerequisiteFixture();
  create.effectiveDatabaseCreate = true;
  assert.throws(
    () => assertRelationProvisioningPrerequisites(create, roles),
    /effective database CREATE/,
  );

  const databaseAcl = prerequisiteFixture();
  databaseAcl.databasePrivileges.push({
    privilege: "TEMPORARY",
    is_grantable: false,
  });
  assert.throws(
    () => assertRelationProvisioningPrerequisites(databaseAcl, roles),
    /exact direct non-grantable database CONNECT/,
  );

  const schemaAcl = prerequisiteFixture();
  schemaAcl.schemaPrivileges.push({
    schema: "public",
    privilege: "CREATE",
    is_grantable: false,
  });
  assert.throws(
    () => assertRelationProvisioningPrerequisites(schemaAcl, roles),
    /exact public schema USAGE/,
  );
});

test("requires exact migrator ownership of every web relation", () => {
  const missing = prerequisiteFixture();
  missing.relationOwners.pop();
  assert.throws(
    () => assertRelationProvisioningPrerequisites(missing, roles),
    /exist exactly once/,
  );

  const wrongOwner = prerequisiteFixture();
  wrongOwner.relationOwners[0].owner = "vico_forum_owner";
  assert.throws(
    () => assertRelationProvisioningPrerequisites(wrongOwner, roles),
    /owned by vico_forum_migrator/,
  );

  const wrongKind = prerequisiteFixture();
  wrongKind.relationOwners[0].kind = "v";
  assert.throws(
    () => assertRelationProvisioningPrerequisites(wrongKind, roles),
    /table relation/,
  );
});

test("commits exact derived grants only after full shared end-state assertion", async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      return { rows: [] };
    },
  };
  let asserted = false;

  await executeWebRelationProvisioning(
    client,
    roles,
    {
      async readPrerequisites() {
        return prerequisiteFixture();
      },
      async readRuntimeSnapshot() {
        return { marker: "snapshot" };
      },
      assertRuntimeContract(snapshot, actualRoles) {
        assert.deepEqual(snapshot, { marker: "snapshot" });
        assert.deepEqual(actualRoles, roles);
        asserted = true;
      },
    },
  );

  assert.equal(queries[0], "BEGIN");
  assert.deepEqual(
    queries.slice(1, -1),
    buildWebRelationGrantStatements(roles.webRole),
  );
  assert.equal(queries.at(-1), "COMMIT");
  assert.equal(asserted, true);
});

test("rolls back when the shared end-state assertion fails", async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      return { rows: [] };
    },
  };

  await assert.rejects(
    executeWebRelationProvisioning(
      client,
      roles,
      {
        async readPrerequisites() {
          return prerequisiteFixture();
        },
        async readRuntimeSnapshot() {
          return {};
        },
        assertRuntimeContract() {
          throw new Error("forbidden drift");
        },
      },
    ),
    /forbidden drift/,
  );

  assert.equal(queries[0], "BEGIN");
  assert.ok(queries.includes("ROLLBACK"));
  assert.equal(queries.includes("COMMIT"), false);
});

test("confirmation failure occurs before provisioning and logs no secret", async () => {
  let provisionCalled = false;
  const errors = [];
  const code = await runCli({
    env: {
      OWNER_PHASE_CONFIRMATION: "wrong",
      DATABASE_URL: "postgresql://user:super-secret@example.invalid/db",
      RUNTIME_DATABASE_ROLE: roles.localizationRole,
      WEB_RUNTIME_DATABASE_ROLE: roles.webRole,
    },
    logger: {
      log() {},
      error(message) {
        errors.push(message);
      },
    },
    async provision() {
      provisionCalled = true;
    },
  });

  assert.equal(code, 1);
  assert.equal(provisionCalled, false);
  assert.deepEqual(errors, ["Production web relation provisioning failed."]);
  assert.doesNotMatch(errors.join("\n"), /super-secret|postgresql:\/\//);
});

test("successful CLI passes only explicit inputs and emits bounded success text", async () => {
  const calls = [];
  const logs = [];
  const databaseUrl = "postgresql://user:secret@example.invalid/db";

  const code = await runCli({
    env: {
      OWNER_PHASE_CONFIRMATION: OWNER_PHASE_CONFIRMATION_TOKEN,
      DATABASE_URL: databaseUrl,
      RUNTIME_DATABASE_ROLE: roles.localizationRole,
      WEB_RUNTIME_DATABASE_ROLE: roles.webRole,
    },
    logger: {
      log(message) {
        logs.push(message);
      },
      error() {
        throw new Error("unexpected error log");
      },
    },
    async provision(options) {
      calls.push(options);
    },
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [
    {
      databaseUrl,
      localizationRole: roles.localizationRole,
      webRole: roles.webRole,
      confirmation: OWNER_PHASE_CONFIRMATION_TOKEN,
    },
  ]);
  assert.deepEqual(logs, [
    "Production web relation grants verified and committed.",
  ]);
  assert.doesNotMatch(logs.join("\n"), /secret|postgresql:\/\//);
});
