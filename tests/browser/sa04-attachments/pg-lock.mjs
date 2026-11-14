/**
 * Disposable K5 PostgreSQL lock orchestrator. No application or production API.
 * Commands are JSON-lines over stdin; every held transaction uses this one
 * actual PG connection so pg_blocking_pids can prove the race ordering.
 */
import pg from "pg";
import readline from "node:readline";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const parsed = new URL(url);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
  throw new Error("only disposable loopback test database");
}
const client = new pg.Client({ connectionString: url, application_name: "sa04_k5_lock" });
await client.connect();
let inTransaction = false;
async function command(input) {
  switch (input.action) {
    case "begin-scope": {
      if (inTransaction) throw new Error("lock already held");
      await client.query("begin"); inTransaction = true;
      const scope = JSON.stringify([input.actor, input.context]);
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [scope]);
      return { locked: "scope" };
    }
    case "begin-actor": {
      if (inTransaction) throw new Error("lock already held");
      await client.query("begin"); inTransaction = true;
      const found = await client.query('select id from "user" where id=$1 for update', [input.actor]);
      if (found.rows.length !== 1) throw new Error("actor row missing");
      return { locked: "actor" };
    }
    case "begin-journal": {
      if (inTransaction) throw new Error("lock already held");
      await client.query("begin"); inTransaction = true;
      const found = await client.query(
        "select object_key,reservation_etag from forum_attachment_upload_objects where object_key=$1 for update",
        [input.key]);
      if (found.rows.length !== 1 || found.rows[0].reservation_etag !== null) {
        throw new Error("journal PREPARING row missing or already READY");
      }
      return { locked: "journal" };
    }
    case "deactivate": {
      if (!inTransaction) throw new Error("no active transaction");
      const changed = await client.query(
        "update \"user\" set deactivated_at=now(),deactivated_by_user_id=$1,"
        + "retain_at_least_until=now()+interval '2 years' "
        + "where id=$1 and deactivated_at is null returning id", [input.actor]);
      if (changed.rows.length !== 1) throw new Error("deactivation failed");
      return { deactivated: input.actor };
    }
    case "commit":
      if (inTransaction) { await client.query("commit"); inTransaction = false; }
      return { committed: true };
    case "rollback":
      if (inTransaction) { await client.query("rollback"); inTransaction = false; }
      return { rolledBack: true };
    case "pid": {
      const result = await client.query("select pg_backend_pid() as pid");
      return { pid: result.rows[0].pid };
    }
    default: throw new Error("unknown K5 lock action");
  }
}
const io = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
try {
  for await (const line of io) {
    if (!line.trim()) continue;
    try {
      const input = JSON.parse(line);
      const result = await command(input);
      process.stdout.write(JSON.stringify({ ok: true, ...result }) + "\n");
    } catch (error) {
      process.stdout.write(JSON.stringify({ ok: false, error: String(error) }) + "\n");
    }
  }
} finally {
  if (inTransaction) await client.query("rollback").catch(() => {});
  await client.end();
}
