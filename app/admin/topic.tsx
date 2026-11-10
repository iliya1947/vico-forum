import { useAdministrativeRouting } from "../administrative-routing/provider";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AdminAccess } from "./access";
import type { AdminTopic } from "./topic-model";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { AdminShell } from "./shell";
import { adminForumPath, adminCategoryPath, adminSectionPath } from "./forum-paths";
import { TopicQuickActions } from "./quick-actions";
import { MessageQuickActions } from "./message-quick-actions";
import { TopicTitlePresentation, PostBodyPresentation } from "../forum/content-translation-view";
import { ForumAttachmentDisplay } from "../forum/attachment-presentation";
import { ForumInlineAttachmentProvider } from "../forum/markdown";
import { forumTopicPath, forumProfilePath } from "../forum/paths";

interface AdminTopicViewProps {
  locale: string;
  access: AdminAccess;
  topic: AdminTopic;
  titlePresentation: ContentTranslationPresentation;
  postPresentations: readonly ContentTranslationPresentation[];
  canManagePin: boolean;
  canManageClosure?: boolean;
  canManageAnySolution: boolean;
  canManageHelpDuplicate: boolean;
  canCorrectAnySourceLocale: boolean;
  canReadPostHistory?: boolean;
  actorId?: string;
  canModerateHelpSolution: boolean;
  pendingDuplicateAppeal: { id: string } | null;
}

export function AdminTopicView({
  locale, access, topic, titlePresentation, postPresentations,
  canManagePin, canManageClosure = false, canManageAnySolution, canManageHelpDuplicate, canCorrectAnySourceLocale,
  canReadPostHistory = false, actorId,
  canModerateHelpSolution, pendingDuplicateAppeal,
}: AdminTopicViewProps) {
  const { t } = useTranslation("common");
  const routing = useAdministrativeRouting();
  const numbers = new Map(topic.posts.map((post, index) => [post.id, index + 1]));
  const byId = new Map(postPresentations.map((presentation) => [presentation.contentId, presentation]));
  const original = topic.posts[0];
  const selected = topic.bestAnswerPostId
    ? topic.posts.find((post) => post.id === topic.bestAnswerPostId) : undefined;
  const ordered = original ? [
    original,
    ...(selected && selected.id !== original.id ? [selected] : []),
    ...topic.posts.slice(1).filter((post) => post.id !== selected?.id),
  ] : [];
  const publicTopic = forumTopicPath(locale, topic.id);
  const timestamp = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone: "UTC" });

  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum admin-topic" aria-labelledby="admin-topic-heading">
      <nav className="admin-forum-trail" aria-label={t("adminForumLocation")}>
        <Link to={adminForumPath(locale,routing)}>{t("adminForum")}</Link>
        <Link to={adminCategoryPath(locale, topic.section.category.id,routing)}><bdi>{topic.section.category.name}</bdi></Link>
        <Link to={adminSectionPath(locale, topic.section.id,routing)}><bdi>{topic.section.name}</bdi></Link>
        <span aria-current="page"><bdi dir="auto">{titlePresentation.content}</bdi></span>
      </nav>
      <div id="admin-topic-heading"><TopicTitlePresentation presentation={titlePresentation} as="h2"/></div>
      <p>{t("startedBy", { author: topic.authorName })}</p>
      <div className="admin-topic-status">
        {topic.isPinned ? <span>{t("pinnedHeading")}</span> : null}
        {topic.isSolved ? <span>{t("solved")}</span> : null}
        {topic.isClosed ? <span>{t("topicClosedStatus")}</span> : null}
        {topic.duplicateOf ? <span>{t("helpDuplicateBadge")}</span> : null}
        {topic.needsDetails ? <span>{t("helpSolutionsFilterNeedsDetails")}</span> : null}
      </div>
      <p><Link to={publicTopic}>{t("topicLabel")}</Link></p>
      <TopicQuickActions
        locale={locale} inline topic={topic} canManagePin={canManagePin}
        canManageClosure={canManageClosure} actorId={actorId}
        canManageAnySolution={canManageAnySolution} canManageHelpDuplicate={canManageHelpDuplicate}
        canCorrectAnySourceLocale={canCorrectAnySourceLocale} canModerateHelpSolution={canModerateHelpSolution}
        pendingDuplicateAppeal={pendingDuplicateAppeal}
        postCandidates={topic.posts.slice(1).map((post) => ({ id: post.id, number: numbers.get(post.id)! }))}
      />
      <h3>{t("postsColumn")}</h3>
      {!ordered.length ? <p>{t("postsEmpty")}</p> :
        <ol className="post-list topic-message-list">
          {ordered.map((post) => {
            const presentation = byId.get(post.id)!;
            const postAnchor = `post-${post.id}`;
            const number = numbers.get(post.id)!;
            return <li key={post.id} id={postAnchor} className={[
              "forum-post", "topic-message",
              post.id === original?.id ? "original-question" : "",
              post.id === topic.bestAnswerPostId ? "best-answer" : "",
            ].filter(Boolean).join(" ")}>
              <header className="topic-message-author">
                <Link className="topic-message-profile-link" to={forumProfilePath(locale, post.authorId)}>
                  <strong dir="auto">{post.authorName}</strong>
                </Link>
                {post.id === original?.id ? <strong className="original-question-label">{t("originalQuestion")}</strong> : null}
                {post.id === topic.bestAnswerPostId ? <strong className="best-answer-label">{t("bestAnswer")}</strong> : null}
                {canModerateHelpSolution && post.solutionModerationStatus === "needs-review"
                  ? <strong className="solution-moderation-badge is-needs-review">{t("helpSolutionNeedsReview")}</strong> : null}
                {post.solutionModerationStatus === "outdated"
                  ? <strong className="solution-moderation-badge is-outdated">{t("helpSolutionOutdated")}</strong> : null}
                <a className="topic-message-anchor" href={`${publicTopic}#post-${encodeURIComponent(post.id)}`}>
                  {t("postNumber", { number })}
                </a>
                <time dateTime={post.createdAt}>{timestamp(post.createdAt)}</time>
              </header>
              <div className="forum-post-content">
                <ForumInlineAttachmentProvider attachments={post.attachments.map((attachment) => ({
                  ...attachment,
                  url: `/api/attachments/file/${encodeURIComponent(attachment.id)}?post=${encodeURIComponent(post.id)}`,
                }))}>
                  <PostBodyPresentation presentation={presentation}/>
                </ForumInlineAttachmentProvider>
                {post.solutionModerationStatus === "outdated" && (
                  post.solutionOutdatedReasonKind === "best-answer-replaced" || post.solutionOutdatedReason
                ) ? <p className="help-solution-outdated-reason">
                  {t("helpSolutionOutdatedReasonLabel")}: {
                    post.solutionOutdatedReasonKind === "best-answer-replaced"
                      ? t("helpSolutionOutdatedReasonBestAnswerReplaced") : post.solutionOutdatedReason
                  }
                </p> : null}
                {post.editedAt ? <small className="topic-message-edited">
                  {t("postEditedAt", { date: timestamp(post.editedAt) })}
                </small> : null}
                {post.attachments.length ? <div className="topic-message-attachments" aria-label={t("editorAttachments")}>
                  {post.attachments.map((attachment) => <ForumAttachmentDisplay
                    key={attachment.id} attachment={attachment}
                    url={`/api/attachments/file/${encodeURIComponent(attachment.id)}?post=${encodeURIComponent(post.id)}`}
                  />)}
                </div> : null}
                <MessageQuickActions locale={locale} topicId={topic.id} postId={post.id}
                  revisionId={post.body.id} sourceLocale={post.body.sourceLocale} actorId={actorId}
                  canCorrectAnySourceLocale={canCorrectAnySourceLocale} canReadPostHistory={canReadPostHistory}/>
                {post.parentPostId && numbers.has(post.parentPostId) ? <a
                  className="topic-message-parent-link" href={`#post-${encodeURIComponent(post.parentPostId)}`}>
                  {t("replyToMessageNumberCompact", { number: numbers.get(post.parentPostId)! })}
                </a> : null}
              </div>
            </li>;
          })}
        </ol>}
    </section>
  </AdminShell>;
}
