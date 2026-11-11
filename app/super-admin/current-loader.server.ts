import { data, type RouterContextProvider } from "react-router";
import { SA02_MONITORS, type Sa02Area } from "../../db/owner-sa02-catalog";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { requireSuperAdmin, superAdminPrivateHeaders } from "./access.server";
import { ownerSa02MonitoringForRequest } from "./request-context";

export async function loadSa02CurrentArea({request,params,context}:{
  request:Request;params:{locale?:string};context:RouterContextProvider;
},area:Sa02Area){
  requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size!==0)
    throw new Response("Invalid monitoring query",{status:400,headers:superAdminPrivateHeaders});
  try{
    const snapshot=await ownerSa02MonitoringForRequest(context).readSa02Current();
    return data({locale:params.locale??"en",area,
      state:{...snapshot,monitors:snapshot.monitors.filter(m=>
        (SA02_MONITORS[area] as readonly string[]).includes(m.key))}},
      {headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)
      throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
