import { AttachmentWriteSettledError, type PrivateAttachmentBucket } from "../app/forum/attachment-r2";
import { ATTACHMENT_RESERVATION_KIND, ATTACHMENT_UPLOAD_PREFIX, isFencedAttachmentKey } from "../app/forum/attachment-storage-protocol";
import {captureStorageObservation,type StorageObservationCapture} from "../app/observability/storage-observations";

/** R2 requires a known-length body; arbitrary inspected JS streams lack it. */
export function privateAttachmentBucket(bucket: R2Bucket,capture?:StorageObservationCapture): PrivateAttachmentBucket {
  return {
    async reserve(key) {
      if (!isFencedAttachmentKey(key)) throw new Error("invalid reservation key");
      const started=performance.now();let reservation;
      try{reservation = await bucket.put(key, "", {
        onlyIf: new Headers({ "If-None-Match": "*" }),
        customMetadata: { kind: ATTACHMENT_RESERVATION_KIND },
      });}catch(error){captureStorageObservation(capture,"reserve","threw","reservation-error","rpc-error",started);throw error;}
      captureStorageObservation(capture,"reserve",reservation?"returned":"declined",reservation?"reservation-returned":"reservation-declined","rpc-return",started);
      // R2 permits one write/second per key. Space initialization and payload;
      // do not retry a failed/ambiguous create on this physical identity.
      if (reservation) await new Promise((resolve) => setTimeout(resolve, 1_000));
      return reservation;
    },
    async listReservations({ limit, cursor }) {
      const started=performance.now();let page;
      try{page = await bucket.list({ prefix: ATTACHMENT_UPLOAD_PREFIX, limit, cursor, include: ["customMetadata"] });}
      catch(error){captureStorageObservation(capture,"listReservations","threw","list-error","rpc-error",started);throw error;}
      captureStorageObservation(capture,"listReservations","returned","page-returned","rpc-return",started);
      return {
        keys: page.objects.filter((item) => isFencedAttachmentKey(item.key)
          && item.customMetadata?.kind === ATTACHMENT_RESERVATION_KIND).map((item) => item.key),
        cursor: page.truncated ? page.cursor : undefined,
      };
    },
    async put(key, content, { byteLength, httpMetadata, reservationEtag }) {
      if (!reservationEtag) throw new Error("attachment payload requires a reservation");
      const fixed = new FixedLengthStream(byteLength);
      const abort = new AbortController();
      let forwarded = 0;
      const counted = content.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) { forwarded += chunk.byteLength; controller.enqueue(chunk); },
      }));
      const pumping = counted.pipeTo(fixed.writable, { signal: abort.signal });
      let invoked=false,started=0;
      const writing = Promise.resolve().then(() => {invoked=true;started=performance.now();return bucket.put(key, fixed.readable, {
        httpMetadata, onlyIf: { etagMatches: reservationEtag }, customMetadata: { kind: "vico-payload-v1" },
      });})
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
        captureStorageObservation(capture,"put",stored===null?"declined":"returned",stored===null?"conditional-rejection":"write-settled","write-settled",started);
        return stored;
      } catch (error) {
        abort.abort(error);
        // Workerd may have a backpressured FixedLengthStream write pending.
        // Once the RPC has failed/declined, cancel our readable as well so the
        // aborted pump can settle even if the provider never consumed it.
        await fixed.readable.cancel(error).catch(() => {});
        const [writeResult] = await Promise.allSettled([writing, pumping]);
        const settled=writeResult.status==="fulfilled"||forwarded<byteLength;
        if(invoked){
          if(writeResult.status==="fulfilled"&&writeResult.value===null)captureStorageObservation(capture,"put","declined","conditional-rejection","write-settled",started);
          else captureStorageObservation(capture,"put","threw",settled?"settled-call-error":"outcome-unknown",settled?"write-settled":"write-unknown",started);
        }
        // RPC acknowledgement proves settlement. With an aborted, incomplete
        // fixed-length producer, there are not enough bytes for a later commit.
        // Full-body transport failures remain unknown; never infer from DELETE.
        if (writeResult.status === "fulfilled" || forwarded < byteLength) {
          throw new AttachmentWriteSettledError(error);
        }
        throw error;
      }
    },
    async get(key,options){
      const started=performance.now();let object;
      try{object=await bucket.get(key,options);}catch(error){captureStorageObservation(capture,"get","threw","get-error","rpc-error",started);throw error;}
      captureStorageObservation(capture,"get",object?"returned":"declined",object?"object-returned":"not-found","rpc-return",started);return object;
    },
    async delete(key){
      const started=performance.now();
      try{await bucket.delete(key);}catch(error){captureStorageObservation(capture,"delete","threw","acknowledgement-unknown","rpc-error",started);throw error;}
      captureStorageObservation(capture,"delete","returned","acknowledged","rpc-return",started);
    },
  };
}
