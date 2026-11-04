import { readFile, readdir } from "node:fs/promises";
import { RouterContextProvider } from "react-router";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumReaderContext } from "../../app/forum/request-context";
import { action as canonicalAuthorizationAction } from "../../app/routes/authorization-admin";
import { loader as adminUserDetail } from "../../app/routes/admin-user";
import { createAuthorizationCapability, AuthorizationService } from "../../db/authorization-service";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";

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
const capability = {
  ...createAuthorizationCapability(repository),
  readUserManagementState: (id: string) => service.readUserManagementState(id),
  assignUserRole: (actor: string, user: string, role: string) => service.assignUserRole(actor, user, role),
  setUserOverride: (actor: string, user: string, permission: unknown, effect: unknown) =>
    service.setUserOverride(actor, user, permission, effect),
};

const profile = {
  id: "target", name: "Target", image: null, joinedAt: new Date("2026-10-01T10:00:00Z"),
  bio: "Public biography", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true },
  messageCount: 0, bestAnswerCount: 0,
  email: "secret-target@example.invalid",
};
function requestContext(actorId: string | null) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId
    ? { user: { id: actorId, name: actorId, email: "private@example.invalid" } } as AuthSession
    : null);
  context.set(authorizationContext, capability as never);
  const readProfile = vi.fn(async (id: string) => id === "target" ? profile : null);
  context.set(forumReaderContext, { readProfile } as never);
  return { context, readProfile };
}
async function detail(actorId: string | null, id = "target") {
  const { context, readProfile } = requestContext(actorId);
  const result = await adminUserDetail({ params: { locale: "en", userId: id }, context });
  return { result, readProfile };
}
function post(actorId: string, fields: Record<string, string>, origin = "https://forum.test") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const request = new Request("https://forum.test/en/admin/authorization", {
    method: "POST", headers: { Origin: origin }, body: form,
  });
  return canonicalAuthorizationAction({ request, context: requestContext(actorId).context });
}
function override(permission: string, effect: string, userId = "target") {
  return { intent: "override", userId, permission, effect };
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

describe("AP-09 integrated Users permissions and canonical authorization mutations", () => {
  it("enforces fresh allow/deny/inherit, separate read/manage gates, canonical writes and History", async () => {
    expect(await history()).toHaveLength(0);
    expect(await repository.hasPermission("manager", "admin.users.read")).toBe(true);
    expect(await repository.hasPermission("target", "admin.users.read")).toBe(false);
    const guest = requestContext(null);
    await expect(adminUserDetail({ params: { locale: "en", userId: "target" }, context: guest.context }))
      .rejects.toMatchObject({ status: 401 });
    expect(guest.readProfile).not.toHaveBeenCalled();
    const denied = requestContext("target");
    await expect(adminUserDetail({ params: { locale: "en", userId: "target" }, context: denied.context }))
      .rejects.toMatchObject({ status: 403 });
    expect(denied.readProfile).not.toHaveBeenCalled();

    expect(await post("manager", override("admin.users.read", "allow"))).toEqual({ ok: true });
    const readOnly = (await detail("target")).result.data;
    expect(readOnly.access).toMatchObject({ canReadUsers: true, canManageAuthorization: false });
    expect(readOnly).not.toHaveProperty("management");
    expect(readOnly).not.toHaveProperty("managerActorId");
    expect(JSON.stringify(readOnly)).not.toContain("secret-target@example.invalid");
    expect(await repository.hasPermission("target", "admin.history.read")).toBe(false);

    expect(await post("manager", override("access.authorization.manage", "allow"))).toEqual({ ok: true });
    const both = (await detail("target")).result.data;
    expect(both.access).toMatchObject({ canReadUsers: true, canManageAuthorization: true });
    expect(both.management).toMatchObject({ userId: "target" });
    expect(JSON.stringify(both.management)).not.toContain("secret-target@example.invalid");

    expect(await post("manager", override("admin.users.read", "deny"))).toEqual({ ok: true });
    await expect(detail("target")).rejects.toMatchObject({ status: 403 });
    const beforeManagementOnlyWrite = (await history()).length;
    expect(await post("target", override("forum.topic.pin", "allow"))).toEqual({ ok: true });
    expect((await history())).toHaveLength(beforeManagementOnlyWrite + 1);
    expect((await repository.readUserManagementState("target")).authorization.overrides)
      .toMatchObject({ "forum.topic.pin": "allow", "admin.users.read": "deny" });

    expect(await post("manager", { intent: "assignRole", userId: "target", roleId: "builtin-admin" }))
      .toEqual({ ok: true });
    await expect(detail("target")).rejects.toMatchObject({ status: 403 });
    expect(await post("manager", override("admin.users.read", "inherit"))).toEqual({ ok: true });
    const inherited = (await detail("target")).result.data;
    expect(inherited.access).toMatchObject({ canReadUsers: true, canManageAuthorization: true });
    expect(inherited.management.authorization).toMatchObject({
      explicitAssignment: true, overrides: { "access.authorization.manage": "allow", "forum.topic.pin": "allow" },
    });
    expect(inherited.management.authorization.effectivePermissions).toContain("admin.users.read");

    expect(await post("manager", override("access.authorization.manage", "deny"))).toEqual({ ok: true });
    const revoked = (await detail("target")).result.data;
    expect(revoked.access).toMatchObject({ canReadUsers: true, canManageAuthorization: false });
    expect(revoked).not.toHaveProperty("management");
    await expect(post("target", override("forum.topic.pin", "deny"))).rejects.toMatchObject({ status: 403 });
    const beforeNoop = (await history()).length;
    expect(await post("manager", override("admin.users.read", "inherit"))).toEqual({ ok: true });
    expect((await history())).toHaveLength(beforeNoop);
    const changes = await history();
    expect(changes.filter(change => change.action === "user.roleAssigned")).toHaveLength(1);
    expect(changes.filter(change => change.action === "user.overrideChanged").length).toBeGreaterThan(4);
    expect(changes.every(change => change.target_id === "target")).toBe(true);
  });

  it("preserves lockout, origin rejection and atomic History rollback on the same action", async () => {
    const before = (await history()).length;
    const forbidden = await post("manager", override("forum.reply.create", "deny"), "https://not-forum.test");
    expect(forbidden).toBeInstanceOf(Response);
    expect((forbidden as Response).status).toBe(403);
    expect((await history())).toHaveLength(before);

    const lockout = await post("manager", override("access.authorization.manage", "deny", "manager"));
    expect(lockout).toBeInstanceOf(Response);
    expect((lockout as Response).status).toBe(409);
    expect(await (lockout as Response).json()).toEqual({ error: "conflict" });
    expect(await repository.hasPermission("manager", "access.authorization.manage")).toBe(true);
    expect((await history())).toHaveLength(before);

    await client.query(`create function reject_ap09_history() returns trigger language plpgsql as
      $$ begin raise exception 'AP-09 history rollback'; end $$;
      create trigger reject_ap09_history before insert on admin_history
      for each row execute function reject_ap09_history()`);
    try {
      await expect(post("manager", override("forum.topic.pin", "deny")))
        .rejects.toThrow("AP-09 history rollback");
      expect((await repository.readUserManagementState("target")).authorization.overrides)
        .toMatchObject({ "forum.topic.pin": "allow" });
      expect((await history())).toHaveLength(before);
    } finally {
      await client.query("drop trigger reject_ap09_history on admin_history; drop function reject_ap09_history()");
    }
    expect(await post("manager", override("forum.topic.pin", "deny"))).toEqual({ ok: true });
    const after = await history();
    expect(after).toHaveLength(before + 1);
    expect(after.at(-1)).toMatchObject({
      action: "user.overrideChanged", target_id: "target",
      context: { permission: "forum.topic.pin", before: "allow", after: "deny" },
    });
  });
});
