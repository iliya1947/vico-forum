import {expect,it,vi} from "vitest";
import {OperationalFactBuffer,withOperationalFacts,withProviderCallEvidence,type OwnerOperationalFact} from "./operational-facts";

const task={id:"task-fixture",translationKind:"ui",generation:1,attemptCount:1,maxAttempts:3,operationAt:"2026-11-17T00:00:00.123456Z"};
it("bounds one collector to32 facts and delivers no raw ownership capability to the sink",async()=>{
  const facts:OwnerOperationalFact[]=[],buffer=new OperationalFactBuffer({append:async fact=>{facts.push(fact);}});
  for(let n=0;n<40;n++)buffer.captureTask("task.claimed",task,"PRIVATE_CLAIM_"+n);
  await buffer.flush();await buffer.flush();expect(facts).toHaveLength(32);expect(buffer.recording).toBe("unavailable");
  expect(JSON.stringify(facts)).not.toContain("PRIVATE_CLAIM");expect(facts.every(f=>/^[a-f0-9]{64}$/.test(f.occurrenceDigest))).toBe(true);
});
it("unknown operation outcome never flushes a success, while sink failure preserves a successful result",async()=>{
  const sink={append:vi.fn(async()=>{throw Error("recording unavailable");})};
  await expect(withOperationalFacts(sink,async facts=>{facts.captureTask("task.planned",task);throw Error("commit unknown");})).rejects.toThrow("commit unknown");expect(sink.append).not.toHaveBeenCalled();
  expect(await withOperationalFacts(sink,async facts=>{facts.captureTask("task.planned",task);return "committed";})).toBe("committed");expect(sink.append).toHaveBeenCalledOnce();
});
it("actual provider call outcome remains distinct from a later publication failure",async()=>{
  const sink={append:vi.fn(async(fact:OwnerOperationalFact)=>{void fact;})};
  await expect(withProviderCallEvidence(sink,async calls=>{calls.configure({...task,claimToken:"PRIVATE_CLAIM"});
    await calls.observe(async()=>"provider returned");throw Error("publication failed");})).rejects.toThrow("publication failed");
  expect(sink.append).toHaveBeenCalledWith(expect.objectContaining({kind:"integration.translationCall",values:expect.objectContaining({calls:1,succeeded:1,failed:0})}));
  sink.append.mockClear();await withProviderCallEvidence(sink,async()=>"not eligible");expect(sink.append).not.toHaveBeenCalled();
});
