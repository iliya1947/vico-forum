import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationForbiddenError, PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { AuthorizationService } from "../../db/authorization-service";
import { PostgresUserMeasuresRepository, UserMeasuresService } from "../../db/user-measures";
import { UserMeasureForbiddenError } from "../../db/user-measure-authority";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}

const schema = "ap10_owner_elevated_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const owner = new AuthorizationService(new PostgresAuthorizationRepository(pool, "owner"));
const unbound = new AuthorizationService(new PostgresAuthorizationRepository(pool));
const elevated = "admin.users.blocks.managePrivileged";

async function historyCount() {
  const result = await client.query<{ total: number }>(
    "select count(*)::int as total from admin_history",
  );
  return result.rows[0].total;
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('owner','Owner','ap10-owner@example.invalid'),
    ('manager','Manager','ap10-manager@example.invalid'),
    ('target','Target','ap10-target@example.invalid'),
    ('plain','Plain','ap10-plain@example.invalid')`);
  await client.query(`insert into authz_user_roles(user_id, role_id) values
    ('owner','builtin-admin'),('manager','builtin-admin')`);
  await client.query(`insert into authz_roles(id,slug,display_name,is_system) values
    ('ap10-elevated-role','ap10-elevated-role','Elevated test role',false)`);
});

afterAll(async () => {
  await pool.end();
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("AP-10 owner-only elevated permission changes inside authorization transaction", () => {
  it("rejects nonowner role grant, override and elevated role assignment without writing History", async () => {
    const initial = await historyCount();
    await expect(owner.replaceRoleGrants("manager", "ap10-elevated-role", [elevated]))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await expect(owner.setUserOverride("manager", "plain", elevated, "allow"))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect(await historyCount()).toBe(initial);
    expect((await owner.readRole("ap10-elevated-role"))?.grants).toEqual([]);
    expect((await owner.resolveUser("plain")).effectivePermissions).not.toContain(elevated);

    // A fully authorized owner explicitly provisions one role.
    await owner.replaceRoleGrants("owner", "ap10-elevated-role", [elevated]);
    const afterGrant = await historyCount();
    expect(afterGrant).toBe(initial + 1);
    await expect(owner.assignUserRole("manager", "target", "ap10-elevated-role"))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await expect(owner.replaceRoleGrants("manager", "ap10-elevated-role", []))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect(await historyCount()).toBe(afterGrant);
    expect((await owner.readRole("ap10-elevated-role"))?.grants).toContain(elevated);

    await owner.assignUserRole("owner", "target", "ap10-elevated-role");
    expect((await owner.resolveUser("target")).effectivePermissions).toContain(elevated);
    // An ordinary manager must not downrank an elevated subject by switching away from the protected role.
    const afterAssignment = await historyCount();
    await expect(owner.assignUserRole("manager", "target", "builtin-user"))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect((await owner.resolveUser("target")).effectivePermissions).toContain(elevated);
    expect(await historyCount()).toBe(afterAssignment);
    await owner.setUserOverride("owner", "plain", elevated, "allow");
    expect((await owner.resolveUser("plain")).effectivePermissions).toContain(elevated);
    const afterOwner = await historyCount();
    await expect(owner.setUserOverride("manager", "plain", elevated, null))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect((await owner.resolveUser("plain")).effectivePermissions).toContain(elevated);
    expect(await historyCount()).toBe(afterOwner);

    // The configured owner is not automatically able to bypass the normal access-manage requirement.
    await expect(unbound.setUserOverride("owner", "plain", elevated, null))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await owner.setUserOverride("owner", "plain", elevated, null);
    expect((await owner.resolveUser("plain")).effectivePermissions).not.toContain(elevated);
  });

  it("does not block ordinary authorization changes or unrelated role grants", async () => {
    const before = await historyCount();
    await owner.setUserOverride("manager", "plain", "forum.topic.create", "allow");
    expect((await owner.resolveUser("plain")).effectivePermissions).toContain("forum.topic.create");
    // Keeping the elevated grant unchanged while editing other role grants is not elevated-key mutation.
    await owner.replaceRoleGrants("manager", "ap10-elevated-role", [elevated, "forum.reply.create"]);
    expect((await owner.readRole("ap10-elevated-role"))?.grants).toEqual([elevated, "forum.reply.create"].sort());
    expect(await historyCount()).toBe(before + 2);
  });
  it("retains the singleton mutex for both authz and AP-10 while reevaluating fresh authority", async () => {
    const waiters = ["stage1-authz-waiter", "stage1-measure-waiter"];
    const authPool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`,
      application_name: waiters[0] });
    const measuresPool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`,
      application_name: waiters[1] });
    const blocker = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    const authorization = new PostgresAuthorizationRepository(authPool, "owner");
    const measures = new UserMeasuresService(new PostgresUserMeasuresRepository(measuresPool, "owner"));
    const id = randomUUID();
    const before = await historyCount();
    let inTransaction = false;
    try {
      await blocker.connect();
      await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
        values('manager','admin.users.blocks.manage','allow')
        on conflict(user_id,permission_key) do update set effect='allow'`);
      await blocker.query("begin");
      inTransaction = true;
      const row = await blocker.query("select id from authz_mutation_lock where id=1 for update");
      expect(row.rows).toEqual([{ id: 1 }]);

      const attempts = Promise.allSettled([
        authorization.setUserOverride("manager", "plain", "forum.topic.pin", "deny"),
        measures.create({ id, actorId: "manager", targetUserId: "plain",
          reason: "Fresh hierarchy after mutex", restrictions: ["replies.create"], expiresAt: null }),
      ]);
      // Establish both real row-lock waits with pg_stat_activity, not sleeps as evidence.
      let observed = false;
      for (let n = 0; n < 300; n += 1) {
        const waits = await client.query<{ n: number }>(`
          select count(distinct application_name)::int n from pg_stat_activity
          where application_name = any($1::text[]) and wait_event_type='Lock'`, [waiters]);
        if (waits.rows[0]?.n === 2) { observed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed).toBe(true);
      // Fixture-only authority change is committed together with the held lock release.
      await blocker.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
        values('manager','access.authorization.manage','deny')
        on conflict(user_id,permission_key) do update set effect='deny'`);
      await blocker.query(`update authz_user_permission_overrides set effect='deny'
        where user_id='manager' and permission_key='admin.users.blocks.manage'`);
      await blocker.query("commit");
      inTransaction = false;

      const outcomes = await attempts;
      expect(outcomes).toMatchObject([
        { status: "rejected", reason: expect.any(AuthorizationForbiddenError) },
        { status: "rejected", reason: expect.any(UserMeasureForbiddenError) },
      ]);
      expect(await historyCount()).toBe(before);
      expect((await client.query("select id from user_measures where id=$1", [id])).rows).toEqual([]);
      expect((await client.query("select id from authz_mutation_lock where id=1")).rows).toEqual([{ id: 1 }]);
    } finally {
      if (inTransaction) await blocker.query("rollback");
      await authPool.end();
      await measuresPool.end();
      await blocker.end();
      await client.query(`delete from authz_user_permission_overrides
        where user_id='manager' and permission_key in
        ('access.authorization.manage','admin.users.blocks.manage')`);
    }
  });

});
