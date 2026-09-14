import { useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { forumReaderForRequest } from "../forum/request-context";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topic = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!topic) throw new Response("Not Found", { status: 404 });
  return { locale: params.locale ?? "en", topic };
}

export default function TopicRoute() {
  const { locale, topic } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: topic.section.category.name, to: `/${locale}/categories/${topic.section.category.id}` },
        { label: topic.section.name, to: `/${locale}/sections/${topic.section.id}` },
        { label: topic.title.originalContent },
      ]} />
      <section className="page-heading"><p className="eyebrow">{t("topicLabel")}</p><h1>{topic.title.originalContent}</h1><p>{t("startedBy", { author: topic.authorName })}</p></section>
      {topic.posts.length === 0 ? <EmptyState>{t("postsEmpty")}</EmptyState> : (
        <ol className="post-list">
          {topic.posts.map((post, index) => (
            <li className="forum-post" key={post.id}>
              <header><strong>{post.authorName}</strong><span>{t("postNumber", { number: index + 1 })}</span></header>
              <p className="post-body">{post.body.originalContent}</p>
            </li>
          ))}
        </ol>
      )}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
