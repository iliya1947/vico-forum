import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PERMISSION_CATALOG, type PermissionKey } from "../../app/authorization/catalog";
import {
  AuthorizationForbiddenError, AuthorizationNotFoundError, PostgresAuthorizationRepository,
} from "../../db/authorization-repository";
import { AuthorizationService, createAuthorizationCapability } from "../../db/authorization-service";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}

const schema = "owner_authority_stage2_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const repository = new PostgresAuthorizationRepository(pool, "owner");
const service = new AuthorizationService(repository);

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('owner','Owner','stage2-owner@example.invalid'),
    ('ordinary','Ordinary','stage2-ordinary@example.invalid'),
    ('manager','Manager','stage2-manager@example.invalid')`);
  await client.query(`insert into authz_roles(id,slug,display_name,is_system) values
    ('owner-empty','owner-empty','Owner',false)`);
  await client.query(`insert into authz_user_roles(user_id,role_id) values
    ('owner','owner-empty'),('ordinary','owner-empty'),('manager','builtin-admin')`);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
    select 'owner', key, 'deny' from authz_permissions`);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
    values ('manager','access.authorization.manage','deny')`);
});

afterAll(async () => {
  await pool.end();
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("Stage 2 central Owner effective authority, PostgreSQL 17", () => {
  it("projects all code-backed permissions without changing raw role, grants, or explicit denies", async () => {
    const resolved = await service.resolveUser("owner");
    const full = await service.readManagementState();
    const targeted = await service.readUserManagementState("owner");
    const bulkOwner = full.users.find(user => user.id === "owner")?.authorization;
    for (const state of [resolved, bulkOwner, targeted.authorization]) {
      expect(state).toMatchObject({
        role: { slug: "owner-empty", displayName: "Owner" },
        grants: [],
        authoritySource: "owner",
        effectivePermissions: [...PERMISSION_CATALOG].sort(),
      });
      expect(Object.keys(state?.overrides ?? {}).sort()).toEqual([...PERMISSION_CATALOG].sort());
      expect(Object.values(state?.overrides ?? {}).every(effect => effect === "deny")).toBe(true);
    }
    const stored = await client.query<{ permission_key: string; effect: string }>(
      "select permission_key, effect from authz_user_permission_overrides where user_id='owner' order by permission_key",
    );
    expect(stored.rows.map(row => row.permission_key)).toEqual([...PERMISSION_CATALOG].sort());
    expect(stored.rows.every(row => row.effect === "deny")).toBe(true);
  });

  it("uses catalog-bound Owner on direct has and request-local capability, never unknown strings", async () => {
    for (const permission of PERMISSION_CATALOG) {
      await expect(repository.hasPermission("owner", permission)).resolves.toBe(true);
    }
    const resolver = createAuthorizationCapability(repository).forUser("owner");
    expect(await resolver.has("access.authorization.manage")).toBe(true);
    expect((await resolver.resolve()).effectivePermissions).toEqual([...PERMISSION_CATALOG].sort());
    await expect(repository.hasPermission("owner", "invented.permission" as PermissionKey)).resolves.toBe(false);
  });

  it("preserves non-Owner raw RBAC, rejects fake Owner identity and invalid/missing binding", async () => {
    expect((await service.resolveUser("ordinary")).role.displayName).toBe("Owner");
    expect((await service.resolveUser("ordinary")).authoritySource).toBeUndefined();
    expect((await service.resolveUser("ordinary")).effectivePermissions).toEqual([]);
    expect(await repository.hasPermission("ordinary", "access.authorization.manage")).toBe(false);
    expect(await repository.hasPermission("manager", "access.authorization.manage")).toBe(false);
    expect((await service.resolveUser("manager")).overrides).toMatchObject({
      "access.authorization.manage": "deny",
    });

    for (const binding of [undefined, "", " owner", "owner "]) {
      const unbound = new PostgresAuthorizationRepository(pool, binding);
      expect((await unbound.resolveUser("owner")).effectivePermissions).toEqual([]);
      expect(await unbound.hasPermission("owner", "access.authorization.manage")).toBe(false);
    }
    const missingOwner = new PostgresAuthorizationRepository(pool, "nonexistent");
    expect(await missingOwner.hasPermission("nonexistent", "access.authorization.manage")).toBe(false);
    await expect(missingOwner.resolveUser("nonexistent")).rejects.toBeInstanceOf(AuthorizationNotFoundError);
  });

  it("accepts Owner authorization mutation despite own deny and zero ordinary managers, with atomic History", async () => {
    const initialHistory = await client.query<{ total: number }>(
      "select count(*)::int total from admin_history",
    );
    await service.createCustomRole("owner", { slug: "owner-created", displayName: "Owner created" });
    const result = await client.query<{ id: string }>(
      "select id from authz_roles where slug='owner-created'",
    );
    expect(result.rows).toHaveLength(1);
    const events = await client.query<{ action: string; target_id: string; actor_id: string }>(
      "select action,target_id,actor_id from admin_history order by position",
    );
    expect(events.rows).toHaveLength(initialHistory.rows[0]!.total + 1);
    expect(events.rows.at(-1)).toMatchObject({
      action: "role.created", actor_id: "owner", target_id: result.rows[0]?.id,
    });

    await expect(service.createCustomRole("manager", {
      slug: "manager-forbidden", displayName: "Forbidden",
    })).rejects.toBeInstanceOf(AuthorizationForbiddenError);
    expect((await client.query("select count(*)::int total from admin_history")).rows[0].total)
      .toBe(initialHistory.rows[0]!.total + 1);
    expect((await client.query("select count(*)::int total from authz_roles where slug='manager-forbidden'")).rows[0].total)
      .toBe(0);
  });
});
