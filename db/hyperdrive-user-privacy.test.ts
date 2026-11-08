import { DrizzleQueryError } from "drizzle-orm";
import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createHyperdriveUserPrivacy, UserPrivacyUnavailableError } from "./hyperdrive-user-privacy";

function client(options: { connectError?: unknown; queryError?: unknown }) {
  const connect = vi.fn(async () => {
    if (options.connectError) throw options.connectError;
  });
  const query = vi.fn(async (statement: string | { text?: string }) => {
    const text = typeof statement === "string" ? statement : statement.text ?? "";
    if (/^(begin|commit|rollback)\b/i.test(text.trim())) return { rows: [], rowCount: 0 };
    if (options.queryError) throw options.queryError;
    return { rows: [], rowCount: 0 };
  });
  const end = vi.fn(async () => undefined);
  return { connect, query, end, factory: () => ({ connect, query, end }) as unknown as Client };
}

const availableFailures = [
  ["connection SQLSTATE", Object.assign(new Error("connection lost"), { code: "08006" })],
  ["server unavailable SQLSTATE", Object.assign(new Error("cannot connect now"), { code: "57P03" })],
  ["transport ECONNRESET", Object.assign(new Error("connection reset"), { code: "ECONNRESET" })],
  ["code-less termination", new Error("Connection terminated unexpectedly")],
  ["query read timeout", new Error("Query read timeout")],
  ["statement timeout", Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" })],
] as const;

describe("SET06-MIRA-01 Privacy Hyperdrive availability", () => {
  it.each(availableFailures)("classifies a Drizzle-wrapped %s on own read", async (_label, driverError) => {
    const db = client({ queryError: driverError });
    const cap = createHyperdriveUserPrivacy("postgres://unreachable.invalid/db", db.factory);
    try {
      await cap.read("actor-1");
      throw new Error("expected query failure");
    } catch (error) {
      expect(error).toBeInstanceOf(UserPrivacyUnavailableError);
      const wrapped = (error as Error).cause;
      expect(wrapped).toBeInstanceOf(DrizzleQueryError);
      expect((wrapped as DrizzleQueryError).cause).toBe(driverError);
    }
    expect(db.connect).toHaveBeenCalledOnce();
    expect(db.query).toHaveBeenCalledOnce();
    expect(db.end).toHaveBeenCalledOnce();
  });

  it.each(availableFailures)("classifies a Drizzle-wrapped %s on own save", async (_label, driverError) => {
    const db = client({ queryError: driverError });
    const cap = createHyperdriveUserPrivacy("postgres://unreachable.invalid/db", db.factory);
    try {
      await cap.save("actor-1", false);
      throw new Error("expected mutation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(UserPrivacyUnavailableError);
      const wrapped = (error as Error).cause;
      expect(wrapped).toBeInstanceOf(DrizzleQueryError);
      expect((wrapped as DrizzleQueryError).cause).toBe(driverError);
    }
    expect(db.query).toHaveBeenCalled();
    expect(db.end).toHaveBeenCalledOnce();
  });

  it.each([
    ["missing relation", Object.assign(new Error("relation does not exist"), { code: "42P01" })],
    ["authentication error", Object.assign(new Error("bad password"), { code: "28P01" })],
    ["unexpected driver defect", new TypeError("unexpected query mapper defect")],
  ] as const)("does not turn wrapped %s into an ordinary unavailable error", async (_label, driverError) => {
    const db = client({ queryError: driverError });
    const cap = createHyperdriveUserPrivacy("postgres://unreachable.invalid/db", db.factory);
    for (const operation of [() => cap.read("actor-1"), () => cap.save("actor-1", true)]) {
      try {
        await operation();
        throw new Error("expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(DrizzleQueryError);
        expect(error).not.toBeInstanceOf(UserPrivacyUnavailableError);
        expect((error as DrizzleQueryError).cause).toBe(driverError);
      }
    }
    expect(db.end).toHaveBeenCalledTimes(2);
  });

  it("preserves classification of direct connect errors and code-less timeouts", async () => {
    for (const error of [
      Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }),
      new Error("timeout expired"),
    ]) {
      const db = client({ connectError: error });
      const cap = createHyperdriveUserPrivacy("postgres://unreachable.invalid/db", db.factory);
      await expect(cap.read("actor-1")).rejects.toMatchObject({
        name: "UserPrivacyUnavailableError",
        cause: error,
      });
      expect(db.end).toHaveBeenCalledOnce();
    }
  });

  it("terminates cause traversal safely on cycles without misclassifying", async () => {
    const cycle = new Error("unexpected nested bug") as Error & { cause?: unknown };
    cycle.cause = cycle;
    const db = client({ connectError: cycle });
    const cap = createHyperdriveUserPrivacy("postgres://unreachable.invalid/db", db.factory);
    await expect(cap.read("actor-1")).rejects.toBe(cycle);
    expect(db.end).toHaveBeenCalledOnce();
  });
});
