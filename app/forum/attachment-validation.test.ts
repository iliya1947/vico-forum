import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_SNIFF_BYTES,
  DEFAULT_ATTACHMENT_MAX_BYTES,
  detectAttachmentContent,
  inspectAttachment,
  type AttachmentCandidate,
} from "./attachment-validation";

const utf8 = (text: string) => new TextEncoder().encode(text);
function payload(prefix: number[] | Uint8Array, size?: number): Uint8Array {
  const source = Uint8Array.from(prefix);
  return size && size > source.length
    ? Uint8Array.from([...source, ...Array<number>(size - source.length).fill(0)])
    : source;
}
function inspect(fileName: string, prefix: Uint8Array, declaredMime = "application/octet-stream",
  overrides: Partial<AttachmentCandidate> = {}) {
  return inspectAttachment({
    fileName, declaredMime, prefix, size: prefix.length, ...overrides,
  });
}

describe("Editor 2.0 server-side attachment type gate", () => {
  it("permits standard image signatures and refuses image MIME/name spoofing", () => {
    const png = payload([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
    expect(inspect("photo.png", png, "image/png")).toMatchObject({
      accepted: true, detected: "png", responseMime: "image/png", scanStatus: "type-checked",
    });
    expect(inspect("photo.jpg", png, "image/jpeg")).toMatchObject({
      accepted: false, detected: "png", reason: "signature-mismatch", suspicious: true,
    });
    expect(inspect("photo.png", png, "image/jpeg")).toMatchObject({
      accepted: false, detected: "png", reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("photo.png", png, "application/octet-stream").accepted).toBe(true);
  });

  it("supports JPEG, GIF and WebP by actual binary magic", () => {
    expect(inspect("frame.jpeg", payload([0xff, 0xd8, 0xff]), "image/jpeg").accepted).toBe(true);
    expect(inspect("animated.gif", utf8("GIF89a"), "image/gif").accepted).toBe(true);
    const webp = utf8("RIFF____WEBP");
    expect(inspect("picture.webp", webp, "image/webp").accepted).toBe(true);
  });

  it("allows recognized documents and technical archives without claiming antivirus clearance", () => {
    expect(inspect("report.pdf", utf8("%PDF-1.7"), "application/pdf")).toMatchObject({
      accepted: true, scanStatus: "type-checked", detected: "pdf",
    });
    expect(inspect("bundle.zip", payload([0x50, 0x4b, 0x03, 0x04]), "application/zip").accepted).toBe(true);
    expect(inspect("doc.docx", payload([0x50, 0x4b, 0x03, 0x04]),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document").accepted).toBe(true);
    expect(inspect("source.7z", payload([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])).accepted).toBe(true);
    expect(inspect("logs.gz", payload([0x1f, 0x8b, 0x08])).accepted).toBe(true);
    const tar = new Uint8Array(512);
    tar.set(utf8("ustar"), 257);
    expect(inspect("logs.tar", tar).accepted).toBe(true);
    expect(inspect("legacy.doc", payload([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])).accepted).toBe(true);
  });

  it.each([
    ["actual.exe", [0x50, 0x4b, 0x03, 0x04], "forbidden-extension"],
    ["program.dll", [0x50, 0x4b, 0x03, 0x04], "forbidden-extension"],
    ["setup.msi", [0x50, 0x4b, 0x03, 0x04], "forbidden-extension"],
    ["payload.scr", [0x50, 0x4b, 0x03, 0x04], "forbidden-extension"],
    ["malware.jar", [0x50, 0x4b, 0x03, 0x04], "forbidden-extension"],
    ["plugin.wasm", [0x00, 0x61, 0x73, 0x6d], "forbidden-extension"],
  ] as const)("rejects executable extensions regardless of binary content: %s", (name, contents, reason) => {
    expect(inspect(name, payload([...contents]))).toMatchObject({ accepted: false, reason, suspicious: true });
  });

  it("detects executable signatures hidden behind harmless extensions", () => {
    for (const bad of [
      payload([0x4d, 0x5a, 0x90, 0x00]),
      payload([0x7f, 0x45, 0x4c, 0x46, 0x02]),
      payload([0xcf, 0xfa, 0xed, 0xfe]),
    ]) {
      expect(inspect("notes.txt", bad, "text/plain")).toMatchObject({
        accepted: false, detected: "executable", reason: "executable-signature", suspicious: true,
      });
    }
    expect(detectAttachmentContent(utf8("#!/bin/bash\necho hello"))).toBe("text");
  });

  it("does not accept binary payloads disguised as technical text", () => {
    expect(inspect("settings.env", payload([65, 0, 66]))).toMatchObject({
      accepted: false, reason: "binary-content", suspicious: true,
    });
    expect(inspect("export.csv", utf8("%PDF-1.7"))).toMatchObject({
      accepted: false, reason: "signature-mismatch", suspicious: true,
    });
    expect(inspect("widget.png", utf8("Not actually PNG"), "image/png")).toMatchObject({
      accepted: false, reason: "signature-mismatch", suspicious: true,
    });
    expect(inspect("file.zip", utf8("Just text"))).toMatchObject({
      accepted: false, reason: "signature-mismatch", suspicious: true,
    });
  });

  it("allows broad technical source and config files but returns safe plain-text response type", () => {
    for (const name of ["test.tsx", "main.cpp", "Dockerfile", ".env",
      "analysis.sql", "configuration.yaml", "patch.diff", "page.html", "figure.svg", "script.sh",
      "plugin.lua", "app.dart", "build.scala", "schema.proto", "query.graphql", "infra.hcl",
      "LICENSE", "custom.unknown-source"]) {
      // HTML/SVG/source can only be served later with download disposition, never as active origin content.
      expect(inspect(name, utf8("const user = 'שלום';\n"), "text/plain")).toMatchObject({
        accepted: true, responseMime: "text/plain; charset=utf-8", scanStatus: "type-checked",
      });
    }
  });

  it("distinguishes specific MIME semantics inside shared text, ZIP and OLE families", () => {
    const zip = payload([0x50, 0x4b, 0x03, 0x04]);
    const ole = payload([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

    expect(inspect("bundle.zip", zip,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("legacy.doc", ole, "application/vnd.ms-excel")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("config.json", utf8("{}"), "text/html")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });

    // A less-specific family MIME is not contradictory by itself.
    expect(inspect("doc.docx", zip, "application/zip").accepted).toBe(true);
    expect(inspect("config.json", utf8("{}"), "text/plain").accepted).toBe(true);
  });

  it("handles generic and unknown declared MIME without narrowing broad source support", () => {
    expect(inspect("hello.py", utf8("print('ok')"), "application/octet-stream").accepted).toBe(true);
    expect(inspect("hello.py", utf8("print('ok')"), "image/png")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("config.json", utf8("{}"), "application/x-custom-json")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("config.json", utf8("{}"), "text/x-custom-json")).toMatchObject({
      accepted: false, reason: "mime-mismatch", suspicious: true,
    });
    expect(inspect("custom.unknown-source", utf8("custom source"), "application/x-custom-source").accepted)
      .toBe(true);
    expect(inspect("custom.unknown-source", utf8("custom source"), "text/x-custom-source").accepted)
      .toBe(true);
    expect(inspect("notes.md", utf8("Hello"), "application/x-msdownload")).toMatchObject({
      accepted: false, reason: "forbidden-mime", suspicious: true,
    });
  });

  it("validates the full 4096-byte UTF-8 sample without rejecting a real boundary split", () => {
    for (const position of [ATTACHMENT_SNIFF_BYTES - 4, ATTACHMENT_SNIFF_BYTES - 1]) {
      const invalid = new Uint8Array(ATTACHMENT_SNIFF_BYTES).fill(0x61);
      invalid[position] = 0xff;
      expect(detectAttachmentContent(invalid, true)).toBe("unknown");
      expect(inspect("notes.txt", invalid, "text/plain", {
        size: ATTACHMENT_SNIFF_BYTES + 1,
      })).toMatchObject({
        accepted: false, detected: "unknown", reason: "binary-content", suspicious: true,
      });
    }

    const splitCodePoint = new Uint8Array(ATTACHMENT_SNIFF_BYTES).fill(0x61);
    splitCodePoint[ATTACHMENT_SNIFF_BYTES - 1] = 0xc3;
    expect(detectAttachmentContent(splitCodePoint, true)).toBe("text");
    expect(inspect("notes.txt", splitCodePoint, "text/plain", {
      size: ATTACHMENT_SNIFF_BYTES + 1,
    })).toMatchObject({ accepted: true, detected: "text", suspicious: false });

    // The same incomplete byte is invalid when the sample is the entire file.
    expect(detectAttachmentContent(splitCodePoint)).toBe("unknown");
    expect(inspect("notes.txt", splitCodePoint, "text/plain")).toMatchObject({
      accepted: false, detected: "unknown", reason: "binary-content", suspicious: true,
    });
  });

  it("enforces a configurable per-file limit from server-owned actual size", () => {
    const text = utf8("hello");
    expect(DEFAULT_ATTACHMENT_MAX_BYTES).toBe(50_000_000);
    expect(inspect("ok.txt", text, "text/plain", {
      size: DEFAULT_ATTACHMENT_MAX_BYTES + 1,
    })).toMatchObject({ accepted: false, reason: "too-large", suspicious: false });
    expect(inspect("ok.txt", text, "text/plain", { maxBytes: 4 })).toMatchObject({
      accepted: false, reason: "too-large",
    });
    expect(inspect("ok.txt", text, "text/plain", { maxBytes: 5 }).accepted).toBe(true);
    expect(inspect("empty.md", new Uint8Array())).toMatchObject({
      accepted: false, reason: "empty",
    });
  });

  it("rejects insufficient actual sample bytes and malformed names without publishing", () => {
    expect(inspect("claim.pdf", utf8("%PDF-1.7"), "application/pdf", {
      size: ATTACHMENT_SNIFF_BYTES + 1,
    })).toMatchObject({ accepted: false, reason: "insufficient-evidence", suspicious: false });
    expect(inspect("../", utf8("hello"))).toMatchObject({
      accepted: false, reason: "invalid-name", suspicious: true,
    });
    expect(inspect("../../harmless.txt", utf8("hello"))).toMatchObject({
      accepted: false, reason: "invalid-name", suspicious: true,
    });
    expect(inspect("oops\nfile.txt", utf8("hello"))).toMatchObject({
      accepted: false, reason: "invalid-name", suspicious: true,
    });
    for (const name of [
      "report\u202Ename.txt", // bidi override
      "report\u2066name.txt", // bidi isolate
      "report\u200Bname.txt", // zero-width format character
    ]) {
      expect(inspect(name, utf8("hello"), "text/plain")).toMatchObject({
        accepted: false, reason: "invalid-name", suspicious: true,
      });
    }
    expect(inspect("קובץ-רגיל.txt", utf8("hello"), "text/plain")).toMatchObject({
      accepted: true, suspicious: false,
    });
    expect(inspect("", utf8("hello"))).toMatchObject({
      accepted: false, reason: "invalid-name", suspicious: true,
    });
    expect(inspect("a".repeat(256) + ".txt", utf8("hello"))).toMatchObject({
      accepted: false, reason: "invalid-name", suspicious: true,
    });
    expect(inspect("unrecognized.proprietary", utf8("hello"))).toMatchObject({
      accepted: true, detected: "text", suspicious: false,
    });
  });
});
