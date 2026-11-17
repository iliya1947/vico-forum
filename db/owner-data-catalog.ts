/** Fixed application sources. Requests cannot select relations, columns or SQL. */
export const DATA_COUNT_GROUPS={
  accounts:["user","account","session"],
  administration:["authz_roles","authz_role_permissions","authz_user_roles","authz_user_permission_overrides","forum_registration_settings"],
  forum:["forum_categories","forum_sections","forum_topics","forum_posts","forum_topic_title_revisions","forum_post_revisions","forum_profiles","forum_topic_tags","forum_tags","forum_topic_pins","forum_topic_read_states","forum_online_presence"],
  moderation:["forum_complaint_targets","forum_complaint_activity","forum_complaint_priority_settings","forum_complaint_cases","forum_complaints","forum_complaint_decisions","forum_complaint_notes","forum_complaint_events","forum_complaint_appeals","forum_help_signals","forum_help_duplicate_relationships","forum_help_duplicate_appeals","user_measures","user_measure_restrictions","user_measure_appeals"],
  inbox:["forum_reply_notifications"],
  files:["forum_attachment_draft_contexts","forum_attachments","forum_attachment_draft_refs","forum_post_attachments","forum_complaint_evidence_attachments","forum_attachment_upload_objects","forum_attachment_sweep"],
  translation:["translation_tasks","translation_task_generation_heads","content_topic_title_translation_tasks","content_post_body_translation_tasks","forum_topic_title_translations","forum_post_body_translations","content_translation_request_budget_counters"],
  history:["owner_events","owner_monitor_observations","owner_attempt_patterns","owner_attempt_telemetry_state","admin_history","forum_attachment_security_events"],
} as const;
export const DATA_LOCALIZATION_COUNTS=["locales","ui_translations","ui_translation_bundles"] as const;
/** Deliberately a runtime subset, not the production manifest parity verifier. */
export const DATA_COMPATIBILITY_COLUMNS={
  user:["id","deactivated_at","deactivated_by_user_id","retain_at_least_until"],
  session:["id","user_id","expires_at"],
  forum_topics:["id","current_title_revision_id"],
  forum_posts:["id","topic_id","current_revision_id"],
  forum_profiles:["user_id","bio"],
  forum_post_revisions:["id","post_id","created_at"],
  forum_attachments:["id","byte_size","cleanup_claimed_at"],
  forum_attachment_sweep:["id","claimed_at"],
  translation_tasks:["id","status","generation"],
  owner_events:["id","occurred_at","recorded_at","payload"],
  owner_monitor_observations:["id","observed_at","schema_version","value"],
} as const;
export const DATA_LOCALIZATION_COMPATIBILITY_COLUMNS={
  locales:["tag","fallback_chain"],
  ui_translations:["locale","namespace","key","translated_payload","status"],
  ui_translation_bundles:["locale","namespace","resources","bundle_version"],
} as const;
export const DATA_MONITOR_KEYS=["data.application","data.compatibility","data.retention"] as const;
export type DataMonitorKey=typeof DATA_MONITOR_KEYS[number];
export type DataValues=Record<string,string|number|boolean|null>;
export type DataCheckStatus="measured"|"compatible"|"incompatible"|"unavailable"|"unchecked";
export type DataFailureCode="missing-relation"|"missing-column"|"insufficient-grant"|"dependency-unavailable"|"type-mismatch"|"deadline"|"none";
export interface DataCheck {id:string;source:"web-database"|"localization-database";observedAt:string;status:DataCheckStatus;code:DataFailureCode;values:DataValues}
export interface DataCurrentMonitor {key:DataMonitorKey;schemaVersion:1;source:"database";quality:"measured";observedAt:string;values:DataValues;checks:DataCheck[];recording:"available"|"unavailable";coverageFrom:string|null;lastObservedAt:string|null}
export interface OwnerDataCurrent {monitors:DataCurrentMonitor[];compiledExpectedMigration:string;deployedMigration:"unchecked"}
