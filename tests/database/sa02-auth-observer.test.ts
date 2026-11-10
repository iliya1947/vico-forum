import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../app/auth/auth.server";
import { RequestAttemptCollector, withAttemptObservation } from "../../app/observability/attempt-collector.server";
import { syntheticAttemptIngressSource } from "../../app/observability/attempt-source";
import type { AttemptTelemetryInput, AttemptTelemetryWriter } from "../../db/owner-attempt-telemetry";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA-02 auth observer tests require a disposable loopback *_test DB");
}
const schema = "sa02_auth_attempts_test";
const origin = "http://localhost:3000";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "sa02-synthetic-local-secret-with-at-least-32-characters",
  GOOGLE_CLIENT_ID: "synthetic-local-google",
  GOOGLE_CLIENT_SECRET: "synthetic-local-google-secret",
};
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const connected = (connectionString: string) => new Client({
  connectionString, options: "-c search_path=" + schema,
});

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await client.query("drop schema " + schema + " cascade");
  await client.end();
});

describe("SA-02 real Better Auth 1.7.7 policy-observer seam", () => {
  it("captures one code-backed refusal without copying identity or changing the canonical denial", async () => {
    await client.query("update forum_registration_settings set email_registration_enabled=false where id=1");
    const events: AttemptTelemetryInput[] = [];
    const sink: AttemptTelemetryWriter & { close(): Promise<void> } = {
      async record(value) {
        events.push(value);
        return { kind: "unknown", slot: "unknown.auth", epoch: "2026-11-10T00:00:00.000Z",
          count: "1", saturated: false };
      },
      async recordGap() {
        return { kind: "gap", slot: "gap.auth", epoch: "2026-11-10T00:00:00.000Z",
          count: "1", saturated: false };
      },
      close: async () => undefined,
    };
    const collector = new RequestAttemptCollector(
      syntheticAttemptIngressSource("203.0.113.55"), () => sink,
    );
    const original = createHyperdriveAuthRuntime(
      url, env, connected, () => collector.recordRegistrationDenied(),
    );
    const monitored = withAttemptObservation(original, collector);
    const request = new Request(origin + "/api/auth/sign-up/email", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sa02-denied@example.test", name: "Example", password: "synthetic-password-123",
      }),
    });
    const rejected = await monitored.handle(request);
    expect(rejected.status).toBe(403);
    expect((await rejected.json() as { code: string }).code).toBe("vico_email_registration_closed");
    expect((await client.query<{ n: number }>(
      'select count(*)::integer n from "user" where email=$1',
      ["sa02-denied@example.test"])).rows[0].n).toBe(0);
    await collector.flush();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      operation: "registration-admission", outcome: "denied", directCode: "forbidden",
      actorUserId: null, networkIp: "203.0.113.55", networkQuality: "trusted",
    });
    expect(JSON.stringify(events)).not.toContain("sa02-denied@example.test");
    expect(JSON.stringify(events)).not.toContain("synthetic-password");
  });
});
