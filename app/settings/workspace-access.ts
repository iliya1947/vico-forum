import type { AdminAccess } from "../admin/access";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";

/** Display/admission candidates only; every destination retains its independent server guard. */
export const ADMIN_ENTRY_IDS = ["overview", "forum", "users", "measures", "roles", "history"] as const;
export type AdminEntryId = typeof ADMIN_ENTRY_IDS[number];
export const ATTENTION_MODES = ["signals", "complaints", "security"] as const;
export type AttentionEntryMode = typeof ATTENTION_MODES[number];
export const ATTENTION_GROUPS = {
  signals: ["needs-details", "needs-review", "solution-outdated", "duplicate", "appeals", "mixed"],
  complaints: ["group1", "group2", "group3"],
  security: ["attachments"],
} as const;
export type AttentionEntryGroup = typeof ATTENTION_GROUPS[AttentionEntryMode][number];
export interface AttentionWorkspaceCapabilities {
  canViewSignals: boolean;
  canReadSecurity: boolean;
  canReviewComplaints: boolean;
  canReviewAppeals: boolean;
  canManageComplaintPriorities: boolean;
}
export type AttentionEntryAccess = Record<AttentionEntryMode, readonly AttentionEntryGroup[]>;

export function allowedAdminEntries(access: AdminAccess): AdminEntryId[] {
  if (!access.canEnter) return [];
  return [
    "overview",
    ...(access.canReadForum ? ["forum" as const] : []),
    ...(access.canReadUsers ? ["users" as const] : []),
    ...(access.canManageMeasures ? ["measures" as const] : []),
    ...(access.canManageAuthorization ? ["roles" as const] : []),
    ...(access.canReadHistory ? ["history" as const] : []),
  ];
}

export function allowedAttentionEntries(c: AttentionWorkspaceCapabilities): AttentionEntryAccess {
  return {
    signals: c.canViewSignals ? [...ATTENTION_GROUPS.signals] : [],
    complaints: [
      ...(c.canReviewComplaints ? ["group1" as const] : []),
      ...(c.canReviewAppeals ? ["group2" as const] : []),
      ...(c.canReviewComplaints ? ["group3" as const] : []),
      // Existing priority-only actors are redirected by the protected Attention loader
      // to the subsystem-local priority settings. Never turn that into a personal setting.
      ...(!c.canReviewComplaints && !c.canReviewAppeals && c.canManageComplaintPriorities
        ? ["group1" as const] : []),
    ],
    security: c.canReadSecurity ? ["attachments"] : [],
  };
}
export function canEnterAdministratorPreferences(
  admin: readonly AdminEntryId[], attention: AttentionEntryAccess,
): boolean {
  return admin.length > 0 || ATTENTION_MODES.some(mode => attention[mode].length > 0);
}

export function adminEntryPath(
  locale: string, id: AdminEntryId, routing: AdministrativeRouting = defaultAdministrativeRouting,
): string {
  const admin = routing.admin;
  const destinations: Record<AdminEntryId, () => string> = {
    overview: () => admin.overview(locale), forum: () => admin.forum(locale),
    users: () => admin.users(locale), measures: () => admin.measures(locale),
    roles: () => admin.authorization(locale), history: () => admin.history(locale),
  };
  return destinations[id]();
}
export function attentionEntryPath(locale: string, mode: AttentionEntryMode, group: AttentionEntryGroup): string {
  const params = new URLSearchParams({ mode, group });
  return `/${encodeURIComponent(locale)}/attention?${params.toString()}`;
}
