import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../auth/request-context";
import { authSessionContext } from "../auth/request-context";
import type { ForumWriter } from "../../db/hyperdrive-forum";
import { forumWriterContext } from "./request-context";
import { action as sectionAction } from "../routes/section";
import { action as topicAction } from "../routes/topic";

const session = {
  user: { id: "session-user", name: "Ada", email: "ada@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session", token: "token", userId: "session-user", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

function request(path: string, fields: Record<string, string>, origin = "https://forum.example") {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  return new Request(`https://forum.example${path}`, { method: "POST", headers: { Origin: origin }, body });
}

function context(writer: ForumWriter, authenticated = true) {
  const value = new RouterContextProvider();
  value.set(authSessionContext, authenticated ? session : null);
  value.set(forumWriterContext, writer);
  return value;
}

function writer() {
  return {
    createTopic: vi.fn(async () => ({ topicId: "server-topic" })),
    createReply: vi.fn(async () => ({ postId: "server-post" })),
  } satisfies ForumWriter;
}

describe("forum write route actions", () => {
  it("creates a topic as the session user and redirects to its canonical locale path", async () => {
    const forumWriter = writer();
    const response = await sectionAction({
      request: request("/he/sections/typescript", { title: " A title ", body: " First post ", authorId: "attacker" }),
      params: { locale: "he", sectionId: "typescript" }, context: context(forumWriter),
    });
    expect(forumWriter.createTopic).toHaveBeenCalledWith({
      sectionId: "typescript", authorId: "session-user", title: "A title", body: "First post",
    });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response).toMatchObject({ status: 302 });
    expect(response.headers.get("Location")).toBe("/he/topics/server-topic");
  });

  it("creates a reply as the session user and redirects to the canonical topic", async () => {
    const forumWriter = writer();
    const response = await topicAction({
      request: request("/en/topics/topic-1", { body: " A reply " }),
      params: { locale: "en", topicId: "topic-1" }, context: context(forumWriter),
    });
    expect(forumWriter.createReply).toHaveBeenCalledWith({ topicId: "topic-1", authorId: "session-user", body: "A reply" });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response.headers.get("Location")).toBe("/en/topics/topic-1");
  });

  it("rejects guest, cross-origin, blank, and invalid route input without writing", async () => {
    const guestWriter = writer();
    expect((await topicAction({ request: request("/en/topics/t", { body: "reply" }), params: { locale: "en", topicId: "t" }, context: context(guestWriter, false) }) as { init: { status: number } }).init.status).toBe(401);
    expect(guestWriter.createReply).not.toHaveBeenCalled();

    const crossOriginWriter = writer();
    expect((await topicAction({ request: request("/en/topics/t", { body: "reply" }, "https://evil.example"), params: { locale: "en", topicId: "t" }, context: context(crossOriginWriter) }) as { init: { status: number } }).init.status).toBe(403);
    expect(crossOriginWriter.createReply).not.toHaveBeenCalled();

    const invalidWriter = writer();
    expect((await sectionAction({ request: request("/en/sections/s", { title: "   ", body: "body" }), params: { locale: "en", sectionId: "s" }, context: context(invalidWriter) }) as { init: { status: number } }).init.status).toBe(400);
    expect((await topicAction({ request: request("/en/topics/t", { body: "body" }), params: { locale: "en" }, context: context(invalidWriter) }) as { init: { status: number } }).init.status).toBe(400);
    expect(invalidWriter.createTopic).not.toHaveBeenCalled();
    expect(invalidWriter.createReply).not.toHaveBeenCalled();
  });
});
