import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireMeasureSession, measurePrivateHeaders, measureResponseError } from "../measures/routes.server";
import { userMeasuresForRequest } from "../measures/request-context";
import { OwnMeasuresIndex } from "../measures/views";
import { ForumRouteError } from "../forum/ui";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { Route } from "./+types/account-measures";

export function headers() { return measurePrivateHeaders; }
export function meta({matches}:Pick<Route.MetaArgs,"matches">) {
  const localeMatch=matches.find(
    (match):match is Route.MetaArgs["matches"][1]=>match?.id==="routes/locale-boundary",
  );
  const snapshot=localeMatch?.loaderData;
  const runtime=snapshot?createTranslationRuntime(snapshot):undefined;
  const title=runtime?.t("measuresOwn")??canonicalEnglishCatalog.common.measuresOwn.source;
  const product=runtime?.t("productName")??canonicalEnglishCatalog.common.productName.source;
  return [{title:`${title} · ${product}`}];
}
export async function loader({ params, context }: {
  params:{locale?:string};context:RouterContextProvider;
}) {
  const subjectId=requireMeasureSession(context);
  try {
    const measures=await userMeasuresForRequest(context).ownList(subjectId);
    return data({locale:params.locale??"en",measures},{headers:measurePrivateHeaders});
  } catch(error) { throw measureResponseError(error); }
}
export default function AccountMeasuresRoute() {
  return <OwnMeasuresIndex {...useLoaderData<typeof loader>()}/>;
}
export const ErrorBoundary=ForumRouteError;
