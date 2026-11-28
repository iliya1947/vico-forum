import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireAdminAccess } from "../admin/access.server";
import { AdminOverview } from "../admin/overview";
import { ForumRouteError } from "../forum/ui";
import { forumReaderForRequest } from "../forum/request-context";
import { historyForRequest } from "../admin/history.server";
import { readAdminOverview } from "../admin/overview.server";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { Route } from "./+types/admin";

export function headers() { return {"Cache-Control":"private, no-store"}; }
export function meta({ matches }: Pick<Route.MetaArgs, "matches">) {
  const localeMatch = matches.find(
    (match): match is Route.MetaArgs["matches"][1] => match?.id === "routes/locale-boundary",
  );
  const snapshot = localeMatch?.loaderData;
  const runtime = snapshot ? createTranslationRuntime(snapshot) : undefined;
  const title = runtime?.t("adminPanelTitle") ?? canonicalEnglishCatalog.common.adminPanelTitle.source;
  const product = runtime?.t("productName") ?? canonicalEnglishCatalog.common.productName.source;
  return [{ title: `${title} · ${product}` }];
}
export async function loader({params,context}: {params: {locale?: string}; context: RouterContextProvider}) {
  const access=await requireAdminAccess(context);
  const overview = await readAdminOverview(access, { readAdminOverviewCounts: () => forumReaderForRequest(context).readAdminOverviewCounts() }, {
    read: (cursor, limit) => historyForRequest(context).read(cursor, limit),
  });
  return data({locale:params.locale ?? "en",access,...overview},{headers:{"Cache-Control":"private, no-store"}});
}
export default function AdminRoute() { return <AdminOverview {...useLoaderData<typeof loader>()} />; }
export const ErrorBoundary=ForumRouteError;
