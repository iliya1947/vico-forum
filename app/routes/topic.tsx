import { Form, redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { forumMutationGuard, mutationFailure, requiredFormText, runForumMutation, type ForumMutationError } from "../forum/mutations.server";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topic = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!topic) throw new Response("Not Found", { status: 404 });
  return { locale: params.locale ?? "en", topic, authenticated: authSessionForRequest(context) !== null };
}

export async function action({ request, params, context }: {
  request: Request; params: { locale?: string; topicId?: string }; context: RouterContextProvider;
}) {
  const topicId = typeof params.topicId === "string" && params.topicId.trim() ? params.topicId : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!topicId || !locale) return mutationFailure("invalid", 400);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const body = requiredFormText(formData, "body");
  if (!body) return mutationFailure("invalid", 400);
  return runForumMutation(request, context, async (writer, authorId) => {
    await writer.createReply({ topicId, authorId, body });
    return redirect(forumTopicPath(locale, topicId));
  });
}

export default function TopicRoute() {
  const { locale, topic, authenticated } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError>();
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
        { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
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
      {authenticated && <Form method="post" className="forum-write-form">
        <h2>{t("replyHeading")}</h2>
        {actionData?.error && <p role="alert">{t(`forumWriteError_${actionData.error}`)}</p>}
        <label>{t("replyBodyLabel")}<textarea name="body" required rows={7} /></label>
        <button type="submit">{t("replySubmit")}</button>
      </Form>}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
