/**
 * SA04-J12: actual built Worker -> real Better Auth session -> canonical Forum
 * reply action -> disposable PostgreSQL late-deactivation barrier.
 * The SQL topic mutex is reached only after the Worker authenticated the request.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { DrizzleForumRepository } from "../db/forum-repository";

const connectionString = process.env.DATABASE_URL;
if (process.env.CI !== "true" || !connectionString) {
  throw new Error("Disposable CI database required");
}
const dbUrl = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(dbUrl.hostname)
  || !dbUrl.pathname.endsWith("_test")) {
  throw new Error("Only loopback *_test PostgreSQL may be used");
}
const base = "http://127.0.0.1:4182";
const vars = resolve(".dev.vars");
const previewLog = resolve(".vico-sa04-j12-preview.log");
const admin = new Client({ connectionString });
const holder = new Client({ connectionString });
let worker: ReturnType<typeof spawn> | undefined;
let ownsVars = false;
let ownsLog = false;
let holderOpen = false;

async function http(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  return fetch(base + path, {
    ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20_000),
  });
}
function expectPrivate(response: Response) {
  assert.match(response.headers.get("Cache-Control") ?? "", /\bno-store\b/);
}
async function submit(topicId: string, cookie: string, body: string) {
  return http("/en/topics/" + topicId, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "reply", body }),
  }, cookie);
}
async function signUp(label: "author" | "control" | "actor" | "unavailable" | "unexpected") {
  // The prior CI smoke uses the same disposable DB's persistent Better Auth
  // rate-limit table. Test-only distinct Cloudflare IP headers keep these real
  // registrations independent, without mutating the rate-limit table.
  const ip = {
    author: "192.0.2.41", control: "192.0.2.42", actor: "192.0.2.43",
    unavailable: "192.0.2.44", unexpected: "192.0.2.45",
  }[label];
  const response = await http("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      Origin: base, "Content-Type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({
      name: "J12 " + label,
      email: label + "-" + randomUUID() + "@j12.invalid",
      password: "Test-Only-" + randomBytes(12).toString("hex"),
    }),
  });
  assert.ok(response.status >= 200 && response.status < 300,
    "Better Auth sign-up failed: " + response.status);
  const cookie = response.headers.getSetCookie()
    .find(value => value.includes("session_token"))?.split(";")[0];
  assert.ok(cookie, "Better Auth did not return its actual session cookie");
  const session = await http("/api/auth/get-session", {}, cookie);
  assert.equal(session.status, 200);
  const payload = await session.json() as { user?: { id?: string } };
  assert.ok(payload.user?.id, "Real Better Auth session did not resolve");
  await admin.query(
    "insert into authz_user_roles(user_id,role_id) values ($1,'builtin-user') on conflict do nothing",
    [payload.user.id],
  );
  return { id: payload.user.id, cookie };
}
async function ready() {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (worker?.exitCode !== null) throw new Error("Preview exited before readiness");
    try {
      if ((await http("/he/")).status === 200) return;
    } catch { /* Preview is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error("Local built Worker did not become ready");
}
async function waitForBlockedTopic(holderPid: number): Promise<number> {
  for (let i = 0; i < 500; i++) {
    const query = await admin.query<{ pid: number; query: string }>(
      `select pid,query from pg_stat_activity
       where wait_event_type='Lock'
         and $1 = any(pg_blocking_pids(pid))
         and query ilike '%forum_topics%'`,
      [holderPid],
    );
    if (query.rows.length) return query.rows[0]!.pid;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("Canonical Worker reply never reached blocked topic-row SQL");
}
async function topicFacts(topicId: string) {
  const result = await admin.query<{ posts: number; notifications: number; history: number }>(
    `select
      (select count(*)::int from forum_posts where topic_id=$1) posts,
      (select count(*)::int from forum_reply_notifications where topic_id=$1) notifications,
      (select count(*)::int from admin_history where target_type='topic' and target_id=$1) history`,
    [topicId],
  );
  return result.rows[0]!;
}
async function run() {
  await Promise.all([admin.connect(), holder.connect()]);
  for (const name of ["user", "session", "forum_topics", "forum_posts", "forum_reply_notifications"]) {
    const row = await admin.query<{ name: string | null }>(
      "select to_regclass($1)::text as name", ["public." + name],
    );
    assert.ok(row.rows[0]?.name, "Disposable schema missing " + name);
  }

  await writeFile(vars, [
    "BETTER_AUTH_SECRET=" + randomBytes(32).toString("hex"),
    "BETTER_AUTH_URL=" + base,
    "GOOGLE_CLIENT_ID=local-test-unused",
    "GOOGLE_CLIENT_SECRET=local-test-unused",
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  ownsVars = true;
  const fd = openSync(previewLog, "w", 0o600);
  ownsLog = true;
  worker = spawn("pnpm", ["exec", "vite", "preview", "--host", "127.0.0.1",
    "--port", "4182", "--strictPort"], {
    stdio: ["ignore", fd, fd], detached: true, env: process.env,
  });
  closeSync(fd);
  await ready();

  const [author, control, actor, unavailableActor, unexpectedActor] = await Promise.all([
    signUp("author"), signUp("control"), signUp("actor"),
    signUp("unavailable"), signUp("unexpected"),
  ]);
  const forum = new DrizzleForumRepository(drizzle(admin), { cooldownMs: 0, now: () => new Date() });
  const categoryId = randomUUID(), sectionId = randomUUID(), topicId = randomUUID();
  await forum.createCategory({ id: categoryId, name: "J12 lifecycle fixture" });
  await forum.createSection({ id: sectionId, categoryId, name: "J12 lifecycle fixture" });
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: author.id,
    titleRevision: {
      id: randomUUID(), originalContent: "Connected lifecycle topic", sourceLocale: "en",
    },
    initialPost: {
      id: randomUUID(), topicId, authorId: author.id,
      bodyRevision: {
        id: randomUUID(), originalContent: "Initial question", sourceLocale: "en",
      },
    },
  });

  // Positive control demonstrates the real session, route, RBAC and persistence.
  const positive = await submit(topicId, control.cookie, "J12_ACTIVE_CONTROL");
  assert.ok([302, 303].includes(positive.status),
    "Active canonical reply did not succeed: " + positive.status);
  assert.equal((await topicFacts(topicId)).posts, 2);

  // The actual Worker transaction waits at its topic mutex, after Better Auth
  // has authenticated the request but before authoritative AccountState.
  await holder.query("begin");
  holderOpen = true;
  const pidResult = await holder.query<{ pid: number }>("select pg_backend_pid() as pid");
  await holder.query("select id from forum_topics where id=$1 for no key update", [topicId]);
  const before = await topicFacts(topicId);
  let pending: Promise<Response> | undefined;
  try {
    pending = submit(topicId, actor.cookie, "J12_DENIED_AFTER_PREFLIGHT");
    await waitForBlockedTopic(pidResult.rows[0]!.pid);
    await admin.query(`update "user" set deactivated_at=now(),
      deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'
      where id=$1`, [actor.id]);
    await holder.query("commit");
    holderOpen = false;

    const denied = await pending;
    assert.equal(denied.status, 401,
      "Late lifecycle denial must be 401 after real Worker request/session");
    expectPrivate(denied);
    assert.equal(denied.headers.get("Location"), null, "Denied writer redirected");
    // A canonical HTML response can contain static app copy or the user's
    // retained draft; neither establishes a lifecycle leak. Verify structured
    // error semantics only when the route actually emits JSON.
    if ((denied.headers.get("Content-Type") ?? "").includes("application/json")) {
      const payload = await denied.json() as { error?: string };
      assert.equal(payload.error, "unauthenticated");
    }
    assert.deepEqual(await topicFacts(topicId), before, "Denied reply changed persisted facts");
    assert.equal((await admin.query<{ count: number }>(
      `select count(*)::int as count from forum_post_revisions
       where original_content='J12_DENIED_AFTER_PREFLIGHT'`,
    )).rows[0]?.count, 0);
    console.log("SA04-J12 built Worker / real Better Auth / PostgreSQL late denial: PASS");
  } finally {
    if (holderOpen) {
      await holder.query("rollback").catch(() => {});
      holderOpen = false;
    }
    if (pending) await Promise.allSettled([pending]);
  }

  // Only an actual unavailable writer dependency should become a controlled 503.
  // Kill precisely the PostgreSQL backend waiting on this topic; auth/session,
  // locale and permission preflight have already completed in the built Worker.
  const beforeUnavailable = await topicFacts(topicId);
  await holder.query("begin");
  holderOpen = true;
  const unavailableHolderPid = (await holder.query<{ pid: number }>(
    "select pg_backend_pid() as pid",
  )).rows[0]!.pid;
  await holder.query("select id from forum_topics where id=$1 for no key update", [topicId]);
  let unavailablePending: Promise<Response> | undefined;
  try {
    unavailablePending = submit(topicId, unavailableActor.cookie, "J12_UNAVAILABLE_DRAFT");
    const waitingPid = await waitForBlockedTopic(unavailableHolderPid);
    const killed = await admin.query<{ terminated: boolean }>(
      "select pg_terminate_backend($1) as terminated",
      [waitingPid],
    );
    assert.equal(killed.rows[0]?.terminated, true, "Test failed to terminate blocked writer");
    await holder.query("commit");
    holderOpen = false;

    const unavailableResponse = await unavailablePending;
    assert.equal(unavailableResponse.status, 503,
      "Known PostgreSQL connection loss must be controlled unavailable, not unexpected");
    expectPrivate(unavailableResponse);
    assert.equal(unavailableResponse.headers.get("Location"), null);
    if ((unavailableResponse.headers.get("Content-Type") ?? "").includes("application/json")) {
      const payload = await unavailableResponse.json() as { error?: string };
      assert.equal(payload.error, "unavailable");
    }
    assert.deepEqual(await topicFacts(topicId), beforeUnavailable,
      "Unavailable writer must not create Forum facts");
    console.log("SA04-J12 built Worker canonical storage-unavailable HTTP: PASS");
  } finally {
    if (holderOpen) {
      await holder.query("rollback").catch(() => {});
      holderOpen = false;
    }
    if (unavailablePending) await Promise.allSettled([unavailablePending]);
  }

  // An unexpected SQL/programming failure is not an infrastructure outage.
  // One disposable BEFORE INSERT trigger injects a unique test-only error;
  // the whole publication transaction must roll back without leaking it.
  const beforeUnexpected = await topicFacts(topicId);
  await admin.query(`
    create function j12_unexpected_forum_revision() returns trigger
    language plpgsql as $func$
      begin raise exception 'J12_PRIVATE_UNEXPECTED_SQL_DETAIL' using errcode='P0001'; end
    $func/**
 * SA04-J12: actual built Worker -> real Better Auth session -> canonical Forum
 * reply action -> disposable PostgreSQL late-deactivation barrier.
 * The SQL topic mutex is reached only after the Worker authenticated the request.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { DrizzleForumRepository } from "../db/forum-repository";

const connectionString = process.env.DATABASE_URL;
if (process.env.CI !== "true" || !connectionString) {
  throw new Error("Disposable CI database required");
}
const dbUrl = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(dbUrl.hostname)
  || !dbUrl.pathname.endsWith("_test")) {
  throw new Error("Only loopback *_test PostgreSQL may be used");
}
const base = "http://127.0.0.1:4182";
const vars = resolve(".dev.vars");
const previewLog = resolve(".vico-sa04-j12-preview.log");
const admin = new Client({ connectionString });
const holder = new Client({ connectionString });
let worker: ReturnType<typeof spawn> | undefined;
let ownsVars = false;
let ownsLog = false;
let holderOpen = false;

async function http(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  return fetch(base + path, {
    ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20_000),
  });
}
function expectPrivate(response: Response) {
  assert.match(response.headers.get("Cache-Control") ?? "", /\bno-store\b/);
}
async function submit(topicId: string, cookie: string, body: string) {
  return http("/en/topics/" + topicId, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "reply", body }),
  }, cookie);
}
async function signUp(label: "author" | "control" | "actor" | "unavailable" | "unexpected") {
  // The prior CI smoke uses the same disposable DB's persistent Better Auth
  // rate-limit table. Test-only distinct Cloudflare IP headers keep these real
  // registrations independent, without mutating the rate-limit table.
  const ip = {
    author: "192.0.2.41", control: "192.0.2.42", actor: "192.0.2.43",
    unavailable: "192.0.2.44", unexpected: "192.0.2.45",
  }[label];
  const response = await http("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      Origin: base, "Content-Type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({
      name: "J12 " + label,
      email: label + "-" + randomUUID() + "@j12.invalid",
      password: "Test-Only-" + randomBytes(12).toString("hex"),
    }),
  });
  assert.ok(response.status >= 200 && response.status < 300,
    "Better Auth sign-up failed: " + response.status);
  const cookie = response.headers.getSetCookie()
    .find(value => value.includes("session_token"))?.split(";")[0];
  assert.ok(cookie, "Better Auth did not return its actual session cookie");
  const session = await http("/api/auth/get-session", {}, cookie);
  assert.equal(session.status, 200);
  const payload = await session.json() as { user?: { id?: string } };
  assert.ok(payload.user?.id, "Real Better Auth session did not resolve");
  await admin.query(
    "insert into authz_user_roles(user_id,role_id) values ($1,'builtin-user') on conflict do nothing",
    [payload.user.id],
  );
  return { id: payload.user.id, cookie };
}
async function ready() {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (worker?.exitCode !== null) throw new Error("Preview exited before readiness");
    try {
      if ((await http("/he/")).status === 200) return;
    } catch { /* Preview is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error("Local built Worker did not become ready");
}
async function waitForBlockedTopic(holderPid: number): Promise<number> {
  for (let i = 0; i < 500; i++) {
    const query = await admin.query<{ pid: number; query: string }>(
      `select pid,query from pg_stat_activity
       where wait_event_type='Lock'
         and $1 = any(pg_blocking_pids(pid))
         and query ilike '%forum_topics%'`,
      [holderPid],
    );
    if (query.rows.length) return query.rows[0]!.pid;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("Canonical Worker reply never reached blocked topic-row SQL");
}
async function topicFacts(topicId: string) {
  const result = await admin.query<{ posts: number; notifications: number; history: number }>(
    `select
      (select count(*)::int from forum_posts where topic_id=$1) posts,
      (select count(*)::int from forum_reply_notifications where topic_id=$1) notifications,
      (select count(*)::int from admin_history where target_type='topic' and target_id=$1) history`,
    [topicId],
  );
  return result.rows[0]!;
}
async function run() {
  await Promise.all([admin.connect(), holder.connect()]);
  for (const name of ["user", "session", "forum_topics", "forum_posts", "forum_reply_notifications"]) {
    const row = await admin.query<{ name: string | null }>(
      "select to_regclass($1)::text as name", ["public." + name],
    );
    assert.ok(row.rows[0]?.name, "Disposable schema missing " + name);
  }

  await writeFile(vars, [
    "BETTER_AUTH_SECRET=" + randomBytes(32).toString("hex"),
    "BETTER_AUTH_URL=" + base,
    "GOOGLE_CLIENT_ID=local-test-unused",
    "GOOGLE_CLIENT_SECRET=local-test-unused",
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  ownsVars = true;
  const fd = openSync(previewLog, "w", 0o600);
  ownsLog = true;
  worker = spawn("pnpm", ["exec", "vite", "preview", "--host", "127.0.0.1",
    "--port", "4182", "--strictPort"], {
    stdio: ["ignore", fd, fd], detached: true, env: process.env,
  });
  closeSync(fd);
  await ready();

  const [author, control, actor, unavailableActor, unexpectedActor] = await Promise.all([
    signUp("author"), signUp("control"), signUp("actor"),
    signUp("unavailable"), signUp("unexpected"),
  ]);
  const forum = new DrizzleForumRepository(drizzle(admin), { cooldownMs: 0, now: () => new Date() });
  const categoryId = randomUUID(), sectionId = randomUUID(), topicId = randomUUID();
  await forum.createCategory({ id: categoryId, name: "J12 lifecycle fixture" });
  await forum.createSection({ id: sectionId, categoryId, name: "J12 lifecycle fixture" });
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: author.id,
    titleRevision: {
      id: randomUUID(), originalContent: "Connected lifecycle topic", sourceLocale: "en",
    },
    initialPost: {
      id: randomUUID(), topicId, authorId: author.id,
      bodyRevision: {
        id: randomUUID(), originalContent: "Initial question", sourceLocale: "en",
      },
    },
  });

  // Positive control demonstrates the real session, route, RBAC and persistence.
  const positive = await submit(topicId, control.cookie, "J12_ACTIVE_CONTROL");
  assert.ok([302, 303].includes(positive.status),
    "Active canonical reply did not succeed: " + positive.status);
  assert.equal((await topicFacts(topicId)).posts, 2);

  // The actual Worker transaction waits at its topic mutex, after Better Auth
  // has authenticated the request but before authoritative AccountState.
  await holder.query("begin");
  holderOpen = true;
  const pidResult = await holder.query<{ pid: number }>("select pg_backend_pid() as pid");
  await holder.query("select id from forum_topics where id=$1 for no key update", [topicId]);
  const before = await topicFacts(topicId);
  let pending: Promise<Response> | undefined;
  try {
    pending = submit(topicId, actor.cookie, "J12_DENIED_AFTER_PREFLIGHT");
    await waitForBlockedTopic(pidResult.rows[0]!.pid);
    await admin.query(`update "user" set deactivated_at=now(),
      deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'
      where id=$1`, [actor.id]);
    await holder.query("commit");
    holderOpen = false;

    const denied = await pending;
    assert.equal(denied.status, 401,
      "Late lifecycle denial must be 401 after real Worker request/session");
    expectPrivate(denied);
    assert.equal(denied.headers.get("Location"), null, "Denied writer redirected");
    // A canonical HTML response can contain static app copy or the user's
    // retained draft; neither establishes a lifecycle leak. Verify structured
    // error semantics only when the route actually emits JSON.
    if ((denied.headers.get("Content-Type") ?? "").includes("application/json")) {
      const payload = await denied.json() as { error?: string };
      assert.equal(payload.error, "unauthenticated");
    }
    assert.deepEqual(await topicFacts(topicId), before, "Denied reply changed persisted facts");
    assert.equal((await admin.query<{ count: number }>(
      `select count(*)::int as count from forum_post_revisions
       where original_content='J12_DENIED_AFTER_PREFLIGHT'`,
    )).rows[0]?.count, 0);
    console.log("SA04-J12 built Worker / real Better Auth / PostgreSQL late denial: PASS");
  } finally {
    if (holderOpen) {
      await holder.query("rollback").catch(() => {});
      holderOpen = false;
    }
);
  let triggerCreated = false;
  try {
    await admin.query(`create trigger j12_unexpected_forum_revision
      before insert on forum_post_revisions
      for each row execute function j12_unexpected_forum_revision()`);
    triggerCreated = true;

    const unexpectedResponse = await submit(
      topicId, unexpectedActor.cookie, "J12_UNEXPECTED_DRAFT",
    );
    assert.equal(unexpectedResponse.status, 500,
      "Unexpected SQL error must not be reclassified as controlled unavailable");
    expectPrivate(unexpectedResponse);
    assert.equal(unexpectedResponse.headers.get("Location"), null);
    const responseText = await unexpectedResponse.text();
    assert.ok(!responseText.includes("J12_PRIVATE_UNEXPECTED_SQL_DETAIL"),
      "Unexpected SQL diagnostics leaked in canonical HTTP response");
    assert.deepEqual(await topicFacts(topicId), beforeUnexpected,
      "Unexpected rollback must preserve Forum facts");
    console.log("SA04-J12 built Worker canonical unexpected-error HTTP: PASS");
  } finally {
    if (triggerCreated) {
      await admin.query("drop trigger if exists j12_unexpected_forum_revision on forum_post_revisions");
    }
    await admin.query("drop function if exists j12_unexpected_forum_revision()");
  }

}
try {
  await run();
} catch (error) {
  console.error("SA04-J12 connected smoke failed:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (worker?.pid) {
    try { process.kill(-worker.pid, "SIGTERM"); } catch { /* Already exited. */ }
  }
  if (holderOpen) await holder.query("rollback").catch(() => {});
  await Promise.all([holder.end().catch(() => {}), admin.end().catch(() => {})]);
  if (ownsVars) await rm(vars, { force: true });
  if (ownsLog) await rm(previewLog, { force: true });
}
