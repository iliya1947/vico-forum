import { data,type RouterContextProvider } from "react-router";
import { requireSuperAdmin,superAdminPrivateHeaders } from "./access.server";
import { ownerNativeMonitoringForRequest } from "./request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import type { NativeMonitorArea } from "../../db/owner-monitor-catalog";

export async function loadNativeCurrentArea(args:{request:Request;params:{locale?:string};context:RouterContextProvider},area:NativeMonitorArea){
  const viewerId=requireSuperAdmin(args.context);
  if(new URL(args.request.url).searchParams.size)throw new Response("Invalid monitoring query",{status:400,headers:superAdminPrivateHeaders});
  try{
    const state=await ownerNativeMonitoringForRequest(args.context).readNativeCurrent(area);
    return data({locale:args.params.locale??"en",area,viewerId,state},{headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
