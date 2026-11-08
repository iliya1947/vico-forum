import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  PostgresRegistrationSettingsRepository,
  RegistrationSettingsConflictError,
  RegistrationSettingsForbiddenError,
  RegistrationSettingsInvariantError,
  RegistrationSettingsValidationError,
} from "../../db/registration-settings";
import { PostgresAdminHistoryReader } from "../../db/admin-history";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "settings_registration_test";
const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
const repository = new PostgresRegistrationSettingsRepository(pool);
const history = new PostgresAdminHistoryReader(pool);
const owner = "settings-owner";
let currentVersion = 1;
const mutation = (googleRegistrationEnabled: boolean, emailRegistrationEnabled: boolean, expectedVersion = currentVersion) =>
  ({ googleRegistrationEnabled, emailRegistrationEnabled, expectedVersion });

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(path => /^\d{4}_.+\.sql$/.test(path)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('settings-owner','Owner','settings-owner@test.invalid'),
    ('settings-manager','Admin','settings-manager@test.invalid');
    insert into authz_user_roles(user_id,role_id) values('settings-manager','builtin-admin')`);
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});

describe("SET-02 registration policy singleton", () => {
  it("migrates one open-by-default row and accepts both closed without repairing missing row", async () => {
    const snapshot = await repository.read();
    expect(snapshot).toMatchObject({ googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 1 });
    expect(new Date(snapshot.updatedAt).toISOString()).toBe(snapshot.updatedAt);
    expect((await client.query("select count(*)::int as n from forum_registration_settings")).rows[0].n).toBe(1);
    const constraints = await client.query(`select conname from pg_constraint
      where conrelid='forum_registration_settings'::regclass and contype='c'`);
    expect(constraints.rows.map(row => row.conname).sort()).toEqual([
      "forum_registration_settings_singleton_check", "forum_registration_settings_version_check"
    ]);
    await expect(client.query("insert into forum_registration_settings(id) values(2)")).rejects.toThrow();
    await client.query("delete from forum_registration_settings where id=1");
    await expect(repository.read()).rejects.toBeInstanceOf(RegistrationSettingsInvariantError);
    await client.query("insert into forum_registration_settings(id) values(1)");
  });

  it("forbids non-Owner even with admin role and rejects invalid values before writes", async () => {
    await expect(repository.update("settings-manager", owner, mutation(false, true))).rejects.toBeInstanceOf(RegistrationSettingsForbiddenError);
    await expect(repository.update(owner, "settings-manager", mutation(false, true))).rejects.toBeInstanceOf(RegistrationSettingsForbiddenError);
    await expect(repository.update("missing", "missing", mutation(false, true))).rejects.toBeInstanceOf(RegistrationSettingsForbiddenError);
    await expect(repository.update(owner, owner, { ...mutation(false,true), googleRegistrationEnabled: "false" as unknown as boolean }))
      .rejects.toBeInstanceOf(RegistrationSettingsValidationError);
    expect((await repository.read()).version).toBe(currentVersion);
    expect((await history.read()).events).toHaveLength(0);
  });

  it("uses exact CAS, no-op and atomic single History event for changed flags", async () => {
    const unchanged = await repository.update(owner, owner, mutation(true, true));
    expect(unchanged.version).toBe(currentVersion);
    expect((await history.read()).events).toHaveLength(0);
    const changed = await repository.update(owner, owner, mutation(false, true));
    currentVersion++;
    expect(changed).toMatchObject({ googleRegistrationEnabled: false, emailRegistrationEnabled: true, version: currentVersion });
    await expect(repository.update(owner, owner, mutation(false, true, currentVersion - 1)))
      .rejects.toBeInstanceOf(RegistrationSettingsConflictError);
    expect((await repository.update(owner, owner, mutation(false, true))).version).toBe(currentVersion);
    const events = (await history.read()).events;
    expect(events).toHaveLength(1);
    expect(events[0].change).toMatchObject({
      action: "settings.registrationChanged", targetType: "forum-settings", targetId: "registration",
      context: {
        before: { googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 1 },
        after: { googleRegistrationEnabled: false, emailRegistrationEnabled: true, version: 2 },
      },
    });
    expect(JSON.stringify(events)).not.toMatch(/test\.invalid|settings-owner@/);
  });

  it("allows both methods closed and isolates History rollback failures", async () => {
    const closed = await repository.update(owner, owner, mutation(false, false));
    currentVersion++;
    expect(closed).toMatchObject({ googleRegistrationEnabled: false, emailRegistrationEnabled: false, version: currentVersion });
    await client.query(`create function reject_settings_history() returns trigger language plpgsql
      as $$begin if NEW.action='settings.registrationChanged' then raise exception 'synthetic settings history failure'; end if; return NEW; end$$;
      create trigger reject_settings_history before insert on admin_history
      for each row execute function reject_settings_history()`);
    const countBefore = (await history.read()).events.length;
    try {
      await expect(repository.update(owner, owner, mutation(true, false))).rejects.toThrow("synthetic settings history failure");
      expect(await repository.read()).toMatchObject({ googleRegistrationEnabled: false, emailRegistrationEnabled: false, version: currentVersion });
      expect((await history.read()).events).toHaveLength(countBefore);
    } finally {
      await client.query("drop trigger reject_settings_history on admin_history; drop function reject_settings_history()");
    }
    expect(await repository.update(owner, owner, mutation(true, false))).toMatchObject({ googleRegistrationEnabled: true, emailRegistrationEnabled: false });
    currentVersion++;
  });

  it("serializes concurrent writes and rejects the second stale expectedVersion", async () => {
    const previous = currentVersion;
    const results = await Promise.allSettled([
      repository.update(owner, owner, mutation(false, false, previous)),
      repository.update(owner, owner, mutation(true, true, previous)),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const denied = results.find(result => result.status === "rejected");
    expect(denied?.reason).toBeInstanceOf(RegistrationSettingsConflictError);
    const latest = await repository.read();
    expect(latest.version).toBe(previous + 1);
    currentVersion = latest.version;
    expect((await history.read()).events.filter(event => event.change.action === "settings.registrationChanged")).toHaveLength(4);
  });
});
