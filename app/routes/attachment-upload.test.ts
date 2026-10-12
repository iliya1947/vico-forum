import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import {
  forumAttachmentStoreContext,
  privateAttachmentBucketContext,
} from "../forum/attachment-request-context";
import { forumDraftStoreContext } from "../forum/draft-request-context";
import type { PrivateAttachmentBucket } from "../forum/attachment-r2";
import { ForumEditorDraftContextNotFoundError } from "../../db/forum-editor-drafts";
import type { CreateDraftAttachmentInput } from "../../db/forum-attachments";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";
import { action } from "./attachment-upload";

const contextKey = "topic:opaque/topic:reply";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";

function bucket() {
  const objects = new Map<string, Uint8Array>();
  const put = vi.fn(async (key: string, body: ReadableStream<Uint8Array>) => {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    objects.set(key, bytes);
    return { size: bytes.length };
  });
  const get = vi.fn(async () => null);
  const del = vi.fn(async (key: string) => { objects.delete(key); });
  return { put, get, delete: del } satisfies PrivateAttachmentBucket;
}

function setup({ owner = "real-user", allowed = true, withBucket = true } = {}) {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, owner ? { user: { id: owner } } as AuthSession : null);
  ctx.set(authorizationContext, {
    forUser: () => ({ has: vi.fn(async () => allowed) }),
  } as never);
  const assertContextExists = vi.fn(async () => {});
  ctx.set(forumDraftStoreContext, { assertContextExists } as never);

  const createDraftAttachment = vi.fn(async (input: CreateDraftAttachmentInput) => ({
    ...input,
    createdAt: new Date().toISOString(),
  }));
  const recordSecurityEvent = vi.fn(async () => {});
  const readSecurityAttachmentEvents = vi.fn(async () => ({ events: [], hasMore: false, page: 0 }));
  ctx.set(forumAttachmentStoreContext, {
    createDraftAttachment,
    recordSecurityEvent,
    readSecurityAttachmentEvents,
  } as never);
  const r2 = bucket();
  if (withBucket) ctx.set(privateAttachmentBucketContext, r2);
  return { ctx, r2, assertContextExists, createDraftAttachment, recordSecurityEvent };
}

function request(
  bytes: Uint8Array,
  {
    origin = "https://forum.test",
    fileName = "notes.txt",
    declaredMime = "text/plain",
    size = bytes.length,
    key = contextKey,
    id = draftId,
  } = {},
) {
  return new Request("https://forum.test/api/attachments", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": declaredMime,
      "X-Vico-Attachment-Name": encodeURIComponent(fileName),
      "X-Vico-Attachment-Size": String(size),
      "X-Vico-Draft-Context": encodeURIComponent(key),
      "X-Vico-Draft-Id": id,
    },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
}

describe("private attachment upload API", () => {
  it("requires session, same origin and current authoring permission before storage", async () => {
    const bytes = new TextEncoder().encode("hello");
    const guest = setup({ owner: "" });
    expect((await action({ request: request(bytes), context: guest.ctx })).status).toBe(401);
    expect(guest.r2.put).not.toHaveBeenCalled();

    const crossOrigin = setup();
    expect((await action({
      request: request(bytes, { origin: "https://evil.test" }),
      context: crossOrigin.ctx,
    })).status).toBe(403);
    expect(crossOrigin.r2.put).not.toHaveBeenCalled();

    const forbidden = setup({ allowed: false });
    expect((await action({ request: request(bytes), context: forbidden.ctx })).status).toBe(403);
    expect(forbidden.assertContextExists).not.toHaveBeenCalled();
    expect(forbidden.r2.put).not.toHaveBeenCalled();
  });

  it("rejects a fabricated editor context before touching R2", async () => {
    const env = setup();
    env.assertContextExists.mockRejectedValueOnce(new ForumEditorDraftContextNotFoundError());
    const response = await action({
      request: request(new TextEncoder().encode("hello")),
      context: env.ctx,
    });
    expect(response.status).toBe(404);
    expect(env.r2.put).not.toHaveBeenCalled();
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
  });

  it("streams a valid file, persists its private reference, and never exposes the object key", async () => {
    const env = setup();
    const bytes = new TextEncoder().encode("hello from upload");
    const response = await action({ request: request(bytes), context: env.ctx });
    expect(response.status).toBe(201);
    const payload = await response.json() as { outcome: string; attachment: Record<string, unknown> };
    expect(payload).toMatchObject({
      outcome: "stored",
      attachment: {
        fileName: "notes.txt",
        detectedType: "text",
        byteSize: bytes.length,
        verificationStatus: "type-checked",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("private/");
    expect(env.createDraftAttachment).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "real-user",
      contextKey,
      draftId,
      objectKey: expect.stringMatching(/^private\//u),
    }));
    expect(env.recordSecurityEvent).not.toHaveBeenCalled();
  });

  it("durably records suspicious rejection metadata without storing an attachment row", async () => {
    const env = setup();
    const bytes = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]);
    const response = await action({
      request: request(bytes, { fileName: "friendly.txt" }),
      context: env.ctx,
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      outcome: "rejected",
      reason: "executable-signature",
      suspicious: true,
    });
    expect(env.r2.put).not.toHaveBeenCalled();
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
    expect(env.recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      uploadedByUserId: "real-user",
      contextKey,
      draftId,
      fileName: "friendly.txt",
      detectedType: "executable",
      reason: "executable-signature",
      byteSize: bytes.length,
    }));
  });

  it("does not create a security event for a non-suspicious size rejection", async () => {
    const env = setup();
    const response = await action({
      request: request(new TextEncoder().encode("x"), { size: 50_000_001 }),
      context: env.ctx,
    });
    expect(response.status).toBe(413);
    expect(env.r2.put).not.toHaveBeenCalled();
    expect(env.recordSecurityEvent).not.toHaveBeenCalled();
  });

  it("fails closed when the R2 binding is absent", async () => {
    const env = setup({ withBucket: false });
    const response = await action({
      request: request(new TextEncoder().encode("hello")),
      context: env.ctx,
    });
    expect(response.status).toBe(503);
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
  });

  it("deletes a stored private object if durable DB persistence becomes unavailable", async () => {
    const env = setup();
    env.createDraftAttachment.mockRejectedValueOnce(new ForumAttachmentStorageUnavailableError());
    const response = await action({
      request: request(new TextEncoder().encode("hello")),
      context: env.ctx,
    });
    expect(response.status).toBe(503);
    expect(env.r2.put).toHaveBeenCalledOnce();
    expect(env.r2.delete).toHaveBeenCalledOnce();
  });

  it("fails closed if a suspicious rejection cannot be durably recorded", async () => {
    const env = setup();
    env.recordSecurityEvent.mockRejectedValueOnce(new ForumAttachmentStorageUnavailableError());
    const response = await action({
      request: request(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00])),
      context: env.ctx,
    });
    expect(response.status).toBe(503);
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
  });
});
