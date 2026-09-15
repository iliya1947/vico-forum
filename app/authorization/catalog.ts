export const PERMISSION_CATALOG = [
  "forum.topic.create",
  "forum.reply.create",
  "forum.solution.manageOwn",
  "forum.solution.manageAny",
  "access.authorization.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number];

const permissionKeys = new Set<string>(PERMISSION_CATALOG);

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && permissionKeys.has(value);
}

export const INITIAL_ROLE_GRANTS = {
  user: ["forum.topic.create", "forum.reply.create", "forum.solution.manageOwn"],
  moderator: [
    "forum.topic.create",
    "forum.reply.create",
    "forum.solution.manageOwn",
    "forum.solution.manageAny",
  ],
  admin: [...PERMISSION_CATALOG],
} as const satisfies Record<string, readonly PermissionKey[]>;

export const AUTHORIZATION_MANAGE_PERMISSION: PermissionKey = "access.authorization.manage";
