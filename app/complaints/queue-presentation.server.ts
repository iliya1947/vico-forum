import type { RouterContextProvider } from "react-router";
import { registryForRequest } from "../localization/request-context";
import type { ComplaintQueueCase } from "./queue-contract";
import { RegistryConnectionUnavailableError } from "../localization/persistent-registry";
import { ComplaintStorageUnavailableError } from "../../db/hyperdrive-complaints";

export async function presentComplaintCases(context: RouterContextProvider, cases: ComplaintQueueCase[]): Promise<ComplaintQueueCase[]> {
  if(!cases.length)return [];
  const {registry}=await registryForRequest(context).catch(error=>{
    if(error instanceof RegistryConnectionUnavailableError)throw new ComplaintStorageUnavailableError("complaint source registry unavailable",{cause:error});
    throw error;
  });
  const direction=(locale:string)=>locale==="und"?"auto" as const:registry.find(locale)?.locale.direction??"auto" as const;
  return cases.map(item=>({...item,topicDirection:direction(item.topicLocale),excerptDirection:direction(item.sourceLocale)}));
}
