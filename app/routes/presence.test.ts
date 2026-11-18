import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumWriterContext } from "../forum/request-context";
import { ForumStorageUnavailableError, type ForumWriter } from "../../db/hyperdrive-forum";
import { action, loader, headers } from "./presence";
import { UserPrivacyAccountMissingError } from "../../db/user-privacy";
import { AccountInactiveError } from "../../db/account-state";

function setup(userId: string | null = "owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, userId ? { user: { id: userId } } as AuthSession : null);
  const recordOnlinePresence = vi.fn(async (userId: string) => {
    if (!userId) throw new Error("missing session user");
  });
  context.set(forumWriterContext, { recordOnlinePresence } as unknown as ForumWriter);
  return { context, recordOnlinePresence };
}

function ping(origin: string | null = "https://forum.test", body = "intent=heartbeat&userId=victim", method = "POST") {
  return new Request("https://forum.test/en/presence", {
    method,
    ...(origin ? { headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" } } : { headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
    body: method === "POST" ? body : undefined,
  });
}

describe("authenticated online presence heartbeat", () => {
  it("rejects a cached identity from another account without recording presence", async () => {
    const env = setup("server-B");
    const result = await action({ request: ping("https://forum.test", "intent=heartbeat&expectedUserId=visible-A"), context: env.context });
    expect(result.status).toBe(409);
    expect(env.recordOnlinePresence).not.toHaveBeenCalled();
    expect(headers()["Cache-Control"]).toBe("no-store");
  });
  it("records only the session user regardless of user-supplied IDs", async () => {
    const env = setup("real-user");
    const result = await action({ request: ping(), context: env.context });
    expect(result.status).toBe(204);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(env.recordOnlinePresence).toHaveBeenCalledExactlyOnceWith("real-user");
  });
  it.each([
    [null, "https://forum.test", 401],
    ["owner", "https://other.test", 403],
    ["owner", null, 403],
  ] as const)("rejects guests and invalid origins without writing", async (userId, origin, code) => {
    const env = setup(userId);
    try {
      await action({ request: ping(origin), context: env.context });
      throw new Error("Expected rejection");
    } catch (error) {
      expect((error as Response).status).toBe(code);
      expect((error as Response).headers.get("Cache-Control")).toBe("no-store");
    }
    expect(env.recordOnlinePresence).not.toHaveBeenCalled();
  });
  it("rejects malformed intent and unsupported verbs", async () => {
    const env = setup();
    await expect(action({ request: ping("https://forum.test", "intent=wrong"), context: env.context })).rejects.toMatchObject({ status: 400 });
    await expect(action({ request: ping("https://forum.test", "", "PUT"), context: env.context })).rejects.toMatchObject({ status: 405 });
    expect(env.recordOnlinePresence).not.toHaveBeenCalled();
    try { loader(); } catch (error) {
      expect((error as Response).headers.get("Cache-Control")).toBe("no-store");
    }
  });
  it("maps a deleted session account to a stale-identity conflict", async () => {
    const env = setup();
    env.recordOnlinePresence.mockRejectedValueOnce(new UserPrivacyAccountMissingError("stale"));
    await expect(action({ request: ping(), context: env.context })).rejects.toMatchObject({ status: 409 });
  });
  it("rejects an inactive session actor with a private generic conflict and no lifecycle disclosure", async () => {
    const env = setup("inactive-user");
    env.recordOnlinePresence.mockRejectedValueOnce(new AccountInactiveError());
    try {
      await action({ request: ping(), context: env.context });
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(409);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.text()).toBe("Conflict");
      expect(env.recordOnlinePresence).toHaveBeenCalledExactlyOnceWith("inactive-user");
    }
  });
  it("classifies storage outages but preserves unexpected defects", async () => {
    const env = setup();
    env.recordOnlinePresence.mockRejectedValueOnce(new ForumStorageUnavailableError());
    try { await action({ request: ping(), context: env.context }); }
    catch (error) { expect((error as Response).headers.get("Cache-Control")).toBe("no-store"); }
    const bug = new Error("unexpected"); env.recordOnlinePresence.mockRejectedValueOnce(bug);
    await expect(action({ request: ping(), context: env.context })).rejects.toBe(bug);
  });
});
