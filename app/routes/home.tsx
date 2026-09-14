import { useTranslation } from "react-i18next";
import { Link, useLoaderData, type RouterContextProvider } from "react-router";
import { forumCategoryPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { EmptyState, ForumRouteError, ForumShell } from "../forum/ui";
import type { ForumCategorySummary } from "../../db/forum-repository";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  return {
    locale: params.locale ?? "en",
    categories: await forumReaderForRequest(context).listCategories(),
  };
}

export default function Home() {
  const { t } = useTranslation("common");
  const { locale, categories } = useLoaderData<typeof loader>();
  return (
    <ForumShell locale={locale}>
      <section className="page-heading">
        <p className="eyebrow">{t("forumIndex")}</p>
        <h1>{t("categoriesHeading")}</h1>
        <p>{t("categoriesIntro")}</p>
      </section>
      {categories.length === 0 ? <EmptyState>{t("categoriesEmpty")}</EmptyState> : (
        <ul className="forum-list">
          {categories.map((category: ForumCategorySummary) => (
            <li key={category.id}>
              <Link className="forum-list-link" to={forumCategoryPath(locale, category.id)}>
                <strong>{category.name}</strong>
                <span>{t("sectionCount", { count: category.sectionCount })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
