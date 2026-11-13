import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { InvalidProfileError, type ProfileFields } from "../../app/forum/profile";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J4 requires a disposable loopback *_test PostgreSQL database");
}

const schema = "sa04_j4_profile_lifecycle_test";
const options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const policy = { cooldownMs: 0, now: () => new Date() };
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const initial: ProfileFields = { bio: "Before profile", githubUrl: null, websiteUrl: null };
const changed: ProfileFields = {
  bio: "After profile", githubUrl: "https://github.com/octocat",
  websiteUrl: "https://example.test/profile",
};

async function user(): Promise<string> {
  const id = "j4-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [id, "Private " + id, id + "@test.invalid"]);
  return id;
}

async function deactivate(id: string): Promise<void> {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}

async function facts(id: string) {
  const result = await fixture.query<{
    bio: string; github_url: string | null; website_url: string | null; updated_at: Date;
  }>("select bio, github_url, website_url, updated_at from forum_profiles where user_id=$1", [id]);
  return result.rows[0] ?? null;
}

function nativeSql(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value
    && typeof value.text === "string" ? value.text : "";
}

function pauseQuery(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return {
    observed, resume: () => release(), restore: () => { client.query = original; },
    get triggered() { return triggered; },
  };
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});

afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-J4 authoritative profile mutation lifecycle admission", () => {
  it("keeps active profile create/update and validation semantics unchanged", async () => {
    const actor = await user();
    expect(await facts(actor)).toBeNull();
    await forum.updateProfile(actor, initial);
    expect(await facts(actor)).toMatchObject({
      bio: initial.bio, github_url: null, website_url: null,
    });
    await forum.updateProfile(actor, changed);
    expect(await facts(actor)).toMatchObject({
      bio: changed.bio, github_url: changed.githubUrl, website_url: changed.websiteUrl,
    });
    const before = await facts(actor);
    await expect(forum.updateProfile(actor, {
      ...changed, githubUrl: "javascript:alert(1)",
    })).rejects.toBeInstanceOf(InvalidProfileError);
    expect(await facts(actor)).toEqual(before);
  });

  it("denies inactive/missing writers without modifying existing or absent profile facts", async () => {
    const withRow = await user();
    const withoutRow = await user();
    await forum.updateProfile(withRow, initial);
    await deactivate(withRow);
    await deactivate(withoutRow);
    const before = await facts(withRow);
    await expect(forum.updateProfile(withRow, changed))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.updateProfile(withoutRow, changed))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.updateProfile("missing-" + uuid(), changed))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(withRow)).toEqual(before);
    expect(await facts(withoutRow)).toBeNull();
    const publicProfile = await forum.readProfile(withRow);
    expect(publicProfile).toMatchObject({
      id: withRow, identityKind: "deleted", name: "Deleted user",
      bio: "", githubUrl: null, websiteUrl: null,
    });
    expect(JSON.stringify(publicProfile)).not.toContain(initial.bio);
  });

  it("retains profile.edit measure denial after active actor admission, without profile writes", async () => {
    const actor = await user();
    const measured = new DrizzleForumRepository(drizzle(pool), policy, async () => {
      throw new UserMeasureRestrictedError("profile.edit");
    });
    await expect(measured.updateProfile(actor, changed))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await facts(actor)).toBeNull();
    await deactivate(actor);
    await expect(measured.updateProfile(actor, changed))
      .rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(actor)).toBeNull();
  });

  it("rejects a profile save when deactivation commits before the existing user-row lock", async () => {
    const actor = await user();
    await forum.updateProfile(actor, initial);
    const before = await facts(actor);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /from "user" .*for update/i.test(sql));
    try {
      const isolated = new DrizzleForumRepository(drizzle(writer), policy, noMeasures);
      const pending = isolated.updateProfile(actor, changed);
      await paused.observed;
      await deactivate(actor);
      paused.resume();
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(actor)).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      await writer.end();
    }
  }, 30_000);

  it("holds the existing user-row lock and active guard through profile upsert and COMMIT", async () => {
    const actor = await user();
    await forum.updateProfile(actor, initial);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /^commit$/i.test(sql.trim()));
    let deactivatorOpen = false;
    try {
      const isolated = new DrizzleForumRepository(drizzle(writer), policy, noMeasures);
      const pending = isolated.updateProfile(actor, changed);
      await paused.observed;
      await fixture.query("begin");
      deactivatorOpen = true;
      await fixture.query("set local lock_timeout = '180ms'");
      await expect(fixture.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [actor])).rejects.toMatchObject({ code: "55P03" });
      await fixture.query("rollback");
      deactivatorOpen = false;
      paused.resume();
      await pending;
      const after = await facts(actor);
      expect(after).toMatchObject({
        bio: changed.bio, github_url: changed.githubUrl, website_url: changed.websiteUrl,
      });
      await deactivate(actor);
      await expect(forum.updateProfile(actor, { ...changed, bio: "Must not persist" }))
        .rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(actor)).toEqual(after);
    } finally {
      paused.resume();
      paused.restore();
      if (deactivatorOpen) await fixture.query("rollback");
      await writer.end();
    }
  }, 30_000);
});
