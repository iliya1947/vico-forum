import { Form, Link, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { forumCategoryPath, forumTopicPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import type { ForumMutationError } from "../forum/mutations.server";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export { sectionAction as action } from "../forum/actions.server";

export async function loader({ params, context }: {
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const section = await forumReaderForRequest(context).readSection(params.sectionId ?? "");
  if (!section) throw new Response("Not Found", { status: 404 });
  const session = authSessionForRequest(context);
  let canCreateTopic = false;
  if (session) {
    try {
      canCreateTopic = await authorizationForRequest(context).forUser(session.user.id).has("forum.topic.create");
    } catch {
      // Public section reads remain available when optional presentation authorization is unavailable.
    }
  }
  return { locale: params.locale ?? "en", section, canCreateTopic };
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
