import { describe, expect, it, vi } from "vitest";
import { RequestAuthFactCollector } from "./auth-fact-collector.server";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";

const created: AuthTransitionFact={kind:"account.created",userId:"new-user"};

describe("SA02 committed fact request collector", () => {
  it("keeps authoritative actor separate and preserves each exact fact", async () => {
    const stored: AuthTransitionFact[]=[];
    const close=vi.fn(async()=>undefined);
    const gap=vi.fn();
    const source=new RequestAuthFactCollector(()=>({
      append:async fact => {stored.push(fact);return {id:"saved",inserted:true}},
      close,
    }),gap);
    expect(source.trustedActorFor("new-user")).toBeNull();
    source.setResolvedActor("existing-owner");
    expect(source.trustedActorFor("existing-owner")).toBe("existing-owner");
    expect(source.trustedActorFor("different-owner")).toBeNull();
    source.setResolvedActor("forged@email");
    expect(source.trustedActorFor("existing-owner")).toBeNull();
    for(let i=0;i<12;i++)source.capture({
      kind:"auth.sessionCreated",userId:"new-user",sessionId:"session-"+i,
    });
    source.capture(created);
    await source.flush();
    expect(stored).toHaveLength(13);
    expect(stored.at(-1)).toEqual(created);
    expect(close).toHaveBeenCalledOnce();
    expect(gap).not.toHaveBeenCalled();
    await source.flush();
    expect(stored).toHaveLength(13);
  });

  it("records a gap on individual append failure without dropping other exact facts",async()=>{
    const append=vi.fn(async (fact:AuthTransitionFact)=>{
      if(fact.kind==="account.created")throw new Error("storage unavailable");
      return {id:"saved",inserted:true};
    });
    const gap=vi.fn();
    const collector=new RequestAuthFactCollector(()=>({
      append,close:async()=>undefined,
    }),gap);
    collector.capture(created);
    collector.capture({kind:"auth.sessionCreated",userId:"new-user",sessionId:"session-1"});
    await expect(collector.flush()).resolves.toBeUndefined();
    expect(append).toHaveBeenCalledTimes(2);
    expect(gap).toHaveBeenCalledOnce();
    expect(gap).toHaveBeenCalledWith(1);
  });

  it("keeps source failure and late-callback gaps isolated from request outcome",async()=>{
    const missed=vi.fn();
    const collector=new RequestAuthFactCollector(()=>{
      throw new Error("disconnected");
    },missed);
    collector.capture(created);
    collector.capture({kind:"auth.sessionCreated",userId:"new-user",sessionId:"s1"});
    await expect(collector.flush()).resolves.toBeUndefined();
    expect(missed).toHaveBeenCalledWith(2);
    collector.capture(created);
    expect(missed).toHaveBeenLastCalledWith(1);
  });
});
