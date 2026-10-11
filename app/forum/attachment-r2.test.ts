import { describe, expect, it, vi } from "vitest";
import { AttachmentLengthMismatchError, storePrivateAttachment, storePrivateAttachmentStream, type PrivateAttachmentBucket } from "./attachment-r2";

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
function bucket() {
  const put = vi.fn(async (key: string, body: ReadableStream<Uint8Array>,
    options: { httpMetadata: { contentType: string } }) => {
    if (!key.startsWith("private/") || options.httpMetadata.contentType !== "application/octet-stream") {
      throw new Error("unprotected object write");
    }
    const result = new Uint8Array(await new Response(body).arrayBuffer());
    return { size: result.length };
  });
  const del = vi.fn(async (key: string) => {
    if (!key.startsWith("private/")) throw new Error("unprotected object deletion");
  });
  return { put, delete: del } satisfies PrivateAttachmentBucket;
}

describe("private R2 attachment write contract", () => {
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
      httpMetadata: { contentType: "application/octet-stream" },
    });
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
      .rejects.toThrow("private attachment storage failed");
    expect(store.delete).toHaveBeenCalledOnce();
    expect(store.delete.mock.calls[0]?.[0]).toMatch(/^private\//u);
  });

  it("does not convert an R2 failure into a successful attachment", async () => {
    const store = bucket();
    store.put.mockRejectedValueOnce(new Error("R2 service unavailable"));
    await expect(storePrivateAttachment(store,
      file("work.js", new TextEncoder().encode("const a = 1;"))))
      .rejects.toThrow("R2 service unavailable");
  });
});

function chunked(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

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
    })).rejects.toThrow("R2 interrupted");
    expect(store.delete).toHaveBeenCalledOnce();
  });
});
