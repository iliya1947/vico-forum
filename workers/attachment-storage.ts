import { AttachmentWriteSettledError, type PrivateAttachmentBucket } from "../app/forum/attachment-r2";

/** R2 requires a known-length body; arbitrary inspected JS streams lack it. */
export function privateAttachmentBucket(bucket: R2Bucket): PrivateAttachmentBucket {
  return {
    async put(key, content, { byteLength, httpMetadata }) {
      const fixed = new FixedLengthStream(byteLength);
      const abort = new AbortController();
      let forwarded = 0;
      const counted = content.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) { forwarded += chunk.byteLength; controller.enqueue(chunk); },
      }));
      const pumping = counted.pipeTo(fixed.writable, { signal: abort.signal });
      const writing = Promise.resolve().then(() => bucket.put(key, fixed.readable, { httpMetadata }))
        .then(async (stored) => {
          // A definitive rejection need not consume the body. Stop the pump
          // rather than waiting forever for a reader which has already returned.
          if (stored === null) {
            const error = new Error("private attachment PUT rejected");
            abort.abort(error);
            await fixed.readable.cancel(error).catch(() => {});
          }
          return stored;
        });
      try {
        const [stored] = await Promise.all([
          writing,
          pumping,
        ]);
        return stored;
      } catch (error) {
        abort.abort(error);
        // Workerd may have a backpressured FixedLengthStream write pending.
        // Once the RPC has failed/declined, cancel our readable as well so the
        // aborted pump can settle even if the provider never consumed it.
        await fixed.readable.cancel(error).catch(() => {});
        const [writeResult] = await Promise.allSettled([writing, pumping]);
        // RPC acknowledgement proves settlement. With an aborted, incomplete
        // fixed-length producer, there are not enough bytes for a later commit.
        // Full-body transport failures remain unknown; never infer from DELETE.
        if (writeResult.status === "fulfilled" || forwarded < byteLength) {
          throw new AttachmentWriteSettledError(error);
        }
        throw error;
      }
    },
    get: (key, options) => bucket.get(key, options),
    delete: (key) => bucket.delete(key),
  };
}
