// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { privateAttachmentBucket } from "./attachment-storage";

afterEach(() => vi.unstubAllGlobals());

describe("Workers private attachment adapter", () => {
  it("provides R2 a known-length stream and neutral metadata, without buffering the upload", async () => {
    const lengths = new WeakMap<ReadableStream, number>();
    vi.stubGlobal("FixedLengthStream", class extends TransformStream {
      constructor(length: number) { super(); lengths.set(this.readable, length); }
    });
    let pulls = 0;
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulls++ < 3) controller.enqueue(new Uint8Array([1, 2]));
        else controller.close();
      },
    });
    const put = vi.fn(async (_key: string, body: ReadableStream, options: unknown) => {
      expect(lengths.get(body)).toBe(6);
      expect(pulls).toBeLessThan(4); // R2 starts before the source is drained.
      expect(options).toEqual({ httpMetadata: { contentType: "application/octet-stream" } });
      expect(new Uint8Array(await new Response(body).arrayBuffer())).toEqual(new Uint8Array([1, 2, 1, 2, 1, 2]));
      return { size: 6 };
    });
    const adapter = privateAttachmentBucket({ put } as unknown as R2Bucket);
    expect(await adapter.put("private/test", source, {
      byteLength: 6, httpMetadata: { contentType: "application/octet-stream" },
    })).toEqual({ size: 6 });
    expect(put).toHaveBeenCalledOnce();
  });

  it("cancels the upstream upload when R2 rejects without consuming its body", async () => {
    vi.stubGlobal("FixedLengthStream", class extends TransformStream {
      constructor(length: number) { super(); expect(length).toBe(6); }
    });
    const cancel = vi.fn();
    const failure = new Error("R2 unavailable");
    const adapter = privateAttachmentBucket({ put: async () => { throw failure; } } as unknown as R2Bucket);
    await expect(adapter.put("private/test", new ReadableStream({ cancel }), {
      byteLength: 6, httpMetadata: { contentType: "application/octet-stream" },
    })).rejects.toBe(failure);
    expect(cancel).toHaveBeenCalled();
  });
});
