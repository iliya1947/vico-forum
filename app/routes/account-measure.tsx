import { data, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { userMeasuresForRequest } from "../measures/request-context";
import {
  requireMeasureSession, measurePrivateHeaders, measureResponseError, measureActionError,
  measureFormText, measureUuid, readMeasureForm,
} from "../measures/routes.server";
import { OwnMeasureDetail } from "../measures/views";
import { ForumRouteError } from "../forum/ui";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { Route } from "./+types/account-measure";

export {headers} from "./account-measures";
export function meta({matches}:Pick<Route.MetaArgs,"matches">) {
  const localeMatch=matches.find(
    (match):match is Route.MetaArgs["matches"][1]=>match?.id==="routes/locale-boundary",
  );
  const snapshot=localeMatch?.loaderData;
  const runtime=snapshot?createTranslationRuntime(snapshot):undefined;
  const title=runtime?.t("measuresDetail")??canonicalEnglishCatalog.common.measuresDetail.source;
  const product=runtime?.t("productName")??canonicalEnglishCatalog.common.productName.source;
  return [{title:`${title} · ${product}`}];
}
export async function loader({params,context}: {
  params:{locale?:string;measureId?:string};context:RouterContextProvider;
}) {
  const subjectId=requireMeasureSession(context);
  try {
    const measure=await userMeasuresForRequest(context).ownDetail(subjectId,measureUuid(params.measureId));
    return data({locale:params.locale??"en",measure,appealId:crypto.randomUUID()},{headers:measurePrivateHeaders});
  } catch(error) { throw measureResponseError(error); }
}
export async function action({request,params,context}: {
  request:Request;params:{locale?:string;measureId?:string};context:RouterContextProvider;
}) {
  const subjectId=requireMeasureSession(context);
  try {
    const measureId=measureUuid(params.measureId);
    const form=await readMeasureForm(request,["intent","appealId","body"]);
    if (measureFormText(form,"intent")!=="appeal") {
      return data({error:"invalid" as const},{status:400,headers:measurePrivateHeaders});
    }
    const result=await userMeasuresForRequest(context).submitAppeal({
      actorId:subjectId,measureId,id:measureFormText(form,"appealId"),body:measureFormText(form,"body"),
    });
    return data({ok:true as const,ordinal:result.ordinal},{headers:measurePrivateHeaders});
  } catch(error) { return measureActionError(error); }
}
export default function AccountMeasureRoute() {
  return <OwnMeasureDetail {...useLoaderData<typeof loader>()} feedback={useActionData<typeof action>()}/>;
}
export const ErrorBoundary=ForumRouteError;

export { measureShouldRevalidate as shouldRevalidate } from "../measures/revalidation";
