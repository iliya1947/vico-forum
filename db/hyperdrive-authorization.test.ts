import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationUnavailableError } from "./authorization-service";
import { createHyperdriveAuthorization } from "./hyperdrive-authorization";

function rejectingPool(error: unknown): Pool {
  return {
    query: vi.fn(async () => { throw error; }),
    end: vi.fn(async () => undefined),
  } as unknown as Pool;
}

describe("Hyperdrive authorization availability boundary", () => {
  it("classifies known PostgreSQL availability failures", async () => {
    const connectionFailure = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    const connectionCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => rejectingPool(connectionFailure),
    );
    await expect(
      connectionCapability.forUser("user-1").has("forum.topic.create"),
    ).rejects.toBeInstanceOf(AuthorizationUnavailableError);

    const timeout = new Error("Query read timeout");
    const timeoutCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => rejectingPool(timeout),
    );
    await expect(timeoutCapability.readManagementState()).rejects.toBeInstanceOf(AuthorizationUnavailableError);
  });

  it("does not classify schema or programming failures as availability", async () => {
    const schemaFailure = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const schemaCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => rejectingPool(schemaFailure),
    );
    await expect(
      schemaCapability.forUser("user-1").has("forum.topic.create"),
    ).rejects.toBe(schemaFailure);

    const programmingFailure = new TypeError("unexpected mapper bug");
    const programmingCapability = createHyperdriveAuthorization(
      "postgresql://example.invalid/db",
      () => rejectingPool(programmingFailure),
    );
    await expect(programmingCapability.readManagementState()).rejects.toBe(programmingFailure);
  });
});
