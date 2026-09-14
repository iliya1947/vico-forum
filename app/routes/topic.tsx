import { Form, redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { forumMutationGuard, mutationFailure, requiredFormText, runForumMutation, type ForumMutationError } from "../forum/mutations.server";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumMarkdown } from "../forum/markdown";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topic = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!topic) throw new Response("Not Found", { status: 404 });
  const session = authSessionForRequest(context);
  return { locale: params.locale ?? "en", topic, authenticated: session !== null, canManageSolution: session?.user.id === topic.authorId };
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
  const intent = requiredFormText(formData, "intent") ?? "reply";
  if (intent === "markSolved") return runForumMutation(request, context, async (writer, actorId) => {
    await writer.markTopicSolved({ topicId, actorId });
    return redirect(forumTopicPath(locale, topicId));
  });
  if (intent === "selectBestAnswer") {
    const postId = requiredFormText(formData, "postId");
    if (!postId) return mutationFailure("invalid", 400);
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.selectBestAnswer({ topicId, postId, actorId });
      return redirect(`${forumTopicPath(locale, topicId)}#post-${encodeURIComponent(postId)}`);
    });
  }
  if (intent !== "reply") return mutationFailure("invalid", 400);
  const body = requiredFormText(formData, "body");
  if (!body) return mutationFailure("invalid", 400);
  return runForumMutation(request, context, async (writer, authorId) => {
    await writer.createReply({ topicId, authorId, body });
    return redirect(forumTopicPath(locale, topicId));
  });
}

export default function TopicRoute() {
  const { locale, topic, authenticated, canManageSolution } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError>();
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
        { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
        { label: topic.title.originalContent },
      ]} />
      <section className="page-heading"><p className="eyebrow">{t("topicLabel")}</p><h1>{topic.title.originalContent}</h1><p>{t("startedBy", { author: topic.authorName })}</p>
        {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
        {topic.bestAnswerPostId && <p><a href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>{t("goToSolution")}</a></p>}
        {canManageSolution && !topic.isSolved && <Form method="post"><input type="hidden" name="intent" value="markSolved" /><button type="submit">{t("markSolved")}</button></Form>}
      </section>
      {topic.posts.length === 0 ? <EmptyState>{t("postsEmpty")}</EmptyState> : (
        <ol className="post-list">
          {topic.posts.map((post, index) => (
            <li id={`post-${post.id}`} className={`forum-post${topic.bestAnswerPostId === post.id ? " best-answer" : ""}`} key={post.id}>
              <header><strong>{post.authorName}</strong><span>{t("postNumber", { number: index + 1 })}</span></header>
              {topic.bestAnswerPostId === post.id && <strong className="best-answer-label">{t("bestAnswer")}</strong>}
              <ForumMarkdown>{post.body.originalContent}</ForumMarkdown>
              {canManageSolution && topic.isSolved && topic.bestAnswerPostId !== post.id && <Form method="post" className="solution-form"><input type="hidden" name="intent" value="selectBestAnswer" /><input type="hidden" name="postId" value={post.id} /><button type="submit">{t("selectBestAnswer")}</button></Form>}
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
