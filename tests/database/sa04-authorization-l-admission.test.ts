import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-L requires disposable loopback *_test PostgreSQL");
}
const schema = "sa04_l_authorization_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const uuid = () => crypto.randomUUID();
const noMeasures = async () => {};

async function user(): Promise<string> {
  const id = "l-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$2,$3)',
    [id, "L " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(actor: string) {
  const result = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [actor]);
  expect(result.rows).toEqual([{ id: actor }]);
}
function repository(owner: string) {
  return new PostgresAuthorizationRepository(pool, owner, noMeasures);
}
async function facts(target: string) {
  const result = await fixture.query(`select
    (select count(*)::int from admin_history) as history,
    (select count(*)::int from authz_roles where not is_system) as custom_roles,
    (select count(*)::int from authz_role_permissions where role_id in
      (select id from authz_roles where not is_system)) as custom_grants,
    (select count(*)::int from authz_user_roles where user_id=$1) as target_roles,
    (select count(*)::int from authz_user_permission_overrides where user_id=$1) as target_overrides`, [target]);
  return result.rows[0] as Record<string, number>;
}
beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\\d{4}_.+\\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-L shared authorization mutation actor admission", () => {
  it("allows all six active Owner writers with unchanged raw authority and exact History", async () => {
    const actor = await user(), target = await user();
    const roles = await fixture.query<{ id: string }>("select id from authz_roles where slug='user'");
    const userRole = roles.rows[0]?.id;
    expect(userRole).toBeDefined();
    const store = repository(actor), role = uuid(), removedRole = uuid();
    const original = await facts(target);

    await store.createCustomRole(actor, { id: role, slug: "l-role-" + uuid().slice(0, 8), displayName: "L role" });
    await store.renameCustomRole(actor, role, { displayName: "L renamed" });
    await store.replaceRoleGrants(actor, role, ["forum.topic.pin"]);
    await store.assignUserRole(actor, target, role);
    await store.setUserOverride(actor, target, "forum.topic.pin", "deny");
    await store.createCustomRole(actor, {
      id: removedRole, slug: "l-remove-" + uuid().slice(0, 8), displayName: "L removable",
    });
    await store.deleteCustomRole(actor, removedRole);

    const changed = await facts(target);
    expect(changed.history - original.history).toBe(7);
    expect(changed.custom_roles - original.custom_roles).toBe(1);
    expect(changed.custom_grants - original.custom_grants).toBe(1);
    expect(changed.target_roles - original.target_roles).toBe(1);
    expect(changed.target_overrides - original.target_overrides).toBe(1);

    // The four pre-existing active no-op branches are successful but do not add History.
    await store.renameCustomRole(actor, role, { displayName: "L renamed" });
    await store.replaceRoleGrants(actor, role, ["forum.topic.pin"]);
    await store.assignUserRole(actor, target, role);
    await store.setUserOverride(actor, target, "forum.topic.pin", "deny");
    expect((await facts(target)).history).toBe(changed.history);
    expect(await store.resolveUser(target)).toMatchObject({
      overrides: { "forum.topic.pin": "deny" },
    });
    await store.assignUserRole(actor, target, userRole!);
  });

  it("denies every inactive Owner writer, including all no-op variants, with unchanged durable facts", async () => {
    const actor = await user(), target = await user(), role = uuid(), freeRole = uuid();
    const store = repository(actor);
    await store.createCustomRole(actor, { id: role, slug: "l-keep-" + uuid().slice(0, 8), displayName: "L keep" });
    await store.createCustomRole(actor, { id: freeRole, slug: "l-free-" + uuid().slice(0, 8), displayName: "L free" });
    await store.replaceRoleGrants(actor, role, ["forum.topic.pin"]);
    await store.assignUserRole(actor, target, role);
    await store.setUserOverride(actor, target, "forum.topic.pin", "allow");
    const before = await facts(target);
    await deactivate(actor);

    const attempts = [
      () => store.createCustomRole(actor, { id: uuid(), slug: "l-new-" + uuid().slice(0, 8), displayName: "Late" }),
      () => store.renameCustomRole(actor, role, { displayName: "L keep" }),
      () => store.replaceRoleGrants(actor, role, ["forum.topic.pin"]),
      () => store.deleteCustomRole(actor, freeRole),
      () => store.assignUserRole(actor, target, role),
      () => store.setUserOverride(actor, target, "forum.topic.pin", "allow"),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(target)).toEqual(before);
    }
  });

  it("denies all six families for a missing bound Owner before any mutation or private no-op", async () => {
    const target = await user(), actor = "l-missing-" + uuid();
    const store = repository(actor), before = await facts(target);
    const attempts = [
      () => store.createCustomRole(actor, { id: uuid(), slug: "l-missing", displayName: "Missing" }),
      () => store.renameCustomRole(actor, uuid(), { displayName: "Missing" }),
      () => store.replaceRoleGrants(actor, uuid(), []),
      () => store.deleteCustomRole(actor, uuid()),
      () => store.assignUserRole(actor, target, uuid()),
      () => store.setUserOverride(actor, target, "forum.topic.pin", null),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts(target)).toEqual(before);
    }
  });
});
