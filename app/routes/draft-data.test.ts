import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumDraftStoreContext } from "../forum/draft-request-context";
import type { ForumDraftStore } from "../../db/hyperdrive-editor-drafts";
import { action, loader } from "./draft-data";

const draftId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const contextKey = "topic:abc:reply";
const payload = { body: "one", title: "", tags: "" };
function setup(owner: string | null = "real-user") {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, owner ? { user: { id: owner } } as AuthSession : null);
  const save = vi.fn(async () => ({ outcome: "saved" as const, draft: {
    contextKey, draftId, payload, version: 1,
    status: "active" as const, title: "", snippet: "one",
    editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } }));
  const finish = vi.fn(async () => true);
  const metadata = vi.fn(async () => []);
  const get = vi.fn(async () => null);
  ctx.set(forumDraftStoreContext, { save, finish, metadata, get } as unknown as ForumDraftStore);
  return { ctx, save, finish, metadata, get };
}
function request(body: Record<string, unknown>, origin = "https://forum.test") {
  return new Request("https://forum.test/en/drafts/data", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("account-scoped draft API", () => {
  it("does not expose metadata or allow writes for guests", async () => {
    const env = setup(null);
    const response = await loader({ request: new Request("https://forum.test/en/drafts/data"), context: env.ctx });
    expect(response.status).toBe(401);
    expect((await action({ request: request({ intent: "delete", contextKey, draftId }), context: env.ctx })).status).toBe(401);
    expect(env.finish).not.toHaveBeenCalled();
  });
  it("does not accept spoofed owner identity or a client-controlled published state", async () => {
    const env = setup("real-user");
    const fakeFinish = await action({ request: request({ intent: "finish", contextKey, draftId }), context: env.ctx });
    expect(fakeFinish.status).toBe(400);
    expect(env.finish).not.toHaveBeenCalled();
    const saved = await action({ request: request({
      intent: "save", contextKey, draftId, payload, expectedVersion: 0,
      editedAt: "2090-01-01T00:00:00.000Z", ownerId: "forged-owner",
    }), context: env.ctx });
    expect(saved.status).toBe(200);
    expect(env.save).toHaveBeenCalledExactlyOnceWith("real-user", contextKey, draftId, payload, 0);
  });
  it("rejects cross-origin mutations and permits a real owner to delete", async () => {
    const env = setup();
    expect((await action({ request: request({ intent: "delete", contextKey, draftId }, "https://evil.test"), context: env.ctx })).status).toBe(403);
    expect(env.finish).not.toHaveBeenCalled();
    const response = await action({ request: request({ intent: "delete", contextKey, draftId }), context: env.ctx });
    expect(response.status).toBe(200);
    expect(env.finish).toHaveBeenCalledWith("real-user", contextKey, draftId, "deleted");
  });
  it("fetches only the logged-in user's metadata and content", async () => {
    const env = setup("real-user");
    const response = await loader({ request: new Request("https://forum.test/en/drafts/data?mode=metadata"), context: env.ctx });
    expect(response.status).toBe(200);
    expect(env.metadata).toHaveBeenCalledWith("real-user");
    const content = await loader({ request: new Request("https://forum.test/en/drafts/data?mode=content&key=" + contextKey), context: env.ctx });
    expect(content.status).toBe(404);
    expect(env.get).toHaveBeenCalledWith("real-user", contextKey);
  });
});
