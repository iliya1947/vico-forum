import { createP1AttachmentFixture } from "./attachment-fixture";
import { P0_TOPIC_ID } from "../p0/fixture";
import { P0_ATTACHMENT_ID, P0_ATTACHMENT_NAME, P0_ATTACHMENT_PNG_BASE64 } from "../p0/attachment-fixture";
import { createPreviewAttachmentUrls, type PreviewAttachmentAsset } from "../p0/attachment-urls";
import { publishedAttachmentReference } from "../../forum/attachment-url";
import { importRoute, routeManifest } from "virtual:vico-ui-preview-routes";
import { createPreviewDataRoutes } from "../p0/route-adapter";
import { installPreviewResourceTransport } from "../p0/resource-transport";

/**
 * Isolated P1 import proof, not the published preview and not a second UI.
 * Import every real route module after installing the fail-closed transport.
 */
const mount = document.getElementById("root");
if (!mount) throw new Error("P1 import diagnostic root is missing");

function ids(route: typeof routeManifest): string[] {
  return [route.id, ...(route.children ?? []).flatMap(ids)];
}

const routeIds = ids(routeManifest);
const publishedPostId = "p0-first-post";
const publishedReference = publishedAttachmentReference(publishedPostId, P0_ATTACHMENT_ID);
const publishedBytes = Uint8Array.from(atob(P0_ATTACHMENT_PNG_BASE64), (char) => char.charCodeAt(0));
const publishedAssets: PreviewAttachmentAsset[] = [{
  reference: publishedReference, fileName: P0_ATTACHMENT_NAME, detectedType: "png",
  bytes: publishedBytes,
}];
const attachmentFixture = createP1AttachmentFixture(publishedAssets);
const attachmentUrls = createPreviewAttachmentUrls(publishedAssets);
const transport = installPreviewResourceTransport({
  manifest: routeManifest,
  createContext: attachmentFixture.createContext,
});

void (async () => {
  const modules = new Map<string, Record<string, unknown>>();
  for (const id of routeIds) {
    try {
      modules.set(id, await importRoute(id));
    } catch (error) {
      throw new Error(
        "P1 route module import failed for " + id + ": " +
        (error instanceof Error ? error.message : String(error)),
        { cause: error },
      );
    }
    console.info("P1_MODULE_IMPORTED", id);
  }
  const routes = createPreviewDataRoutes(routeManifest, modules);
  transport.configure(routes, modules);
  // Real catch-all module: prove HTTP interception with no Pages/backend fetch.
  const unknownApi = await fetch(new URL("/api/vico-preview-resource-probe", window.location.origin));
  if (unknownApi.status !== 404) {
    throw new Error("P1 resource dispatch returned unexpected HTTP " + unknownApi.status);
  }
  console.info("P1_RESOURCE_DISPATCH_404", unknownApi.status);
  // Browser-native File/XHR, using the real generated API catch-all action.
  // A 404 is expected; any native Pages request is forbidden by Chromium smoke.
  const uploaded = new File(["preview upload"], "notes.txt", { type: "text/plain" });
  const xhr = await new Promise<{ status: number; progress: number; text: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let progress = 0;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) progress = event.loaded;
    };
    request.onload = () => resolve({
      status: request.status, progress, text: request.responseText,
    });
    request.onerror = () => reject(new Error("P1 XHR/File local dispatch failed"));
    request.open("POST", "/api/vico-preview-xhr-upload-probe");
    request.responseType = "text";
    request.setRequestHeader("Content-Type", uploaded.type);
    request.send(uploaded);
  });
  if (xhr.status !== 404 || xhr.text !== "Not Found" || xhr.progress !== uploaded.size) {
    throw new Error("P1 XHR/File request contract mismatch: " + JSON.stringify(xhr));
  }
  console.info("P1_XHR_FILE_DISPATCH_404", xhr.status, xhr.progress);
  // Use the real upload route, authorization checks, streaming validation and test bucket.
  const attachmentId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const file = new File(["hello preview"], "notes.txt", { type: "text/plain" });
  const uploadedAttachment = await new Promise<{ status: number; text: string; progress: number }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let progress = 0;
    request.upload.onprogress = (event) => { if (event.lengthComputable) progress = event.loaded; };
    request.onload = () => resolve({
      status: request.status, text: request.responseText, progress,
    });
    request.onerror = () => reject(new Error("P1 real attachment upload route failed"));
    request.open("POST", "/api/attachments");
    request.responseType = "text";
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-Vico-Attachment-Id", attachmentId);
    request.setRequestHeader("X-Vico-Attachment-Name", encodeURIComponent(file.name));
    request.setRequestHeader("X-Vico-Attachment-Size", String(file.size));
    request.setRequestHeader("X-Vico-Editor-Context", encodeURIComponent("topic:" + P0_TOPIC_ID + ":reply"));
    request.setRequestHeader("X-Vico-Operation-Id", operationId);
    request.send(file);
  });
  const stored = JSON.parse(uploadedAttachment.text) as {
    outcome?: string; attachment?: { id?: string; byteSize?: number; verificationStatus?: string };
  };
  if (uploadedAttachment.status !== 201 || stored.outcome !== "stored"
    || stored.attachment?.id !== attachmentId
    || stored.attachment.byteSize !== file.size
    || stored.attachment.verificationStatus !== "type-checked"
    || uploadedAttachment.progress !== file.size) {
    throw new Error("P1 real attachment upload mismatch: " + JSON.stringify(uploadedAttachment));
  }
  console.info("P1_ATTACHMENT_UPLOAD_201", uploadedAttachment.status, uploadedAttachment.progress);
  // The exact uploaded bytes are read through the original private attachment loader.
  const draftDownloadUrl = new URL("/api/attachments/file/" + attachmentId, window.location.origin);
  draftDownloadUrl.searchParams.set("operation", operationId);
  draftDownloadUrl.searchParams.set("context", "topic:" + P0_TOPIC_ID + ":reply");
  draftDownloadUrl.searchParams.set("view", "text");
  const textResponse = await fetch(draftDownloadUrl);
  const textBody = await textResponse.text();
  if (textResponse.status !== 200
    || textBody !== await file.text()
    || textResponse.headers.get("Content-Type") !== "text/plain; charset=utf-8"
    || textResponse.headers.get("Cache-Control") !== "private, no-store"
    || textResponse.headers.get("Content-Disposition") !== "inline"
    || textResponse.headers.get("Content-Security-Policy") !== "sandbox") {
    throw new Error("P1 private attachment text view mismatch: " +
      JSON.stringify({ status: textResponse.status, textBody }));
  }

  draftDownloadUrl.searchParams.delete("view");
  const downloadResponse = await fetch(draftDownloadUrl);
  const downloaded = new Uint8Array(await downloadResponse.arrayBuffer());
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  if (downloadResponse.status !== 200
    || downloadResponse.headers.get("Content-Type") !== "application/octet-stream"
    || !downloadResponse.headers.get("Content-Disposition")?.includes("attachment;")
    || !downloadResponse.headers.get("Content-Disposition")?.includes(file.name)
    || downloaded.length !== file.size
    || downloaded.some((byte, i) => byte !== originalBytes[i])) {
    throw new Error("P1 private attachment download mismatch");
  }
  draftDownloadUrl.searchParams.set("context", "topic:other:reply");
  const wrongContextResponse = await fetch(draftDownloadUrl);
  if (wrongContextResponse.status !== 404
    || wrongContextResponse.headers.get("Cache-Control") !== "private, no-store") {
    throw new Error("P1 private attachment wrong-context disclosure");
  }
  console.info("P1_ATTACHMENT_PRIVATE_READ_200", downloadResponse.status,
    wrongContextResponse.status);
  // The same P0 published reference is readable through the original public
  // attachment loader and the shared native Blob presentation seam.
  const publicUrl = new URL("/api/attachments/file/" + P0_ATTACHMENT_ID, window.location.origin);
  publicUrl.searchParams.set("post", publishedPostId);
  const publicFile = await fetch(publicUrl);
  const fileBytes = new Uint8Array(await publicFile.arrayBuffer());
  if (publicFile.status !== 200
    || publicFile.headers.get("Content-Type") !== "application/octet-stream"
    || !publicFile.headers.get("Content-Disposition")?.includes(P0_ATTACHMENT_NAME)
    || fileBytes.length !== publishedBytes.length
    || fileBytes.some((byte, index) => byte !== publishedBytes[index])) {
    throw new Error("P1 published attachment HTTP download mismatch");
  }
  publicUrl.searchParams.set("view", "inline");
  const inlineFile = await fetch(publicUrl);
  const inlineBytes = new Uint8Array(await inlineFile.arrayBuffer());
  if (inlineFile.status !== 200
    || inlineFile.headers.get("Content-Type") !== "image/png"
    || inlineFile.headers.get("Content-Disposition") !== "inline"
    || inlineBytes.length !== publishedBytes.length
    || inlineBytes.some((byte, index) => byte !== publishedBytes[index])) {
    throw new Error("P1 published attachment HTTP inline mismatch");
  }
  publicUrl.searchParams.set("post", "p0-other-post");
  const foreignPost = await fetch(publicUrl);
  if (foreignPost.status !== 404 || foreignPost.headers.get("Cache-Control") !== "private, no-store") {
    throw new Error("P1 published attachment leaked to unreferenced post");
  }
  const nativeInline = attachmentUrls.resolve(publishedReference, "inline");
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("P1 published native Blob image failed"));
    image.src = nativeInline;
  });
  if (image.naturalWidth !== 2 || image.naturalHeight !== 2) {
    throw new Error("P1 published native Blob image dimensions differ");
  }
  const nativeDownload = attachmentUrls.resolve(publishedReference, "download");
  if (!nativeDownload.startsWith("blob:") || nativeDownload === nativeInline) {
    throw new Error("P1 published native Blob download URL mismatch");
  }
  const downloadLink = document.createElement("a");
  downloadLink.id = "p1-published-download";
  downloadLink.href = nativeDownload;
  downloadLink.download = P0_ATTACHMENT_NAME;
  downloadLink.textContent = "P1 published attachment download proof";
  console.info("P1_ATTACHMENT_PUBLISHED_READ_200", publicFile.status, inlineFile.status,
    foreignPost.status, image.naturalWidth, image.naturalHeight);
  if (modules.size !== routeIds.length) {
    throw new Error("P1 import registry is missing modules");
  }
  mount.dataset.status = "complete";
  mount.dataset.routes = String(modules.size);
  mount.textContent = "Imported original modules: " + modules.size;
  mount.appendChild(downloadLink);
  console.info("P1_ALL_MODULES_IMPORTED", modules.size);
})().catch((error: unknown) => {
  transport.dispose();
  attachmentUrls.dispose();
  attachmentFixture.dispose();
  mount.dataset.status = "failed";
  mount.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("P1_IMPORT_FAILURE", error);
});
