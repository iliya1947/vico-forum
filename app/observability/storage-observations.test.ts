// @vitest-environment node
import {afterEach,expect,it,vi} from "vitest";
import {StorageObservationCollector,RequestRecordingBudget,createStorageAdmissionGate,STORAGE_SLOTS,checkedStorageCandidate,type StorageObservationValue} from "./storage-observations";
import {privateAttachmentBucket} from "../../workers/attachment-storage";
import {AttachmentWriteSettledError} from "../forum/attachment-r2";
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const now="2026-11-17T00:00:00.000Z";
const value:StorageObservationValue={operation:"get",resultClass:"returned",category:"object-returned",phase:"rpc-return",callReturnedAt:now,durationMs:1};
it("selects the first candidate per fixed slot, shares the32-budget and suppresses15 minutes after successful/no-op admission",async()=>{
  let clock=0;const gate=createStorageAdmissionGate(),budget=new RequestRecordingBudget(),record=vi.fn(async(candidates:unknown)=>{void candidates;});
  const first=new StorageObservationCollector({record},gate,budget,()=>clock);
  first.capture(value);first.capture({...value,durationMs:60});await first.flush();await first.flush();
  expect(record).toHaveBeenCalledOnce();expect(record.mock.calls[0][0]).toEqual([checkedStorageCandidate(value)]);
  clock=899999;const second=new StorageObservationCollector({record},gate,budget,()=>clock);second.capture(value);await second.flush();expect(record).toHaveBeenCalledOnce();
  clock=900000;const third=new StorageObservationCollector({record},gate,budget,()=>clock);third.capture(value);await third.flush();expect(record).toHaveBeenCalledTimes(2);
  const used=new RequestRecordingBudget();for(let n=0;n<32;n++)expect(used.admit()).toBe(true);
  const capped=new StorageObservationCollector({record},createStorageAdmissionGate(),used,()=>clock);capped.capture(value);await capped.flush();expect(record).toHaveBeenCalledTimes(2);
});
it("backs off recording failures for60 seconds without background retries or recursive events",async()=>{
  let clock=0;const gate=createStorageAdmissionGate(),record=vi.fn(async()=>{throw Error("PRIVATE_SQL");});
  const invoke=async()=>{const collector=new StorageObservationCollector({record},gate,undefined,()=>clock);collector.capture(value);await collector.flush();};
  await invoke();clock=59999;await invoke();expect(record).toHaveBeenCalledOnce();clock=60000;await invoke();expect(record).toHaveBeenCalledTimes(2);
});
it("observes all13 supported results at the real adapter seam without leaking keys, bodies, errors or capabilities",async()=>{
  vi.stubGlobal("FixedLengthStream",class extends TransformStream{constructor(){super();}});
  const captured:StorageObservationValue[]=[],capture=(v:StorageObservationValue)=>{captured.push(v);};
  const failure=Error("PRIVATE_R2_ERROR"),key="private/fenced-v1/00000000-0000-4000-8000-000000000000";
  for(const mode of ["returned","declined","threw"] as const){
    const raw={put:vi.fn(async()=>{if(mode==="threw")throw failure;return mode==="declined"?null:{etag:"PRIVATE_ETAG"};})};
    const adapter=privateAttachmentBucket(raw as unknown as R2Bucket,capture);
    if(mode==="returned"){
      vi.useFakeTimers();const pending=adapter.reserve(key);await vi.advanceTimersByTimeAsync(1000);expect(await pending).toEqual({etag:"PRIVATE_ETAG"});vi.useRealTimers();
    }else if(mode==="declined")expect(await adapter.reserve(key)).toBeNull();else await expect(adapter.reserve(key)).rejects.toBe(failure);
  }
  for(const mode of ["returned","declined","threw"] as const){
    const raw={put:async(_key:string,body:ReadableStream)=>{if(mode==="threw")throw failure;if(mode==="declined")return null;await new Response(body).arrayBuffer();return {size:6};}};
    const adapter=privateAttachmentBucket(raw as unknown as R2Bucket,capture);
    const source=mode==="threw"?new ReadableStream<Uint8Array>({}):new Response("secret").body!;
    const pending=adapter.put(key,source,{byteLength:6,reservationEtag:"PRIVATE_ETAG",httpMetadata:{contentType:"text/plain"}});
    if(mode==="returned")expect(await pending).toEqual({size:6});else await expect(pending).rejects.toBeInstanceOf(AttachmentWriteSettledError);
  }
  for(const mode of ["returned","declined","threw"] as const){
    const object={size:6,body:new ReadableStream<Uint8Array>({pull(controller){controller.error(failure);}})};
    const raw={get:async()=>{if(mode==="threw")throw failure;return mode==="declined"?null:object;}};
    const adapter=privateAttachmentBucket(raw as unknown as R2Bucket,capture);
    if(mode==="threw")await expect(adapter.get(key,{range:{offset:0,length:6}})).rejects.toBe(failure);
    else expect(await adapter.get(key,{range:{offset:0,length:6}})).toBe(mode==="declined"?null:object);
  }
  for(const throws of [false,true]){
    const adapter=privateAttachmentBucket({delete:async()=>{if(throws)throw failure;}} as unknown as R2Bucket,capture);
    if(throws)await expect(adapter.delete(key)).rejects.toBe(failure);else await adapter.delete(key);
    const list=privateAttachmentBucket({list:async()=>{if(throws)throw failure;return {objects:[],truncated:false};}} as unknown as R2Bucket,capture);
    if(throws)await expect(list.listReservations({limit:1})).rejects.toBe(failure);else expect(await list.listReservations({limit:1})).toEqual({keys:[],cursor:undefined});
  }
  expect(new Set(captured.map(v=>checkedStorageCandidate(v).scope))).toEqual(new Set(STORAGE_SLOTS));expect(captured).toHaveLength(13);
  expect(JSON.stringify(captured)).not.toMatch(/PRIVATE_|secret|fenced-v1|00000000/);
});
it("records no call for failed preconditions and preserves full-body PUT uncertainty despite a recording callback error",async()=>{
  vi.stubGlobal("FixedLengthStream",class extends TransformStream{constructor(){super();}});
  const capture=vi.fn(),put=vi.fn(async()=>({size:6})),adapter=privateAttachmentBucket({put} as unknown as R2Bucket,capture);
  await expect(adapter.reserve("invalid-private-key")).rejects.toThrow();await expect(adapter.put("private-key",new Response("secret").body!,{byteLength:6,reservationEtag:"",httpMetadata:{contentType:"text/plain"}})).rejects.toThrow();expect(put).not.toHaveBeenCalled();expect(capture).not.toHaveBeenCalled();
  const failure=Error("unknown full body ACK"),outcomes:StorageObservationValue[]=[];
  const observed=privateAttachmentBucket({put:async(_key:string,body:ReadableStream)=>{await new Response(body).arrayBuffer();throw failure;}} as unknown as R2Bucket,v=>{outcomes.push(v);throw Error("recording failure");});
  await expect(observed.put("private-key",new Response("secret").body!,{byteLength:6,reservationEtag:"PRIVATE_ETAG",httpMetadata:{contentType:"text/plain"}})).rejects.toBe(failure);
  expect(outcomes).toMatchObject([{operation:"put",resultClass:"threw",category:"outcome-unknown",phase:"write-unknown"}]);
});
