import type { PrivateAttachmentBucket } from "../app/forum/attachment-r2";

/** R2 requires a known-length body; arbitrary inspected JS streams lack it. */
export function privateAttachmentBucket(bucket: R2Bucket): PrivateAttachmentBucket {
  return {
    async put(key, content, { byteLength, httpMetadata }) {
      const fixed = new FixedLengthStream(byteLength);
      const abort = new AbortController();
      const pumping = content.pipeTo(fixed.writable, { signal: abort.signal });
      try {
        const [stored] = await Promise.all([
          bucket.put(key, fixed.readable, { httpMetadata }),
          pumping,
        ]);
        return stored;
      } catch (error) {
        abort.abort(error);
        await pumping.catch(() => {});
        throw error;
      }
    },
    get: (key, options) => bucket.get(key, options),
    delete: (key) => bucket.delete(key),
  };
}
