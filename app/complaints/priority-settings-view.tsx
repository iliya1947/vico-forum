import { Link, useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { COMPLAINT_REASONS } from "../../db/complaints-domain";
import type { ComplaintPrioritySettings } from "./queue-contract";
import { complaintQueuePath } from "./queue-view";

export const complaintPrioritySettingsPath=(locale:string)=>`/${encodeURIComponent(locale)}/attention/complaints/settings`;
export function ComplaintPrioritySettingsView({locale,settings,canReview}:{locale:string;settings:ComplaintPrioritySettings;canReview:boolean}) {
  const {t}=useTranslation("common");
  const fetcher=useFetcher<{ok?:true;error?:"invalid"|"conflict"|"forbidden"|"notFound"|"unavailable"}>();
  return <ForumShell locale={locale} variant="attention"><section className="complaint-triage">
    {canReview&&<Link to={complaintQueuePath(locale)}>{t("complaintQueueHeading")}</Link>}
    <h1>{t("complaintPrioritySettingsHeading")}</h1>
    <p>{t("complaintPrioritySettingsDescription")}</p>
    <fetcher.Form key={settings.version} method="post" className="complaint-priority-form">
      <input type="hidden" name="expectedVersion" value={settings.version}/>
      <fieldset disabled={fetcher.state!=="idle"}>
        <legend>{t("complaintPrioritySettingsHeading")}</legend>
        {COMPLAINT_REASONS.map(reason=><label key={reason}>{t(`complaintReason_${reason}`)}
          <select name={reason} defaultValue={settings.weights[reason]}>
            {([1,2,3] as const).map(priority=><option key={priority} value={priority}>{t(`complaintPriority${priority}`)}</option>)}
          </select>
        </label>)}
        <button type="submit">{t("complaintPrioritySave")}</button>
      </fieldset>
    </fetcher.Form>
    {fetcher.data?.ok&&<p role="status">{t("complaintPrioritySettingsSaved")}</p>}
    {fetcher.data?.error&&<p role="alert">{t(fetcher.data.error==="conflict"?"complaintPrioritySettingsConflict":`complaintError_${fetcher.data.error}`)}</p>}
    <Link to={complaintPrioritySettingsPath(locale)}>{t("complaintPrioritySettingsReload")}</Link>
  </section></ForumShell>;
}
