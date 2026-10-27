import { describe, expect, it, vi } from "vitest";
import { classicManyEntryZip, descriptorOverlapZip } from "./attachment-zip.test-fixtures";
import {
  AttachmentLengthMismatchError,
  AttachmentStorageError,
  storePrivateAttachment,
  storePrivateAttachmentStream,
  type PrivateAttachmentBucket,
} from "./attachment-r2";

function file(name: string, bytes: Uint8Array, type = "application/octet-stream"): File {
  return {
    name, type, size: bytes.length,
    slice(start = 0, end = bytes.length) {
      const sample = bytes.slice(start, end);
      return { arrayBuffer: async () => sample.buffer } as Blob;
    },
    stream() {
      return new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(bytes); controller.close(); },
      });
    },
  } as File;
}

function chunked(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function bucket() {
  const objects = new Map<string, Uint8Array>();
  const put = vi.fn(async (key: string, body: ReadableStream<Uint8Array>,
    options: { byteLength: number; httpMetadata: { contentType: string } }) => {
    if (!key.startsWith("private/") || options.httpMetadata.contentType !== "application/octet-stream") {
      throw new Error("unprotected object write");
    }
    const result = new Uint8Array(await new Response(body).arrayBuffer());
    objects.set(key, result);
    return { size: result.length };
  });
  const get = vi.fn(async (key: string, options: { range: { offset: number; length: number } }) => {
    const object = objects.get(key);
    if (!object) return null;
    const { offset, length } = options.range;
    const bytes = object.slice(offset, offset + length);
    return { size: object.length, body: chunked([bytes]) };
  });
  const del = vi.fn(async (key: string) => {
    if (!key.startsWith("private/")) throw new Error("unprotected object deletion");
    objects.delete(key);
  });
  return { put, get, delete: del } satisfies PrivateAttachmentBucket;
}

function emptyZip(): Uint8Array {
  return Uint8Array.from([
    0x50, 0x4b, 0x05, 0x06,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0,
  ]);
}

function singleEntryZip(): Uint8Array {
  const bytes = new Uint8Array(101), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint32(18, 1, true); view.setUint32(22, 1, true); view.setUint16(26, 1, true);
  bytes[30] = 97; bytes[31] = 120;
  view.setUint32(32, 0x02014b50, true);
  view.setUint32(52, 1, true); view.setUint32(56, 1, true); view.setUint16(60, 1, true);
  bytes[78] = 97;
  view.setUint32(79, 0x06054b50, true);
  view.setUint16(87, 1, true); view.setUint16(89, 1, true);
  view.setUint32(91, 47, true); view.setUint32(95, 32, true);
  return bytes;
}

function minimalGif(): Uint8Array {
  return Uint8Array.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x3b,
  ]);
}

describe("private R2 attachment write contract", () => {
  it.each([false, true])("finalizes classic 65535 within a 1000-subrequest storage budget (reverse=%s)", async (reverse) => {
    const data = classicManyEntryZip(65535, reverse), storage = bucket();
    let requests = 0;
    const get = storage.get;
    storage.get = vi.fn(async (key, options) => {
      expect(++requests).toBeLessThan(995); // reserve PUT/journal/metadata overhead
      expect(options.range.length).toBeLessThanOrEqual(128 * 1024);
      return get(key, options);
    });
    const result = await storePrivateAttachment(storage, file("boundary.zip", data, "application/zip"));
    expect(result.outcome).toBe("stored");
    expect(requests).toBeLessThan(60);
  }, 30_000);

  it("rejects descriptor/header overlap after PUT but preserves separate descriptor controls", async () => {
    for (const descriptor of ["missing", "unsigned", "signed"] as const) {
      const storage = bucket();
      const result = await storePrivateAttachment(storage, file("descriptor.zip", descriptorOverlapZip(descriptor), "application/zip"));
      expect(result.outcome).toBe(descriptor === "missing" ? "rejected" : "stored");
      expect(storage.delete).toHaveBeenCalledTimes(descriptor === "missing" ? 1 : 0);
    }
  });

  it("finalizes ZIP metadata after private write and deletes CRC/descriptor mismatches", async () => {
    for (const kind of ["valid", "crc", "missing-descriptor"] as const) {
      const bytes = singleEntryZip(), store = bucket();
      if (kind === "crc") bytes[14] = 1;
      if (kind === "missing-descriptor") { bytes[6] = 8; bytes[40] = 8; }
      const result = await storePrivateAttachment(store, file("one.zip", bytes, "application/zip"));
      expect(store.put).toHaveBeenCalledOnce();
      expect(store.get).toHaveBeenCalled();
      if (kind === "valid") {
        expect(result.outcome).toBe("stored");
        expect(store.delete).not.toHaveBeenCalled();
      } else {
        expect(result).toMatchObject({ outcome: "rejected", inspection: { reason: "invalid-structure" } });
        expect(store.delete).toHaveBeenCalledOnce();
      }
    }
  });
  it("streams accepted content to an unguessable private key without exposing active content MIME", async () => {
    const store = bucket();
    const content = new TextEncoder().encode("<html><script>danger</script></html>");
    const result = await storePrivateAttachment(store, file("example.html", content, "text/html"));
    expect(result).toMatchObject({ outcome: "stored", bytes: content.length,
      inspection: { accepted: true, responseMime: "text/plain; charset=utf-8" } });
    if (result.outcome !== "stored") return;
    expect(result.objectKey).toMatch(/^private\/[0-9a-f-]{36}$/u);
    expect(store.put).toHaveBeenCalledOnce();
    expect(store.put.mock.calls[0]?.[2]).toEqual({
      byteLength: content.length,
      httpMetadata: { contentType: "application/octet-stream" },
    });
    expect(store.get).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("never writes suspicious or oversized files to R2", async () => {
    const store = bucket();
    const executable = await storePrivateAttachment(store,
      file("friendly.txt", Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]), "text/plain"));
    expect(executable).toMatchObject({
      outcome: "rejected", inspection: { suspicious: true, reason: "executable-signature" },
    });
    const oversize = await storePrivateAttachment(store,
      file("text.md", new TextEncoder().encode("hello")), 4);
    expect(oversize).toMatchObject({
      outcome: "rejected", inspection: { suspicious: false, reason: "too-large" },
    });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("fails closed and deletes an inconsistent R2 write instead of declaring it stored", async () => {
    const store = bucket();
    store.put.mockImplementationOnce(async () => ({ size: 1 }));
    await expect(storePrivateAttachment(store,
      file("report.pdf", new TextEncoder().encode("%PDF-1.7"))))
      .rejects.toBeInstanceOf(AttachmentStorageError);
    expect(store.delete).toHaveBeenCalledOnce();
    expect(store.delete.mock.calls[0]?.[0]).toMatch(/^private\//u);
  });

  it("does not convert an R2 failure into a successful attachment", async () => {
    const store = bucket();
    store.put.mockRejectedValueOnce(new Error("R2 service unavailable"));
    await expect(storePrivateAttachment(store,
      file("work.js", new TextEncoder().encode("const a = 1;"))))
      .rejects.toMatchObject({
        name: "AttachmentStorageError",
        cause: expect.objectContaining({ message: "R2 service unavailable" }),
      });
  });

  it("finalizes streaming binary structure before returning a private key", async () => {
    const store = bucket();
    const result = await storePrivateAttachment(store, file("tiny.gif", minimalGif(), "image/gif"));
    expect(result).toMatchObject({
      outcome: "stored",
      inspection: { accepted: true, detected: "gif" },
    });
    expect(store.get).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("deletes a stored object when streaming structural validation rejects it", async () => {
    const store = bucket();
    const truncated = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const result = await storePrivateAttachment(store, file("broken.gif", truncated, "image/gif"));
    expect(result).toMatchObject({
      outcome: "rejected",
      inspection: {
        reason: "invalid-structure",
        detected: "gif",
        suspicious: true,
        scanStatus: "rejected",
      },
    });
    expect(store.put).toHaveBeenCalledOnce();
    expect(store.get).not.toHaveBeenCalled();
    expect(store.delete).toHaveBeenCalledOnce();
  });

  it("uses ranged reads to finalize ZIP structure after the private write", async () => {
    const store = bucket();
    const result = await storePrivateAttachment(store, file("empty.zip", emptyZip(), "application/zip"));
    expect(result).toMatchObject({
      outcome: "stored",
      inspection: { accepted: true, detected: "zip" },
    });
    expect(store.get).toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("stores an empty TAR and rejects a zero-marked archive with trailing nonzero data", async () => {
    const validStore = bucket();
    const archive = new Uint8Array(10_240);
    const valid = await storePrivateAttachment(validStore, file("empty.tar", archive, "application/x-tar"));
    expect(valid).toMatchObject({
      outcome: "stored", bytes: archive.length,
      inspection: { accepted: true, detected: "tar", responseMime: "application/x-tar" },
    });
    expect(validStore.get).toHaveBeenCalled();
    expect(validStore.delete).not.toHaveBeenCalled();

    const invalidStore = bucket();
    const malformed = new Uint8Array(1536);
    malformed[1024] = 1;
    const invalid = await storePrivateAttachment(invalidStore, file("malformed.tar", malformed, "application/x-tar"));
    expect(invalid).toMatchObject({
      outcome: "rejected",
      inspection: { detected: "tar", reason: "invalid-structure", suspicious: true },
    });
    expect(invalidStore.delete).toHaveBeenCalledOnce();
  });

  it("uses the filename semantic when finalizing ZIP-backed Office packages", async () => {
    const store = bucket();
    const result = await storePrivateAttachment(store, file(
      "not-a-document.docx",
      emptyZip(),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ));
    expect(result).toMatchObject({
      outcome: "rejected",
      inspection: { reason: "invalid-structure", detected: "zip", suspicious: true },
    });
    expect(store.get).toHaveBeenCalled();
    expect(store.delete).toHaveBeenCalledOnce();
  });

  it("propagates R2 finalization read failures instead of classifying storage errors as invalid files", async () => {
    const store = bucket();
    store.get.mockRejectedValueOnce(new Error("R2 range read unavailable"));
    await expect(storePrivateAttachment(store, file("empty.zip", emptyZip(), "application/zip")))
      .rejects.toMatchObject({
        name: "AttachmentStorageError",
        cause: expect.objectContaining({ message: "R2 range read unavailable" }),
      });
    expect(store.delete).toHaveBeenCalledOnce();
  });
});

describe("bounded one-pass upload stream", () => {
  it("validates a fragmented prefix and uploads exact bytes without buffering the whole file", async () => {
    const store = bucket();
    const bytes = new TextEncoder().encode("hello from a fragmented stream");
    const chunks = [bytes.subarray(0, 1), bytes.subarray(1, 8), bytes.subarray(8)];
    const stored = await storePrivateAttachmentStream(store, {
      fileName: "notes.md", declaredMime: "text/plain", size: bytes.length, body: chunked(chunks),
    });
    expect(stored).toMatchObject({ outcome: "stored", bytes: bytes.length });
    expect(store.put).toHaveBeenCalledOnce();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("rejects an executable even when its magic bytes cross chunk boundaries", async () => {
    const store = bucket();
    const uploaded = await storePrivateAttachmentStream(store, {
      fileName: "readme.txt", declaredMime: "text/plain", size: 5,
      body: chunked([Uint8Array.from([0x4d]), Uint8Array.from([0x5a, 0x90, 0x00, 0x01])]),
    });
    expect(uploaded).toMatchObject({
      outcome: "rejected", inspection: { reason: "executable-signature", suspicious: true },
    });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("rejects oversized declared content before touching R2 or consuming the body", async () => {
    const store = bucket();
    const canceled = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull() { throw new Error("must not consume oversized input"); },
      cancel: canceled,
    }, { highWaterMark: 0 });
    const result = await storePrivateAttachmentStream(store, {
      fileName: "big.txt", declaredMime: "text/plain", size: 101, body,
    }, 100);
    expect(result).toMatchObject({ outcome: "rejected", inspection: { reason: "too-large" } });
    expect(canceled).toHaveBeenCalledOnce();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("fails closed and removes the object when the actual body is shorter than claimed", async () => {
    const store = bucket();
    const bytes = new TextEncoder().encode("a".repeat(4096));
    await expect(storePrivateAttachmentStream(store, {
      fileName: "notes.txt", declaredMime: "text/plain", size: 5000, body: chunked([bytes]),
    })).rejects.toBeInstanceOf(AttachmentLengthMismatchError);
    expect(store.put).toHaveBeenCalledOnce();
    expect(store.delete).toHaveBeenCalledOnce();
  });

  it("fails closed and removes the object when actual streaming bytes exceed the claim", async () => {
    const store = bucket();
    const first = new TextEncoder().encode("a".repeat(4096));
    const extra = new TextEncoder().encode("extra");
    await expect(storePrivateAttachmentStream(store, {
      fileName: "notes.txt", declaredMime: "text/plain",
      size: 4096, body: chunked([first, extra]),
    })).rejects.toBeInstanceOf(AttachmentLengthMismatchError);
    expect(store.put).toHaveBeenCalledOnce();
    expect(store.delete).toHaveBeenCalledOnce();
  });

  it("fails without exposing a key when R2 rejects after receiving part of the stream", async () => {
    const store = bucket();
    store.put.mockImplementationOnce(async (_key, body) => {
      const reader = body.getReader();
      await reader.read();
      throw new Error("R2 interrupted");
    });
    await expect(storePrivateAttachmentStream(store, {
      fileName: "notes.txt", declaredMime: "text/plain",
      size: 5, body: chunked([new TextEncoder().encode("hello")]),
    })).rejects.toMatchObject({
      name: "AttachmentStorageError",
      cause: expect.objectContaining({ message: "R2 interrupted" }),
    });
    expect(store.delete).toHaveBeenCalledOnce();
  });
});
