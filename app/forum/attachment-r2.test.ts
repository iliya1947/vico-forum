import { describe, expect, it, vi } from "vitest";
import { storePrivateAttachment, type PrivateAttachmentBucket } from "./attachment-r2";

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
  const put = vi.fn(async (_key: string, body: ReadableStream<Uint8Array>,
    _options: { httpMetadata: { contentType: string } }) => {
    const result = new Uint8Array(await new Response(body).arrayBuffer());
    return { size: result.length };
  });
  const del = vi.fn(async (_key: string) => {});
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
