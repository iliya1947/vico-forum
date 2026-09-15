import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  AuthorizationRoleSlugConflictError,
  PostgresAuthorizationRepository,
} from "./authorization-repository";

function managementPool() {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("from authz_roles order by")) {
      return { rows: [
        { id: "builtin-admin", slug: "admin", display_name: "Administrator", is_system: true },
        { id: "builtin-user", slug: "user", display_name: "User", is_system: true },
      ] };
    }
    if (sql.includes('from "user" u left join authz_user_roles')) {
      return { rows: [{
        user_id: "u1", user_name: "User One", email: "u1@example.test",
        id: "builtin-user", slug: "user", display_name: "User", is_system: true,
        explicit_assignment: false,
      }] };
    }
    if (sql.startsWith("select role_id, permission_key")) {
      return { rows: [
        { role_id: "builtin-admin", permission_key: "access.authorization.manage" },
        { role_id: "builtin-user", permission_key: "forum.reply.create" },
        { role_id: "builtin-user", permission_key: "forum.topic.create" },
      ] };
    }
    if (sql.startsWith("select user_id, permission_key")) {
      return { rows: [
        { user_id: "u1", permission_key: "forum.reply.create", effect: "deny" },
        { user_id: "u1", permission_key: "forum.solution.manageOwn", effect: "allow" },
      ] };
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  return { pool: { query } as unknown as Pool, query };
}

function mutationPool(insertError: unknown) {
  const query = vi.fn(async (sql: string) => {
    if (sql === "begin" || sql === "rollback") return { rows: [] };
    if (sql.includes("select managers_ever_existed")) return { rows: [{ managers_ever_existed: true }] };
    if (sql.startsWith("select count(*)::int count")) return { rows: [{ count: 1 }] };
    if (sql.startsWith("select case")) return { rows: [{ allowed: true }] };
    if (sql.startsWith("insert into authz_roles")) throw insertError;
    throw new Error(`unexpected query: ${sql}`);
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client) } as unknown as Pool;
  return { pool, query };
}

describe("PostgresAuthorizationRepository management reads", () => {
  it("bulk-loads roles, users, grants, and overrides with a fixed query count", async () => {
    const { pool, query } = managementPool();
    const state = await new PostgresAuthorizationRepository(pool).readManagementState();

    expect(query).toHaveBeenCalledTimes(4);
    expect(state.roles.find((role) => role.slug === "user")?.grants).toEqual([
      "forum.reply.create", "forum.topic.create",
    ]);
    expect(state.users[0]?.authorization).toMatchObject({
      role: { slug: "user" },
      explicitAssignment: false,
      grants: ["forum.reply.create", "forum.topic.create"],
      overrides: { "forum.reply.create": "deny", "forum.solution.manageOwn": "allow" },
      effectivePermissions: ["forum.solution.manageOwn", "forum.topic.create"],
    });
  });

  it("translates only the role-slug unique violation to a domain conflict", async () => {
    const error = { code: "23505", constraint: "authz_roles_slug_unique" };
    const { pool, query } = mutationPool(error);
    const repository = new PostgresAuthorizationRepository(pool);

    await expect(repository.createCustomRole("manager", {
      id: "custom-1", slug: "duplicate", displayName: "Duplicate",
    })).rejects.toBeInstanceOf(AuthorizationRoleSlugConflictError);
    expect(query).toHaveBeenCalledWith("rollback");
  });
});
