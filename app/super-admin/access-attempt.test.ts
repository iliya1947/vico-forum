import { RouterContextProvider } from "react-router";
import { expect, it } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { RequestAttemptCollector, requestAttemptCollectorContext } from "../observability/attempt-collector.server";
import { syntheticAttemptIngressSource } from "../observability/attempt-source";
import type { AttemptTelemetryInput, AttemptTelemetryWriter } from "../../db/owner-attempt-telemetry";
import { requireSuperAdmin } from "./access.server";

it("records only real Owner 401/403 guard denials, and never changes protected response status", async () => {
  const records: AttemptTelemetryInput[] = [];
  const sink: AttemptTelemetryWriter & { close(): Promise<void> } = {
    async record(record) {
      records.push(record);
      return { kind: "attributed", id: crypto.randomUUID(), epoch: "2026-11-10T00:00:00Z",
        count: "1", saturated: false, inserted: true };
    },
    async recordGap() {
      return { kind: "gap", slot: "gap.access", epoch: "2026-11-10T00:00:00Z",
        count: "1", saturated: false };
    },
    close: async () => undefined,
  };
  async function check(user: string | null, expectedStatus: number) {
    const context = new RouterContextProvider();
    const collector = new RequestAttemptCollector(syntheticAttemptIngressSource("203.0.113.6"),
      () => sink);
    context.set(requestAttemptCollectorContext, collector);
    context.set(authorizationOwnerContext, "actual-owner");
    if (user !== null) {
      context.set(authSessionContext, { user: { id: user }, session: { id: "session" } } as never);
      collector.setResolvedActor(user);
    }
    if (expectedStatus !== 200) {
      try { requireSuperAdmin(context); throw new Error("Expected denied Owner"); }
      catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(expectedStatus);
      }
    } else expect(requireSuperAdmin(context)).toBe("actual-owner");
    await collector.flush();
  }
  await check(null, 401);
  await check("ordinary-admin", 403);
  await check("actual-owner", 200);
  expect(records).toHaveLength(2);
  expect(records[0]).toMatchObject({
    surface: "access", operation: "owner-guard", httpStatus: 401, actorUserId: null,
  });
  expect(records[1]).toMatchObject({
    surface: "access", operation: "owner-guard", httpStatus: 403, actorUserId: "ordinary-admin",
  });
});
