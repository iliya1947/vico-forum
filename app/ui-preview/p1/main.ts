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
// Keep the active fixture and native Blob URL registry in one generation. Reset
// replaces both, while the old generation remains alive until its view URLs
// have been replaced and their image loads have completed.
const liveGenerations = new Set<{
  fixture: ReturnType<typeof createP1AttachmentFixture>;
  urls: ReturnType<typeof createPreviewAttachmentUrls>;
}>();
const revokedUrls = new Set<string>();
const urlApi = {
  createObjectURL: (blob: Blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url: string) => {
    URL.revokeObjectURL(url);
    revokedUrls.add(url);
  },
};
function createGeneration() {
  const state = {
    fixture: createP1AttachmentFixture(publishedAssets),
    urls: createPreviewAttachmentUrls(publishedAssets, urlApi),
  };
  liveGenerations.add(state);
  return state;
}
function releaseGeneration(state: ReturnType<typeof createGeneration>) {
  if (!liveGenerations.delete(state)) return;
  state.urls.dispose();
  state.fixture.dispose();
}
let generation = createGeneration();
const transport = installPreviewResourceTransport({
  manifest: routeManifest,
  createContext: () => generation.fixture.createContext(),
});
function dispose() {
  transport.dispose();
  for (const state of [...liveGenerations]) releaseGeneration(state);
  window.removeEventListener("pagehide", dispose);
  mount.dataset.cleanup = "complete";
  mount.dataset.revokedUrls = String(revokedUrls.size);
  mount.dataset.liveGenerations = String(liveGenerations.size);
}
window.addEventListener("pagehide", dispose);
// Framework imports can capture fetch once. Keep that function usable across reset.
const moduleCapturedFetch = window.fetch;

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
  // Restore the just-uploaded selection through the original attachment list loader.
  const draftHeaders = new Headers({
    "X-Vico-Editor-Context": encodeURIComponent("topic:" + P0_TOPIC_ID + ":reply"),
    "X-Vico-Operation-Id": operationId,
  });
  const listDrafts = (headers: Headers) => fetch(new URL("/api/attachments", window.location.origin), {
    method: "GET", headers,
  });
  const selected = await listDrafts(draftHeaders);
  const selectedText = await selected.text();
  const selectedJson = JSON.parse(selectedText) as {
    attachments?: Array<{
      id?: string; fileName?: string; detectedType?: string; responseMime?: string;
      byteSize?: number; verificationStatus?: string;
    }>;
  };
  if (selected.status !== 200
    || selected.headers.get("Cache-Control") !== "no-store"
    || selected.headers.get("X-Content-Type-Options") !== "nosniff"
    || selectedJson.attachments?.length !== 1
    || selectedJson.attachments[0].id !== attachmentId
    || selectedJson.attachments[0].fileName !== file.name
    || selectedJson.attachments[0].detectedType !== "text"
    || selectedJson.attachments[0].responseMime !== "text/plain; charset=utf-8"
    || selectedJson.attachments[0].byteSize !== file.size
    || selectedJson.attachments[0].verificationStatus !== "type-checked"
    || selectedText.includes("objectKey") || selectedText.includes("private/")) {
    throw new Error("P1 draft attachment list mismatch: " + selectedText);
  }
  const otherOperationHeaders = new Headers(draftHeaders);
  otherOperationHeaders.set("X-Vico-Operation-Id", crypto.randomUUID());
  const otherOperation = await listDrafts(otherOperationHeaders);
  if (otherOperation.status !== 200
    || JSON.stringify(await otherOperation.json()) !== '{"attachments":[]}') {
    throw new Error("P1 draft list leaked into another operation");
  }
  const otherContextHeaders = new Headers(draftHeaders);
  otherContextHeaders.set("X-Vico-Editor-Context", encodeURIComponent("topic:other:reply"));
  const otherContext = await listDrafts(otherContextHeaders);
  if (otherContext.status !== 404
    || (await otherContext.json() as { error?: string }).error !== "notFound") {
    throw new Error("P1 draft list accepted a nonexistent editor context");
  }
  const invalidOperationHeaders = new Headers(draftHeaders);
  invalidOperationHeaders.set("X-Vico-Operation-Id", "not-a-uuid");
  const badOperation = await listDrafts(invalidOperationHeaders);
  if (badOperation.status !== 400
    || (await badOperation.json() as { error?: string }).error !== "invalid") {
    throw new Error("P1 draft list accepted invalid operation");
  }
  console.info("P1_ATTACHMENT_DRAFT_LIST_200", selected.status,
    otherOperation.status, otherContext.status, badOperation.status);
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
  const nativeInline = generation.urls.resolve(publishedReference, "inline");
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("P1 published native Blob image failed"));
    image.src = nativeInline;
  });
  if (image.naturalWidth !== 2 || image.naturalHeight !== 2) {
    throw new Error("P1 published native Blob image dimensions differ");
  }
  const nativeDownload = generation.urls.resolve(publishedReference, "download");
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
  const cancelHeaders = new Headers(draftHeaders);
  const cancelResponse = await fetch(new URL("/api/attachments", window.location.origin), {
    method: "DELETE", headers: cancelHeaders,
  });
  if (cancelResponse.status !== 200
    || cancelResponse.headers.get("Cache-Control") !== "no-store"
    || (await cancelResponse.json() as { outcome?: string }).outcome !== "cancelled") {
    throw new Error("P1 original attachment cancel failed");
  }
  const cancelledAgain = await fetch(new URL("/api/attachments", window.location.origin), {
    method: "DELETE", headers: cancelHeaders,
  });
  if (cancelledAgain.status !== 200
    || (await cancelledAgain.json() as { outcome?: string }).outcome !== "cancelled") {
    throw new Error("P1 attachment cancel is not idempotent");
  }
  const retiredList = await listDrafts(draftHeaders);
  if (retiredList.status !== 410
    || (await retiredList.json() as { error?: string }).error !== "gone") {
    throw new Error("P1 cancelled attachment operation was not retired");
  }
  draftDownloadUrl.searchParams.set("context", "topic:" + P0_TOPIC_ID + ":reply");
  const retiredDownload = await fetch(draftDownloadUrl);
  if (retiredDownload.status !== 404
    || retiredDownload.headers.get("Cache-Control") !== "private, no-store") {
    throw new Error("P1 cancelled attachment is still readable");
  }
  const nextOperationHeaders = new Headers(draftHeaders);
  nextOperationHeaders.set("X-Vico-Operation-Id", crypto.randomUUID());
  const nextOperationList = await listDrafts(nextOperationHeaders);
  if (nextOperationList.status !== 200
    || JSON.stringify(await nextOperationList.json()) !== '{"attachments":[]}') {
    throw new Error("P1 cancel affected an independent operation");
  }
  console.info("P1_ATTACHMENT_CANCEL_200", cancelResponse.status,
    cancelledAgain.status, retiredList.status, retiredDownload.status,
    nextOperationList.status);
  // Reuse the same imported product handlers and installed transport with fresh
  // request-scoped attachment state; the cancelled operation must not bleed into it.
  const retiring = generation;
  const replacement = createGeneration();
  const installedXhr = window.XMLHttpRequest;
  transport.reset(routes, modules, replacement.fixture.createContext);
  generation = replacement;
  if (window.fetch !== moduleCapturedFetch || window.XMLHttpRequest !== installedXhr) {
    throw new Error("P1 reset replaced module-captured transport functions");
  }
  const afterReset = await moduleCapturedFetch(new URL("/api/attachments", window.location.origin), {
    method: "GET", headers: draftHeaders,
  });
  if (afterReset.status !== 200
    || JSON.stringify(await afterReset.json()) !== '{"attachments":[]}') {
    throw new Error("P1 reset reused retired attachment state");
  }
  const baselineAfterReset = await moduleCapturedFetch(new URL(
    "/api/attachments/file/" + P0_ATTACHMENT_ID + "?post=" + publishedPostId,
    window.location.origin,
  ));
  if (baselineAfterReset.status !== 200
    || (await baselineAfterReset.arrayBuffer()).byteLength !== publishedBytes.byteLength) {
    throw new Error("P1 reset failed to use fresh published asset fixture");
  }
  console.info("P1_RESET_RETAINED_FETCH_200", afterReset.status, baselineAfterReset.status);
  // Finish any old image display and install the new generation's usable
  // download href BEFORE revoking the old object URLs.
  const nextInline = generation.urls.resolve(publishedReference, "inline");
  const nextDownload = generation.urls.resolve(publishedReference, "download");
  if (nextInline === nativeInline || nextDownload === nativeDownload) {
    throw new Error("P1 reset reused an old generation Blob URL");
  }
  const nextImage = new Image();
  await new Promise<void>((resolve, reject) => {
    nextImage.onload = () => resolve();
    nextImage.onerror = () => reject(new Error("P1 replacement Blob image failed"));
    nextImage.src = nextInline;
  });
  if (nextImage.naturalWidth !== 2 || nextImage.naturalHeight !== 2) {
    throw new Error("P1 replacement Blob image dimensions mismatch");
  }
  downloadLink.href = nextDownload;
  image.removeAttribute("src");
  nextImage.removeAttribute("src");
  releaseGeneration(retiring);
  if (!revokedUrls.has(nativeInline) || !revokedUrls.has(nativeDownload)
    || revokedUrls.has(nextInline) || revokedUrls.has(nextDownload)
    || liveGenerations.size !== 1) {
    throw new Error("P1 reset did not retire only the previous Blob/fixture generation");
  }
  console.info("P1_ATTACHMENT_RESET_RESOURCE_LIFECYCLE",
    revokedUrls.size, liveGenerations.size);
  if (modules.size !== routeIds.length) {
    throw new Error("P1 import registry is missing modules");
  }
  mount.dataset.status = "complete";
  mount.dataset.routes = String(modules.size);
  mount.textContent = "Imported original modules: " + modules.size;
  mount.appendChild(downloadLink);
  console.info("P1_ALL_MODULES_IMPORTED", modules.size);
})().catch((error: unknown) => {
  dispose();
  mount.dataset.status = "failed";
  mount.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("P1_IMPORT_FAILURE", error);
});
