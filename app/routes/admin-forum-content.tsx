import { data, Link, useLoaderData, type HeadersArgs, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { requireAdminAccess } from "../admin/access.server";
import { AdminShell } from "../admin/shell";
import { hiddenQueuePath, hiddenQueueQuery, hiddenInspectionPath } from "../admin/visibility-queue-path";
import { hiddenQueuePrivateHeaders, readHiddenQueue } from "../admin/visibility-queue.server";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { ForumRouteError } from "../forum/ui";

export { meta } from "./admin";

export function headers({ parentHeaders }: HeadersArgs) {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "private, no-store");
  return result;
}

export async function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  // Fresh capability, not generic Admin admission. Validate cursor only after
  // admission, so denied actors do not gain even a private query oracle.
  const access = await requireAdminAccess(context);
  if (!access.canManageVisibility) throw new Response("Forbidden", {
    status: 403, headers: hiddenQueuePrivateHeaders,
  });
  const appQuery = new URLSearchParams();
  for (const [key, value] of new URL(request.url).searchParams) {
    if (key !== ".data" && key !== "_routes") appQuery.append(key, value);
  }
  const query = hiddenQueueQuery(appQuery);
  const page = await readHiddenQueue(context, query);
  return data({ locale: params.locale ?? "en", access, query, page }, {
    headers: hiddenQueuePrivateHeaders,
  });
}

export default function AdminHiddenContentRoute() {
  const { locale, access, query, page } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const routing = useAdministrativeRouting();
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-hidden-queue-heading">
      <h2 id="admin-hidden-queue-heading">{t("adminHiddenQueueTitle")}</h2>
      <nav className="admin-forum-paging" aria-label={t("adminHiddenQueueTitle")}>
        <Link to={hiddenQueuePath(locale, "topic", undefined, routing)}
          aria-current={query.kind === "topic" ? "page" : undefined}>{t("adminHiddenTopics")}</Link>
        <Link to={hiddenQueuePath(locale, "post", undefined, routing)}
          aria-current={query.kind === "post" ? "page" : undefined}>{t("adminHiddenPosts")}</Link>
      </nav>
      {page.items.length
        ? <ul className="admin-forum-objects">
          {page.items.map(item => <li key={item.kind + ":" + item.id}>
            <h3><Link to={hiddenInspectionPath(locale,
              item.kind==="topic"?{kind:"topic",topicId:item.topicId}:
                {kind:"post",topicId:item.topicId,postId:item.id},routing)}>
              {t("adminHiddenInspectorOpen")}: <bdi>{item.id}</bdi>
            </Link></h3>
            <dl>
              <div><dt>{t("adminHiddenQueueChangedAt")}</dt>
                <dd><time dateTime={item.changedAt}><bdi>{item.changedAt}</bdi></time></dd></div>
              <div><dt>{t("adminHiddenQueueVersion")}</dt><dd>{item.visibilityVersion}</dd></div>
              {item.kind === "post" ? <>
                <div><dt>{t("adminHiddenQueueTopicRef")}</dt><dd><bdi>{item.topicId}</bdi></dd></div>
                {item.parentPostId ? <div><dt>{t("adminHiddenQueueParentRef")}</dt>
                  <dd><bdi>{item.parentPostId}</bdi></dd></div> : null}
                <div><dt>{t("adminHiddenQueueContextStatus")}</dt>
                  <dd>{t(item.parentUnavailable
                    ? "adminHiddenQueueParentUnavailable" : "adminHiddenQueueParentAvailable")}</dd></div>
              </> : null}
            </dl>
          </li>)}
        </ul>
        : <p>{t("adminForumEmpty")}</p>}
      <nav className="admin-forum-paging" aria-label={t("adminForumPaging")}>
        {query.before ? <Link to={hiddenQueuePath(locale, query.kind, undefined, routing)}>{t("adminForumFirst")}</Link> : null}
        {page.next ? <Link to={hiddenQueuePath(locale, query.kind, page.next, routing)}>{t("adminForumNext")}</Link> : null}
      </nav>
    </section>
  </AdminShell>;
}

export const ErrorBoundary = ForumRouteError;
