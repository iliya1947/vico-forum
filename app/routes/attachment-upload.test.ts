import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import {
  forumAttachmentStoreContext,
  privateAttachmentBucketContext,
} from "../forum/attachment-request-context";
import { forumReaderContext } from "../forum/request-context";
import type { PrivateAttachmentBucket } from "../forum/attachment-r2";
import type {
  CreateDraftAttachmentInput,
  ForumAttachmentMetadata,
  RecordAttachmentSecurityEventInput,
} from "../../db/forum-attachments";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";
import { ForumAttachmentDraftConflictError } from "../../db/forum-attachments";
import { action, loader } from "./attachment-upload";
import routes from "../routes";

const contextKey = "topic:opaque/topic:reply";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const uploadId = "23b93562-0550-4eef-88af-f951d6ea6138";

function bucket() {
  const objects = new Map<string, Uint8Array>();
  const put = vi.fn(async (key: string, body: ReadableStream<Uint8Array>) => {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    objects.set(key, bytes);
    return { size: bytes.length };
  });
  const get = vi.fn(async () => null);
  const del = vi.fn(async (key: string) => { objects.delete(key); });
  const result = { put, get, delete: del, objects };
  return result satisfies PrivateAttachmentBucket;
}

function setup({ owner = "real-user", allowed = true, withBucket = true } = {}) {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, owner ? { user: { id: owner } } as AuthSession : null);
  ctx.set(authorizationContext, {
    forUser: () => ({ has: vi.fn(async () => allowed) }),
  } as never);
  const assertContextExists = vi.fn(async () => {});
  ctx.set(forumReaderContext, {readTopicPage: async () => ({id: "topic"}), readSection: async () => ({id:"section"}), readPostLocation: async () => ({id:"post",authorId:owner})} as never);

  const createDraftAttachment = vi.fn(async (
    input: CreateDraftAttachmentInput,
  ): Promise<ForumAttachmentMetadata> => ({
    id: input.id,
    objectKey: input.objectKey,
    fileName: input.fileName,
    declaredMime: input.declaredMime,
    detectedType: input.detectedType,
    responseMime: input.responseMime,
    byteSize: input.byteSize,
    verificationStatus: input.verificationStatus,
    createdAt: new Date().toISOString(),
  }));
  const recordSecurityEvent = vi.fn(async (
    input: RecordAttachmentSecurityEventInput,
  ): Promise<void> => {
    void input;
  });
  const readSecurityAttachmentEvents = vi.fn(async () => ({ events: [], hasMore: false, page: 0 }));
  const listDraftAttachments = vi.fn(async (): Promise<ForumAttachmentMetadata[]> => []);
  const cancelOperation = vi.fn(async () => {});
  const rebindDraftAttachments = vi.fn(async () => 0);
  const initializePostEditAttachments = vi.fn(async () => {});
  ctx.set(forumAttachmentStoreContext, {
    createDraftAttachment,
    recordSecurityEvent,
    readSecurityAttachmentEvents,
    listDraftAttachments,
    cancelOperation,
    rebindDraftAttachments,
    initializePostEditAttachments,
  } as never);
  const r2 = bucket();
  if (withBucket) ctx.set(privateAttachmentBucketContext, r2);
  return {
    ctx, r2, assertContextExists, createDraftAttachment, recordSecurityEvent,
    listDraftAttachments, cancelOperation, rebindDraftAttachments, initializePostEditAttachments,
  };
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
    attachmentId = uploadId,
    version = "0",
  } = {},
) {
  return new Request("https://forum.test/api/attachments", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": declaredMime,
      "X-Vico-Attachment-Id": attachmentId,
      "X-Vico-Attachment-Name": encodeURIComponent(fileName),
      "X-Vico-Attachment-Size": String(size),
      "X-Vico-Editor-Context": encodeURIComponent(key),
      "X-Vico-Operation-Id": id,
      "X-Vico-Draft-Version": version,
    },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
}


function scopedRequest(
  method: "GET" | "DELETE" | "PATCH",
  {
    origin = "https://forum.test",
    key = contextKey,
    id = draftId,
    attachmentId,
    fromDraftId,
    version = "4",
  }: {
    origin?: string;
    key?: string;
    id?: string;
    attachmentId?: string;
    fromDraftId?: string;
    version?: string;
  } = {},
) {
  const headers = new Headers({
    "X-Vico-Editor-Context": encodeURIComponent(key),
    "X-Vico-Operation-Id": id,
  });
  if (method !== "GET") headers.set("Origin", origin);
  if (attachmentId) headers.set("X-Vico-Attachment-Id", attachmentId);
  if (fromDraftId) headers.set("X-Vico-Attachment-From-Draft-Id", fromDraftId);
  if (method === "PATCH" || method === "DELETE") headers.set("X-Vico-Draft-Version", version);
  return new Request("https://forum.test/api/attachments", { method, headers });
}

describe("private attachment upload API", () => {

  it.each([["real-user", 201], ["other", 403], [null, 404]] as const)(
    "uses edit permission plus authoritative post ownership for post-edit files (%s)", async (authorId, status) => {
      const env = setup();
      const permission = vi.fn(async (name: string) => name === "forum.post.editOwn");
      env.ctx.set(authorizationContext, { forUser: () => ({ has: permission }) } as never);
      env.ctx.set(forumReaderContext, { readPostLocation: async () => authorId ? { topicId: "topic", authorId } : undefined } as never);
      const response = await action({ context: env.ctx,
        request: request(new TextEncoder().encode("Editor source"), { key: "post:existing:edit" }),
      });
      expect(response.status).toBe(status);
      expect(permission).toHaveBeenCalledWith("forum.post.editOwn");
      if (status !== 201) expect(env.r2.put).not.toHaveBeenCalled();
      else expect(env.createDraftAttachment).toHaveBeenCalledWith(expect.objectContaining({ contextKey: "post:existing:edit" }));
    },
  );

  it("is registered before the generic API catch-all", () => {
    const paths = routes.map((route) => route.path);
    expect(paths.indexOf("api/attachments")).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf("api/attachments")).toBeLessThan(paths.indexOf("api/*"));
  });

  it("restores draft attachments through loader without exposing private storage keys", async () => {
    const env = setup();
    env.listDraftAttachments.mockResolvedValueOnce([{
      id: "23b93562-0550-4eef-88af-f951d6ea6138",
      objectKey: "private/8cd55954-9cb6-48fd-a42f-e4a5e85ae90c",
      fileName: "example.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 12,
      verificationStatus: "type-checked",
      createdAt: new Date().toISOString(),
    }]);
    const response = await loader({ request: scopedRequest("GET"), context: env.ctx });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain("private/");
    expect(env.listDraftAttachments).toHaveBeenCalledWith("real-user", contextKey, draftId);
    expect((await action({ request: scopedRequest("GET"), context: env.ctx })).status).toBe(405);
  });

  it("rejects retired per-file DELETE without changing the private pool", async () => {
    const env = setup();
    const response = await action({request: scopedRequest("DELETE", {attachmentId: uploadId}), context: env.ctx});
    expect(response.status).toBe(405);
    expect(env.cancelOperation).not.toHaveBeenCalled();
  });
  it("cancels only the authorized owner/context/operation", async () => {
    const env = setup();
    const response = await action({request: scopedRequest("DELETE"), context: env.ctx});
    expect(response.status).toBe(200);
    expect(env.cancelOperation).toHaveBeenCalledWith("real-user", contextKey, draftId);
  });

  it("does not require a text version and still rejects closed operation mutations", async () => {
    const bytes = new TextEncoder().encode("hello");
    const noVersion = request(bytes);
    noVersion.headers.delete("X-Vico-Draft-Version");
    expect((await action({request:noVersion,context:setup().ctx})).status).toBe(201);

    const uploadEnv = setup();
    uploadEnv.createDraftAttachment.mockRejectedValueOnce(new ForumAttachmentDraftConflictError());
    expect((await action({ request: request(bytes), context: uploadEnv.ctx })).status).toBe(409);
    expect(uploadEnv.r2.delete).toHaveBeenCalledOnce();

    const deleteEnv = setup();
    deleteEnv.cancelOperation.mockRejectedValueOnce(new ForumAttachmentDraftConflictError());
    expect((await action({
      request: scopedRequest("DELETE"), context: deleteEnv.ctx,
    })).status).toBe(409);
  });

  it("discards the private upload when final persistence sees a terminal draft generation", async () => {
    const env = setup();
    env.createDraftAttachment.mockRejectedValueOnce(new ForumAttachmentDraftConflictError("gone"));
    const result = await action({ request: request(new TextEncoder().encode("hello")), context: env.ctx });
    expect(result.status).toBe(410);
    expect(env.r2.delete).toHaveBeenCalledOnce();
    expect(JSON.stringify(await result.json())).not.toContain("private/");
  });

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
    env.ctx.set(forumReaderContext, {readTopicPage:async()=>undefined} as never);
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
      id: uploadId,
      ownerId: "real-user",
      contextKey,
      draftId,
      objectKey: expect.stringMatching(/^private\//u),
    }));
    expect(env.recordSecurityEvent).not.toHaveBeenCalled();
  });

  it("cleans up a duplicate retry object when the stable upload ID already committed", async () => {
    const env = setup();
    env.createDraftAttachment.mockResolvedValueOnce({
      id: uploadId,
      objectKey: "private/8cd55954-9cb6-48fd-a42f-e4a5e85ae90c",
      fileName: "notes.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 5,
      verificationStatus: "type-checked",
      createdAt: new Date().toISOString(),
    });
    const response = await action({
      request: request(new TextEncoder().encode("hello")),
      context: env.ctx,
    });
    expect(response.status).toBe(201);
    expect(env.r2.put).toHaveBeenCalledOnce();
    expect(env.r2.delete).toHaveBeenCalledOnce();
    expect(JSON.stringify(await response.json())).not.toContain("private/");
  });

  it("rejects a malformed client upload ID before touching storage", async () => {
    const env = setup();
    const response = await action({
      request: request(new TextEncoder().encode("hello"), {
        attachmentId: "------------------------------------",
      }),
      context: env.ctx,
    });
    expect(response.status).toBe(400);
    expect(env.r2.put).not.toHaveBeenCalled();
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
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
      uploadId: expect.stringMatching(/^attachment-v1:[0-9a-f]{64}$/u),
      uploadedByUserId: "real-user",
      contextKey,
      draftId,
      fileName: "friendly.txt",
      detectedType: "executable",
      reason: "executable-signature",
      declaredByteSize: bytes.length,
    }));
    expect(env.recordSecurityEvent.mock.calls[0]?.[0].uploadId).not.toBe(uploadId);
  });

  it("derives one stable security event key for identical suspicious retries", async () => {
    const env = setup();
    const bytes = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]);
    const responses = await Promise.all([
      action({ request: request(bytes, { fileName: "masked.txt" }), context: env.ctx }),
      action({ request: request(bytes, { fileName: "masked.txt" }), context: env.ctx }),
    ]);
    expect(responses.map((item) => item.status)).toEqual([422, 422]);
    const recorded = env.recordSecurityEvent.mock.calls.map(([event]) => event);
    expect(recorded).toHaveLength(2);
    expect(recorded[0]?.uploadId).toMatch(/^attachment-v1:[0-9a-f]{64}$/u);
    expect(recorded[1]?.uploadId).toBe(recorded[0]?.uploadId);
    expect(env.createDraftAttachment).not.toHaveBeenCalled();
    expect(env.r2.put).not.toHaveBeenCalled();

    const otherOwner = setup({ owner: "different-user" });
    expect((await action({ request: request(bytes, { fileName: "masked.txt" }), context: otherOwner.ctx })).status).toBe(422);
    expect(otherOwner.recordSecurityEvent.mock.calls[0]?.[0].uploadId).not.toBe(recorded[0]?.uploadId);

    expect((await action({ request: request(bytes, { fileName: "other.txt" }), context: env.ctx })).status).toBe(422);
    expect(env.recordSecurityEvent.mock.calls[2]?.[0].uploadId).not.toBe(recorded[0]?.uploadId);
  });

  it("preserves a NUL filename anomaly as durable escaped evidence", async () => {
    const env = setup();
    const response = await action({
      request: request(new TextEncoder().encode("hello"), { fileName: "bad\0name.txt" }),
      context: env.ctx,
    });
    expect(response.status).toBe(422);
    expect(env.recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "bad\\u{0}name.txt",
      reason: "invalid-name",
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

  it("preserves an ambiguously committed private object and converges a stable-ID retry on it", async () => {
    const env = setup();
    let committed: ForumAttachmentMetadata | undefined;
    env.createDraftAttachment.mockImplementationOnce(async (input) => {
      committed = { ...input, createdAt: new Date().toISOString() };
      throw new ForumAttachmentStorageUnavailableError();
    });
    const response = await action({
      request: request(new TextEncoder().encode("hello")),
      context: env.ctx,
    });
    expect(response.status).toBe(503);
    expect(env.r2.put).toHaveBeenCalledOnce();
    expect(env.r2.delete).not.toHaveBeenCalled();
    expect(env.r2.objects.has(committed!.objectKey)).toBe(true);
    env.createDraftAttachment.mockResolvedValueOnce(committed!);
    const retried = await action({ request: request(new TextEncoder().encode("hello")), context: env.ctx });
    expect(retried.status).toBe(201);
    expect(env.r2.objects.size).toBe(1);
    expect(Array.from(env.r2.objects.get(committed!.objectKey) ?? [])).toEqual([104, 101, 108, 108, 111]);
    expect(env.r2.delete).toHaveBeenCalledOnce();
    expect(env.r2.delete).not.toHaveBeenCalledWith(committed!.objectKey);
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
