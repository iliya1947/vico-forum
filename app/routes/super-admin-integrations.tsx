import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireSuperAdmin,superAdminPrivateHeaders} from "../super-admin/access.server";
import {ownerIntegrationsMonitoringContext} from "../super-admin/request-context";
import {OwnerSystemUnavailableError} from "../../db/owner-system-error";
import {SuperAdminIntegrations} from "../super-admin/integration-current";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}){
  const viewerId=requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size)throw new Response('Invalid monitoring query',{status:400,headers:superAdminPrivateHeaders});
  try{return data({locale:params.locale??'en',state:await context.get(ownerIntegrationsMonitoringContext).readCurrent(),viewerId},{headers:superAdminPrivateHeaders});}
  catch(error){if(error instanceof OwnerSystemUnavailableError)throw new Response('Unavailable',{status:503,headers:superAdminPrivateHeaders});throw error;}
}
export default function IntegrationsRoute(){return <SuperAdminIntegrations {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
