/** Private disposable CI verifier. The production entrypoint never imports it.
 * Proof binding/expiry/replay are real fixture SQL operations, not client flags.
 */
import { Client } from "pg";
import { createApplication } from "../../../workers/app";
import { resolveRuntimeDatabaseConnectionStrings } from "../../../workers/database-bindings";
import { createConnectedMailRuntime } from "../auth-02b/worker-entry";

export default createApplication(createConnectedMailRuntime, async env => {
  const connectionString = resolveRuntimeDatabaseConnectionStrings(env).webConnectionString;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const db = await client.query("select current_database() db,current_schema() schema");
    if (env.BETTER_AUTH_URL !== "http://127.0.0.1:4242" || env.AUTH_MAIL_MODE !== "fake" ||
        db.rows[0]?.db !== "vico_auth02b_browser_test" || db.rows[0]?.schema !== "public") return { mode: "required" };
    const mode = await client.query("select mode from auth05_test_policy where id=1");
    if (mode.rows[0]?.mode === "disabled") return { mode: "disabled" };
    if (mode.rows[0]?.mode !== "required") return { mode: "required" };
  } finally { await client.end(); }
  return { mode: "required", verifier: {
    async verifyRegistrationChallenge({ proof, expected }) {
      const db = new Client({ connectionString });
      await db.connect();
      try {
        const result = await db.query<{ outcome: string }>(`
          update auth05_test_proofs set consumed=true
          where digest=encode(sha256(convert_to($1,'UTF8')),'hex') and purpose=$2 and method=$3
            and expires_at>clock_timestamp() and not consumed returning outcome
        `, [proof, expected.purpose, expected.method]);
        const outcome = result.rows[0]?.outcome;
        if (outcome === "timeout") return new Promise(() => {});
        if (outcome === "passed") return { status: "passed", binding: expected };
        if (outcome === "wrong-binding") return { status: "passed", binding: { ...expected, nonce: "wrong" } };
        return { status: outcome === "unavailable" || outcome === "uncertain" ? "unavailable" : "rejected" };
      } finally { await db.end(); }
    },
  } };
});
