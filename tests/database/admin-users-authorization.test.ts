import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationService } from "../../db/authorization-service";
import { AuthorizationForbiddenError, PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { adminAccess } from "../../app/admin/access";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}
const schema = "admin_users_authorization_test";
const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
const repository = new PostgresAuthorizationRepository(pool);
const service = new AuthorizationService(repository);
async function access(userId: string) {
  const value = adminAccess(new Set((await repository.resolveUser(userId)).effectivePermissions));
  return { canReadUsers: value.canReadUsers === true, canManageAuthorization: value.canManageAuthorization };
}
function override(actorId: string, permission: string, effect: "allow" | "deny" | null, userId = "target") {
  return service.setUserOverride(actorId, userId, permission, effect);
}
async function history() {
  return (await client.query<{ action: string; target_id: string; context: unknown }>(
    "select action, target_id, context from admin_history order by position",
  )).rows;
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('manager','Manager','secret-manager@example.invalid'),
    ('target','Target','secret-target@example.invalid');
    insert into authz_user_roles(user_id,role_id) values ('manager','builtin-admin')`);
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("AP-09 dynamic Users permissions and atomic authorization History", () => {
  it("applies role grants and personal allow/deny/inherit on subsequent reads", async () => {
    expect(await history()).toHaveLength(0);
    expect(await access("manager")).toMatchObject({ canReadUsers: true, canManageAuthorization: true });
    expect(await access("target")).toMatchObject({ canReadUsers: false, canManageAuthorization: false });
    await override("manager", "admin.users.read", "allow");
    expect(await access("target")).toMatchObject({ canReadUsers: true, canManageAuthorization: false });
    await override("manager", "access.authorization.manage", "allow");
    expect(await access("target")).toMatchObject({ canReadUsers: true, canManageAuthorization: true });
    const snapshot = await service.readUserManagementState("target");
    expect(snapshot.roles.every(role => !("grants" in role) && !("email" in role))).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("secret-manager@example.invalid");
    await override("manager", "admin.users.read", "deny");
    expect(await access("target")).toMatchObject({ canReadUsers: false, canManageAuthorization: true });
    await override("target", "forum.topic.pin", "allow");
    await service.assignUserRole("manager", "target", "builtin-admin");
    expect(await access("target")).toMatchObject({ canReadUsers: false, canManageAuthorization: true });
    await override("manager", "admin.users.read", null);
    expect(await access("target")).toMatchObject({ canReadUsers: true, canManageAuthorization: true });
    const inherited = await service.readUserManagementState("target");
    expect(inherited.authorization).toMatchObject({ role: { slug: "admin" }, explicitAssignment: true });
    expect(inherited.authorization.effectivePermissions).toContain("admin.users.read");
    await override("manager", "access.authorization.manage", "deny");
    expect(await access("target")).toMatchObject({ canReadUsers: true, canManageAuthorization: false });
    await expect(override("target", "forum.topic.pin", "deny")).rejects.toBeInstanceOf(AuthorizationForbiddenError);
    const beforeNoop = (await history()).length;
    await override("manager", "admin.users.read", null);
    expect((await history())).toHaveLength(beforeNoop);
    const changes = await history();
    expect(changes.filter(change => change.action === "user.roleAssigned")).toHaveLength(1);
    expect(changes.filter(change => change.action === "user.overrideChanged").length).toBeGreaterThan(4);
    expect(changes.every(change => change.target_id === "target")).toBe(true);
  });

  it("rolls back failed History append without losing authoritative access", async () => {
    const before = (await history()).length;
    await client.query(`create function reject_ap09_history() returns trigger language plpgsql as
      $$ begin raise exception 'AP-09 history rollback'; end $$;
      create trigger reject_ap09_history before insert on admin_history
      for each row execute function reject_ap09_history()`);
    try {
      await expect(override("manager", "forum.topic.pin", "deny")).rejects.toThrow("AP-09 history rollback");
      expect((await repository.readUserManagementState("target")).authorization.overrides)
        .toMatchObject({ "forum.topic.pin": "allow" });
      expect((await history())).toHaveLength(before);
    } finally {
      await client.query("drop trigger reject_ap09_history on admin_history; drop function reject_ap09_history()");
    }
    await override("manager", "forum.topic.pin", "deny");
    expect((await history())).toHaveLength(before + 1);
  });
});
