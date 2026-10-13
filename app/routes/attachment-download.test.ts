import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../forum/attachment-request-context";
import type { ForumAttachmentMetadata } from "../../db/forum-attachments";
import { loader } from "./attachment-download";
import routes from "../routes";

const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";
const postId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const draftId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const metadata: ForumAttachmentMetadata = {
  id: attachmentId, objectKey: "private/03b93562-0550-4eef-88af-f951d6ea6138",
  fileName: 'unsafe"файл.svg', declaredMime: "image/svg+xml",
  detectedType: "svg", responseMime: "image/svg+xml",
  byteSize: 4, verificationStatus: "type-checked", createdAt: new Date().toISOString(),
};

function setup(owner: string | null = null, available = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, owner ? { user: { id: owner } } as AuthSession : null);
  const readPublishedAttachment = vi.fn(async () => metadata as ForumAttachmentMetadata | null);
  const readDraftAttachment = vi.fn(async () => metadata as ForumAttachmentMetadata | null);
  context.set(forumAttachmentStoreContext, { readPublishedAttachment, readDraftAttachment } as never);
  const get = vi.fn(async () => ({
    size: 4,
    body: new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array([1, 2, 3, 4])); controller.close(); },
    }),
  }));
  if (available) context.set(privateAttachmentBucketContext, { get } as never);
  return { context, get, readPublishedAttachment, readDraftAttachment };
}

function run(context: RouterContextProvider, url: string) {
  return loader({
    context, params: { attachmentId },
    request: new Request("https://forum.test" + url),
  });
}

describe("controlled attachment read", () => {
  it("has a registered route and streams only referenced public post bytes, with safe download headers", async () => {
    expect(JSON.stringify(routes)).toContain("attachment-download.ts");
    const { context, get, readPublishedAttachment } = setup();
    const response = await run(context, `/api/attachments/file/${attachmentId}?post=${postId}`);
    expect(response.status).toBe(200);
    expect(readPublishedAttachment).toHaveBeenCalledWith(postId, attachmentId);
    expect(get).toHaveBeenCalledWith(metadata.objectKey, { range: { offset: 0, length: 4 } });
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(response.headers.get("Content-Disposition")).toContain("filename*=UTF-8''");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3, 4]);
    expect(response.headers.get("Content-Disposition")).not.toContain(metadata.objectKey);
  });

  it("requires the account owner for draft access and never reads storage before authorization", async () => {
    const guest = setup();
    expect((await run(guest.context, `/api/attachments/file/${attachmentId}?draft=${draftId}&context=help%3Anew`)).status).toBe(401);
    expect(guest.get).not.toHaveBeenCalled();
    const owner = setup("alice");
    expect((await run(owner.context, `/api/attachments/file/${attachmentId}?draft=${draftId}&context=help%3Anew`)).status).toBe(200);
    expect(owner.readDraftAttachment).toHaveBeenCalledWith("alice", "help:new", draftId, attachmentId);
  });

  it("returns not-found for revoked references and unavailable for missing storage, without success-shaped bytes", async () => {
    const denied = setup();
    denied.readPublishedAttachment.mockResolvedValueOnce(null);
    expect((await run(denied.context, `/api/attachments/file/${attachmentId}?post=${postId}`)).status).toBe(404);
    expect(denied.get).not.toHaveBeenCalled();

    const missing = setup(null, false);
    expect((await run(missing.context, `/api/attachments/file/${attachmentId}?post=${postId}`)).status).toBe(503);
    const absent = setup();
    absent.get.mockResolvedValueOnce(null as never);
    expect((await run(absent.context, `/api/attachments/file/${attachmentId}?post=${postId}`)).status).toBe(503);
  });
});
