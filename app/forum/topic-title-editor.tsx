import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumMutationError, TopicTitleEditResult } from "./mutations.server";
import { forumTopicPath } from "./paths";

/** A short, revision-bound form; revalidation never replaces the author's input. */
export function TopicTitleEditor({ topicId, actorId, locale, title, canEdit }: {
  topicId: string; actorId: string; locale: string;
  title: { id: string; originalContent: string }; canEdit: boolean;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicTitleEditResult | ForumMutationError>();
  const revalidator = useRevalidator();
  const [draft, setDraft] = useState<{ text: string; revisionId: string } | null>(null);
  const submitted = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreOpenerFocus = useRef(false);
  const pending = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const conflict = fetcher.data && "currentTitle" in fetcher.data ? fetcher.data.currentTitle : null;

  useEffect(() => {
    if (fetcher.state !== "idle" || !submitted.current || !fetcher.data) return;
    submitted.current = false;
    if ("ok" in fetcher.data && fetcher.data.ok) {
      restoreOpenerFocus.current = true;
      setDraft(null);
    } else if ("error" in fetcher.data && ["conflict", "unauthenticated", "forbidden"].includes(fetcher.data.error)) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  useEffect(() => {
    if (draft !== null || !restoreOpenerFocus.current || !opener.current || opener.current.hidden) return;
    restoreOpenerFocus.current = false;
    opener.current.focus();
  }, [draft, canEdit]);

  if (!canEdit && !draft) return null;
  return <div className="topic-title-editor">
    <button type="button" ref={opener} hidden={draft !== null} onClick={() => {
      fetcher.reset();
      setDraft({ text: title.originalContent, revisionId: title.id });
    }}>{t("topicTitleEdit")}</button>
    {draft && <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
      aria-label={t("topicTitleEdit")} aria-busy={pending}
      onSubmit={event => {
        if (!canEdit || pending || error === "conflict") event.preventDefault();
        else submitted.current = true;
      }}>
      <input type="hidden" name="intent" value="editTopicTitle" />
      <input type="hidden" name="expectedRevisionId" value={draft.revisionId} />
      <input type="hidden" name="editorActorId" value={actorId} />
      <label>{t("topicTitleLabel")}
        <input name="title" dir="auto" required value={draft.text} disabled={pending}
          onChange={event => setDraft({ ...draft, text: event.target.value })} />
      </label>
      {error && <p role="alert">{t(error === "conflict" ? "topicTitleEditConflict" : `forumWriteError_${error}`)}</p>}
      {conflict && error === "conflict" && <div>
        <p dir="auto">{conflict.originalContent}</p>
        <button type="button" disabled={pending || !canEdit} onClick={() => {
          setDraft({ ...draft, revisionId: conflict.id });
          fetcher.reset();
        }}>{t("topicTitleEditUseCurrent")}</button>
      </div>}
      <div className="topic-title-editor-actions">
        <button type="submit" disabled={pending || !canEdit || !draft.text.trim() || error === "conflict"}>
          {t("postEditSave")}
        </button>
        <button type="button" disabled={pending} onClick={() => {
          restoreOpenerFocus.current = true;
          setDraft(null);
          fetcher.reset();
        }}>{t("postEditCancel")}</button>
      </div>
    </fetcher.Form>}
  </div>;
}
