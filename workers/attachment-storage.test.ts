// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { privateAttachmentBucket } from "./attachment-storage";
import { AttachmentWriteSettledError } from "../app/forum/attachment-r2";

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
      expect(options).toEqual({ httpMetadata: { contentType: "application/octet-stream" }, onlyIf: {etagMatches: "reservation"}, customMetadata: {kind: "vico-payload-v1"} });
      expect(new Uint8Array(await new Response(body).arrayBuffer())).toEqual(new Uint8Array([1, 2, 1, 2, 1, 2]));
      return { size: 6 };
    });
    const adapter = privateAttachmentBucket({ put } as unknown as R2Bucket);
    expect(await adapter.put("private/test", source, {
      byteLength: 6, reservationEtag: "reservation", httpMetadata: { contentType: "application/octet-stream" },
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
      byteLength: 6, reservationEtag: "reservation", httpMetadata: { contentType: "application/octet-stream" },
    })).rejects.toMatchObject({ name: "AttachmentWriteSettledError", cause: failure });
    expect(cancel).toHaveBeenCalled();
  });

  it("preserves an unknown transport error after the full body was forwarded", async () => {
    vi.stubGlobal("FixedLengthStream", class extends TransformStream {
      constructor(length: number) { super(); expect(length).toBe(6); }
    });
    const failure = new Error("lost full-body PUT acknowledgement");
    const adapter = privateAttachmentBucket({ put: async (_key: string, body: ReadableStream) => {
      expect((await new Response(body).arrayBuffer()).byteLength).toBe(6);
      throw failure;
    } } as unknown as R2Bucket);
    await expect(adapter.put("private/test", new Response("abcdef").body!, {
      byteLength: 6, reservationEtag: "reservation", httpMetadata: {contentType: "application/octet-stream"},
    })).rejects.toBe(failure);
  });

  it("settles a definitive rejection without waiting for an unconsumed body", async () => {
    vi.stubGlobal("FixedLengthStream", class extends TransformStream {
      constructor(length: number) { super(); expect(length).toBe(6); }
    });
    const cancel = vi.fn();
    const adapter = privateAttachmentBucket({put: async () => null} as unknown as R2Bucket);
    await expect(adapter.put("private/test", new ReadableStream({cancel}), {
      byteLength: 6, reservationEtag: "reservation", httpMetadata: {contentType: "application/octet-stream"},
    })).rejects.toBeInstanceOf(AttachmentWriteSettledError);
    expect(cancel).toHaveBeenCalled();
  });

  it("reports settled storage when PUT acknowledged before an upstream terminal error", async () => {
    vi.stubGlobal("FixedLengthStream", class extends TransformStream {
      constructor(length: number) { super(); expect(length).toBe(6); }
    });
    const failure = new Error("producer failed after all bytes");
    let pulls = 0;
    const source = new ReadableStream<Uint8Array>({pull(controller) {
      if (pulls++ === 0) controller.enqueue(new TextEncoder().encode("abcdef"));
      else controller.error(failure);
    }});
    const adapter = privateAttachmentBucket({put: async (_key: string, body: ReadableStream) => {
      const reader = body.getReader();
      await reader.read();
      reader.releaseLock();
      return {size: 6}; // definite remote acknowledgement, even though producer errors
    }} as unknown as R2Bucket);
    await expect(adapter.put("private/test", source, {
      byteLength: 6, reservationEtag: "reservation", httpMetadata: {contentType: "application/octet-stream"},
    })).rejects.toBeInstanceOf(AttachmentWriteSettledError);
  });
});

it('creates a reservation once and paces the next same-key write',async()=>{
  vi.useFakeTimers();
  try{
    const put=vi.fn(async()=>({etag:'guard'}));const storage=privateAttachmentBucket({put}as unknown as R2Bucket);
    const key='private/fenced-v1/00000000-0000-4000-8000-000000000000';let returned=false;
    const pending=storage.reserve(key).then(value=>{returned=true;return value;});
    await vi.advanceTimersByTimeAsync(999);expect(returned).toBe(false);
    await vi.advanceTimersByTimeAsync(1);expect(await pending).toEqual({etag:'guard'});expect(put).toHaveBeenCalledOnce();
    const options=put.mock.calls[0] as unknown as [string,string,{onlyIf:Headers;customMetadata:{kind:string}}];
    expect(options[2].onlyIf.get('If-None-Match')).toBe('*');expect(options[2].customMetadata.kind).toBe('vico-reservation-v1');
  }finally{vi.useRealTimers();}
});

it('filters reservation pages while forwarding the bounded cursor and prefix',async()=>{
  const key='private/fenced-v1/00000000-0000-4000-8000-000000000000';
  const list=vi.fn(async()=>({objects:[{key,customMetadata:{kind:'vico-reservation-v1'}},{key:key+'bad',customMetadata:{kind:'vico-reservation-v1'}},{key:'data',customMetadata:{kind:'vico-payload-v1'}}],truncated:true,cursor:'next'}));
  expect(await privateAttachmentBucket({list}as unknown as R2Bucket).listReservations({limit:3,cursor:'current'})).toEqual({keys:[key],cursor:'next'});
  expect(list).toHaveBeenCalledWith({prefix:'private/fenced-v1/',limit:3,cursor:'current',include:['customMetadata']});
});
