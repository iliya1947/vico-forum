import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { canReadProfileAdminSection } from "./admission.server";
import { ownerProfileContext, ownerProfileForRequest } from "./request-context";

function requestContext(actorId: string | null, boundOwner?: string) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId ? {
    user: { id: actorId, name: "Not authority", email: "owner@example.test" },
    session: { id: "actual-session", token: "never pass token" },
  } as AuthSession : null);
  context.set(authorizationOwnerContext, boundOwner);
  return context;
}

describe("SA03 server-only profile admissions", () => {
  it("never resolves Owner reader for guests, administrators or missing bindings", () => {
    for (const context of [
      requestContext(null, "bound-owner"),
      requestContext("ordinary-admin", "bound-owner"),
      requestContext("ordinary-admin"),
      requestContext("ordinary-admin", " ordinary-admin"),
    ]) {
      expect(ownerProfileForRequest(context)).toBeNull();
    }
  });

  it("binds the actual Owner actor/session and never forwards credentials or input actor IDs", async () => {
    const context = requestContext("bound-owner", "bound-owner");
    const readTarget = vi.fn().mockResolvedValue(null);
    const readHistory = vi.fn().mockResolvedValue({ entries: [], next: null });
    context.set(ownerProfileContext, { readTarget, readHistory });
    const access = ownerProfileForRequest(context);
    expect(access).not.toBeNull();
    await access!.readTarget("another-user", "opaque-session-cursor");
    expect(readTarget).toHaveBeenCalledExactlyOnceWith({
      targetId: "another-user", viewerUserId: "bound-owner",
      currentSessionId: "actual-session", before: "opaque-session-cursor",
    });
    expect(JSON.stringify(readTarget.mock.calls)).not.toContain("never pass token");
    await access!.readHistory("another-user", "opaque-history-cursor");
    expect(readHistory).toHaveBeenCalledExactlyOnceWith("another-user", "opaque-history-cursor");
    expect(JSON.stringify(readHistory.mock.calls)).not.toContain("never pass token");
  });

  it("admits independent permission-scoped sections without directory grant", async () => {
    const context = requestContext("ordinary-admin", "bound-owner");
    const has = vi.fn(async (permission: string) => permission === "access.authorization.manage");
    const forUser = vi.fn(() => ({ has }));
    context.set(authorizationContext, { forUser } as never);
    expect(await canReadProfileAdminSection(context, "authorization")).toBe(true);
    expect(await canReadProfileAdminSection(context, "measures")).toBe(false);
    expect(forUser).toHaveBeenCalledWith("ordinary-admin");
    expect(has.mock.calls.flat()).not.toContain("admin.users.read");
  });

  it("does not ask the permission resolver for guests or hide its failures for authenticated actors", async () => {
    const guest = requestContext(null, "bound-owner");
    expect(await canReadProfileAdminSection(guest, "authorization")).toBe(false);
    const context = requestContext("ordinary-admin", "bound-owner");
    const failure = new Error("unexpected schema failure");
    context.set(authorizationContext, { forUser: () => ({ has: () => Promise.reject(failure) }) } as never);
    await expect(canReadProfileAdminSection(context, "authorization")).rejects.toBe(failure);
  });
});
