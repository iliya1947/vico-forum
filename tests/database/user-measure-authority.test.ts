import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationForbiddenError, AuthorizationRoleAssignedError, PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { AuthorizationService } from "../../db/authorization-service";
import { PostgresUserMeasuresRepository, UserMeasuresService } from "../../db/user-measures";
import { PostgresUserMeasureReader } from "../../db/user-measure-read";
import { PERMISSION_CATALOG } from "../../app/authorization/catalog";
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

    // Unbound repositories reject elevated-key changes regardless of the ordinary admin role.
    await expect(unbound.setUserOverride("owner", "plain", elevated, null))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await owner.setUserOverride("owner", "plain", elevated, null);
    expect((await owner.resolveUser("plain")).effectivePermissions).not.toContain(elevated);
  });

  it("denies ordinary manager writes but permits Owner edits of non-elevated configuration", async () => {
    const before = await historyCount();
    await expect(owner.setUserOverride("manager", "plain", "forum.topic.pin", "allow"))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect((await owner.resolveUser("plain")).effectivePermissions).not.toContain("forum.topic.pin");
    await owner.setUserOverride("owner", "plain", "forum.topic.pin", "allow");
    expect((await owner.resolveUser("plain")).effectivePermissions).toContain("forum.topic.pin");
    await expect(owner.replaceRoleGrants("manager", "ap10-elevated-role", [elevated, "forum.reply.create"]))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await owner.replaceRoleGrants("owner", "ap10-elevated-role", [elevated, "forum.reply.create"]);
    expect((await owner.readRole("ap10-elevated-role"))?.grants).toEqual([elevated, "forum.reply.create"].sort());
    expect(await historyCount()).toBe(before + 2);
  });
  it("guards role deletion for elevated and ordinary roles under the same Owner-only policy", async () => {
    const suffix = randomUUID();
    await owner.createCustomRole("owner", {
      slug: "elevated-deletion-" + suffix, displayName: "Elevated cascade",
    });
    const elevatedRole = (await owner.listRoles()).find(r => r.slug === "elevated-deletion-" + suffix)!;
    await owner.replaceRoleGrants("owner", elevatedRole.id, [elevated]);
    const before = await historyCount();
    await expect(owner.deleteCustomRole("manager", elevatedRole.id))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect((await owner.readRole(elevatedRole.id))?.grants).toEqual([elevated]);
    expect(await historyCount()).toBe(before);

    await owner.assignUserRole("owner", "plain", elevatedRole.id);
    await expect(owner.deleteCustomRole("owner", elevatedRole.id))
      .rejects.toBeInstanceOf(AuthorizationRoleAssignedError);
    await owner.assignUserRole("owner", "plain", "builtin-user");
    const beforeDeletion = await historyCount();
    await owner.deleteCustomRole("owner", elevatedRole.id);
    await expect(owner.readRole(elevatedRole.id)).resolves.toBeUndefined();
    expect(await historyCount()).toBe(beforeDeletion + 1);
    expect((await client.query(
      "select count(*)::int n from authz_role_permissions where role_id=$1", [elevatedRole.id],
    )).rows[0].n).toBe(0);

    const normalSlug = "ordinary-deletion-" + randomUUID();
    await expect(owner.createCustomRole("manager", { slug: normalSlug, displayName: "Ordinary role" }))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await owner.createCustomRole("owner", { slug: normalSlug, displayName: "Ordinary role" });
    const normal = (await owner.listRoles()).find(r => r.slug === normalSlug)!;
    await expect(owner.deleteCustomRole("manager", normal.id))
      .rejects.toBeInstanceOf(AuthorizationForbiddenError);
    await owner.deleteCustomRole("owner", normal.id);
    await expect(owner.readRole(normal.id)).resolves.toBeUndefined();
  });

  it("admits bound Owner with zero raw grants and denied block keys through measures, appeals and privacy reads", async () => {
    const emptyRole = "stage2-owner-no-raw-keys";
    const measures = new UserMeasuresService(new PostgresUserMeasuresRepository(pool, "owner"));
    const reader = new PostgresUserMeasureReader(pool, "owner");
    const firstId = randomUUID();
    const secondId = randomUUID();
    const startHistory = await historyCount();

    await client.query("insert into authz_roles(id,slug,display_name,is_system) values($1,$1,'Stored Owner role',false)", [emptyRole]);
    await client.query("update authz_user_roles set role_id=$1 where user_id='owner'", [emptyRole]);
    await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
      values('owner','admin.users.blocks.manage','deny'),
            ('owner','admin.users.blocks.managePrivileged','deny')`);
    try {
      const ownAuth = await owner.resolveUser("owner");
      expect(ownAuth.grants).toEqual([]);
      expect(ownAuth.overrides).toMatchObject({
        "admin.users.blocks.manage": "deny", "admin.users.blocks.managePrivileged": "deny",
      });
      expect(ownAuth.effectivePermissions).toEqual([...PERMISSION_CATALOG].sort());
      expect(await owner.resolveUser("plain")).not.toMatchObject({ effectivePermissions: [...PERMISSION_CATALOG].sort() });

      const first = await measures.create({
        id: firstId, actorId: "owner", targetUserId: "plain",
        reason: "Owner reviews suspicious posting", restrictions: ["topics.create"], expiresAt: null,
      });
      expect(first).toEqual({ id: firstId, version: 1 });
      expect((await client.query(
        "select issuer_authority_floor from user_measures where id=$1", [firstId],
      )).rows[0].issuer_authority_floor).toBe(3);
      expect((await reader.adminTarget("owner", "plain")).measures.some(m => m.id === firstId)).toBe(true);
      expect((await reader.adminDetail("owner", firstId)).canMutate).toBe(true);
      await expect(reader.adminTarget("owner", "owner")).rejects.toBeInstanceOf(UserMeasureForbiddenError);
      await expect(measures.create({
        id: randomUUID(), actorId: "owner", targetUserId: "owner", reason: "Self-target denied",
        restrictions: ["topics.create"], expiresAt: null,
      })).rejects.toBeInstanceOf(UserMeasureForbiddenError);
      await expect(measures.create({
        id: randomUUID(), actorId: "manager", targetUserId: "plain", reason: "No raw basic manage",
        restrictions: ["topics.create"], expiresAt: null,
      })).rejects.toBeInstanceOf(UserMeasureForbiddenError);

      const changed = await measures.change({
        measureId: firstId, operationId: randomUUID(), actorId: "owner",
        expectedVersion: 1, reason: "Reconsider posting scope",
        restrictions: ["replies.create"], expiresAt: null,
      });
      expect(changed.version).toBe(2);
      const rejected = await measures.submitAppeal({
        id: randomUUID(), measureId: firstId, actorId: "plain", body: "Please reconsider",
      });
      expect((await reader.adminPendingAppeals("owner")).appeals.some(a => a.id === rejected.id)).toBe(true);
      const denied = await measures.resolveAppeal({
        measureId: firstId, appealId: rejected.id, operationId: randomUUID(), actorId: "owner",
        expectedVersion: 2, outcome: "rejected", explanation: "Evidence remains valid",
        remedy: null, restrictions: null, expiresAt: null,
      });
      expect(denied.outcome).toBe("rejected");

      const changeAppeal = await measures.submitAppeal({
        id: randomUUID(), measureId: firstId, actorId: "plain", body: "New supporting information",
      });
      const changeResult = await measures.resolveAppeal({
        measureId: firstId, appealId: changeAppeal.id, operationId: randomUUID(), actorId: "owner",
        expectedVersion: 2, outcome: "accepted", explanation: "Change accepted",
        remedy: "change", restrictions: ["posts.edit"], expiresAt: null,
      });
      expect(changeResult).toMatchObject({ outcome: "accepted", remedy: "change", version: 3 });

      const liftAppeal = await measures.submitAppeal({
        id: randomUUID(), measureId: firstId, actorId: "plain", body: "Final reconsideration",
      });
      const liftResult = await measures.resolveAppeal({
        measureId: firstId, appealId: liftAppeal.id, operationId: randomUUID(), actorId: "owner",
        expectedVersion: 3, outcome: "accepted", explanation: "Lift accepted",
        remedy: "lift", restrictions: null, expiresAt: null,
      });
      expect(liftResult).toMatchObject({ outcome: "accepted", remedy: "lift", version: 4 });

      const second = await measures.create({
        id: secondId, actorId: "owner", targetUserId: "plain",
        reason: "Separate violation", restrictions: ["profile.edit"], expiresAt: null,
      });
      expect(second.version).toBe(1);
      const directLift = await measures.lift({
        measureId: secondId, operationId: randomUUID(), actorId: "owner",
        expectedVersion: 1, reason: "Direct lift after review",
      });
      expect(directLift.version).toBe(2);
      expect((await reader.adminPendingAppeals("owner")).appeals.some(a => a.measureId === firstId)).toBe(false);
      expect(await historyCount()).toBe(startHistory + 7);
    } finally {
      await client.query("delete from authz_user_permission_overrides where user_id='owner' and permission_key in ('admin.users.blocks.manage','admin.users.blocks.managePrivileged')");
      await client.query("update authz_user_roles set role_id='builtin-admin' where user_id='owner'");
      await client.query("delete from authz_roles where id=$1", [emptyRole]);
    }
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
