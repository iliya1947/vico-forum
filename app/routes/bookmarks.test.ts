import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { bookmarkListCursor, headers, loader } from "./bookmarks";

const session = {
  user: { id: "viewer-a", name: "Ada", email: "ada@example.test",
    emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "s1", token: "token", userId: "viewer-a",
    expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;
function setup(authenticated = true) {
  const context = new RouterContextProvider();
  const readTopicBookmarks = vi.fn(async () => ({
    items: [{
      id: "topic-1", title: "<script>literal title</script>",
      authorName: "retained-private-name", authorIdentityKind: "deleted" as const,
      savedAt: new Date("2026-11-18T09:10:11.123Z"),
      category: { id: "help-solutions", name: "Help" },
      section: null,
    }],
    next: { savedAt: new Date("2026-11-17T01:02:03.456Z"), topicId: "topic-0" },
  }));
  context.set(authSessionContext, authenticated ? session : null);
  context.set(forumReaderContext, { readTopicBookmarks } as never);
  return { context, readTopicBookmarks };
}
function load(context: RouterContextProvider, query = "") {
  return loader({ params: { locale: "ru" }, context,
    url: new URL("https://forum.example/ru/bookmarks" + query) });
}

describe("private Bookmarks list loader and cursor", () => {
  it("rejects guest before personal reads, with no-store on all route responses", async () => {
    const { context, readTopicBookmarks } = setup(false);
    await expect(load(context)).rejects.toMatchObject({
      status: 401, headers: new Headers({ "Cache-Control": "private, no-store" }),
    });
    expect(readTopicBookmarks).not.toHaveBeenCalled();
    const actual = headers({ parentHeaders: new Headers({
      "Cache-Control": "public,max-age=300", "Set-Cookie": "locale=ru; Path=/",
    }) } as Parameters<typeof headers>[0]);
    expect(actual.get("Cache-Control")).toBe("private, no-store");
    expect(actual.get("Set-Cookie")).toBe("locale=ru; Path=/");
  });

  it("filters by the session actor, returns only safe current fields and a canonical cursor", async () => {
    const { context, readTopicBookmarks } = setup();
    const result = await load(context);
    expect(readTopicBookmarks).toHaveBeenCalledWith("viewer-a", undefined);
    expect(result).toEqual({
      locale: "ru", actorId: "viewer-a",
      items: [{
        id: "topic-1", title: "<script>literal title</script>", authorName: DELETED_USER_NAME,
        authorIdentityKind: "deleted", category: { id: "help-solutions", name: "Help" },
        section: null, savedAt: "2026-11-18T09:10:11.123Z",
      }],
      next: { beforeSavedAt: "2026-11-17T01:02:03.456Z", beforeTopicId: "topic-0" },
    });
    expect(JSON.stringify(result)).not.toContain("retained-private-name");
  });

  it("passes bounded canonical millisecond cursor, without lookup of anchor authority", async () => {
    const { context, readTopicBookmarks } = setup();
    const result = await load(context,
      "?beforeSavedAt=2026-11-17T01%3A02%3A03.456Z&beforeTopicId=topic-0");
    expect(result.locale).toBe("ru");
    expect(readTopicBookmarks).toHaveBeenCalledWith("viewer-a", {
      savedAt: new Date("2026-11-17T01:02:03.456Z"), topicId: "topic-0",
    });
    expect(bookmarkListCursor(new URLSearchParams())).toBeUndefined();
  });

  it.each([
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z",
    "?beforeTopicId=topic-1",
    "?limit=50",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId=topic-1&sort=asc",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeSavedAt=2026-11-17T09%3A10%3A11.123Z&beforeTopicId=topic-1",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId=topic-1&beforeTopicId=topic-2",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11Z&beforeTopicId=topic-1",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123%2B00%3A00&beforeTopicId=topic-1",
    "?beforeSavedAt=2026-02-30T09%3A10%3A11.123Z&beforeTopicId=topic-1",
    "?beforeSavedAt=not-a-date&beforeTopicId=topic-1",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId=",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId=%20",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId=%00",
    "?beforeSavedAt=2026-11-18T09%3A10%3A11.123Z&beforeTopicId="+"x".repeat(257),
  ])("rejects malformed query before DB access: %s", async query => {
    const { context, readTopicBookmarks } = setup();
    await expect(load(context, query)).rejects.toMatchObject({ status: 400 });
    expect(readTopicBookmarks).not.toHaveBeenCalled();
  });

  it("classifies only storage outages as private 503; unexpected errors propagate", async () => {
    const { context, readTopicBookmarks } = setup();
    readTopicBookmarks.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await expect(load(context)).rejects.toMatchObject({ status: 503 });
    const bug = new TypeError("unhandled query problem");
    readTopicBookmarks.mockRejectedValueOnce(bug);
    await expect(load(context)).rejects.toBe(bug);
  });

  it("does not read personal state when a malformed cursor arrives for a guest", async () => {
    const { context, readTopicBookmarks } = setup(false);
    await expect(load(context, "?sort=public")).rejects.toMatchObject({ status: 401 });
    expect(readTopicBookmarks).not.toHaveBeenCalled();
  });
});
