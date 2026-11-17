import { SYSTEM_MONITORS } from "./owner-system-history";
import { SA02_MONITORS } from "./owner-sa02-catalog";

/** Closed, code-backed capabilities. A catalog entry is never a query or a writer. */
export const NATIVE_MONITORS = {
  forum: ["forum.structure", "forum.state", "forum.content", "forum.presence"],
  administration: ["administration.authorization", "administration.measures", "administration.registration"],
  moderation: ["moderation.help", "moderation.complaints"],
  notifications: ["notifications.inbox"],
} as const;
export type NativeMonitorArea = keyof typeof NATIVE_MONITORS;
export type NativeMonitorKey = (typeof NATIVE_MONITORS)[NativeMonitorArea][number];
export const OPERATIONAL_MONITORS={background:["background.translation"],integrations:["integrations.translation"]} as const;
export const OWNER_MONITORS = { system: SYSTEM_MONITORS, ...SA02_MONITORS, ...NATIVE_MONITORS,...OPERATIONAL_MONITORS } as const;
export type OwnerMonitorArea = keyof typeof OWNER_MONITORS;
export type OwnerMonitorKey = (typeof OWNER_MONITORS)[OwnerMonitorArea][number];
export const NATIVE_AREAS = Object.keys(NATIVE_MONITORS) as NativeMonitorArea[];
export function ownerAreaForMonitor(key: string): OwnerMonitorArea | null {
  for (const area of Object.keys(OWNER_MONITORS) as OwnerMonitorArea[]) {
    if ((OWNER_MONITORS[area] as readonly string[]).includes(key)) return area;
  }
  return null;
}
export type OwnerMonitorAction = "forum" | "authorization" | "measures" | "registration" | "help" | "complaints" | "inbox";
export const NATIVE_MONITOR_ACTIONS = {
  "forum.structure": "forum", "forum.state": "forum", "forum.content": "forum", "forum.presence": null,
  "administration.authorization": "authorization", "administration.measures": "measures",
  "administration.registration": "registration", "moderation.help": "help",
  "moderation.complaints": "complaints", "notifications.inbox": "inbox",
} as const satisfies Record<NativeMonitorKey, OwnerMonitorAction | null>;

/** Same native Admin fact may belong to several monitors, but has one identity. */
export const ADMIN_MONITOR_SCOPES_SQL = `case
  when a.action='settings.registrationChanged' then ARRAY['accounts.registration','administration.registration']::text[]
  when a.action in ('role.created','role.deleted','role.renamed','role.grantsChanged','user.roleAssigned','user.overrideChanged') then ARRAY['administration.authorization']::text[]
  when a.action in ('measure.created','measure.changed','measure.lifted','measure.appealResolved') then ARRAY['administration.measures']::text[]
  when a.action like 'help.%' or a.action in ('topic.solved','topic.bestAnswerChanged') then ARRAY['moderation.help','forum.state']::text[]
  when a.action in ('topic.sourceLocaleCorrected','post.sourceLocaleCorrected') then ARRAY['forum.content']::text[]
  when a.action in ('topic.pinned','topic.unpinned','topic.closed','topic.reopened') then ARRAY['forum.state']::text[]
  else ARRAY[]::text[] end`;
