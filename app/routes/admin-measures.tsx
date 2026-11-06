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
    if ([...query.keys()].some(key=>key!=="target" && key!=="page") ||
        query.getAll("target").length>1 || query.getAll("page").length>1 ||
        (query.has("target") && query.has("page"))) {
      throw new Response("Invalid query",{status:400,headers:measurePrivateHeaders});
    }
    const input=query.get("target");
    const rawPage=query.get("page");
    if (rawPage!==null && !/^[1-9][0-9]{0,3}$/.test(rawPage)) {
      throw new Response("Invalid page",{status:400,headers:measurePrivateHeaders});
    }
    const page=rawPage===null?0:Number(rawPage)-1;
    if(page>1000)throw new Response("Invalid page",{status:400,headers:measurePrivateHeaders});
    const capability=userMeasuresForRequest(context);
    const [target,pendingAppeals,permissions] = await Promise.all([
      input ? capability.adminTarget(actorId,measureTargetId(input)) : Promise.resolve(null),
      !input ? capability.adminPendingAppeals(actorId,page) : Promise.resolve(null),
      authorizationForRequest(context).forUser(actorId).resolve(),
    ]);
    return data({locale:params.locale??"en",target,pendingAppeals,requestedTarget:input??"",
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
