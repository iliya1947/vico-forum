import { data, Link, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { requireAdminAccess } from "../admin/access.server";
import { historyForRequest, parseHistoryCursor } from "../admin/history.server";
import { historyPagePath } from "../admin/history-path";
import { AdminHistoryUnavailableError } from "../../db/hyperdrive-admin-history";
import { AdminShell } from "../admin/shell";
import { HistoryEvents } from "../admin/history";
import { ForumRouteError } from "../forum/ui";
export { headers, meta } from "./admin";
export async function loader({request,params,context}: {request: Request; params: {locale?: string}; context: RouterContextProvider}) {
  const access = await requireAdminAccess(context);
  if (!access.canReadHistory) throw new Response("Forbidden", {status:403,headers:{"Cache-Control":"private, no-store"}});
  const cursor = parseHistoryCursor(request.url);
  try {
    const page = await historyForRequest(context).read(cursor);
    return data({ locale: params.locale ?? "en", access, page, paged: !!cursor }, {headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    if (error instanceof AdminHistoryUnavailableError) throw new Response("Unavailable", {status:503,headers:{"Cache-Control":"private, no-store"}});
    throw error;
  }
}
export default function AdminHistoryRoute() {
  const {locale,access,page,paged} = useLoaderData<typeof loader>();
  const {t} = useTranslation("common");
  return <AdminShell locale={locale} access={access} current="history">
    <section aria-labelledby="admin-history-heading"><h2 id="admin-history-heading">{t("adminHistory")}</h2>
      <p>{t("historyCoverage")}</p><HistoryEvents events={page.events} locale={locale}/>
      <nav className="admin-history-paging" aria-label={t("historyPaging")}>
        {paged ? <Link to={historyPagePath(locale)}>{t("historyNewest")}</Link> : null}
        {page.next ? <Link to={historyPagePath(locale,page.next)}>{t("historyOlder")}</Link> : null}
      </nav>
    </section>
  </AdminShell>;
}
export const ErrorBoundary = ForumRouteError;
