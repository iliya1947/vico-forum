// @vitest-environment jsdom
import { expect, it } from "vitest";
import { action as upload, loader as listDrafts } from "../../routes/attachment-upload";
import { loader as download } from "../../routes/attachment-download";
import { authSessionContext } from "../../auth/request-context";
import { authorizationContext } from "../../authorization/request-context";
import { createP1AttachmentFixture } from "./attachment-fixture";
import { P0_TOPIC_ID } from "../p0/fixture";
import { P0_ATTACHMENT_ID, P0_ATTACHMENT_NAME, P0_ATTACHMENT_PNG_BASE64, P0_ATTACHMENT_BYTE_SIZE } from "../p0/attachment-fixture";
import { createPreviewAttachmentUrls, type PreviewAttachmentAsset } from "../p0/attachment-urls";
import { publishedAttachmentReference } from "../../forum/attachment-url";

const operationId = "11111111-1111-4111-8111-111111111111";
const attachmentId = "22222222-2222-4222-8222-222222222222";
function request(origin = "http://localhost") {
  return new Request("http://localhost/api/attachments", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "text/plain",
      "X-Vico-Attachment-Id": attachmentId,
      "X-Vico-Attachment-Name": encodeURIComponent("notes.txt"),
      "X-Vico-Attachment-Size": "13",
      "X-Vico-Editor-Context": encodeURIComponent("topic:" + P0_TOPIC_ID + ":reply"),
      "X-Vico-Operation-Id": operationId,
    },
    body: "hello preview",
  });
}

it("routes real upload action through original admission, streaming validation and test bucket", async () => {
  const environment = createP1AttachmentFixture();
  try {
    const context = environment.createContext();
    const response = await upload({ request: request(), context });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      outcome: "stored",
      attachment: {
        id: attachmentId, fileName: "notes.txt", byteSize: 13,
        detectedType: "text", verificationStatus: "type-checked",
      },
    });
    const replay = await upload({ request: request(), context: environment.createContext() });
    expect(replay.status).toBe(201);
    expect(await replay.json()).toMatchObject({ attachment: { id: attachmentId } });

    const draftContext = "topic:" + P0_TOPIC_ID + ":reply";
    const downloadPath = "/api/attachments/file/" + attachmentId;
    const query = "?operation=" + operationId + "&context=" + encodeURIComponent(draftContext);
    const read = (suffix = "", customContext = environment.createContext()) => download({
      request: new Request("http://localhost" + downloadPath + query + suffix),
      params: { attachmentId },
      context: customContext,
    });
    const privateText = await read("&view=text");
    expect(privateText.status).toBe(200);
    expect(privateText.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(privateText.headers.get("Content-Disposition")).toBe("inline");
    expect(privateText.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(privateText.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(privateText.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await privateText.text()).toBe("hello preview");
    const privateDownload = await read();
    expect(privateDownload.status).toBe(200);
    expect(privateDownload.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(privateDownload.headers.get("Content-Disposition")).toContain("attachment;");
    expect(privateDownload.headers.get("Content-Disposition")).toContain("notes.txt");
    expect([...new Uint8Array(await privateDownload.arrayBuffer())])
      .toEqual([...new TextEncoder().encode("hello preview")]);

    // Wrong operation, context and user cannot reuse a known asset ID.
    const wrongContext = await download({
      request: new Request("http://localhost" + downloadPath
        + "?operation=" + operationId + "&context=topic%3Aother%3Areply"),
      params: { attachmentId },
      context: environment.createContext(),
    });
    expect(wrongContext.status).toBe(404);
    expect(wrongContext.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await wrongContext.text()).toBe("");
    const wrongOperation = await download({
      request: new Request("http://localhost" + downloadPath
        + "?operation=33333333-3333-4333-8333-333333333333"
        + "&context=" + encodeURIComponent(draftContext)),
      params: { attachmentId },
      context: environment.createContext(),
    });
    expect(wrongOperation.status).toBe(404);
    const guest = environment.createContext();
    guest.set(authSessionContext, null);
    expect((await read("", guest)).status).toBe(401);
    const foreign = environment.createContext();
    const session = foreign.get(authSessionContext);
    if (!session) throw new Error("P0 test actor session missing");
    foreign.set(authSessionContext, { ...session, user: { ...session.user, id: "other-actor" } });
    expect((await read("", foreign)).status).toBe(404);
    expect((await read("&view=inline")).status).toBe(404);
    expect((await read("&view=unrecognized")).status).toBe(400);

    const denied = await upload({
      request: request("https://foreign.example.invalid"), context: environment.createContext(),
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "origin" });
  } finally {
    environment.dispose();
  }
});

it("restores only the current owner/context/operation through the original draft-list loader", async () => {
  const environment = createP1AttachmentFixture();
  try {
    const editorContext = "topic:" + P0_TOPIC_ID + ":reply";
    const headers = new Headers({
      "X-Vico-Editor-Context": encodeURIComponent(editorContext),
      "X-Vico-Operation-Id": operationId,
    });
    const list = (requestHeaders = headers, context = environment.createContext()) =>
      listDrafts({
        request: new Request("http://localhost/api/attachments", {
          method: "GET", headers: requestHeaders,
        }),
        context,
      });
    const initial = await list();
    expect(initial.status).toBe(200);
    expect(await initial.json()).toEqual({ attachments: [] });
    expect((await upload({ request: request(), context: environment.createContext() })).status).toBe(201);
    const restored = await list();
    expect(restored.status).toBe(200);
    expect(restored.headers.get("Cache-Control")).toBe("no-store");
    expect(restored.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const payload = await restored.text();
    expect(JSON.parse(payload)).toEqual({
      attachments: [{
        id: attachmentId, fileName: "notes.txt", detectedType: "text",
        responseMime: "text/plain; charset=utf-8", byteSize: 13,
        verificationStatus: "type-checked",
      }],
    });
    expect(payload).not.toContain("private/");
    expect(payload).not.toContain("objectKey");
    expect(payload).not.toContain(operationId);
    expect(payload).not.toContain(editorContext);
    expect(await (await list()).json()).toEqual(JSON.parse(payload));

    const otherOperation = new Headers(headers);
    otherOperation.set("X-Vico-Operation-Id", "33333333-3333-4333-8333-333333333333");
    const separate = await list(otherOperation);
    expect(separate.status).toBe(200);
    expect(await separate.json()).toEqual({ attachments: [] });

    const otherContext = new Headers(headers);
    otherContext.set("X-Vico-Editor-Context", encodeURIComponent("topic:other:reply"));
    const unavailable = await list(otherContext);
    expect(unavailable.status).toBe(404);
    expect(await unavailable.json()).toEqual({ error: "notFound" });

    const invalid = new Headers(headers);
    invalid.set("X-Vico-Operation-Id", "not-a-uuid");
    const badOperation = await list(invalid);
    expect(badOperation.status).toBe(400);
    expect(await badOperation.json()).toEqual({ error: "invalid" });

    const guest = environment.createContext();
    guest.set(authSessionContext, null);
    const rejected = await list(headers, guest);
    expect(rejected.status).toBe(401);
    expect(await rejected.json()).toEqual({ error: "unauthenticated" });

    // Permit a second synthetic account to pass the original permission gate,
    // then verify that the store still filters out the first account's selection.
    const foreign = environment.createContext();
    const session = foreign.get(authSessionContext);
    if (!session) throw new Error("P0 test actor session missing");
    foreign.set(authSessionContext, { ...session, user: { ...session.user, id: "other-actor" } });
    foreign.set(authorizationContext, {
      forUser: () => ({ has: async () => true }),
    } as never);
    const foreignResult = await list(headers, foreign);
    expect(foreignResult.status).toBe(200);
    expect(await foreignResult.json()).toEqual({ attachments: [] });
  } finally {
    environment.dispose();
  }
});

it("publishes baseline image bytes through the original public loader and shared native URL seam", async () => {
  const bytes = Uint8Array.from(atob(P0_ATTACHMENT_PNG_BASE64), (character) => character.charCodeAt(0));
  expect(bytes.byteLength).toBe(P0_ATTACHMENT_BYTE_SIZE);
  const postId = "p0-first-post";
  const reference = publishedAttachmentReference(postId, P0_ATTACHMENT_ID);
  const assets: PreviewAttachmentAsset[] = [{
    reference, fileName: P0_ATTACHMENT_NAME, detectedType: "png", bytes,
  }];
  const environment = createP1AttachmentFixture(assets);
  const created: Blob[] = [];
  const revoked: string[] = [];
  const attachmentUrls = createPreviewAttachmentUrls(assets, {
    createObjectURL(blob) {
      if (!(blob instanceof Blob)) throw new Error("Preview attachment must be a Blob");
      created.push(blob);
      return "blob:preview-public-" + created.length;
    },
    revokeObjectURL(url) { revoked.push(url); },
  });
  try {
    const publicRequest = (postId: string, suffix = "", context = environment.createContext()) =>
      download({
        request: new Request("http://localhost/api/attachments/file/" + P0_ATTACHMENT_ID
          + "?post=" + encodeURIComponent(postId) + suffix),
        params: { attachmentId: P0_ATTACHMENT_ID },
        context,
      });
    const guest = environment.createContext();
    guest.set(authSessionContext, null);
    const downloadResult = await publicRequest(postId, "", guest);
    expect(downloadResult.status).toBe(200);
    expect(downloadResult.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(downloadResult.headers.get("Content-Disposition")).toContain(P0_ATTACHMENT_NAME);
    expect(downloadResult.headers.get("Cache-Control")).toBe("private, no-store");
    expect(downloadResult.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect([...new Uint8Array(await downloadResult.arrayBuffer())]).toEqual([...bytes]);

    const inlineResult = await publicRequest(postId, "&view=inline");
    expect(inlineResult.status).toBe(200);
    expect(inlineResult.headers.get("Content-Type")).toBe("image/png");
    expect(inlineResult.headers.get("Content-Disposition")).toBe("inline");
    expect([...new Uint8Array(await inlineResult.arrayBuffer())]).toEqual([...bytes]);
    expect((await publicRequest(postId, "&view=text")).status).toBe(404);
    const otherPost = await publicRequest("p0-other-post");
    expect(otherPost.status).toBe(404);
    expect(otherPost.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await otherPost.text()).toBe("");

    expect(attachmentUrls.resolve(reference, "inline")).toBe("blob:preview-public-1");
    expect(attachmentUrls.resolve(reference, "inline")).toBe("blob:preview-public-1");
    expect(attachmentUrls.resolve(reference, "download")).toBe("blob:preview-public-2");
    expect(created.map(blob => blob.type)).toEqual(["image/png", "application/octet-stream"]);
    async function readBlob(blob: Blob): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    }
    expect([...await readBlob(created[0])]).toEqual([...bytes]);
    expect([...await readBlob(created[1])]).toEqual([...bytes]);
  } finally {
    attachmentUrls.dispose();
    environment.dispose();
  }
  expect(revoked).toEqual(["blob:preview-public-1", "blob:preview-public-2"]);
});
