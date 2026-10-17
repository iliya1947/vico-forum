import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { loader } from "./mentions";

function setup(authenticated = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, authenticated ? { user: { id: "author" } } as AuthSession : null);
  const searchMentionableUsers = vi.fn(async () => [
    { id: "user-42", name: "Ada Lovelace" },
  ]);
  context.set(forumReaderContext, { searchMentionableUsers } as never);
  return { context, searchMentionableUsers };
}
function request(q: string) {
  return new Request("https://forum.test/en/mentions?q=" + encodeURIComponent(q));
}

describe("authenticated mention search", () => {
  it("does not reveal member identity to guests", async () => {
    const ctx = setup(false);
    const result = await loader({ request: request("Ada"), context: ctx.context });
    expect(result.status).toBe(401);
    expect(ctx.searchMentionableUsers).not.toHaveBeenCalled();
  });

  it("returns only stable ids and display names, never emails, on a private no-store response", async () => {
    const ctx = setup();
    const result = await loader({ request: request(" ada "), context: ctx.context });
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(ctx.searchMentionableUsers).toHaveBeenCalledExactlyOnceWith("ada");
    expect(await result.json()).toEqual({ users: [{ id: "user-42", name: "Ada Lovelace" }] });
  });

  it("does not issue empty or oversized searches", async () => {
    const ctx = setup();
    expect(await (await loader({ request: request("  "), context: ctx.context })).json())
      .toEqual({ users: [] });
    expect((await loader({ request: request("a".repeat(65)), context: ctx.context })).status).toBe(400);
    expect(ctx.searchMentionableUsers).not.toHaveBeenCalled();
  });

  it("returns 503 only for known storage unavailability and propagates programming errors", async () => {
    const ctx = setup();
    ctx.searchMentionableUsers.mockRejectedValueOnce(new ForumStorageUnavailableError());
    const unavailable = await loader({ request: request("Ada"), context: ctx.context });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: "unavailable" });
    const bug = new Error("unexpected bug");
    ctx.searchMentionableUsers.mockRejectedValueOnce(bug);
    await expect(loader({ request: request("Ada"), context: ctx.context })).rejects.toBe(bug);
  });
});
