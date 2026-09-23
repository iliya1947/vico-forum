import { Link, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { forumSectionPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; categoryId?: string };
  context: RouterContextProvider;
}) {
  const category = await forumReaderForRequest(context).readCategory(params.categoryId ?? "");
  if (!category) throw new Response("Not Found", { status: 404 });
  return { locale: params.locale ?? "en", category };
}

export default function CategoryRoute() {
  const { locale, category } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[{ label: category.name }]} />
      <section className="page-heading"><p className="eyebrow">{t("categoryLabel")}</p><h1>{category.name}</h1></section>
      {category.sections.length === 0 ? <EmptyState>{t("sectionsEmpty")}</EmptyState> : (
        <ul className="forum-list">
          {category.sections.map((section) => (
            <li key={section.id}>
              <Link className="forum-list-link" to={forumSectionPath(locale, section.id)}>
                <strong>{section.name}</strong>
                <span>{t("topicCount", { count: section.topicCount })} · {t("messageCount", { count: section.postCount })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
