import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireSuperAdmin,superAdminPrivateHeaders} from "../super-admin/access.server";
import {ownerFilesMonitoringContext,ownerNativeMonitoringForRequest} from "../super-admin/request-context";
import {OwnerSystemUnavailableError} from "../../db/hyperdrive-owner-system";
import {SuperAdminBackground} from "../super-admin/task-current";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}){
  const viewerId=requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size)throw new Response("Invalid monitoring query",{status:400,headers:superAdminPrivateHeaders});
  try{
    const state=await ownerNativeMonitoringForRequest(context).readTaskCurrent();
    const cleanup=await context.get(ownerFilesMonitoringContext).readCleanup();
    return data({locale:params.locale??"en",state,cleanup,viewerId},{headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function BackgroundRoute(){return <SuperAdminBackground {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
