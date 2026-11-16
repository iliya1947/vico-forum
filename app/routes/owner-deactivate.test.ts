// @vitest-environment node
import { createStaticHandler, RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import routes from "../routes";
import { action, headers, loader } from "./owner-deactivate";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { ownerAccountLifecycleContext } from "../profile/request-context";
import { forumOwnerDeactivationPath } from "../forum/paths";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError, AccountStateUnexpectedError } from "../../db/account-state";
import { OwnerAccountLifecycleUnavailableError } from "../../db/hyperdrive-owner-account-lifecycle";
import { OwnerAccountLifecycleCommitUncertainError, OwnerAccountLifecycleConflictError, OwnerAccountLifecycleForbiddenError,
  OwnerAccountLifecycleInvariantError, OwnerAccountLifecycleTargetMissingError, OwnerAccountLifecycleValidationError,
  type DeactivateOwnerAccountInput, type OwnerAccountDeactivationResult } from "../../db/owner-account-lifecycle";

const origin = "https://forum.test", owner = "trusted-owner", target = "subject";
const operation = "5c95abe8-9197-4977-9ada-87b931bd0ee1";
const result = { targetUserId: target, state: "deactivated" as const, changed: true,
  deactivatedAt: "2026-11-16T12:00:00.123Z", retainAtLeastUntil: "2027-11-16T12:00:00.123Z", eventId: operation };
const fields = { intent: "deactivate", expectedActorId: owner, targetUserId: target, operationId: operation };
function session(id: string): AuthSession {
  const date = new Date(); return { user: { id, name: "Synthetic", email: "synthetic@test.invalid", emailVerified: false, createdAt: date, updatedAt: date },
    session: { id: "synthetic-session", userId: id, token: "PRIVATE_SESSION_TOKEN", expiresAt: date, createdAt: date, updatedAt: date } };
}
function setup(actor: string | null = owner, binding: unknown = owner) {
  const context = new RouterContextProvider(); context.set(authSessionContext, actor ? session(actor) : null);
  context.set(authorizationOwnerContext, binding as string | undefined);
  const deactivate = vi.fn(async (input: DeactivateOwnerAccountInput): Promise<OwnerAccountDeactivationResult> => { void input; return result; });
  context.set(ownerAccountLifecycleContext, { deactivate }); return { context, deactivate };
}
function request(body: BodyInit | null = new URLSearchParams(fields).toString(), method = "POST", overrides: Record<string, string> = {}) {
  return new Request(origin + forumOwnerDeactivationPath("en", target), { method,
    headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded", ...overrides },
    ...(!["GET", "HEAD"].includes(method) ? { body } : {}) });
}
async function privateStatus(response: Response, status: number) {
  expect(response.status).toBe(status); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.clone().text()).not.toMatch(/PRIVATE_|select .*from|stack|password/i); return response;
}

describe("SA05-2 protected canonical Owner resource", () => {
  it("uses the registered resource path, encodes literal identities and has no detail view", async () => {
    const resource = routes.find(r => r.path === ":locale")?.children?.find(r => r.file === "routes/owner-deactivate.ts");
    expect(resource?.path).toBe("users/:userId/owner/deactivate"); expect(resource?.children).toBeUndefined();
    expect(forumOwnerDeactivationPath("he", "用户/a?b#c")).toBe("/he/users/%E7%94%A8%E6%88%B7%2Fa%3Fb%23c/owner/deactivate");
    expect(headers()).toEqual({ "Cache-Control": "private, no-store" });
    const { context, deactivate } = setup();
    const router = createStaticHandler([{ id: "resource", path: "/:locale/" + resource!.path,
      action: args => action({ ...args, context: args.context as RouterContextProvider }),
      loader: args => loader({ ...args, context: args.context as RouterContextProvider }) }]);
    const response = await router.queryRoute(request(), { requestContext: context });
    expect(response).toBeInstanceOf(Response); await privateStatus(response as Response, 200); expect(deactivate).toHaveBeenCalledOnce();
  });
  it.each([null, "ordinary-admin", "another-user"])("rejects %s before reading a body or obtaining a private command", async actor => {
    const context = new RouterContextProvider(); context.set(authSessionContext, actor ? session(actor) : null); context.set(authorizationOwnerContext, owner);
    const req = request("invalid=%FF"); const read = vi.spyOn(req.body!, "getReader");
    await privateStatus(await action({ request: req, params: {}, context }), actor ? 403 : 401); expect(read).not.toHaveBeenCalled();
  });
  it.each([undefined, "", " trusted-owner ", "other-owner", 7])("invalid server binding %s has no privileged fallback", async binding => {
    const { context, deactivate } = setup(); context.set(authorizationOwnerContext, binding as string | undefined);
    await privateStatus(await action({ request: request(), params: { userId: target }, context }), 403);
    expect(deactivate).not.toHaveBeenCalled();
  });
  it.each(["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"])("Owner %s is method-denied without a command", async method => {
    const { context, deactivate } = setup(), req = request(null, method);
    const response = await (["GET", "HEAD"].includes(method) ? loader({ request: req, params: {}, context }) : action({ request: req, params: {}, context }));
    await privateStatus(response, 405); expect(response.headers.get("Allow")).toBe("POST"); expect(deactivate).not.toHaveBeenCalled();
  });
  it.each([null, "ordinary-admin"])("GET also admits %s before reporting unsupported method", async actor => {
    const { context } = setup(actor); await privateStatus(loader({ request: request(null, "GET"), params: {}, context }), actor ? 403 : 401);
  });
  it.each(["", "null", "https://other.test", "https://forum.test.attacker.test"])("rejects wrong/missing Origin %s before body parsing", async value => {
    const { context, deactivate } = setup(), req = request("invalid=%FF", "POST", { Origin: value });
    const read = vi.spyOn(req.body!, "getReader");
    await privateStatus(await action({ request: req, params: { userId: target }, context }), 403);
    expect(read).not.toHaveBeenCalled(); expect(deactivate).not.toHaveBeenCalled();
  });
  it.each([
    "", "application/json", "multipart/form-data; boundary=test", "application/x-www-form-urlencoded-extra",
  ])("rejects unsupported form media type %s", async contentType => {
    const { context, deactivate } = setup();
    await privateStatus(await action({ request: request(undefined, "POST", { "Content-Type": contentType }), params: { userId: target }, context }), 400);
    expect(deactivate).not.toHaveBeenCalled();
  });
  it.each([
    "", "intent=deactivate", new URLSearchParams({ ...fields, intent: "other" }).toString(),
    new URLSearchParams({ ...fields, operationId: "not-uuid" }).toString(), new URLSearchParams({ ...fields, operationId: operation + "\n" }).toString(),
    new URLSearchParams({ ...fields, targetUserId: "bad\u0000id" }).toString(), new URLSearchParams({ ...fields, expectedActorId: "bad\nid" }).toString(),
    new URLSearchParams({ ...fields, targetUserId: "x".repeat(201) }).toString(),
    new URLSearchParams({ ...fields, targetUserId: "" }).toString(),
    new URLSearchParams(fields).toString() + "&operationId=" + operation,
    new URLSearchParams(fields).toString() + "&expectedActorId=" + owner,
    new URLSearchParams(fields).toString() + "&actorId=" + owner,
    new URLSearchParams(fields).toString() + "&owner=" + owner,
    new URLSearchParams(fields).toString() + "&targetUserId=%FF",
    new URLSearchParams(fields).toString().replace("subject", "%FF"),
    new URLSearchParams(fields).toString().replace("subject", "%GG"),
    new URLSearchParams(fields).toString() + "&padding=" + "x".repeat(4096),
  ])("exact bounded form rejects malformed input %#", async body => {
    const { context, deactivate } = setup(); await privateStatus(await action({ request: request(body), params: { userId: target }, context }), 400);
    expect(deactivate).not.toHaveBeenCalled();
  });
  it("bounds a streaming body without Content-Length and cancels excess bytes", async () => {
    const { context, deactivate } = setup(), cancel = vi.fn();
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4097)); }, cancel });
    const req = new Request(origin + forumOwnerDeactivationPath("en", target), { method: "POST",
      headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" }, body: stream, duplex: "half" } as RequestInit);
    await privateStatus(await action({ request: req, params: { userId: target }, context }), 400);
    expect(cancel).toHaveBeenCalledOnce(); expect(deactivate).not.toHaveBeenCalled();
  });
  it("requires URL/body target agreement and a current actor expectation before private command lookup", async () => {
    const { context, deactivate } = setup();
    for (const urlTarget of [undefined, "other"]) await privateStatus(await action({ request: request(), params: { userId: urlTarget }, context }), 400);
    await privateStatus(await action({ request: request(new URLSearchParams({ ...fields, expectedActorId: "old-account" })), params: { userId: target }, context }), 409);
    expect(deactivate).not.toHaveBeenCalled();
  });
  it("passes only the session actor and validated target/operation, preserving a null event ID and safe result allowlist", async () => {
    const { context, deactivate } = setup();
    const extended = { ...result, changed: false, eventId: null, password: "PRIVATE_SECRET" }; deactivate.mockResolvedValueOnce(extended);
    const response = await action({ request: request(new URLSearchParams({ ...fields, operationId: operation.toUpperCase() })), params: { userId: target }, context });
    await privateStatus(response, 200); expect(await response.json()).toEqual({ ...result, changed: false, eventId: null });
    expect(deactivate).toHaveBeenCalledExactlyOnceWith({ actorId: owner, targetId: target, operationId: operation });
  });
  it.each([
    [new AccountInactiveError(), 401], [new AccountMissingError(), 401], [new OwnerAccountLifecycleForbiddenError(), 403],
    [new OwnerAccountLifecycleValidationError(), 400], [new OwnerAccountLifecycleConflictError(), 409], [new OwnerAccountLifecycleTargetMissingError(), 404],
    [new AccountStateUnavailableError(), 503], [new OwnerAccountLifecycleUnavailableError(), 503],
    [new OwnerAccountLifecycleCommitUncertainError({ cause: new Error("PRIVATE_ACK_DETAILS") }), 503],
    [new OwnerAccountLifecycleInvariantError(), 500], [new AccountStateUnexpectedError(), 500], [new TypeError("PRIVATE_SQL_STACK"), 500],
  ] as const)("maps typed/unexpected failure %# without exposing details or retrying", async (error, status) => {
    const { context, deactivate } = setup(); deactivate.mockRejectedValueOnce(error);
    const response = await action({ request: request(), params: { userId: target }, context }); await privateStatus(response, status);
    expect(await response.text()).not.toContain("changed"); expect(deactivate).toHaveBeenCalledOnce();
  });
});
