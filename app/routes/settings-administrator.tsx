import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { authorizationForRequest, authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ADMIN_ADMISSION_PERMISSIONS, adminAccess } from "../admin/access";
import type { PermissionKey } from "../authorization/catalog";
import {
  ATTENTION_MODES, ATTENTION_GROUPS, allowedAdminEntries, allowedAttentionEntries,
  canEnterAdministratorPreferences, adminEntryPath, type AdminEntryId,
  type AttentionEntryMode, type AttentionEntryGroup,
} from "../settings/workspace-access";
import {
  useAdministratorPreferences, updateAdministratorPreferences,
  selectAdminEntry, selectAttentionEntry,
} from "../settings/administrator-preferences";
import { SettingsShell } from "../settings/shell";
import { ForumRouteError } from "../forum/ui";
import { settingsPrivateHeaders } from "./settings";

export function headers() { return settingsPrivateHeaders; }

export async function loader({ params, context }: {
  params: { locale?: string }; context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  try {
    const permissions = authorizationForRequest(context).forUser(session.user.id);
    const resolved = await Promise.all(ADMIN_ADMISSION_PERMISSIONS.map(async key =>
      await permissions.has(key) ? key : null));
    const allowed = new Set<PermissionKey>(resolved.filter((key): key is NonNullable<typeof key> => key !== null));
    const admin = allowedAdminEntries(adminAccess(allowed));
    const [signals, duplicates, details, security, complaints, priorities, appeals] = await Promise.all([
      permissions.has("forum.solution.manageAny"),
      permissions.has("forum.helpDuplicate.manage"),
      permissions.has("forum.helpNeedsDetails.manage"),
      permissions.has("forum.attachmentSecurity.read"),
      permissions.has("forum.complaint.review"),
      permissions.has("forum.complaint.priority.manage"),
      permissions.has("forum.complaint.appeal.review"),
    ]);
    const attention = allowedAttentionEntries({
      canViewSignals: signals || duplicates || details,
      canReadSecurity: security,
      canReviewComplaints: complaints,
      canReviewAppeals: appeals,
      canManageComplaintPriorities: priorities,
    });
    if (!canEnterAdministratorPreferences(admin, attention)) throw new Response("Forbidden", {
      status: 403, headers: settingsPrivateHeaders,
    });
    return data({
      locale: params.locale ?? "en",
      accountId: session.user.id,
      canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
      admin, attention,
    }, { headers: settingsPrivateHeaders });
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) throw new Response("Unavailable", {
      status: 503, headers: settingsPrivateHeaders,
    });
    throw error;
  }
}

const adminLabels: Record<AdminEntryId, string> = {
  overview: "adminOverview", forum: "adminForum", users: "adminUsers",
  measures: "measuresAdmin", roles: "adminRoles", history: "adminHistory",
};
const modeLabels: Record<AttentionEntryMode, string> = {
  signals: "attentionModeSignals", complaints: "attentionModeComplaints",
  security: "attentionModeSecurity",
};
const groupLabels: Record<AttentionEntryGroup, string> = {
  "needs-details": "helpSolutionsFilterNeedsDetails",
  "needs-review": "helpSolutionNeedsReview",
  "solution-outdated": "helpSolutionOutdated",
  duplicate: "helpDuplicateBadge", appeals: "helpAttentionAppeals",
  mixed: "helpAttentionMixed", group1: "complaintQueueHeading",
  group2: "complaintAppealsHeading", group3: "complaintHistoryHeading",
  attachments: "attentionSecurityAttachments",
};

export default function SettingsAdministratorRoute() {
  const state = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const headerAccountId = useHeaderAuthUser()?.id;
  // A still-mounted route must never read/write account A's browser preferences for B.
  const accountId = headerAccountId === state.accountId ? state.accountId : null;
  const prefs = useAdministratorPreferences(accountId);
  const save = (changes: Parameters<typeof updateAdministratorPreferences>[1]) =>
    updateAdministratorPreferences(accountId, changes);
  const modes = ATTENTION_MODES.filter(mode => state.attention[mode].length > 0);
  const selectedMode = modes.includes(prefs.attentionDefaultMode)
    ? prefs.attentionDefaultMode : modes[0];
  const groups = selectedMode ? state.attention[selectedMode] : [];
  const selectedGroup = groups.includes(prefs.attentionDefaultGroup)
    ? prefs.attentionDefaultGroup : groups[0];

  return <SettingsShell locale={state.locale} canViewForum={state.canViewForum} current="administrator">
    <section className="admin-overview settings-overview settings-administrator" aria-labelledby="settings-administrator-heading">
      <h2 id="settings-administrator-heading">{t("settingsAdministrator")}</h2>
      <p>{t("settingsAdminLocalHint")}</p>
      {state.admin.length ? <fieldset className="settings-workspace-fieldset">
        <legend>{t("settingsAdminNavigation")}</legend>
        <label htmlFor="settings-admin-entry">{t("settingsAdminOpenBehavior")}</label>
        <select id="settings-admin-entry" disabled={!accountId} value={prefs.adminEntry}
          onChange={event => save({ adminEntry: event.currentTarget.value as "default" | "last" })}>
          <option value="default">{t("settingsAdminUseDefault")}</option>
          <option value="last">{t("settingsAdminUseLast")}</option>
        </select>
        <label htmlFor="settings-admin-default">{t("settingsAdminDefaultDestination")}</label>
        <select id="settings-admin-default" disabled={!accountId}
          value={state.admin.includes(prefs.adminDefault) ? prefs.adminDefault : state.admin[0]}
          onChange={event => save({ adminDefault: event.currentTarget.value as AdminEntryId })}>
          {state.admin.map(id => <option key={id} value={id}>{t(adminLabels[id])}</option>)}
        </select>
        <a className="settings-workspace-entry" href={selectAdminEntry(state.locale, state.admin, prefs)}>
          {t("settingsAdminOpenAdmin")}
        </a>
      </fieldset> : null}
      {modes.length ? <fieldset className="settings-workspace-fieldset">
        <legend>{t("settingsAdminAttention")}</legend>
        <label htmlFor="settings-attention-entry">{t("settingsAdminOpenBehavior")}</label>
        <select id="settings-attention-entry" disabled={!accountId} value={prefs.attentionEntry}
          onChange={event => save({ attentionEntry: event.currentTarget.value as "default" | "last" })}>
          <option value="default">{t("settingsAdminUseDefault")}</option>
          <option value="last">{t("settingsAdminUseLast")}</option>
        </select>
        <label htmlFor="settings-attention-mode">{t("settingsAdminDefaultMode")}</label>
        <select id="settings-attention-mode" disabled={!accountId} value={selectedMode}
          onChange={event => {
            const mode = event.currentTarget.value as AttentionEntryMode;
            if (!modes.includes(mode)) return;
            save({ attentionDefaultMode: mode, attentionDefaultGroup: state.attention[mode][0]! });
          }}>
          {modes.map(mode => <option key={mode} value={mode}>{t(modeLabels[mode])}</option>)}
        </select>
        <label htmlFor="settings-attention-group">{t("settingsAdminDefaultGroup")}</label>
        <select id="settings-attention-group" disabled={!accountId} value={selectedGroup}
          onChange={event => {
            const group = event.currentTarget.value as AttentionEntryGroup;
            if (groups.includes(group)) save({ attentionDefaultGroup: group });
          }}>
          {groups.map(group => <option key={group} value={group}>{t(groupLabels[group])}</option>)}
        </select>
        <a className="settings-workspace-entry" href={selectAttentionEntry(state.locale, state.attention, prefs)}>
          {t("settingsAdminOpenAttention")}
        </a>
      </fieldset> : null}
      <fieldset className="settings-workspace-fieldset">
        <legend>{t("settingsAdminPresentation")}</legend>
        <label htmlFor="settings-admin-density">{t("settingsAdminDensity")}</label>
        <select id="settings-admin-density" disabled={!accountId} value={prefs.density}
          onChange={event => save({ density: event.currentTarget.value as "comfortable" | "compact" })}>
          <option value="comfortable">{t("settingsAdminComfortable")}</option>
          <option value="compact">{t("settingsAdminCompact")}</option>
        </select>
        <label className="settings-workspace-checkbox">
          <input type="checkbox" disabled={!accountId} checked={prefs.technicalDetailsExpanded}
            onChange={event => save({ technicalDetailsExpanded: event.currentTarget.checked })}/>
          <span>{t("settingsAdminTechnicalDefault")}</span>
        </label>
      </fieldset>
    </section>
  </SettingsShell>;
}
export const ErrorBoundary = ForumRouteError;
