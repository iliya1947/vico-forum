import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { DrizzleUserPrivacyRepository, UserPrivacyAccountMissingError } from "../../db/user-privacy";
import { AccountInactiveError } from "../../db/account-state";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}
const schema = "forum_online_privacy_test";
const connectionOptions = { connectionString: databaseUrl, options: `-c search_path=${schema}` };
const owner = new Client(connectionOptions);
const firstClient = new Client(connectionOptions);
const secondClient = new Client(connectionOptions);
const observer = new Client(connectionOptions);
const ownerForum = new DrizzleForumRepository(drizzle(owner));
const ownerPrivacy = new DrizzleUserPrivacyRepository(drizzle(owner));
const firstForum = new DrizzleForumRepository(drizzle(firstClient));
const firstPrivacy = new DrizzleUserPrivacyRepository(drizzle(firstClient));
const secondForum = new DrizzleForumRepository(drizzle(secondClient));
const secondPrivacy = new DrizzleUserPrivacyRepository(drizzle(secondClient));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
  "0061_user_privacy_preferences", "0065_sa04_account_state_foundation",
];
const ids = ["privacy-a", "privacy-b", "race-heartbeat-first", "race-off-first"];

beforeAll(async () => {
  await owner.connect();
  await owner.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await owner.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of [...ids, ...Array.from({ length: 15 }, (_, i) => `privacy-member-${i}`)]) {
    await owner.query('insert into "user" (id, name, email) values ($1, $2, $3)', [id, id, `${id}@private.test`]);
  }
  await Promise.all([firstClient.connect(), secondClient.connect(), observer.connect()]);
});
beforeEach(async () => {
  await owner.query("delete from forum_online_presence");
  await owner.query('update "user" set deactivated_at = null, deactivated_by_user_id = null, retain_at_least_until = null');
  await owner.query("delete from user_privacy_preferences");
});
afterAll(async () => {
  await Promise.all([firstClient.end(), secondClient.end(), observer.end()]);
  await owner.query(`drop schema if exists ${schema} cascade`);
  await owner.end();
});

describe("SET-06 authoritative public visibility", () => {
  it("starts ON without backfill, saves per account and rejects a missing session actor", async () => {
    expect(await ownerPrivacy.read("privacy-a")).toBe(true);
    expect(await firstPrivacy.read("privacy-a")).toBe(true);
    expect(await ownerPrivacy.read("privacy-b")).toBe(true);
    await ownerPrivacy.save("privacy-a", false);
    expect(await firstPrivacy.read("privacy-a")).toBe(false);
    expect(await ownerPrivacy.read("privacy-b")).toBe(true);
    await firstPrivacy.save("privacy-a", true);
    expect(await secondPrivacy.read("privacy-a")).toBe(true);
    await expect(ownerPrivacy.read("deleted-actor")).rejects.toBeInstanceOf(UserPrivacyAccountMissingError);
    await expect(ownerPrivacy.save("deleted-actor", false)).rejects.toBeInstanceOf(UserPrivacyAccountMissingError);
    await expect(ownerForum.recordOnlinePresence("deleted-actor")).rejects.toBeInstanceOf(UserPrivacyAccountMissingError);
  });

  it("keeps OFF out of list/count even with a stale row and restores only after heartbeat", async () => {
    await ownerForum.recordOnlinePresence("privacy-a");
    await ownerForum.recordOnlinePresence("privacy-b");
    expect((await ownerForum.readOnlinePresence()).count).toBe(2);
    await ownerPrivacy.save("privacy-a", false);
    expect((await owner.query("select user_id from forum_online_presence where user_id = 'privacy-a'")).rowCount).toBe(0);
    await firstForum.recordOnlinePresence("privacy-a");
    expect((await owner.query("select user_id from forum_online_presence where user_id = 'privacy-a'")).rowCount).toBe(0);
    await owner.query("insert into forum_online_presence (user_id) values ('privacy-a')");
    expect(await ownerForum.readOnlinePresence()).toMatchObject({ count: 1, members: [{ id: "privacy-b" }] });
    await ownerPrivacy.save("privacy-a", false);
    expect((await owner.query("select user_id from forum_online_presence where user_id = 'privacy-a'")).rowCount).toBe(0);
    await ownerPrivacy.save("privacy-a", true);
    expect((await ownerForum.readOnlinePresence()).count).toBe(1);
    await firstForum.recordOnlinePresence("privacy-a");
    expect((await ownerForum.readOnlinePresence()).count).toBe(2);
  });

  it("filters hidden rows before the total window count and twelve-member limit", async () => {
    for (let i = 0; i < 15; i++) {
      await ownerForum.recordOnlinePresence(`privacy-member-${i}`);
    }
    await ownerForum.recordOnlinePresence("privacy-a");
    await owner.query(`update forum_online_presence set last_seen_at=now() + interval '20 seconds'
      where user_id='privacy-member-0'`);
    await owner.query(`update forum_online_presence set last_seen_at=now() - interval '4 minutes'
      where user_id='privacy-member-14'`);
    await ownerPrivacy.save("privacy-member-0", false);
    await ownerPrivacy.save("privacy-member-14", false);
    // Reinsert physical presence to verify that read filtering stands independently of cleanup.
    await owner.query(`insert into forum_online_presence (user_id, last_seen_at)
      values ('privacy-member-0', now() + interval '20 seconds'),
             ('privacy-member-14', now() - interval '4 minutes')`);
    const visible = await ownerForum.readOnlinePresence();
    expect(visible.count).toBe(14);
    expect(visible.members).toHaveLength(12);
    expect(visible.members.some(member => ["privacy-member-0", "privacy-member-14"].includes(member.id))).toBe(false);
    await owner.query(`update forum_online_presence set last_seen_at=now() - interval '6 minutes'
      where user_id='privacy-a'`);
    expect((await ownerForum.readOnlinePresence()).count).toBe(13);
    for (let i = 0; i < 15; i++) await ownerPrivacy.save(`privacy-member-${i}`, false);
    await ownerPrivacy.save("privacy-a", false);
    expect(await ownerForum.readOnlinePresence()).toEqual({ count: 0, members: [] });
  });

  it("rolls back the preference change if presence cleanup fails before commit", async () => {
    await ownerForum.recordOnlinePresence("privacy-a");
    await owner.query(`create function fail_privacy_cleanup() returns trigger
      language plpgsql as $$ begin raise exception 'test cleanup failed'; end $$`);
    await owner.query(`create trigger fail_privacy_cleanup before delete on forum_online_presence
      for each row execute function fail_privacy_cleanup()`);
    try {
      await expect(ownerPrivacy.save("privacy-a", false)).rejects.toThrow();
      expect(await ownerPrivacy.read("privacy-a")).toBe(true);
      expect((await owner.query("select * from forum_online_presence where user_id='privacy-a'")).rowCount).toBe(1);
    } finally {
      await owner.query("drop trigger fail_privacy_cleanup on forum_online_presence");
      await owner.query("drop function fail_privacy_cleanup()");
    }
  });
});


async function deactivateFixtureAccount(client: Client, id: string): Promise<void> {
  await client.query(`update "user"
    set deactivated_at = now(), deactivated_by_user_id = 'SA04-test-owner',
      retain_at_least_until = now() + interval '2 years'
    where id = $1`, [id]);
}

describe("SA04-F online presence lifecycle visibility and admission", () => {
  it("filters inactive ON accounts before the full count, order and 12-member limit", async () => {
    for (let i = 0; i < 15; i++) {
      await ownerForum.recordOnlinePresence(`privacy-member-${i}`);
    }
    await ownerForum.recordOnlinePresence("privacy-a");
    await ownerForum.recordOnlinePresence("privacy-b");
    await ownerPrivacy.save("privacy-member-0", true);
    await owner.query(`update "user"
      set name = 'SA04_PRIVATE_INACTIVE_NAME', image = 'SA04_PRIVATE_INACTIVE_IMAGE'
      where id = 'privacy-member-0'`);
    await owner.query(`update forum_online_presence set last_seen_at = now() + interval '30 seconds'
      where user_id in ('privacy-member-0', 'privacy-member-1')`);
    await owner.query(`update forum_online_presence set last_seen_at = now() - interval '4 minutes'
      where user_id = 'privacy-member-14'`);
    await ownerPrivacy.save("privacy-member-1", false);
    // Physical stale hidden presence must not participate in the window count.
    await owner.query(`insert into forum_online_presence (user_id, last_seen_at)
      values ('privacy-member-1', now() + interval '30 seconds')`);
    await deactivateFixtureAccount(owner, "privacy-member-0");
    await deactivateFixtureAccount(owner, "privacy-member-14");

    const state = await secondForum.readOnlinePresence();
    expect(await ownerPrivacy.read("privacy-member-0")).toBe(true);
    expect(await ownerPrivacy.read("privacy-member-14")).toBe(true); // Missing preference = ON.
    expect((await owner.query("select count(*)::int as count from forum_online_presence")).rows[0]?.count).toBe(17);
    expect(state.count).toBe(14);
    expect(state.members).toHaveLength(12);
    expect(new Set(state.members.map(({ id }) => id)).size).toBe(12);
    expect(state.members.some(({ id }) => ["privacy-member-0", "privacy-member-1", "privacy-member-14"].includes(id))).toBe(false);
    expect(state.members.some(({ id }) => id === "privacy-a")).toBe(true);
    expect(JSON.stringify(state)).not.toContain("SA04_PRIVATE_INACTIVE");
    expect(JSON.stringify(state)).not.toContain("deactivated");
    expect(state.members.every((member) => Object.keys(member).sort().join(",") === "id,image,name")).toBe(true);
  });

  it("refuses both inactive insert and refresh under the subject lock without rewriting Privacy", async () => {
    await ownerPrivacy.save("privacy-a", true);
    await ownerForum.recordOnlinePresence("privacy-a");
    await owner.query(`update forum_online_presence
      set last_seen_at = now() - interval '2 minutes' where user_id = 'privacy-a'`);
    const original = await owner.query<{ last_seen_at: Date }>(
      "select last_seen_at from forum_online_presence where user_id = 'privacy-a'",
    );
    await deactivateFixtureAccount(owner, "privacy-a");
    await deactivateFixtureAccount(owner, "privacy-b");
    await expect(firstForum.recordOnlinePresence("privacy-a")).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(secondForum.recordOnlinePresence("privacy-b")).rejects.toBeInstanceOf(AccountInactiveError);
    const unchanged = await owner.query<{ last_seen_at: Date }>(
      "select last_seen_at from forum_online_presence where user_id = 'privacy-a'",
    );
    expect(unchanged.rows[0]?.last_seen_at.getTime()).toBe(original.rows[0]?.last_seen_at.getTime());
    expect((await owner.query("select * from forum_online_presence where user_id='privacy-b'")).rowCount).toBe(0);
    expect(await ownerForum.readOnlinePresence()).toEqual({ count: 0, members: [] });
    expect(await ownerPrivacy.read("privacy-a")).toBe(true);
    // Checkpoint P is separate: the existing privacy-save lifecycle admission is unchanged.
    await ownerPrivacy.save("privacy-a", false);
    expect(await ownerPrivacy.read("privacy-a")).toBe(false);
    await ownerPrivacy.save("privacy-a", true);
    expect(await ownerPrivacy.read("privacy-a")).toBe(true);
  });
});

async function backendPid(client: Client): Promise<number> {
  const r = await client.query<{ pid: number }>("select pg_backend_pid() as pid");
  return r.rows[0]!.pid;
}

async function waitUntilBlocked(pid: number): Promise<void> {
  // Observe PostgreSQL's real lock wait; timing/sleeps do not determine ordering.
  for (let attempts = 0; attempts < 300; attempts++) {
    const result = await observer.query<{ blocked: boolean }>(
      "select cardinality(pg_blocking_pids($1::int)) > 0 as blocked", [pid],
    );
    if (result.rows[0]?.blocked) return;
  }
  throw new Error("Expected PostgreSQL row-lock contention was not observed");
}

describe("SET-06 heartbeat/OFF transaction serialization", () => {
  it.each(["heartbeat-first", "off-first"] as const)(
    "leaves OFF and no presence when %s queues first against an initially missing preference",
    async (order) => {
      const id = order === "heartbeat-first" ? "race-heartbeat-first" : "race-off-first";
      if (order === "off-first") await ownerForum.recordOnlinePresence(id);
      const firstPid = await backendPid(firstClient);
      const secondPid = await backendPid(secondClient);
      await owner.query("begin");
      await owner.query('select id from "user" where id=$1 for update', [id]);
      let first: Promise<void> | undefined;
      let second: Promise<void> | undefined;
      try {
        first = order === "heartbeat-first" ? firstForum.recordOnlinePresence(id) : firstPrivacy.save(id, false);
        await waitUntilBlocked(firstPid);
        second = order === "heartbeat-first" ? secondPrivacy.save(id, false) : secondForum.recordOnlinePresence(id);
        await waitUntilBlocked(secondPid);
      } finally {
        await owner.query("commit");
      }
      await Promise.all([first!, second!]);
      expect(await ownerPrivacy.read(id)).toBe(false);
      expect((await owner.query("select * from forum_online_presence where user_id=$1", [id])).rowCount).toBe(0);
      await secondForum.recordOnlinePresence(id);
      expect((await owner.query("select * from forum_online_presence where user_id=$1", [id])).rowCount).toBe(0);
    },
  );

  it("does not serialize unrelated users behind a subject row lock", async () => {
    await owner.query("begin");
    await owner.query('select id from "user" where id=$1 for update', ["privacy-a"]);
    try {
      await firstForum.recordOnlinePresence("privacy-b");
      expect((await secondForum.readOnlinePresence()).count).toBe(1);
    } finally {
      await owner.query("rollback");
    }
  });
});


describe("SA04-F deactivation/heartbeat row-lock ordering", () => {
  it("denies the waiting heartbeat when deactivation takes the subject lock first", async () => {
    const id = "race-off-first";
    const firstPid = await backendPid(firstClient);
    const secondPid = await backendPid(secondClient);
    await owner.query("begin");
    await firstClient.query("begin");
    try {
      await owner.query('select id from "user" where id=$1 for update', [id]);
      const deactivation = deactivateFixtureAccount(firstClient, id);
      await waitUntilBlocked(firstPid);
      const heartbeat = secondForum.recordOnlinePresence(id);
      await waitUntilBlocked(secondPid);
      await owner.query("commit");
      await deactivation;
      await firstClient.query("commit");
      await expect(heartbeat).rejects.toBeInstanceOf(AccountInactiveError);
      expect((await owner.query("select * from forum_online_presence where user_id=$1", [id])).rowCount).toBe(0);
      expect(await ownerPrivacy.read(id)).toBe(true);
    } finally {
      // Harmless after a prior commit; prevents a stranded transaction on assertion failure.
      await owner.query("rollback");
      await firstClient.query("rollback");
    }
  });

  it("keeps earlier committed heartbeat physical but invisible after later deactivation", async () => {
    const id = "race-heartbeat-first";
    const firstPid = await backendPid(firstClient);
    const secondPid = await backendPid(secondClient);
    await owner.query("begin");
    await secondClient.query("begin");
    try {
      await owner.query('select id from "user" where id=$1 for update', [id]);
      const heartbeat = firstForum.recordOnlinePresence(id);
      await waitUntilBlocked(firstPid);
      const deactivation = deactivateFixtureAccount(secondClient, id);
      await waitUntilBlocked(secondPid);
      await owner.query("commit");
      await heartbeat;
      await deactivation;
      await secondClient.query("commit");
      expect((await owner.query("select * from forum_online_presence where user_id=$1", [id])).rowCount).toBe(1);
      expect(await ownerForum.readOnlinePresence()).toEqual({ count: 0, members: [] });
      await expect(firstForum.recordOnlinePresence(id)).rejects.toBeInstanceOf(AccountInactiveError);
      expect((await owner.query("select * from forum_online_presence where user_id=$1", [id])).rowCount).toBe(1);
    } finally {
      await owner.query("rollback");
      await secondClient.query("rollback");
    }
  });
});
