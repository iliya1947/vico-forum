import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOTSTRAP_CONFIRMATION_TOKEN,
  EXPECTED_WEB_ROLE,
  assertBootstrapConfirmation,
  assertBootstrapPassword,
  assertBootstrapPreflight,
  assertDirectOwnerTarget,
  assertScramVerifier,
  deriveScramSha256Verifier,
  runCli,
} from "./bootstrap-production-web-credential.mjs";

test("derives the PostgreSQL SCRAM-SHA-256 verifier deterministically", () => {
  const verifier = deriveScramSha256Verifier(
    "CorrectHorseBatteryStaple!2026",
    {
      iterations: 4096,
      salt: Buffer.from([
        0, 1, 2, 3, 4, 5, 6, 7,
        8, 9, 10, 11, 12, 13, 14, 15,
      ]),
    },
  );

  assert.equal(
    verifier,
    "SCRAM-SHA-256$4096:AAECAwQFBgcICQoLDA0ODw==$hhw9HL0adFzc0hQr2cAYBiiZbmTq2FdmF07t+KqpzMk=:/PF/xI1JroPrBctA5PGCQMw2Y5qxTKi3KUaZFuTDfAU=",
  );
  assert.doesNotThrow(() => assertScramVerifier(verifier));
});

test("requires the exact bootstrap confirmation token", () => {
  assert.doesNotThrow(() =>
    assertBootstrapConfirmation(BOOTSTRAP_CONFIRMATION_TOKEN)
  );
  for (const value of [undefined, "", "confirmed", "web-bootstrap-confirmed"]) {
    assert.throws(
      () => assertBootstrapConfirmation(value),
      /BOOTSTRAP_CONFIRMATION/,
    );
  }
});

test("requires a bounded printable-ASCII bootstrap password", () => {
  assert.doesNotThrow(() =>
    assertBootstrapPassword("A-strong-random-password-2026!")
  );

  for (const password of [
    "",
    "too-short",
    "contains space but is otherwise long enough",
    "non-ascii-password-ёжик-2026",
  ]) {
    assert.throws(() => assertBootstrapPassword(password));
  }
});


function preflightFixture() {
  return {
    identity: {
      current_user: "vico_forum_owner",
      session_user: "vico_forum_owner",
      current_database: "vico_forum",
    },
    server: {
      version_num: 170000,
      server_encoding: "UTF8",
      log_parameter_max_length_on_error: 0,
      scram_iterations: 4096,
    },
    roleRows: [
      {
        rolname: "vico_forum_web",
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
        role: "vico_forum_web",
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
    ],
    settings: ["lock_timeout=2s", "statement_timeout=5s"],
    runtimeSnapshot: {},
  };
}

test("rejects wrong owner identity before any credential mutation", () => {
  const candidate = preflightFixture();
  candidate.identity.current_user = "vico_forum_migrator";
  assert.throws(
    () => assertBootstrapPreflight(candidate),
    /execute as exact vico_forum_owner/,
  );
});

test("rejects unsafe web role attributes before shared ACL assertion", () => {
  const candidate = preflightFixture();
  candidate.roleRows[0].rolcreaterole = true;
  assert.throws(
    () => assertBootstrapPreflight(candidate),
    /must not have rolcreaterole/,
  );
});

test("rejects deadline-default drift before shared ACL assertion", () => {
  const candidate = preflightFixture();
  candidate.settings = ["lock_timeout=2s"];
  assert.throws(
    () => assertBootstrapPreflight(candidate),
    /exact accepted database-role defaults/,
  );
});


test("rejects full runtime ACL drift before credential mutation", () => {
  const candidate = preflightFixture();
  assert.throws(
    () => assertBootstrapPreflight(candidate),
    /Expected current database owner role/,
  );
});

test("accepts only the exact direct Neon production target", () => {
  assert.doesNotThrow(() =>
    assertDirectOwnerTarget(
      "postgresql://owner:secret@ep-example.eu-central-1.aws.neon.tech/vico_forum?sslmode=require",
    )
  );

  assert.throws(
    () =>
      assertDirectOwnerTarget(
        "postgresql://owner:secret@ep-example-pooler.eu-central-1.aws.neon.tech/vico_forum?sslmode=require",
      ),
    /direct\/unpooled/,
  );
  assert.throws(
    () =>
      assertDirectOwnerTarget(
        "postgresql://owner:secret@example.invalid/vico_forum",
      ),
    /Neon origin/,
  );
  assert.throws(
    () =>
      assertDirectOwnerTarget(
        "postgresql://owner:secret@ep-example.eu-central-1.aws.neon.tech/not_vico",
      ),
    /exact database vico_forum/,
  );
});

test("CLI never logs owner URL, password, or verifier on failure", async () => {
  const ownerUrl =
    "postgresql://owner:owner-secret@ep-example.eu-central-1.aws.neon.tech/vico_forum";
  const password = "WebBootstrapSecret-2026-Example!";
  const verifier =
    "SCRAM-SHA-256$4096:AAECAwQFBgcICQoLDA0ODw==$hhw9HL0adFzc0hQr2cAYBiiZbmTq2FdmF07t+KqpzMk=:/PF/xI1JroPrBctA5PGCQMw2Y5qxTKi3KUaZFuTDfAU=";
  const output = [];

  const code = await runCli({
    env: {
      BOOTSTRAP_CONFIRMATION: BOOTSTRAP_CONFIRMATION_TOKEN,
      NEON_OWNER_DATABASE_URL: ownerUrl,
      WEB_RUNTIME_DATABASE_ROLE: EXPECTED_WEB_ROLE,
      WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP: password,
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async bootstrap() {
      throw new Error(
        "sensitive failure " + ownerUrl + " " + password + " " + verifier,
      );
    },
  });

  assert.equal(code, 1);
  assert.deepEqual(output, ["Production web credential bootstrap failed."]);
  const rendered = output.join("\n");
  assert.doesNotMatch(rendered, /owner-secret|WebBootstrapSecret|SCRAM-SHA-256|postgresql:\/\//);
});

test("successful CLI forwards secrets only to the bootstrap boundary", async () => {
  const calls = [];
  const output = [];
  const env = {
    BOOTSTRAP_CONFIRMATION: BOOTSTRAP_CONFIRMATION_TOKEN,
    NEON_OWNER_DATABASE_URL:
      "postgresql://owner:secret@ep-example.eu-central-1.aws.neon.tech/vico_forum",
    WEB_RUNTIME_DATABASE_ROLE: EXPECTED_WEB_ROLE,
    WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP:
      "WebBootstrapSecret-2026-Example!",
  };

  const code = await runCli({
    env,
    logger: {
      log(message) {
        output.push(message);
      },
      error() {
        throw new Error("unexpected error output");
      },
    },
    async bootstrap(options) {
      calls.push(options);
    },
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [
    {
      ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
      webRole: EXPECTED_WEB_ROLE,
      password: env.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP,
      confirmation: BOOTSTRAP_CONFIRMATION_TOKEN,
    },
  ]);
  assert.deepEqual(output, ["Production web credential bootstrap verified."]);
  assert.doesNotMatch(output.join("\n"), /secret|postgresql:\/\//i);
});
