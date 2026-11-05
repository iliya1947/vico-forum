/**
 * AP-10 restrictions supplement effective permissions; they are not PermissionKey grants.
 * Group IDs are presentation shortcuts only. Persist and validate child IDs exclusively.
 */
export const USER_MEASURE_RESTRICTION_GROUPS = [
  { id: "publication", ids: ["topics.create", "replies.create", "attachments.upload"] },
  { id: "ownContent", ids: ["posts.edit", "profile.edit"] },
  { id: "submissions", ids: ["complaints.submit", "helpSignals.submit"] },
  { id: "resources", ids: ["translations.generate"] },
  { id: "administration", ids: ["admin.forum", "admin.complaints", "admin.security", "admin.usersAccess"] },
] as const;

export type UserMeasureRestrictionId =
  (typeof USER_MEASURE_RESTRICTION_GROUPS)[number]["ids"][number];

export const USER_MEASURE_RESTRICTION_IDS: readonly UserMeasureRestrictionId[] =
  USER_MEASURE_RESTRICTION_GROUPS.flatMap(group => group.ids);

const restrictionIds = new Set<string>(USER_MEASURE_RESTRICTION_IDS);

export function isUserMeasureRestrictionId(value: unknown): value is UserMeasureRestrictionId {
  return typeof value === "string" && restrictionIds.has(value);
}

export class InvalidUserMeasureRestrictionsError extends Error {
  constructor() {
    super("invalid user measure restrictions");
    this.name = "InvalidUserMeasureRestrictionsError";
  }
}

/** Reject unknown, duplicate and empty input; never store group identifiers as policies. */
export function validateUserMeasureRestrictions(value: unknown): UserMeasureRestrictionId[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > USER_MEASURE_RESTRICTION_IDS.length) {
    throw new InvalidUserMeasureRestrictionsError();
  }
  const selected = new Set<UserMeasureRestrictionId>();
  for (const id of value) {
    if (!isUserMeasureRestrictionId(id) || selected.has(id)) {
      throw new InvalidUserMeasureRestrictionsError();
    }
    selected.add(id);
  }
  return [...selected];
}

export const USER_MEASURE_ADMIN_RESTRICTIONS = [
  "admin.forum",
  "admin.complaints",
  "admin.security",
  "admin.usersAccess",
] as const satisfies readonly UserMeasureRestrictionId[];

export type UserMeasureAdminRestrictionId = (typeof USER_MEASURE_ADMIN_RESTRICTIONS)[number];

const administrativeRestrictions = new Set<string>(USER_MEASURE_ADMIN_RESTRICTIONS);
export function hasAdministrativeUserMeasureRestrictions(ids: readonly UserMeasureRestrictionId[]): boolean {
  return ids.some(id => administrativeRestrictions.has(id));
}

/** Exact implemented family mapping; still subject to fresh RBAC and resource guards. */
export const USER_MEASURE_ADMIN_PERMISSION_FAMILIES = {
  "admin.forum": [
    "forum.topic.pin", "forum.topic.close", "forum.solution.manageAny",
    "forum.helpNeedsDetails.manage", "forum.helpDuplicate.manage",
    "forum.sourceLocale.correctAny", "forum.post.history.read",
  ],
  "admin.complaints": [
    "forum.complaint.review", "forum.complaint.appeal.review",
    "forum.complaint.priority.manage", "forum.complaint.reporterIdentity.read",
  ],
  "admin.security": ["forum.attachmentSecurity.read"],
  "admin.usersAccess": [
    "admin.users.read", "access.authorization.manage", "admin.history.read",
    "admin.users.blocks.manage", "admin.users.blocks.managePrivileged",
  ],
} as const satisfies Record<UserMeasureAdminRestrictionId, readonly string[]>;
