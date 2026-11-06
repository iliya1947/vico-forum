import { data, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { userMeasuresForRequest } from "../measures/request-context";
import {
  requireMeasureManager, measurePrivateHeaders, measureResponseError, measureActionError,
  measureFormText, measureFormRestrictions, measureOptionalInstant, measureUuid, readMeasureForm,
} from "../measures/routes.server";
import { AdminMeasureDetail } from "../measures/views";
import { ForumRouteError } from "../forum/ui";
import { authorizationForRequest } from "../authorization/request-context";
import { adminAccess } from "../admin/access";
export {headers,meta} from "./admin";

export async function loader({params,context}:{
  params:{locale?:string;measureId?:string};context:RouterContextProvider;
}) {
  const actorId=await requireMeasureManager(context);
  try {
    const measure=await userMeasuresForRequest(context).adminDetail(actorId,measureUuid(params.measureId));
    const permissions=await authorizationForRequest(context).forUser(actorId).resolve();
    return data({locale:params.locale??"en",measure,
      changeId:crypto.randomUUID(),liftId:crypto.randomUUID(),
      reviewIds:measure.appeals.map(item=>({appealId:item.id,operationId:crypto.randomUUID()})),
      access:adminAccess(new Set(permissions.effectivePermissions))},
      {headers:measurePrivateHeaders});
  } catch(error) { throw measureResponseError(error); }
}
export async function action({request,params,context}:{
  request:Request;params:{locale?:string;measureId?:string};context:RouterContextProvider;
}) {
  const actorId=await requireMeasureManager(context);
  try {
    const measureId=measureUuid(params.measureId);
    const form=await readMeasureForm(request,[
      "intent","operationId","expectedVersion","reason","explanation","restriction",
      "expiresAt","appealId","outcome","remedy",
    ]);
    const intent=measureFormText(form,"intent");
    const operationId=measureFormText(form,"operationId");
    const expectedVersion=Number(measureFormText(form,"expectedVersion"));
    const capability=userMeasuresForRequest(context);
    if(intent==="change"){
      await capability.change({measureId,operationId,actorId,expectedVersion,
        reason:measureFormText(form,"reason"),
        restrictions:measureFormRestrictions(form),expiresAt:measureOptionalInstant(form)});
    } else if(intent==="lift"){
      await capability.lift({measureId,operationId,actorId,expectedVersion,
        reason:measureFormText(form,"reason")});
    } else if(intent==="review"){
      const outcome=measureFormText(form,"outcome");
      const remedy=measureFormText(form,"remedy");
      await capability.resolveAppeal({measureId,operationId,actorId,expectedVersion,
        appealId:measureFormText(form,"appealId"),outcome,explanation:measureFormText(form,"explanation"),
        remedy:remedy===""?null:remedy,
        restrictions:remedy==="change"?measureFormRestrictions(form):null,
        expiresAt:remedy==="change"?measureOptionalInstant(form):null});
    } else return data({error:"invalid" as const},{status:400,headers:measurePrivateHeaders});
    return data({ok:true as const},{headers:measurePrivateHeaders});
  } catch(error) { return measureActionError(error); }
}
export default function AdminMeasureRoute() {
  return <AdminMeasureDetail {...useLoaderData<typeof loader>()} feedback={useActionData<typeof action>()}/>;
}
export const ErrorBoundary=ForumRouteError;
