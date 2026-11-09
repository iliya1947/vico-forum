import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresOwnerSystemHistory } from "../../db/owner-system-history";
import { PostgresOwnerSystemMonitoring } from "../../db/owner-system-monitoring";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA-01 coverage requires disposable loopback *_test PostgreSQL");
}
const schema = "owner_sa01_coverage_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const history = new PostgresOwnerSystemHistory(pool);
const system = new PostgresOwnerSystemMonitoring(pool, "test");

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const filename of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    const sql = (await readFile("drizzle/" + filename, "utf8"))
      .replaceAll('"public".', '"' + schema + '".');
    await client.query(sql);
  }
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema " + schema + " cascade");
  await client.end();
});

describe("SA01-MIRA-01 earliest retained System History coverage", () => {
  it("keeps Runtime and Database coverage at their oldest retained observation, not the latest sample", async () => {
    const runtime = await history.recordObservation({
      monitorKey: "system.runtime", resourceScope: "global", source: "application",
      schemaVersion: 1, quality: "measured", value: { component: "worker", state: "initial" },
    });
    await history.recordObservation({
      monitorKey: "system.runtime", resourceScope: "global", source: "application",
      schemaVersion: 1, quality: "measured", value: { component: "worker", state: "intermediate" },
    });
    const database = await history.recordObservation({
      monitorKey: "system.dependencies", resourceScope: "global", source: "database",
      schemaVersion: 1, quality: "measured", value: { component: "postgresql", version: "16" },
    });
    await history.recordObservation({
      monitorKey: "system.dependencies", resourceScope: "global", source: "database",
      schemaVersion: 1, quality: "measured", value: { component: "postgresql", version: "17" },
    });
    // Backdate only synthetic observations inside the isolated test schema.
    await client.query("update owner_monitor_observations set observed_at=$1 where id=$2",
      ["2024-01-01T00:00:00.000Z", runtime.id]);
    await client.query("update owner_monitor_observations set observed_at=$1 where id=$2",
      ["2024-02-01T00:00:00.000Z", database.id]);

    const current = await system.readSystem();
    for (const [key, firstAt] of [
      ["system.runtime", "2024-01-01T00:00:00.000Z"],
      ["system.dependencies", "2024-02-01T00:00:00.000Z"],
    ]) {
      const monitor = current.monitors.find(item => item.key === key);
      expect(monitor?.coverageFrom).toBe(firstAt);
      expect(monitor?.lastObservedAt).toBeTruthy();
      expect(monitor?.lastObservedAt).not.toBe(firstAt);
      const timeline = await system.readTimeline({
        monitorKey: key as "system.runtime" | "system.dependencies",
      });
      expect(timeline.entries.filter(item => item.origin === "system-observation").length)
        .toBeGreaterThanOrEqual(3);
      expect(timeline.entries.some(item => item.occurredAt === firstAt)).toBe(true);
    }
    const next = await system.readSystem();
    expect(next.monitors.find(item => item.key === "system.runtime")?.coverageFrom)
      .toBe("2024-01-01T00:00:00.000Z");
    expect(next.monitors.find(item => item.key === "system.dependencies")?.coverageFrom)
      .toBe("2024-02-01T00:00:00.000Z");
  });

  it("uses retained Request observations without failures, then the earliest of observations and real event times", async () => {
    const initial = await system.readSystem();
    expect(initial.monitors.find(item => item.key === "system.requests")?.coverageFrom).toBeTruthy();
    expect((await client.query("select count(*)::int as count from owner_events where monitor_key='system.requests'")).rows[0].count).toBe(0);

    const oldest = await client.query<{ id: string }>(
      "select id from owner_monitor_observations where monitor_key='system.requests' order by observed_at asc limit 1");
    expect(oldest.rows).toHaveLength(1);
    await client.query("update owner_monitor_observations set observed_at=$1 where id=$2",
      ["2024-05-01T00:00:00.000Z", oldest.rows[0].id]);
    const noFailures = await system.readSystem();
    expect(noFailures.monitors.find(item => item.key === "system.requests")?.coverageFrom)
      .toBe("2024-05-01T00:00:00.000Z");
    expect(noFailures.monitors.find(item => item.key === "system.requests")?.lastObservedAt)
      .not.toBe("2024-05-01T00:00:00.000Z");

    await history.append({
      kind: "system.requestFailed", monitorKey: "system.requests",
      occurrenceKey: "newer-5xx", occurredAt: new Date("2025-01-01T00:00:00.000Z"),
      payload: { component: "worker", code: "503" },
    });
    const newerFailure = await system.readSystem();
    expect(newerFailure.monitors.find(item => item.key === "system.requests")?.coverageFrom)
      .toBe("2024-05-01T00:00:00.000Z");

    await history.append({
      kind: "system.requestFailed", monitorKey: "system.requests",
      occurrenceKey: "older-5xx", occurredAt: new Date("2023-01-01T00:00:00.000Z"),
      payload: { component: "worker", code: "503" },
    });
    const olderFailure = await system.readSystem();
    expect(olderFailure.monitors.find(item => item.key === "system.requests")?.coverageFrom)
      .toBe("2023-01-01T00:00:00.000Z");

    const scoped = await system.readTimeline({ monitorKey: "system.requests" });
    expect(scoped.entries.every(item => item.monitorKey === "system.requests")).toBe(true);
    expect(scoped.entries.some(item => item.occurredAt === "2024-05-01T00:00:00.000Z")).toBe(true);
    expect(scoped.entries.some(item => item.occurredAt === "2023-01-01T00:00:00.000Z")).toBe(true);
  });
});
