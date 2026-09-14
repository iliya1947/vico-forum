import { Link, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { forumCategoryPath, forumTopicPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const section = await forumReaderForRequest(context).readSection(params.sectionId ?? "");
  if (!section) throw new Response("Not Found", { status: 404 });
  return { locale: params.locale ?? "en", section };
}

export default function SectionRoute() {
  const { locale, section } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: section.category.name, to: forumCategoryPath(locale, section.category.id) },
        { label: section.name },
      ]} />
      <section className="page-heading"><p className="eyebrow">{t("sectionLabel")}</p><h1>{section.name}</h1></section>
      {section.topics.length === 0 ? <EmptyState>{t("topicsEmpty")}</EmptyState> : (
        <div className="topic-table" role="table" aria-label={t("topicsHeading")}>
          <div className="topic-row topic-table-header" role="row">
            <span role="columnheader">{t("topicColumn")}</span><span role="columnheader">{t("postsColumn")}</span>
          </div>
          {section.topics.map((topic) => (
            <div className="topic-row" role="row" key={topic.id}>
              <span role="cell"><Link to={forumTopicPath(locale, topic.id)}>{topic.title.originalContent}</Link><small>{t("startedBy", { author: topic.authorName })}</small></span>
              <span role="cell" className="count-cell">{topic.postCount}</span>
            </div>
          ))}
        </div>
      )}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
