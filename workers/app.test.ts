// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { AuthSessionUnavailableError } from "../app/auth/request-context";
import { requestAttemptCollectorContext } from "../app/observability/attempt-collector.server";
import { ownerAccountLifecycleContext } from "../app/profile/request-context";
import { authorizationOwnerContext } from "../app/authorization/request-context";
import { action as deactivateAction } from "../app/routes/owner-deactivate";
import type { AuthSession } from "../app/auth/request-context";

const runtime = vi.hoisted(() => ({ getSession: vi.fn(), handle: vi.fn(), router: vi.fn() }));
const telemetry = vi.hoisted(() => ({ record: vi.fn(), recordGap: vi.fn(), close: vi.fn() }));
const factSink = vi.hoisted(() => ({ append: vi.fn(), close: vi.fn() }));
const lifecycle = vi.hoisted(() => ({ create: vi.fn(), deactivate: vi.fn() }));
vi.mock("../db/hyperdrive-owner-account-lifecycle", async original => ({
  ...await original<typeof import("../db/hyperdrive-owner-account-lifecycle")>(),
  createHyperdriveOwnerAccountLifecycle: lifecycle.create,
}));
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
  lifecycle.create.mockReturnValue({ deactivate: lifecycle.deactivate });
});

const lifecycleUrl = "https://forum.test/en/users/subject/owner/deactivate";
function ownerSession(id: string): AuthSession {
  const date = new Date(); return { user: { id, name: "Synthetic", email: "owner@test.invalid", emailVerified: false, createdAt: date, updatedAt: date },
    session: { id: "session", userId: id, token: "PRIVATE_TOKEN", expiresAt: date, createdAt: date, updatedAt: date } };
}
it("constructs the lifecycle capability from the validated binding/web connection and executes the real guarded action", async () => {
  const owner = "server-bound-owner", operationId = "5c95abe8-9197-4977-9ada-87b931bd0ee1";
  runtime.getSession.mockResolvedValueOnce({ session: ownerSession(owner), headers: new Headers() });
  const result = { targetUserId: "subject", state: "deactivated", changed: true,
    deactivatedAt: "2026-11-16T12:00:00.123Z", retainAtLeastUntil: "2027-11-16T12:00:00.123Z", eventId: operationId };
  lifecycle.deactivate.mockResolvedValueOnce(result);
  runtime.router.mockImplementationOnce(async (req, context) => {
    expect(context.get(authorizationOwnerContext)).toBe(owner);
    expect(context.get(ownerAccountLifecycleContext).deactivate).toBe(lifecycle.deactivate);
    return deactivateAction({ request: req, params: { userId: "subject" }, context });
  });
  const req = new Request(lifecycleUrl, { method: "POST", headers: { Origin: "https://forum.test", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "deactivate", expectedActorId: owner, targetUserId: "subject", operationId }) });
  const response = await worker.fetch(req as never, { ...env, VICO_OWNER_USER_ID: owner } as never);
  expect(lifecycle.create).toHaveBeenCalledExactlyOnceWith("synthetic-web", owner);
  expect(lifecycle.deactivate).toHaveBeenCalledExactlyOnceWith({ actorId: owner, targetId: "subject", operationId });
  expect(response.status).toBe(200); expect(await response.json()).toEqual(result);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(runtime.getSession).toHaveBeenCalledOnce();
});
it.each([undefined, "", " owner "])("invalid Worker Owner binding %s never promotes the session actor", async binding => {
  runtime.getSession.mockResolvedValueOnce({ session: ownerSession("owner"), headers: new Headers() });
  runtime.router.mockImplementationOnce((req, context) => deactivateAction({ request: req, params: { userId: "subject" }, context }));
  const response = await worker.fetch(new Request(lifecycleUrl, { method: "POST" }) as never, { ...env, VICO_OWNER_USER_ID: binding } as never);
  expect(lifecycle.create).toHaveBeenCalledExactlyOnceWith("synthetic-web", undefined);
  expect(response.status).toBe(403); expect(lifecycle.deactivate).not.toHaveBeenCalled();
});
it("preserves the endpoint-last cookie order when wrapping a protected action response", async () => {
  runtime.getSession.mockResolvedValueOnce({ session: null, headers: new Headers({ "Set-Cookie": "session=lookup; HttpOnly" }) });
  runtime.router.mockResolvedValueOnce(new Response("denied", { status: 401, headers: { "Set-Cookie": "session=endpoint; HttpOnly" } }));
  const response = await worker.fetch(new Request(lifecycleUrl) as never, env as never);
  expect(response.headers.getSetCookie()).toEqual(["session=lookup; HttpOnly", "session=endpoint; HttpOnly"]);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("protects early session outages, unexpected initialization faults and binding failures on action/data aliases", async () => {
  for (const suffix of ["", ".data///"]) {
    const req = new Request(lifecycleUrl + suffix);
    runtime.getSession.mockRejectedValueOnce(new AuthSessionUnavailableError({ cause: new Error("PRIVATE_SQL") }));
    const outage = await worker.fetch(req as never, env as never);
    expect(outage.status).toBe(503); expect(outage.headers.get("Cache-Control")).toBe("private, no-store"); expect(await outage.text()).not.toContain("PRIVATE_SQL");
    runtime.getSession.mockRejectedValueOnce(new TypeError("PRIVATE_CONFIGURATION"));
    const unexpected = await worker.fetch(req as never, env as never);
    expect(unexpected.status).toBe(500); expect(unexpected.headers.get("Cache-Control")).toBe("private, no-store"); expect(await unexpected.text()).not.toContain("PRIVATE_CONFIGURATION");
    const bindings = await worker.fetch(req as never, {} as never);
    expect(bindings.status).toBe(500); expect(bindings.headers.get("Cache-Control")).toBe("private, no-store");
  }
  expect(runtime.router).not.toHaveBeenCalled(); expect(lifecycle.deactivate).not.toHaveBeenCalled();
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
