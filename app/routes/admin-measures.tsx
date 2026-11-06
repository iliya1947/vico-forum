import { data, redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { userMeasuresForRequest } from "../measures/request-context";
import {
  requireMeasureManager, measurePrivateHeaders, measureResponseError, measureActionError,
  measureFormText, measureFormRestrictions, measureTargetId, measureOptionalInstant, readMeasureForm,
} from "../measures/routes.server";
import { AdminMeasuresIndex } from "../measures/views";
import { ForumRouteError } from "../forum/ui";
import { authorizationForRequest } from "../authorization/request-context";
import { adminAccess } from "../admin/access";
export {headers,meta} from "./admin";

export async function loader({request,params,context}:{
  request:Request;params:{locale?:string};context:RouterContextProvider;
}) {
  const actorId=await requireMeasureManager(context);
  try {
    const query=new URL(request.url).searchParams;
    if (query.getAll("target").length>1 || [...query.keys()].some(key=>key!=="target")) {
      throw new Response("Invalid query",{status:400,headers:measurePrivateHeaders});
    }
    const input=query.get("target");
    const target=input ? await userMeasuresForRequest(context).adminTarget(actorId,measureTargetId(input)) : null;
    const permissions=await authorizationForRequest(context).forUser(actorId).resolve();
    return data({locale:params.locale??"en",target,requestedTarget:input??"",
      createId:crypto.randomUUID(),access:adminAccess(new Set(permissions.effectivePermissions))},
      {headers:measurePrivateHeaders});
  } catch(error) { if(error instanceof Response)throw error; throw measureResponseError(error); }
}
export async function action({request,params,context}:{
  request:Request;params:{locale?:string};context:RouterContextProvider;
}) {
  const actorId=await requireMeasureManager(context);
  try {
    const form=await readMeasureForm(request,["intent","measureId","targetId","reason","expiresAt","restriction"]);
    if (measureFormText(form,"intent")!=="create") {
      return data({error:"invalid" as const},{status:400,headers:measurePrivateHeaders});
    }
    const result=await userMeasuresForRequest(context).create({
      id:measureFormText(form,"measureId"),actorId,targetUserId:measureFormText(form,"targetId"),
      reason:measureFormText(form,"reason"),expiresAt:measureOptionalInstant(form),
      restrictions:measureFormRestrictions(form),
    });
    return redirect("/"+encodeURIComponent(params.locale??"en")+"/admin/measures/"+encodeURIComponent(result.id),
      {headers:measurePrivateHeaders});
  } catch(error) { return measureActionError(error); }
}
export default function AdminMeasuresRoute() {
  return <AdminMeasuresIndex {...useLoaderData<typeof loader>()} feedback={useActionData<typeof action>()}/>;
}
export const ErrorBoundary=ForumRouteError;

export { measureShouldRevalidate as shouldRevalidate } from "../measures/revalidation";
