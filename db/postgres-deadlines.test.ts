import { describe, expect, it, vi } from "vitest";
import type { Client } from "pg";
import {
  LOCALIZATION_DB_DEADLINES,
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
  isPostgresStatementTimeout,
} from "./postgres-deadlines";

describe("PostgreSQL deadlines", () => {
  it("configures bounded caller deadlines with room for server-side deadlines", () => {
    const client = createLocalizationClient("postgres://runtime@hyperdrive/vico");
    const configured = client as unknown as {
      connectionParameters: { query_timeout: number };
      _connectionTimeoutMillis: number;
    };

    expect(configured._connectionTimeoutMillis).toBe(LOCALIZATION_DB_DEADLINES.connectionTimeoutMillis);
    expect(configured.connectionParameters.query_timeout).toBe(LOCALIZATION_DB_DEADLINES.queryTimeoutMillis);
    expect(LOCALIZATION_DB_DEADLINES.lockTimeoutMillis)
      .toBeLessThan(LOCALIZATION_DB_DEADLINES.statementTimeoutMillis);
    expect(LOCALIZATION_DB_DEADLINES.statementTimeoutMillis)
      .toBeLessThan(LOCALIZATION_DB_DEADLINES.queryTimeoutMillis);
  });

  it.each([
    new Error("Query read timeout"),
    Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" }),
    Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" }),
    { cause: new Error("Query read timeout") },
  ])("recognizes only known timeout shapes", (failure) => {
    expect(isPostgresQueryTimeout(failure)).toBe(true);
  });

  it.each([
    Object.assign(new Error("canceling statement due to user request"), { code: "57014" }),
    Object.assign(new Error("could not obtain lock"), { code: "55P03" }),
    Object.assign(new Error("authentication failed"), { code: "28P01" }),
    new TypeError("programming error"),
  ])("does not broaden timeout classification", (failure) => {
    expect(isPostgresQueryTimeout(failure)).toBe(false);
  });

  it("recognizes only the exact pg 8.23.0 connection timeout shape", () => {
    expect(isPostgresConnectionTimeout(new Error("timeout expired"))).toBe(true);
    expect(isPostgresConnectionTimeout(new Error("operation timeout"))).toBe(false);
  });

  it("requires both SQLSTATE and exact message for a PostgreSQL statement timeout", () => {
    expect(isPostgresStatementTimeout(
      Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" }),
    )).toBe(true);
    expect(isPostgresStatementTimeout(
      Object.assign(new Error("canceling statement due to user request"), { code: "57014" }),
    )).toBe(false);
    expect(isPostgresStatementTimeout(new Error("canceling statement due to statement timeout"))).toBe(false);
  });

  it("swallows synchronous and asynchronous cleanup failures", async () => {
    bestEffortDiscardClient({ end: vi.fn(() => { throw new Error("sync cleanup"); }) } as unknown as Client);
    bestEffortDiscardClient({ end: vi.fn(async () => { throw new Error("async cleanup"); }) } as unknown as Client);
    await Promise.resolve();
  });
});
