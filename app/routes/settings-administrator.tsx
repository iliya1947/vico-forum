import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { authorizationForRequest, authorizationOwnerContext } from "../authorization/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { isBoundOwner } from "../authorization/owner";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ADMIN_ADMISSION_PERMISSIONS, adminAccess } from "../admin/access";
import { adminDestinations } from "../admin/shell";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { settingsPrivateHeaders } from "./settings";
import { ATTENTION_GROUP_IDS, useAdministratorPreferences, writeAdministratorPreferences,
  type AdminDestinationId, type AttentionModeId, type AttentionSelection } from "../settings/administrator-preferences";

type Args = { params: { locale?: string }; context: RouterContextProvider };
const ATTENTION_ADMISSION_PERMISSIONS = [
  "forum.solution.manageAny", "forum.helpDuplicate.manage", "forum.helpNeedsDetails.manage",
  "forum.attachmentSecurity.read", "forum.complaint.review", "forum.complaint.priority.manage",
  "forum.complaint.appeal.review",
] as const satisfies readonly PermissionKey[];

export function headers() { return settingsPrivateHeaders; }

export async function loader({ params, context }: Args) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  const locale = params.locale ?? "en";
  let permitted: Set<PermissionKey>;
  try {
    const resolver = authorizationForRequest(context).forUser(session.user.id);
    const keys: readonly PermissionKey[] = [...new Set([
      ...ADMIN_ADMISSION_PERMISSIONS, ...ATTENTION_ADMISSION_PERMISSIONS,
    ])];
    const allowed = await Promise.all(keys.map(async key => await resolver.has(key) ? key : null));
    permitted = new Set(allowed.filter((key): key is PermissionKey => key !== null));
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: settingsPrivateHeaders });
    }
    throw error;
  }
  const has = (key: PermissionKey) => permitted.has(key);
  const admin = adminAccess(permitted);
  const canViewSignals = has("forum.solution.manageAny")
    || has("forum.helpDuplicate.manage") || has("forum.helpNeedsDetails.manage");
  const canViewComplaints = has("forum.complaint.review") || has("forum.complaint.appeal.review");
  const canManageComplaintPriorities = has("forum.complaint.priority.manage");
  const canViewSecurity = has("forum.attachmentSecurity.read");
  if (!admin.canEnter && !canViewSignals && !canViewComplaints
    && !canManageComplaintPriorities && !canViewSecurity) {
    throw new Response("Forbidden", { status: 403, headers: settingsPrivateHeaders });
  }
  // These are only presentation choices. Route loaders still recheck permission on entry.
  const attentionGroups = {
    signals: [
      ...(has("forum.helpNeedsDetails.manage") ? ["needs-details"] : []),
      ...(has("forum.solution.manageAny") ? ["needs-review", "solution-outdated"] : []),
      ...(has("forum.helpDuplicate.manage") ? ["duplicate", "appeals"] : []),
      ...(canViewSignals ? ["mixed"] : []),
    ],
    complaints: [
      ...(has("forum.complaint.review") ? ["group1"] : []),
      ...(has("forum.complaint.appeal.review") ? ["group2"] : []),
      ...(has("forum.complaint.review") ? ["group3"] : []),
    ],
    security: canViewSecurity ? ["attachments"] : [],
  };
  return data({
    locale,
    accountId: session.user.id,
    canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
    adminDestinations: admin.canEnter
      ? adminDestinations(locale, admin).filter(item => item.id !== "settings")
        .map(({ id, label }) => ({ id: id as AdminDestinationId, label }))
      : [],
    attentionGroups,
    canManageComplaintPriorities,
  }, { headers: settingsPrivateHeaders });
}

const groupLabels = {
  "needs-details": "helpSolutionsFilterNeedsDetails",
  "needs-review": "helpSolutionNeedsReview",
  "solution-outdated": "helpSolutionOutdated",
  "duplicate": "helpDuplicateBadge",
  "appeals": "helpAttentionAppeals",
  "mixed": "helpAttentionMixed",
  "group1": "complaintQueueHeading",
  "group2": "complaintAppealsHeading",
  "group3": "complaintHistoryHeading",
  "attachments": "attentionSecurityAttachments",
} as const;
const modeLabels = {
  signals: "attentionModeSignals",
  complaints: "attentionModeComplaints",
  security: "attentionModeSecurity",
} as const;

export default function SettingsAdministratorRoute() {
  const state = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const displayedUserId = useHeaderAuthUser()?.id;
  // Never write a previous account's browser preferences from a stale Settings loader.
  const accountId = displayedUserId === state.accountId ? state.accountId : null;
  const prefs = useAdministratorPreferences(accountId);
  const update = (changes: Parameters<typeof writeAdministratorPreferences>[1]) =>
    writeAdministratorPreferences(accountId, changes);
  const adminDestinations = state.adminDestinations;
  const chosenAdmin = prefs.adminEntry === "last"
    || adminDestinations.some(item => item.id === prefs.adminEntry)
    ? prefs.adminEntry : "overview";
  const groups = state.attentionGroups;
  const availableModes = (Object.keys(ATTENTION_GROUP_IDS) as AttentionModeId[])
    .filter(mode => groups[mode].length);
  const selectedMode = availableModes.includes(prefs.defaultAttention.mode)
    ? prefs.defaultAttention.mode : availableModes[0] ?? null;
  const selectedGroup = selectedMode
    ? groups[selectedMode].includes(prefs.defaultAttention.group)
      ? prefs.defaultAttention.group : groups[selectedMode][0]!
    : null;
  const adminLabel = (id: AdminDestinationId | null) =>
    adminDestinations.find(item => item.id === id)?.label;
  const attentionLabel = (value: AttentionSelection | null) => value
    ? `${t(modeLabels[value.mode])} / ${t(groupLabels[value.group])}` : t("settingsAdminNoLast");

  return <SettingsShell locale={state.locale} canViewForum={state.canViewForum}
    canViewAdministrator current="administrator">
    <section className="admin-overview settings-overview settings-administrator" aria-labelledby="settings-administrator-heading">
      <h2 id="settings-administrator-heading">{t("settingsAdministrator")}</h2>
      <p>{t("settingsAdminLocalHint")}</p>
      <div className="settings-admin-controls">
        {adminDestinations.length > 0 ? <section aria-labelledby="settings-admin-entry-heading">
          <h3 id="settings-admin-entry-heading">{t("settingsAdminDefaultDestination")}</h3>
          <label htmlFor="settings-admin-entry">{t("settingsAdminDefaultDestination")}</label>
          <select id="settings-admin-entry" disabled={!accountId} value={chosenAdmin}
            onChange={event => {
              const id = event.currentTarget.value;
              if (id === "last" || adminDestinations.some(item => item.id === id)) {
                update({ adminEntry: id as AdminDestinationId | "last" });
              }
            }}>
            {adminDestinations.map(item => <option key={item.id} value={item.id}>{t(item.label)}</option>)}
            <option value="last">{t("settingsAdminLast")}</option>
          </select>
          <p>{t("settingsAdminLastAdmin")}: {adminLabel(prefs.lastAdmin)
            ? t(adminLabel(prefs.lastAdmin)!) : t("settingsAdminNoLast")}</p>
          {chosenAdmin !== prefs.adminEntry ? <p role="status">{t("settingsAdminChoiceUnavailable")}</p> : null}
        </section> : null}
        {availableModes.length > 0 ? <section aria-labelledby="settings-attention-entry-heading">
          <h3 id="settings-attention-entry-heading">{t("settingsAttentionEntry")}</h3>
          <label htmlFor="settings-attention-entry">{t("settingsAttentionEntry")}</label>
          <select id="settings-attention-entry" disabled={!accountId}
            value={prefs.attentionEntry} onChange={event => {
              const next = event.currentTarget.value;
              if (next === "default" || next === "last") update({ attentionEntry: next });
            }}>
            <option value="default">{t("settingsAttentionDefault")}</option>
            <option value="last">{t("settingsAdminLast")}</option>
          </select>
          <label htmlFor="settings-attention-mode">{t("settingsAttentionMode")}</label>
          <select id="settings-attention-mode" disabled={!accountId} value={selectedMode ?? ""}
            onChange={event => {
              const mode = event.currentTarget.value as AttentionModeId;
              if (!availableModes.includes(mode)) return;
              const group = groups[mode][0] as AttentionSelection["group"] | undefined;
              if (group) update({ defaultAttention: { mode, group } });
            }}>
            {availableModes.map(mode => <option key={mode} value={mode}>{t(modeLabels[mode])}</option>)}
          </select>
          <label htmlFor="settings-attention-group">{t("settingsAttentionGroup")}</label>
          <select id="settings-attention-group" disabled={!accountId || !selectedMode}
            value={selectedGroup ?? ""} onChange={event => {
              if (!selectedMode) return;
              const group = event.currentTarget.value;
              if (groups[selectedMode].includes(group)) {
                update({ defaultAttention: {
                  mode: selectedMode, group: group as AttentionSelection["group"],
                } });
              }
            }}>
            {selectedMode ? groups[selectedMode].map(group => (
              <option key={group} value={group}>{t(groupLabels[group as keyof typeof groupLabels])}</option>
            )) : null}
          </select>
          <p>{t("settingsAdminLastAttention")}: {attentionLabel(prefs.lastAttention)}</p>
          {selectedMode && (prefs.defaultAttention.mode !== selectedMode
            || prefs.defaultAttention.group !== selectedGroup)
            ? <p role="status">{t("settingsAdminChoiceUnavailable")}</p> : null}
        </section> : null}
        <section aria-labelledby="settings-admin-presentation-heading">
          <h3 id="settings-admin-presentation-heading">{t("settingsAdminDensity")}</h3>
          <label htmlFor="settings-admin-density">{t("settingsAdminDensity")}</label>
          <select id="settings-admin-density" disabled={!accountId} value={prefs.density}
            onChange={event => {
              const value = event.currentTarget.value;
              if (value === "comfortable" || value === "compact") update({ density: value });
            }}>
            <option value="comfortable">{t("settingsAdminComfortable")}</option>
            <option value="compact">{t("settingsAdminCompact")}</option>
          </select>
          <label className="settings-admin-checkbox" htmlFor="settings-admin-details">
            <input id="settings-admin-details" type="checkbox" checked={prefs.detailsExpanded}
              disabled={!accountId} onChange={event => update({ detailsExpanded: event.currentTarget.checked })} />
            <span>{t("settingsAdminDetails")}</span>
          </label>
        </section>
      </div>
    </section>
  </SettingsShell>;
}
export const ErrorBoundary = ForumRouteError;
