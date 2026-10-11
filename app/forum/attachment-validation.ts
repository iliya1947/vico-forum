/**
 * Synchronous, server-side type gate for private attachment ingestion.
 *
 * This is NOT an antivirus scanner or an archive-content validator. The
 * caller must keep every object private until this gate (and any configured
 * future mandatory scanner) has succeeded.
 */
export const DEFAULT_ATTACHMENT_MAX_BYTES = 50_000_000;
export const ATTACHMENT_SNIFF_BYTES = 4096;

export type AttachmentDetection = "png" | "jpeg" | "gif" | "webp" | "pdf"
  | "zip" | "7z" | "gzip" | "tar" | "ole" | "text" | "executable" | "unknown";
export type AttachmentRejection = "empty" | "too-large" | "invalid-name"
  | "forbidden-extension" | "forbidden-mime" | "executable-signature"
  | "unsupported-extension" | "signature-mismatch" | "mime-mismatch"
  | "binary-content" | "insufficient-evidence";

export type AttachmentInspection =
  | { accepted: true; fileName: string; detected: AttachmentDetection;
      responseMime: string; suspicious: false; scanStatus: "type-checked" }
  | { accepted: false; fileName: string; detected: AttachmentDetection;
      reason: AttachmentRejection; suspicious: boolean; scanStatus: "rejected" };

export interface AttachmentCandidate {
  fileName: string;
  declaredMime: string;
  size: number;
  /** Prefix read from the actual object, not client-provided metadata. */
  prefix: Uint8Array;
  maxBytes?: number;
}

type BinaryDetection = Exclude<AttachmentDetection, "text" | "unknown" | "executable">;
const binaryExtensions: Readonly<Record<string, BinaryDetection>> = {
  png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp",
  pdf: "pdf", zip: "zip", "7z": "7z", gz: "gzip", tgz: "gzip",
  tar: "tar", doc: "ole", xls: "ole", ppt: "ole",
  docx: "zip", xlsx: "zip", pptx: "zip", odt: "zip", ods: "zip",
};
const binaryMime: Readonly<Record<BinaryDetection, string>> = {
  png: "image/png", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf", zip: "application/zip", "7z": "application/x-7z-compressed",
  gzip: "application/gzip", tar: "application/x-tar", ole: "application/octet-stream",
};
const forbiddenExtensions = new Set([
  "exe", "dll", "msi", "msp", "msix", "scr", "com", "pif", "cpl", "sys",
  "ocx", "app", "dmg", "apk", "jar", "class", "wasm", "vbs", "vbe", "wsf",
]);
const forbiddenMimes = new Set([
  "application/x-msdownload", "application/x-dosexec",
  "application/x-ms-installer", "application/vnd.microsoft.portable-executable",
  "application/x-executable", "application/x-mach-binary", "application/wasm",
]);

function has(bytes: Uint8Array, position: number, signature: readonly number[]): boolean {
  return position + signature.length <= bytes.length
    && signature.every((byte, index) => bytes[position + index] === byte);
}
function ascii(bytes: Uint8Array, at: number, text: string): boolean {
  return [...text].every((value, index) => bytes[at + index] === value.charCodeAt(0));
}
export function detectAttachmentContent(bytes: Uint8Array): AttachmentDetection {
  if (has(bytes, 0, [0x4d, 0x5a]) || has(bytes, 0, [0x7f, 0x45, 0x4c, 0x46])
    || [[0xfe, 0xed, 0xfa, 0xce], [0xce, 0xfa, 0xed, 0xfe],
      [0xfe, 0xed, 0xfa, 0xcf], [0xcf, 0xfa, 0xed, 0xfe],
      [0xca, 0xfe, 0xba, 0xbe]].some((sig) => has(bytes, 0, sig))) return "executable";
  if (has(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (has(bytes, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a")) return "gif";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "webp";
  if (ascii(bytes, 0, "%PDF-")) return "pdf";
  if (has(bytes, 0, [0x50, 0x4b, 0x03, 0x04])
    || has(bytes, 0, [0x50, 0x4b, 0x05, 0x06])
    || has(bytes, 0, [0x50, 0x4b, 0x07, 0x08])) return "zip";
  if (has(bytes, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "7z";
  if (has(bytes, 0, [0x1f, 0x8b])) return "gzip";
  if (ascii(bytes, 257, "ustar")) return "tar";
  if (has(bytes, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole";
  if (bytes.length === 0) return "unknown";
  for (const byte of bytes) {
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) return "unknown";
  }
  // Check a complete UTF-8 prefix; the last few bytes may bisect a code point.
  const end = bytes.length === ATTACHMENT_SNIFF_BYTES ? bytes.length - 4 : bytes.length;
  try { new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, end)); }
  catch { return "unknown"; }
  return "text";
}

function expectedDeclaredFormat(mime: string): AttachmentDetection | null {
  const map: Readonly<Record<string, AttachmentDetection>> = {
    "image/png": "png", "image/jpeg": "jpeg", "image/jpg": "jpeg",
    "image/gif": "gif", "image/webp": "webp", "application/pdf": "pdf",
    "application/zip": "zip", "application/x-zip-compressed": "zip",
    "application/x-7z-compressed": "7z", "application/gzip": "gzip",
    "application/x-gzip": "gzip", "application/x-tar": "tar",
    "application/msword": "ole", "application/vnd.ms-excel": "ole",
    "application/vnd.ms-powerpoint": "ole",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "zip",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "zip",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "zip",
    "application/vnd.oasis.opendocument.text": "zip",
    "application/vnd.oasis.opendocument.spreadsheet": "zip",
    "text/plain": "text", "text/html": "text", "text/css": "text",
    "text/csv": "text", "text/xml": "text", "image/svg+xml": "text",
    "application/json": "text", "application/xml": "text",
    "application/javascript": "text", "text/javascript": "text",
  };
  return map[mime] ?? (mime.startsWith("text/") ? "text" : null);
}

export function inspectAttachment(candidate: AttachmentCandidate): AttachmentInspection {
  const hasPath = /[/\\]/u.test(candidate.fileName);
  const name = candidate.fileName.split(/[/\\]/u).pop()?.trim() ?? "";
  const extension = name.toLowerCase().split(".").pop() ?? "";
  const mime = candidate.declaredMime.split(";")[0]!.trim().toLowerCase();
  const detected = detectAttachmentContent(candidate.prefix);
  const reject = (reason: AttachmentRejection, suspicious = true): AttachmentInspection =>
    ({ accepted: false, fileName: name, detected, reason, suspicious, scanStatus: "rejected" });
  const maxBytes = candidate.maxBytes ?? DEFAULT_ATTACHMENT_MAX_BYTES;
  if (hasPath) return reject("invalid-name");
  if (!name || name === "." || name === ".." || name.length > 255
    || [...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return reject("invalid-name");
  if (!Number.isSafeInteger(candidate.size) || candidate.size <= 0) return reject("empty", false);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || candidate.size > maxBytes) return reject("too-large", false);
  if (candidate.prefix.length < Math.min(candidate.size, ATTACHMENT_SNIFF_BYTES)) return reject("insufficient-evidence", false);
  if (forbiddenExtensions.has(extension)) return reject("forbidden-extension");
  if (forbiddenMimes.has(mime)) return reject("forbidden-mime");
  if (detected === "executable") return reject("executable-signature");
  const binaryExpected = binaryExtensions[extension];
  // Text/source/config formats are intentionally not extension-allowlisted:
  // any non-forbidden name may pass when the actual sampled content is valid text.
  // Recognized binary formats still require their matching extension/signature pair.
  if (binaryExpected ? detected !== binaryExpected : detected !== "text") {
    return reject(detected === "unknown" && !binaryExpected ? "binary-content" : "signature-mismatch");
  }
  const mimeExpected = expectedDeclaredFormat(mime);
  if (mimeExpected && mimeExpected !== detected) return reject("mime-mismatch");
  return {
    accepted: true, fileName: name, detected, scanStatus: "type-checked", suspicious: false,
    // Never render uploaded HTML/SVG/scripts in the forum's origin.
    responseMime: detected === "text" ? "text/plain; charset=utf-8" : binaryMime[binaryExpected!],
  };
}
