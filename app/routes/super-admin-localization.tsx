import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireSuperAdmin,superAdminPrivateHeaders} from "../super-admin/access.server";
import {ownerLocalizationMonitoringContext} from "../super-admin/request-context";
import {OwnerSystemUnavailableError} from "../../db/owner-system-error";
import {SuperAdminLocalization} from "../super-admin/localization-current";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}){
  const viewerId=requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size)throw new Response("Invalid monitoring query",{status:400,headers:superAdminPrivateHeaders});
  try{
    const state=await context.get(ownerLocalizationMonitoringContext).readCurrent();
    return data({locale:params.locale??"en",state,viewerId},{headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function LocalizationRoute(){return <SuperAdminLocalization {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
