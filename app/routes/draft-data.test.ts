import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumDraftStoreContext } from "../forum/draft-request-context";
import {
  ForumDraftStorageUnavailableError,
  type ForumDraftStore,
} from "../../db/hyperdrive-editor-drafts";
import { action, loader } from "./draft-data";

const draftId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const contextKey = "topic:abc:reply";
const payload = { body: "one", title: "", tags: "" };

function setup(owner: string | null = "real-user", allowed = true) {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, owner ? { user: { id: owner } } as AuthSession : null);
  ctx.set(authorizationContext, {
    forUser: () => ({ has: vi.fn(async () => allowed) }),
  } as never);

  const save = vi.fn(async () => ({ outcome: "saved" as const, draft: {
    contextKey,
    draftId,
    payload,
    version: 1,
    status: "active" as const,
    title: "",
    snippet: "one",
    editedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } }));
  const deleteDraft = vi.fn(async () => true);
  const metadata = vi.fn(async () => []);
  const get = vi.fn(async () => null);
  ctx.set(forumDraftStoreContext, {
    save,
    delete: deleteDraft,
    metadata,
    get,
  } as unknown as ForumDraftStore);
  return { ctx, save, deleteDraft, metadata, get };
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
    const response = await loader({
      request: new Request("https://forum.test/en/drafts/data"),
      context: env.ctx,
    });
    expect(response.status).toBe(401);
    expect((await action({
      request: request({ intent: "delete", contextKey, draftId, expectedVersion: 1 }),
      context: env.ctx,
    })).status).toBe(401);
    expect(env.deleteDraft).not.toHaveBeenCalled();
  });

  it("does not accept spoofed owner identity or a client-controlled published state", async () => {
    const env = setup("real-user");
    const fakeFinish = await action({
      request: request({ intent: "finish", contextKey, draftId }),
      context: env.ctx,
    });
    expect(fakeFinish.status).toBe(400);
    expect(env.deleteDraft).not.toHaveBeenCalled();

    const saved = await action({
      request: request({
        intent: "save",
        contextKey,
        draftId,
        payload,
        expectedVersion: 0,
        editedAt: "2090-01-01T00:00:00.000Z",
        ownerId: "forged-owner",
      }),
      context: env.ctx,
    });
    expect(saved.status).toBe(200);
    expect(env.save).toHaveBeenCalledExactlyOnceWith(
      "real-user",
      contextKey,
      draftId,
      payload,
      0,
    );
  });

  it("requires current write permission for server draft saves", async () => {
    const env = setup("real-user", false);
    const response = await action({
      request: request({
        intent: "save",
        contextKey,
        draftId,
        payload,
        expectedVersion: 0,
      }),
      context: env.ctx,
    });
    expect(response.status).toBe(403);
    expect(env.save).not.toHaveBeenCalled();
  });

  it("accepts opaque topic ids instead of restricting context ids to slug characters", async () => {
    const env = setup();
    const opaqueKey = "topic:typed/api:with:unicode-שלום:reply";
    const response = await action({
      request: request({
        intent: "save",
        contextKey: opaqueKey,
        draftId,
        payload,
        expectedVersion: 0,
      }),
      context: env.ctx,
    });
    expect(response.status).toBe(200);
    expect(env.save).toHaveBeenCalledWith(
      "real-user",
      opaqueKey,
      draftId,
      payload,
      0,
    );
  });

  it("rejects cross-origin mutations and CAS-deletes the authoritative server generation", async () => {
    const env = setup();
    expect((await action({
      request: request(
        { intent: "delete", contextKey, draftId, expectedVersion: 7 },
        "https://evil.test",
      ),
      context: env.ctx,
    })).status).toBe(403);
    expect(env.deleteDraft).not.toHaveBeenCalled();

    const response = await action({
      request: request({ intent: "delete", contextKey, draftId, expectedVersion: 7 }),
      context: env.ctx,
    });
    expect(response.status).toBe(200);
    expect(env.deleteDraft).toHaveBeenCalledWith(
      "real-user",
      contextKey,
      draftId,
      7,
    );
  });

  it("enforces the actual request byte limit even when Content-Length is missing or lies", async () => {
    const env = setup();
    const oversized = JSON.stringify({
      intent: "save",
      contextKey,
      draftId,
      expectedVersion: 0,
      payload: { title: "", tags: "", body: "x".repeat(160_000) },
    });

    const missingLength = new Request("https://forum.test/en/drafts/data", {
      method: "POST",
      headers: { Origin: "https://forum.test", "Content-Type": "application/json" },
      body: oversized,
    });
    missingLength.headers.delete("Content-Length");
    expect((await action({ request: missingLength, context: env.ctx })).status).toBe(413);

    const lyingLength = new Request("https://forum.test/en/drafts/data", {
      method: "POST",
      headers: {
        Origin: "https://forum.test",
        "Content-Type": "application/json",
        "Content-Length": "1",
      },
      body: oversized,
    });
    expect((await action({ request: lyingLength, context: env.ctx })).status).toBe(413);
    expect(env.save).not.toHaveBeenCalled();
  });

  it("fetches only the logged-in user's metadata and content", async () => {
    const env = setup("real-user");
    const response = await loader({
      request: new Request("https://forum.test/en/drafts/data?mode=metadata"),
      context: env.ctx,
    });
    expect(response.status).toBe(200);
    expect(env.metadata).toHaveBeenCalledWith("real-user");

    const content = await loader({
      request: new Request(
        "https://forum.test/en/drafts/data?mode=content&key=" + encodeURIComponent(contextKey),
      ),
      context: env.ctx,
    });
    expect(content.status).toBe(404);
    expect(env.get).toHaveBeenCalledWith("real-user", contextKey);
  });

  it("maps only classified storage availability failures to 503", async () => {
    const unavailable = setup();
    unavailable.get.mockRejectedValueOnce(new ForumDraftStorageUnavailableError());
    const unavailableResponse = await loader({
      request: new Request(
        "https://forum.test/en/drafts/data?mode=content&key=" + encodeURIComponent(contextKey),
      ),
      context: unavailable.ctx,
    });
    expect(unavailableResponse.status).toBe(503);

    const bug = setup();
    bug.get.mockRejectedValueOnce(new Error("draft programming bug"));
    await expect(loader({
      request: new Request(
        "https://forum.test/en/drafts/data?mode=content&key=" + encodeURIComponent(contextKey),
      ),
      context: bug.ctx,
    })).rejects.toThrow("draft programming bug");
  });
});
