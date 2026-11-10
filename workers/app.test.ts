// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { AuthSessionUnavailableError } from "../app/auth/request-context";
import { requestAttemptCollectorContext } from "../app/observability/attempt-collector.server";

const runtime = vi.hoisted(() => ({ getSession: vi.fn(), handle: vi.fn(), router: vi.fn() }));
const telemetry = vi.hoisted(() => ({ record: vi.fn(), recordGap: vi.fn(), close: vi.fn() }));
const factSink = vi.hoisted(() => ({ append: vi.fn(), close: vi.fn() }));
const authFacts = vi.hoisted(() => ({
  observer: null as null | { capture(fact: unknown): void },
}));
vi.mock("../db/hyperdrive-auth-facts", () => ({
  createHyperdriveAuthFactWriter: () => factSink,
}));
vi.mock("../db/hyperdrive-attempt-telemetry", () => ({
  createHyperdriveAttemptTelemetry: () => telemetry,
}));
vi.mock("react-router", async (original) => ({
  ...await original<typeof import("react-router")>(), createRequestHandler: () => runtime.router,
}));
vi.mock("virtual:react-router/server-build", () => ({}));
vi.mock("../app/auth/auth.server", () => ({
  createHyperdriveAuthRuntime: (...args: unknown[]) => {
    authFacts.observer = args[4] as { capture(fact: unknown): void };
    return runtime;
  },
}));
import worker from "./app";

const env = { HYPERDRIVE: { connectionString: "synthetic-localization" }, WEB_HYPERDRIVE: { connectionString: "synthetic-web" } };
const request = new Request("https://forum.test/en") as Parameters<typeof worker.fetch>[0];
beforeEach(() => {
  vi.clearAllMocks();
  runtime.getSession.mockResolvedValue({ session: null, headers: new Headers() });
  runtime.router.mockResolvedValue(new Response("page"));
  telemetry.record.mockResolvedValue({ kind: "unknown", slot: "unknown.access", count: "1" });
  telemetry.recordGap.mockResolvedValue({ kind: "gap", slot: "gap.access", count: "1" });
  telemetry.close.mockResolvedValue(undefined);
  factSink.append.mockResolvedValue({ id: "fact-1", inserted: true });
  factSink.close.mockResolvedValue(undefined);
  authFacts.observer = null;
});

it("returns a safe no-store 503 before Router on a classified session storage outage", async () => {
  runtime.getSession.mockRejectedValueOnce(new AuthSessionUnavailableError({ cause: new Error("private database details") }));
  const response = await worker.fetch(request, env as never);
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).not.toContain("private database details");
  expect(runtime.router).not.toHaveBeenCalled();
});

it("preserves unexpected failures and ordinary guest routing", async () => {
  const bug = new TypeError("configuration defect");
  runtime.getSession.mockRejectedValueOnce(bug);
  await expect(worker.fetch(request, env as never)).rejects.toBe(bug);
  expect(runtime.router).not.toHaveBeenCalled();
  expect((await worker.fetch(request, env as never)).status).toBe(200);
  expect(runtime.router).toHaveBeenCalledOnce();
});

it("flushes an Owner denial through waitUntil without changing the guarded response", async () => {
  runtime.router.mockImplementationOnce(async (_request, context) => {
    context.get(requestAttemptCollectorContext).recordOwnerGuardDenied(401);
    return new Response("Unauthenticated", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  });
  const pending: Promise<unknown>[] = [];
  const executionContext = { waitUntil: (task: Promise<unknown>) => pending.push(task) };
  const response = await worker.fetch(request, env as never, executionContext as never);
  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  await Promise.all(pending);
  expect(telemetry.record).toHaveBeenCalledOnce();
  expect(telemetry.record.mock.calls[0][0]).toMatchObject({
    operation: "owner-guard", surface: "access", httpStatus: 401,
    actorUserId: null, networkIp: null, networkQuality: "unknown",
  });
  expect(telemetry.close).toHaveBeenCalledOnce();
});

it("preserves an original exception and finalizes a failing observer without waitUntil", async () => {
  const original = new TypeError("router failure");
  runtime.router.mockImplementationOnce(async (_request, context) => {
    context.get(requestAttemptCollectorContext).recordOwnerGuardDenied(403);
    throw original;
  });
  telemetry.record.mockRejectedValueOnce(new Error("telemetry DB unavailable"));
  await expect(worker.fetch(request, env as never)).rejects.toBe(original);
  expect(telemetry.recordGap).toHaveBeenCalledOnce();
  expect(telemetry.close).toHaveBeenCalledOnce();
});


it("records real native creation facts via waitUntil without mutating response", async () => {
  runtime.router.mockImplementationOnce(async () => {
    authFacts.observer?.capture({ kind: "account.created", userId: "persisted-user" });
    return new Response("registered", { status: 200 });
  });
  const pending: Promise<unknown>[] = [];
  const executionContext = { waitUntil: (task: Promise<unknown>) => pending.push(task) };
  const response = await worker.fetch(request, env as never, executionContext as never);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("registered");
  await Promise.all(pending);
  expect(factSink.append).toHaveBeenCalledExactlyOnceWith({
    kind: "account.created", userId: "persisted-user",
  }, expect.any(Date));
  expect(Number.isFinite((factSink.append.mock.calls[0][1] as Date).getTime())).toBe(true);
  expect(factSink.close).toHaveBeenCalledOnce();
  expect(telemetry.recordGap).not.toHaveBeenCalled();
});

it("does not veto auth success when native fact storage fails and records a bounded gap", async () => {
  runtime.router.mockImplementationOnce(async () => {
    authFacts.observer?.capture({ kind: "auth.sessionCreated", userId: "user", sessionId: "s1" });
    return new Response("success", { status: 200 });
  });
  factSink.append.mockRejectedValueOnce(new Error("private database error"));
  const response = await worker.fetch(request, env as never);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("success");
  expect(factSink.append).toHaveBeenCalledOnce();
  expect(factSink.close).toHaveBeenCalledOnce();
  expect(telemetry.recordGap).toHaveBeenCalledOnce();
  expect(telemetry.recordGap.mock.calls[0][0]).toMatchObject({
    surface: "auth", count: 1,
  });
});
