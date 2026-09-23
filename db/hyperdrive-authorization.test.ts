import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationUnavailableError } from "./authorization-service";
import { createHyperdriveAuthorization } from "./hyperdrive-authorization";

const BEGIN_READ_SNAPSHOT = "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";

function poolWithClient(handler: (sql: string) => unknown | Promise<unknown>): Pool {
  const query = vi.fn(async (sql: string) => handler(sql));
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return {
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
  } as unknown as Pool;
}

function rejectingConnectPool(error: unknown): Pool {
  return {
    connect: vi.fn(async () => { throw error; }),
    end: vi.fn(async () => undefined),
  } as unknown as Pool;
}

function successfulResolutionRows(sql: string) {
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

function successfulResolutionPool(): Pool {
  return poolWithClient(successfulResolutionRows);
}

describe("Hyperdrive authorization availability boundary", () => {
  it("classifies availability failures from connect, BEGIN, component queries, and COMMIT", async () => {
    const connectionFailure = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    const connectionCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => rejectingConnectPool(connectionFailure),
    );
    await expect(
      connectionCapability.forUser("user-1").has("forum.topic.create"),
    ).rejects.toBeInstanceOf(AuthorizationUnavailableError);

    const timeout = new Error("Query read timeout");
    const beginFailureCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => poolWithClient((sql) => {
        if (sql === BEGIN_READ_SNAPSHOT) throw timeout;
        throw new Error(`unexpected query: ${sql}`);
      }),
    );
    await expect(
      beginFailureCapability.forUser("user-1").resolve(),
    ).rejects.toBeInstanceOf(AuthorizationUnavailableError);

    const componentFailureCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => poolWithClient((sql) => {
        if (sql === BEGIN_READ_SNAPSHOT || sql === "ROLLBACK") return { rows: [] };
        throw timeout;
      }),
    );
    await expect(componentFailureCapability.readManagementState()).rejects.toBeInstanceOf(AuthorizationUnavailableError);

    const commitFailureCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => poolWithClient((sql) => {
        if (sql === "COMMIT") throw timeout;
        return successfulResolutionRows(sql);
      }),
    );
    await expect(
      commitFailureCapability.forUser("user-1").resolve(),
    ).rejects.toBeInstanceOf(AuthorizationUnavailableError);
  });

  it("does not classify schema or programming failures as availability", async () => {
    const schemaFailure = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const schemaCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => poolWithClient((sql) => {
        if (sql === BEGIN_READ_SNAPSHOT || sql === "ROLLBACK") return { rows: [] };
        throw schemaFailure;
      }),
    );
    await expect(
      schemaCapability.forUser("user-1").has("forum.topic.create"),
    ).rejects.toBe(schemaFailure);

    const programmingFailure = new TypeError("unexpected mapper bug");
    const programmingCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => poolWithClient((sql) => {
        if (sql === BEGIN_READ_SNAPSHOT || sql === "ROLLBACK") return { rows: [] };
        throw programmingFailure;
      }),
    );
    await expect(programmingCapability.readManagementState()).rejects.toBe(programmingFailure);
  });

  it("reuses one request-scoped resolution promise and a new capability resolves afresh", async () => {
    const factory = vi.fn(() => successfulResolutionPool());
    const capability = createHyperdriveAuthorization("postgresql://example.invalid/db", factory);
    const resolver = capability.forUser("user-1");

    const [first, second, third] = await Promise.all([
      resolver.resolve(),
      resolver.resolve(),
      capability.forUser("user-1").resolve(),
    ]);

    expect(first).toEqual(second);
    expect(second).toEqual(third);
    expect(factory).toHaveBeenCalledTimes(1);

    const nextRequest = createHyperdriveAuthorization("postgresql://example.invalid/db", factory);
    await expect(nextRequest.forUser("user-1").resolve()).resolves.toMatchObject({
      role: { slug: "user" },
      effectivePermissions: ["forum.topic.create"],
    });
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
