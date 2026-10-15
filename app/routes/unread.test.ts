import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext } from "../forum/request-context";
import { loader } from "./unread";

const session = {
  user: { id: "user-1", name: "Ada", email: "ada@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session-1", token: "token", userId: "user-1", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

function context(authenticated: boolean) {
  const value = new RouterContextProvider();
  value.set(authSessionContext, authenticated ? session : null);
  return value;
}

describe("unread route", () => {
  it("requires an authenticated session", async () => {
    const value = context(false);
    await expect(loader({ params: { locale: "en" }, context: value })).rejects.toMatchObject({ status: 401 });
  });

  it("reads unread topics for the session user", async () => {
    const value = context(true);
    const readUnreadForUser = vi.fn(async () => [{
      id: "topic-1",
      title: "Unread topic",
      authorName: "Grace",
      state: "unread" as const,
      firstUnreadPostId: "post-2",
      latestPostId: "post-3",
      unreadCount: 2,
      activityAt: new Date("2026-10-03T10:00:00Z"),
      section: { id: "section-1", name: "Section" },
      category: { id: "category-1", name: "Category" },
    }]);
    value.set(forumReaderContext, { readUnreadForUser } as never);

    const result = await loader({ params: { locale: "ru" }, context: value });

    expect(readUnreadForUser).toHaveBeenCalledWith("user-1");
    expect(result.locale).toBe("ru");
    expect(result.topics[0]).toMatchObject({
      id: "topic-1",
      state: "unread",
      firstUnreadPostId: "post-2",
      unreadCount: 2,
    });
  });
});
