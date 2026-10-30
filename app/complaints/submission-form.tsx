import { useId, useState } from "react";
import { useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { COMPLAINT_REASONS } from "../../db/complaints-domain";
import type { ComplaintSubmissionResponse } from "./response";

export function ComplaintSubmissionForm({ locale, topicId, postId, revisionId }: {
  locale: string; topicId: string; postId?: string; revisionId: string;
}) {
  const { t } = useTranslation("common");
  const id = useId();
  const fetcher = useFetcher<ComplaintSubmissionResponse>();
  const [opened,setOpened] = useState(false);
  const [operationId,setOperationId] = useState("");
  const [observedRevision,setObservedRevision] = useState("");
  const [reason,setReason] = useState<string>("spam");
  const pending = fetcher.state !== "idle";
  const completed = fetcher.data && "ok" in fetcher.data && fetcher.data.operationId === operationId;
  if (completed && observedRevision === revisionId) return <p className="complaint-confirmation" role="status">{t("complaintSubmitted")}</p>;
  const title = t(postId ? "complaintReportPost" : "complaintReportTitle");
  if (!opened || completed) return <button type="button" className="complaint-open" onClick={() => {
    setOperationId(crypto.randomUUID()); setObservedRevision(revisionId); setOpened(true);
  }}>{title}</button>;
  return <fetcher.Form method="post" action={`/${encodeURIComponent(locale)}/topics/${encodeURIComponent(topicId)}/complaints`}
    className="complaint-form" aria-labelledby={id} aria-busy={pending}>
    <h3 id={id}>{title}</h3>
    <input type="hidden" name="kind" value={postId ? "post" : "topic-title"} />
    {postId && <input type="hidden" name="postId" value={postId} />}
    <input type="hidden" name="revisionId" value={observedRevision} />
    <input type="hidden" name="operationId" value={operationId} />
    <fieldset disabled={pending}>
      <label>{t("complaintReasonLabel")}<select name="reason" value={reason} onChange={event => setReason(event.target.value)}>
        {COMPLAINT_REASONS.map(key => <option key={key} value={key}>{t(`complaintReason_${key}`)}</option>)}
      </select></label>
      <label>{t(reason === "other" ? "complaintExplanationRequired" : "complaintExplanationOptional")}
        <textarea name="explanation" rows={3} required={reason === "other"} dir="auto" />
      </label>
      <div className="complaint-form-actions">
        <button type="submit">{t(pending ? "complaintSubmitting" : "complaintSubmit")}</button>
        <button type="button" onClick={() => setOpened(false)}>{t("complaintCancel")}</button>
      </div>
    </fieldset>
    {fetcher.data && "error" in fetcher.data && <p role="alert">{t(`complaintError_${fetcher.data.error}`, {
      seconds:new Intl.NumberFormat(locale).format(fetcher.data.retryAfterSeconds ?? 1),
    })}</p>}
  </fetcher.Form>;
}
