import { RouterContextProvider } from "react-router";
import { describe, it, expect, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { headers, personalFiltersQuery, loader } from "./filters";

const session = {
  user: { id: "viewer-a", name: "Viewer", email: "a@example.test", emailVerified: true,
    createdAt: new Date(), updatedAt: new Date() },
  session: { id: "s1", token: "token", userId: "viewer-a", expiresAt: new Date(),
    createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;
function setup(authenticated = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, authenticated ? session : null);
  const readMutedTopics = vi.fn(async () => ({
    items: [{ id: "t-a", title: "Live title", authorName: "Anonymous",
      mutedAt: new Date("2026-11-17T08:09:10.111Z"),
      category: { id: "help", name: "Help" }, section: null }],
    next: { createdAt: new Date("2026-11-16T07:08:09.123Z"), targetId: "t-b" },
  }));
  const readBlockedUsers = vi.fn(async () => ({
    items: [{ id: "u-b", name: "Deleted user", identityKind: "deleted" as const,
      blockedAt: new Date("2026-11-18T01:02:03.004Z") }],
    next: null,
  }));
  context.set(forumReaderContext, { readMutedTopics, readBlockedUsers } as never);
  return { context, readMutedTopics, readBlockedUsers };
}
function load(context: RouterContextProvider, query = "") {
  return loader({ request: new Request("https://forum.example/ru/filters" + query),
    params: { locale: "ru" }, context });
}

describe("private Mute/Block keyset list route", () => {
  it("reads only the authoritative session's own pair list, with private document/data headers", async () => {
    const env = setup();
    const result = await load(env.context);
    expect(result.data).toMatchObject({ locale: "ru", actorId: "viewer-a", tab: "topics",
      items: [{ kind: "topic", id: "t-a", name: "Live title",
        createdAt: "2026-11-17T08:09:10.111Z" }],
      next: { beforeCreatedAt: "2026-11-16T07:08:09.123Z", beforeTargetId: "t-b" } });
    expect(env.readMutedTopics).toHaveBeenCalledExactlyOnceWith("viewer-a", undefined);
    expect(env.readBlockedUsers).not.toHaveBeenCalled();
    expect(result.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    const h = headers({ parentHeaders: new Headers({
      "Cache-Control": "public,max-age=180", "Set-Cookie": "theme=dark; Path=/",
    }) } as Parameters<typeof headers>[0]);
    expect(h.get("Cache-Control")).toBe("private, no-store");
    expect(h.get("Set-Cookie")).toBe("theme=dark; Path=/");
  });

  it("isolates the blocked users tab, parses its canonical cursor and strips transport metadata", async () => {
    const env = setup();
    const result = await load(env.context,
      "?tab=users&beforeCreatedAt=2026-11-16T07%3A08%3A09.123Z&beforeTargetId=u-old&.data=routes%2Ffilters");
    expect(result.data).toMatchObject({ tab: "users", items: [{ kind: "user", id: "u-b",
      identityKind: "deleted", name: "Deleted user" }], next: null });
    expect(env.readBlockedUsers).toHaveBeenCalledExactlyOnceWith("viewer-a", {
      createdAt: new Date("2026-11-16T07:08:09.123Z"), targetId: "u-old",
    });
    expect(env.readMutedTopics).not.toHaveBeenCalled();
    expect(personalFiltersQuery(new URLSearchParams("tab=users"))).toEqual({ tab: "users" });
  });

  it.each([
    "?tab=all", "?tab=topics&tab=users", "?ownerId=viewer-b", "?beforeTargetId=x",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09.123Z",
    "?tab=users&beforeCreatedAt=not-date&beforeTargetId=x",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09Z&beforeTargetId=x",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09.123%2B00%3A00&beforeTargetId=x",
    "?beforeCreatedAt=2026-02-30T07%3A08%3A09.123Z&beforeTargetId=x",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09.123Z&beforeTargetId=",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09.123Z&beforeTargetId=%00",
    "?beforeCreatedAt=2026-11-16T07%3A08%3A09.123Z&beforeTargetId="+"x".repeat(257),
  ])("rejects malformed cursor/tab/foreign actor before database read: %s", async query => {
    const env = setup();
    await expect(load(env.context, query)).rejects.toMatchObject({ status: 400 });
    expect(env.readMutedTopics).not.toHaveBeenCalled();
    expect(env.readBlockedUsers).not.toHaveBeenCalled();
  });

  it("rejects guest before reading private lists even for malformed cursors", async () => {
    const env = setup(false);
    await expect(load(env.context, "?tab=users&ownerId=viewer-b")).rejects.toMatchObject({ status: 401 });
    expect(env.readMutedTopics).not.toHaveBeenCalled();
    expect(env.readBlockedUsers).not.toHaveBeenCalled();
  });

  it("returns private 503 on dependency failure, not an empty list, and propagates unexpected faults", async () => {
    const env = setup();
    env.readMutedTopics.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await expect(load(env.context)).rejects.toMatchObject({ status: 503 });
    const bug = new TypeError("unexpected");
    env.readBlockedUsers.mockRejectedValueOnce(bug);
    await expect(load(env.context, "?tab=users")).rejects.toBe(bug);
  });
});
