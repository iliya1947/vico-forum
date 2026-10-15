import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext, forumWriterContext } from "../forum/request-context";
import { action, loader } from "./notifications";

const session = {
  user: { id: "user-1", name: "Ada", email: "ada@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session-1", token: "token", userId: "user-1", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

function context(authenticated = true) {
  const value = new RouterContextProvider();
  value.set(authSessionContext, authenticated ? session : null);
  return value;
}

describe("notifications route", () => {
  it("requires an authenticated session", async () => {
    await expect(loader({ params: { locale: "en" }, context: context(false) }))
      .rejects.toMatchObject({ status: 401 });
  });

  it("loads the current user's reply notifications with serialized timestamps", async () => {
    const value = context();
    const readReplyNotifications = vi.fn(async () => [{
      id: "notification-1",
      actorName: "Grace",
      topicId: "topic-1",
      topicTitle: "Typed APIs",
      postId: "post-2",
      createdAt: new Date("2026-10-03T10:00:00Z"),
      readAt: null,
    }]);
    value.set(forumReaderContext, { readReplyNotifications } as never);

    const result = await loader({ params: { locale: "ru" }, context: value });

    expect(readReplyNotifications).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      locale: "ru",
      notifications: [{
        id: "notification-1",
        actorName: "Grace",
        topicId: "topic-1",
        topicTitle: "Typed APIs",
        postId: "post-2",
        createdAt: "2026-10-03T10:00:00.000Z",
        readAt: null,
      }],
    });
  });

  it("marks the selected notification read and redirects to its reply", async () => {
    const value = context();
    const markReplyNotificationRead = vi.fn(async () => ({ topicId: "topic-1", postId: "post-2" }));
    value.set(forumWriterContext, { markReplyNotificationRead } as never);

    const request = new Request("https://forum.example/ru/notifications", {
      method: "POST",
      headers: {
        Origin: "https://forum.example",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        intent: "open",
        notificationId: "notification-1",
      }),
    });

    const response = await action({ request, params: { locale: "ru" }, context: value });

    expect(markReplyNotificationRead).toHaveBeenCalledWith({
      userId: "user-1",
      notificationId: "notification-1",
    });
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe("/ru/topics/topic-1#post-post-2");
  });
});
