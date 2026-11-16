/** SA05-2: real built Worker resource/alias/privacy smoke with guest requests only.
 * Owner/genuine-session/Chromium connected closure remains SA05-5.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (process.env.CI !== "true" || !connectionString) throw new Error("Disposable CI PostgreSQL required");
const database = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(database.hostname) || !database.pathname.endsWith("_test")) {
  throw new Error("Only loopback *_test PostgreSQL is allowed");
}
const base = "http://127.0.0.1:4183", vars = resolve(".dev.vars"), log = resolve(".vico-sa05-2-preview.log");
const client = new Client({ connectionString });
let child: ReturnType<typeof spawn> | undefined, ownsVars = false, ownsLog = false;
async function http(path: string, method = "GET") {
  return fetch(base + path, { method, redirect: "manual", signal: AbortSignal.timeout(15000),
    ...(!["GET", "HEAD"].includes(method) ? { headers: { Origin: base, "Content-Type": "application/x-www-form-urlencoded" }, body: "malformed=%FF" } : {}) });
}
async function facts() {
  return {
    state: (await client.query('select id,deactivated_at,deactivated_by_user_id,retain_at_least_until from "user" order by id')).rows,
    events: (await client.query("select * from owner_events where source='account' order by position")).rows,
  };
}
try {
  await client.connect();
  assert.ok((await client.query("select to_regclass('public.owner_events') as present")).rows[0].present, "Disposable migrated schema required");
  await writeFile(vars, ["BETTER_AUTH_SECRET=" + randomBytes(32).toString("hex"), "BETTER_AUTH_URL=" + base,
    "GOOGLE_CLIENT_ID=local-test-unused", "GOOGLE_CLIENT_SECRET=local-test-unused", "VICO_OWNER_USER_ID=sa05-http-synthetic-owner", ""].join("\n"),
  { mode: 0o600, flag: "wx" }); ownsVars = true;
  const descriptor = openSync(log, "wx", 0o600); ownsLog = true;
  // Vite's own preview CORS middleware answers OPTIONS with 204 before the
  // Worker runs. Disable that test-host middleware so every method reaches
  // the built Worker; production routing/CORS configuration is unchanged.
  child = spawn(process.execPath, ["--input-type=module", "-e",
    'import { preview } from "vite"; await preview({ preview: { host: "127.0.0.1", port: 4183, strictPort: true, cors: false } });'], {
    detached: true, stdio: ["ignore", descriptor, descriptor], env: process.env,
  }); closeSync(descriptor);
  let ready = false, startupError: Error | undefined;
  child.on("error", error => { startupError = error; });
  for (let attempt = 0; attempt < 90; attempt++) {
    if (startupError || child.exitCode !== null) throw startupError ?? new Error("Own preview exited early");
    try { if ((await http("/en/")).status === 200) { ready = true; break; } } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "Own built Worker not ready"); const before = await facts(); let count = 0;
  for (const path of [
    "/en/users/opaque/owner/deactivate", "/en/users/opaque/owner/deactivate/", "/en/users/opaque/owner/deactivate///",
    "/en/USERS/opaque/OWNER/DEACTIVATE", "/en/%75sers/a%2Fb/%6fwner/%64eactivate",
    "/en/users/opaque/owner/deactivate.data", "/en/USERS/opaque/OWNER/DEACTIVATE.data",
    "/en/%75sers/a%2Fb/%6fwner/%64eactivate.data", "/en/USERS/opaque/OWNER/DEACTIVATE.data///",
  ]) {
    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await http(path, method);
      // The .data transport requires that exact suffix, so a trailing-slash
      // spelling produces framework 404/405; it still must remain private.
      // OPTIONS is also rejected by the .data transport before a loader.
      const frameworkMiss = path.endsWith(".data///");
      const expected = frameworkMiss ? (["GET", "HEAD"].includes(method) ? 404 : 405)
        : method === "OPTIONS" && path.endsWith(".data") ? 405 : 401;
      assert.equal(response.status, expected, method + " " + path);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store", method + " " + path);
      const body = await response.text(); if (method === "HEAD") assert.equal(body, "");
      assert.ok(!body.includes("deactivatedAt") && !body.includes("PRIVATE_")); count++;
    }
  }
  assert.deepEqual(await facts(), before, "Denied resources must preserve lifecycle/events");
  console.log("SA05-2 built Worker guest resource/static/data aliases and cache boundary: PASS " + count + " requests");
} catch (error) {
  console.error("SA05-2 resource smoke failed:", error instanceof Error ? error.message : String(error)); process.exitCode = 1;
} finally {
  if (child?.pid) {
    const exited = new Promise<void>(resolve => { child!.once("exit", () => resolve()); });
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* Already exited. */ }
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([exited, new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]);
    if (timer) clearTimeout(timer);
    if (child.exitCode === null) { try { process.kill(-child.pid, "SIGKILL"); } catch { /* Exited. */ } }
  }
  await client.end().catch(() => undefined);
  if (ownsVars) await rm(vars, { force: true });
  if (ownsLog) await rm(log, { force: true });
}
