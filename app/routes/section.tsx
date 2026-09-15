import { Form, Link, redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { forumMutationGuard, requireForumPermission, requiredFormText, runForumMutation, mutationFailure, type ForumMutationError } from "../forum/mutations.server";
import { authorizationForRequest } from "../authorization/request-context";
import { forumCategoryPath, forumTopicPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const section = await forumReaderForRequest(context).readSection(params.sectionId ?? "");
  if (!section) throw new Response("Not Found", { status: 404 });
  const session = authSessionForRequest(context);
  const canCreateTopic = session ? await authorizationForRequest(context).forUser(session.user.id).has("forum.topic.create") : false;
  return { locale: params.locale ?? "en", section, canCreateTopic };
}

export async function action({ request, params, context }: {
  request: Request; params: { locale?: string; sectionId?: string }; context: RouterContextProvider;
}) {
  const sectionId = typeof params.sectionId === "string" && params.sectionId.trim() ? params.sectionId : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!sectionId || !locale) return mutationFailure("invalid", 400);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  const forbidden = await requireForumPermission(context, "forum.topic.create");
  if (forbidden) return forbidden;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const title = requiredFormText(formData, "title");
  const body = requiredFormText(formData, "body");
  if (!title || !body) return mutationFailure("invalid", 400);
  return runForumMutation(request, context, async (writer, authorId) => {
    const created = await writer.createTopic({ sectionId, authorId, title, body });
    return redirect(forumTopicPath(locale, created.topicId));
  });
}

export default function SectionRoute() {
  const { locale, section, canCreateTopic } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError>();
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
      {canCreateTopic && <Form method="post" className="forum-write-form">
        <h2>{t("createTopicHeading")}</h2>
        {actionData?.error && <p role="alert">{t(`forumWriteError_${actionData.error}`)}</p>}
        <label>{t("topicTitleLabel")}<input name="title" required /></label>
        <label>{t("initialPostLabel")}<textarea name="body" required rows={7} /></label>
        <button type="submit">{t("createTopicSubmit")}</button>
      </Form>}
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
