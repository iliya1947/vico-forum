import { SYSTEM_MONITORS } from "./owner-system-history";
import { STRUCTURE_ADMIN_ACTION_SQL } from "./owner-structure-history";
import { SA02_MONITORS } from "./owner-sa02-catalog";
import {STORAGE_SLOTS} from "../app/observability/storage-observations";

export const STORAGE_OBSERVATION_PREDICATE_SQL=`o.monitor_key='integrations.storage' and o.resource_scope in (${STORAGE_SLOTS.map(scope=>"'"+scope+"'").join(',')})`;
export const STORAGE_OBSERVATION_SCOPES_SQL=`case when ${STORAGE_OBSERVATION_PREDICATE_SQL} then ARRAY['integrations.storage','files.operations']::text[] when o.monitor_key='system.dependencies' and o.resource_scope='global' then ARRAY['system.dependencies','data.compatibility','integrations.database']::text[] else ARRAY[o.monitor_key]::text[] end`;
export const SYSTEM_EVENT_MONITOR_SCOPES_SQL="case when e.monitor_key='system.dependencies' and e.kind='system.dependencyUnavailable' then ARRAY['system.dependencies','data.compatibility','integrations.database']::text[] else ARRAY[e.monitor_key]::text[] end";

/** Closed, code-backed capabilities. A catalog entry is never a query or a writer. */
export const NATIVE_MONITORS = {
  forum: ["forum.structure", "forum.state", "forum.content", "forum.presence"],
  administration: ["administration.authorization", "administration.measures", "administration.registration"],
  moderation: ["moderation.help", "moderation.complaints"],
  notifications: ["notifications.inbox"],
} as const;
export type NativeMonitorArea = keyof typeof NATIVE_MONITORS;
export type NativeMonitorKey = (typeof NATIVE_MONITORS)[NativeMonitorArea][number];
export const LOCALIZATION_MONITORS={localization:["localization.registry","localization.ui","localization.content","localization.budget"]} as const;
export const OPERATIONAL_MONITORS={background:["background.translation","background.attachments"],files:["files.assets","files.operations"],integrations:["integrations.database","integrations.authentication","integrations.translation","integrations.storage"]} as const;
export const DATA_MONITORS={data:["data.application","data.compatibility","data.retention"]} as const;
export const OWNER_MONITORS = { system: SYSTEM_MONITORS, ...SA02_MONITORS, ...NATIVE_MONITORS,...OPERATIONAL_MONITORS,...LOCALIZATION_MONITORS,...DATA_MONITORS } as const;
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

/** Association only: original operational fact identity and canonical key remain unchanged. */
export const TASK_FACT_MONITOR_SCOPES_SQL=`ARRAY['background.translation','integrations.translation']::text[] ||
  case when e.payload->>'taskKind'='ui' then ARRAY['localization.ui']::text[]
    when e.payload->>'taskKind' in ('content-topic-title','content-post-body') then ARRAY['localization.content']::text[] else ARRAY[]::text[] end ||
  case when e.kind in ('task.allowanceAdmitted','task.allowanceDeferred') then ARRAY['localization.budget']::text[] else ARRAY[]::text[] end`;

/** Same native Admin fact may belong to several monitors, but has one identity. */
export const ADMIN_MONITOR_SCOPES_SQL = `case
  when a.action in (${STRUCTURE_ADMIN_ACTION_SQL}) then ARRAY['forum.structure']::text[]
  when a.action='settings.registrationChanged' then ARRAY['accounts.registration','administration.registration','integrations.authentication']::text[]
  when a.action in ('role.created','role.deleted','role.renamed','role.grantsChanged','user.roleAssigned','user.overrideChanged') then ARRAY['administration.authorization']::text[]
  when a.action in ('measure.created','measure.changed','measure.lifted','measure.appealResolved') then ARRAY['administration.measures']::text[]
  when a.action like 'help.%' or a.action in ('topic.solved','topic.bestAnswerChanged') then ARRAY['moderation.help','forum.state']::text[]
  when a.action in ('topic.sourceLocaleCorrected','post.sourceLocaleCorrected') then ARRAY['forum.content','localization.content']::text[]
  when a.action in ('topic.hidden','topic.restored','post.hidden','post.restored') then ARRAY['forum.content','forum.state']::text[]
  when a.action in ('topic.pinned','topic.unpinned','topic.closed','topic.reopened') then ARRAY['forum.state']::text[]
  else ARRAY[]::text[] end`;
