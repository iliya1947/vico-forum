import {it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {registryLoaderContext} from "../localization/request-context";
import {presentComplaintCases} from "./queue-presentation.server";
import type {ComplaintQueueCase} from "./queue-contract";
import {RegistryConnectionUnavailableError} from "../localization/persistent-registry";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
it("uses registered source direction independently of UI and falls back only for und/unknown",async()=>{
  const context=new RouterContextProvider();
  const load=vi.fn(async()=>({registry:{find:(tag:string)=>tag==="he"?{locale:{direction:"rtl"}}:tag==="en"?{locale:{direction:"ltr"}}:undefined}}));
  context.set(registryLoaderContext,load as never);
  const cases=await presentComplaintCases(context,[{topicLocale:"he",sourceLocale:"en"},{topicLocale:"und",sourceLocale:"unknown"}] as ComplaintQueueCase[]);
  expect(cases).toMatchObject([{topicDirection:"rtl",excerptDirection:"ltr"},{topicDirection:"auto",excerptDirection:"auto"}]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(await presentComplaintCases(context,[])).toEqual([]);expect(load).toHaveBeenCalledTimes(1);
  load.mockRejectedValueOnce(new RegistryConnectionUnavailableError());
  await expect(presentComplaintCases(context,[{topicLocale:"en",sourceLocale:"en"}] as ComplaintQueueCase[])).rejects.toBeInstanceOf(ComplaintStorageUnavailableError);
});
