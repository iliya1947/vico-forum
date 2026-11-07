import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { PERMISSION_CATALOG } from "../app/authorization/catalog";
import {
  AuthorizationForbiddenError,
  AuthorizationRoleSlugConflictError,
  PostgresAuthorizationRepository,
} from "./authorization-repository";

const BEGIN_READ_SNAPSHOT = "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";

function managementRows(sql: string) {
  if (sql === BEGIN_READ_SNAPSHOT || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
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
}

function resolvedUserRows(sql: string) {
  if (sql === BEGIN_READ_SNAPSHOT || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
  if (sql.includes('from "user" u') && sql.includes("where u.id = $1")) {
    return { rows: [{
      id: "builtin-user", slug: "user", display_name: "User", is_system: true,
      explicit_assignment: false,
    }] };
  }
  if (sql.startsWith("select permission_key from authz_role_permissions")) {
    return { rows: [{ permission_key: "forum.topic.create" }] };
  }
  if (sql.startsWith("select permission_key, effect from authz_user_permission_overrides")) {
    return { rows: [] };
  }
  throw new Error(`unexpected query: ${sql}`);
}

function snapshotPool(handler: (sql: string) => unknown | Promise<unknown>) {
  const query = vi.fn(async (sql: string) => handler(sql));
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const connect = vi.fn(async () => client);
  return { pool: { connect } as unknown as Pool, connect, query, release };
}

function mutationPool(insertError: unknown) {
  const query = vi.fn(async (sql: string) => {
    if (sql === "begin" || sql === "rollback") return { rows: [] };
    if (sql.includes("select id from authz_mutation_lock")) return { rows: [{ id: 1 }] };
    if (sql.startsWith("select case")) return { rows: [{ allowed: true }] };
    if (sql.includes("from user_measures as measure")) return { rows: [{ restricted: false }] };
    if (sql.startsWith("insert into authz_roles")) throw insertError;
    throw new Error(`unexpected query: ${sql}`);
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client) } as unknown as Pool;
  return { pool, query };
}

describe("PostgresAuthorizationRepository snapshot reads", () => {
  it("bulk-loads management state in one snapshot with exactly four data reads", async () => {
    const { pool, connect, query, release } = snapshotPool(managementRows);
    const state = await new PostgresAuthorizationRepository(pool).readManagementState();

    const dataQueries = query.mock.calls.map(([sql]) => sql).filter(
      (sql) => sql !== BEGIN_READ_SNAPSHOT && sql !== "COMMIT" && sql !== "ROLLBACK",
    );
    expect(dataQueries).toHaveLength(4);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      BEGIN_READ_SNAPSHOT,
      expect.stringContaining("from authz_roles order by"),
      expect.stringContaining('from "user" u left join authz_user_roles'),
      "select role_id, permission_key from authz_role_permissions order by role_id, permission_key",
      "select user_id, permission_key, effect from authz_user_permission_overrides order by user_id, permission_key",
      "COMMIT",
    ]);
    expect(release).toHaveBeenCalledTimes(1);
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

  it("projects bound Owner in both bulk and targeted snapshot without rewriting raw grants and overrides", async () => {
    const { pool: bulkPool } = snapshotPool(managementRows);
    const bulk = await new PostgresAuthorizationRepository(bulkPool, "u1").readManagementState();
    expect(bulk.users[0]?.authorization).toMatchObject({
      grants: ["forum.reply.create", "forum.topic.create"],
      overrides: { "forum.reply.create": "deny", "forum.solution.manageOwn": "allow" },
      effectivePermissions: [...PERMISSION_CATALOG].sort(),
    });

    const { pool: targetedPool } = snapshotPool((sql) => {
      if (sql.startsWith("select permission_key, effect from authz_user_permission_overrides")) {
        return { rows: [{ permission_key: "forum.topic.create", effect: "deny" }] };
      }
      return resolvedUserRows(sql);
    });
    const target = await new PostgresAuthorizationRepository(targetedPool, "u1").resolveUser("u1");
    expect(target).toMatchObject({
      grants: ["forum.topic.create"],
      overrides: { "forum.topic.create": "deny" },
      effectivePermissions: [...PERMISSION_CATALOG].sort(),
    });
  });

  it("rolls back a post-BEGIN component failure and preserves it over rollback cleanup failure", async () => {
    const operationError = new Error("component failed");
    const rollbackError = new Error("rollback failed");
    const { pool, query, release } = snapshotPool((sql) => {
      if (sql === BEGIN_READ_SNAPSHOT) return { rows: [] };
      if (sql === "ROLLBACK") throw rollbackError;
      if (sql.includes('from "user" u')) throw operationError;
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(new PostgresAuthorizationRepository(pool).resolveUser("u1")).rejects.toBe(operationError);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      BEGIN_READ_SNAPSHOT,
      expect.stringContaining('from "user" u'),
      "ROLLBACK",
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("preserves a COMMIT failure over rollback cleanup failure", async () => {
    const commitError = new Error("commit failed");
    const rollbackError = new Error("rollback failed");
    const { pool, query, release } = snapshotPool((sql) => {
      if (sql === "COMMIT") throw commitError;
      if (sql === "ROLLBACK") throw rollbackError;
      return resolvedUserRows(sql);
    });

    await expect(new PostgresAuthorizationRepository(pool).resolveUser("u1")).rejects.toBe(commitError);
    expect(query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("propagates BEGIN failure without a fictional rollback and releases once", async () => {
    const beginError = new Error("begin failed");
    const { pool, query, release } = snapshotPool((sql) => {
      if (sql === BEGIN_READ_SNAPSHOT) throw beginError;
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(new PostgresAuthorizationRepository(pool).resolveUser("u1")).rejects.toBe(beginError);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(BEGIN_READ_SNAPSHOT);
    expect(query).not.toHaveBeenCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("keeps an explicitly bound query context inside that context without checking out another client", async () => {
    const boundQuery = vi.fn(async (sql: string) => resolvedUserRows(sql));
    const connect = vi.fn(async () => {
      throw new Error("normal snapshot path should not run");
    });
    const repository = new PostgresAuthorizationRepository({ connect } as unknown as Pool);

    await expect(repository.resolveUser("u1", { query: boundQuery } as unknown as Pick<PoolClient, "query">)).resolves.toMatchObject({
      role: { slug: "user" },
      grants: ["forum.topic.create"],
      overrides: {},
      effectivePermissions: ["forum.topic.create"],
    });
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("PostgresAuthorizationRepository mutations", () => {

  it("denies every direct authorization mutation for an ordinary manager before state or History writes", async () => {
    const { pool, query } = mutationPool(new Error("mutation operation must not run"));
    const repository = new PostgresAuthorizationRepository(pool, "actual-owner");

    const attempts = [
      () => repository.createCustomRole("manager", { id: "r", slug: "role", displayName: "Role" }),
      () => repository.renameCustomRole("manager", "r", { displayName: "Other" }),
      () => repository.replaceRoleGrants("manager", "r", []),
      () => repository.deleteCustomRole("manager", "r"),
      () => repository.assignUserRole("manager", "target", "r"),
      () => repository.setUserOverride("manager", "target", "forum.topic.pin", null),
    ];
    for (const mutate of attempts) {
      await expect(mutate()).rejects.toBeInstanceOf(AuthorizationForbiddenError);
    }
    const statements = query.mock.calls.map(([sql]) => sql);
    expect(statements).toHaveLength(attempts.length * 4);
    for (let index = 0; index < attempts.length; index++) {
      expect(statements.slice(index * 4, index * 4 + 4)).toEqual([
        "begin",
        expect.stringContaining("select id from authz_mutation_lock"),
        expect.stringContaining("select case"),
        "rollback",
      ]);
    }
    expect(statements.join("\n")).not.toMatch(/insert into authz_|update authz_|delete from authz_|admin_history/);
  });

  it("denies ordinary managers when Owner binding is missing or invalid", async () => {
    for (const binding of [undefined, "", " manager", "manager "]) {
      const { pool, query } = mutationPool(new Error("mutation must not run"));
      const repository = new PostgresAuthorizationRepository(pool, binding);
      await expect(repository.createCustomRole("manager", {
        id: "r", slug: "r", displayName: "Role",
      })).rejects.toBeInstanceOf(AuthorizationForbiddenError);
      expect(query.mock.calls.map(([sql]) => sql)).toEqual([
        "begin",
        expect.stringContaining("select id from authz_mutation_lock"),
        expect.stringContaining("select case"),
        "rollback",
      ]);
    }
  });
  it("translates only the role-slug unique violation to a domain conflict", async () => {
    const error = { code: "23505", constraint: "authz_roles_slug_unique" };
    const { pool, query } = mutationPool(error);
    const repository = new PostgresAuthorizationRepository(pool, "manager");

    await expect(repository.createCustomRole("manager", {
      id: "custom-1", slug: "duplicate", displayName: "Duplicate",
    })).rejects.toBeInstanceOf(AuthorizationRoleSlugConflictError);
    expect(query).toHaveBeenCalledWith("rollback");
  });
});
