import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationForbiddenError, PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { AuthorizationService } from "../../db/authorization-service";

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
});
