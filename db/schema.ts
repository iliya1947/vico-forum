import type { BetterAuthOptions } from "better-auth";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  inet,
  jsonb,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export type UiTranslationPayload = string | Record<string, string>;

export const locales = pgTable(
  "locales",
  {
    tag: text("tag").primaryKey(),
    translationStatus: text("translation_status").notNull(),
    publicationStatus: text("publication_status").notNull(),
    direction: text("direction").notNull(),
    fallbackChain: text("fallback_chain").array().notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    matchTags: text("match_tags").array().notNull().default(sql`'{}'::text[]`),
    nativeName: text("native_name").notNull(),
    presentationMetadata: jsonb("presentation_metadata")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "locales_translation_status_check",
      sql`${table.translationStatus} in ('draft', 'generating', 'partial', 'ready')`,
    ),
    check(
      "locales_publication_status_check",
      sql`${table.publicationStatus} in ('inactive', 'active', 'disabled')`,
    ),
    check("locales_direction_check", sql`${table.direction} in ('ltr', 'rtl')`),
    check("locales_native_name_check", sql`btrim(${table.nativeName}) <> ''`),
    check(
      "locales_presentation_metadata_object_check",
      sql`jsonb_typeof(${table.presentationMetadata}) = 'object'`,
    ),
    check(
      "locales_non_bootstrap_tag_check",
      sql`lower(${table.tag}) not in ('en', 'api', 'assets')`,
    ),
    check("locales_fallback_chain_shape_check", arrayShapeCheck(table.fallbackChain)),
    check("locales_aliases_shape_check", arrayShapeCheck(table.aliases)),
    check("locales_match_tags_shape_check", arrayShapeCheck(table.matchTags)),
  ],
);

export const uiTranslations = pgTable(
  "ui_translations",
  {
    locale: text("locale").notNull(),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    origin: text("origin").notNull(),
    status: text("status").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    translatedPayload: jsonb("translated_payload").$type<UiTranslationPayload>().notNull(),
    generationPolicyVersion: text("generation_policy_version"),
    provider: text("provider"),
    providerModel: text("provider_model"),
    provenanceMetadata: jsonb("provenance_metadata")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "ui_translations_pk",
      columns: [table.locale, table.namespace, table.key, table.origin],
    }),
    check("ui_translations_locale_check", sql`btrim(${table.locale}) <> '' and lower(btrim(${table.locale}, chr(32) || chr(9) || chr(10) || chr(13) || chr(12) || chr(11))) <> 'en'`),
    check("ui_translations_namespace_check", sql`btrim(${table.namespace}) <> ''`),
    check("ui_translations_key_check", sql`btrim(${table.key}) <> ''`),
    check(
      "ui_translations_origin_check",
      sql`${table.origin} in ('persistent_manual', 'machine')`,
    ),
    check(
      "ui_translations_status_check",
      sql`${table.status} in ('draft', 'approved', 'rejected')`,
    ),
    check(
      "ui_translations_source_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ui_translations_payload_check",
      sql`jsonb_typeof(${table.translatedPayload}) in ('string', 'object')`,
    ),
    check(
      "ui_translations_provenance_metadata_object_check",
      sql`jsonb_typeof(${table.provenanceMetadata}) = 'object'`,
    ),
    check(
      "ui_translations_machine_metadata_check",
      sql`(
        ${table.origin} = 'machine'
        and ${table.generationPolicyVersion} is not null
        and btrim(${table.generationPolicyVersion}) <> ''
        and ${table.provider} is not null
        and btrim(${table.provider}) <> ''
      ) or (
        ${table.origin} = 'persistent_manual'
        and ${table.generationPolicyVersion} is null
        and ${table.provider} is null
        and ${table.providerModel} is null
      )`,
    ),
  ],
);

export const uiTranslationBundles = pgTable(
  "ui_translation_bundles",
  {
    locale: text("locale").notNull(),
    namespace: text("namespace").notNull(),
    bundleVersion: text("bundle_version").notNull(),
    resources: jsonb("resources").$type<Record<string, UiTranslationPayload>>().notNull(),
    compiledAt: timestamp("compiled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "ui_translation_bundles_pk",
      columns: [table.locale, table.namespace],
    }),
    check(
      "ui_translation_bundles_locale_check",
      sql`btrim(${table.locale}) <> '' and lower(btrim(${table.locale}, chr(32) || chr(9) || chr(10) || chr(13) || chr(12) || chr(11))) <> 'en'`,
    ),
    check("ui_translation_bundles_namespace_check", sql`btrim(${table.namespace}) <> ''`),
    check(
      "ui_translation_bundles_version_check",
      sql`${table.bundleVersion} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ui_translation_bundles_resources_object_check",
      sql`jsonb_typeof(${table.resources}) = 'object'`,
    ),
  ],
);

export const translationTasks = pgTable(
  "translation_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskIdentity: text("task_identity").notNull().unique(),
    translationKind: text("translation_kind").notNull(),
    sourceNamespace: text("source_namespace").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    targetLocale: text("target_locale").notNull(),
    generationPolicyVersion: text("generation_policy_version").notNull(),
    generation: integer("generation").notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastFailureCode: text("last_failure_code"),
    failureDisposition: text("failure_disposition"),
    reconciliationAttemptedAt: timestamp("reconciliation_attempted_at", { withTimezone: true }),
    allowanceState: text("allowance_state"),
    allowanceGeneration: integer("allowance_generation"),
    allowanceAttempt: integer("allowance_attempt"),
    allowanceClaimToken: uuid("allowance_claim_token"),
    allowanceLeaseExpiresAt: timestamp("allowance_lease_expires_at", { withTimezone: true }),
    allowanceRetryNotBefore: timestamp("allowance_retry_not_before", { withTimezone: true }),
    allowanceReason: text("allowance_reason"),
    allowanceProvider: text("allowance_provider"),
    allowanceReservationReference: text("allowance_reservation_reference"),
    allowanceUpdatedAt: timestamp("allowance_updated_at", { withTimezone: true }),
    claimToken: uuid("claim_token"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    staleAt: timestamp("stale_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("translation_tasks_reconcile_pending_idx").on(
      table.status,
      table.reconciliationAttemptedAt.asc().nullsFirst(),
      table.updatedAt,
      table.id,
    ),
    index("translation_tasks_reconcile_processing_idx").on(
      table.status,
      table.reconciliationAttemptedAt.asc().nullsFirst(),
      table.updatedAt,
      table.id,
      table.leaseExpiresAt,
    ),
    index("translation_tasks_allowance_recovery_idx").on(
      table.allowanceState,
      table.allowanceRetryNotBefore,
      table.allowanceLeaseExpiresAt,
      table.updatedAt,
      table.id,
    ),
    check("translation_tasks_identity_check", sql`${table.taskIdentity} ~ '^[0-9a-f]{64}$'`),
    check(
      "translation_tasks_kind_check",
      sql`${table.translationKind} in ('ui', 'content-topic-title', 'content-post-body')`,
    ),
    check("translation_tasks_source_namespace_check", sql`btrim(${table.sourceNamespace}) <> ''`),
    check("translation_tasks_source_key_check", sql`btrim(${table.sourceKey}) <> ''`),
    check("translation_tasks_source_fingerprint_check", sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`),
    check(
      "translation_tasks_target_locale_check",
      contentTargetLocaleCheck(table.targetLocale),
    ),
    check(
      "translation_tasks_ui_target_locale_check",
      sql`${table.translationKind} <> 'ui' or lower(${table.targetLocale}) <> 'en'`,
    ),
    check(
      "translation_tasks_content_shape_check",
      sql`(${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title')
        and (${table.translationKind} <> 'content-post-body' or ${table.sourceNamespace} = 'post-body')`,
    ),
    check(
      "translation_tasks_generation_policy_version_check",
      sql`btrim(${table.generationPolicyVersion}) <> ''`,
    ),
    check("translation_tasks_generation_check", sql`${table.generation} > 0`),
    unique("translation_tasks_unit_generation_unique").on(
      table.translationKind,
      table.sourceNamespace,
      table.sourceKey,
      table.targetLocale,
      table.generation,
    ),
    unique("translation_tasks_content_owner_unique").on(
      table.id,
      table.translationKind,
      table.sourceNamespace,
      table.sourceKey,
    ),
    check("translation_tasks_attempt_count_check", sql`${table.attemptCount} >= 0 and ${table.attemptCount} <= ${table.maxAttempts}`),
    check("translation_tasks_max_attempts_check", sql`${table.maxAttempts} > 0`),
    check(
      "translation_tasks_failure_code_check",
      sql`${table.lastFailureCode} is null or ${table.lastFailureCode} ~ '^[a-z0-9][a-z0-9-]{0,63}$'`,
    ),
    check(
      "translation_tasks_failure_disposition_check",
      sql`${table.failureDisposition} is null or ${table.failureDisposition} in ('terminal', 'retry-exhausted')`,
    ),
    check(
      "translation_tasks_status_check",
      sql`${table.status} in ('pending', 'processing', 'stale', 'completed', 'failed')`,
    ),
    check(
      "translation_tasks_allowance_reason_check",
      sql`${table.allowanceReason} is null or ${table.allowanceReason} ~ '^[a-z0-9][a-z0-9-]{0,63}$'`,
    ),
    check(
      "translation_tasks_allowance_provider_check",
      sql`${table.allowanceProvider} is null
        or ${table.allowanceProvider} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'`,
    ),
    check(
      "translation_tasks_allowance_reservation_check",
      sql`${table.allowanceReservationReference} is null
        or ${table.allowanceReservationReference} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'`,
    ),
    check(
      "translation_tasks_allowance_shape_check",
      sql`(
        ${table.allowanceState} is null
        and ${table.allowanceGeneration} is null
        and ${table.allowanceAttempt} is null
        and ${table.allowanceClaimToken} is null
        and ${table.allowanceLeaseExpiresAt} is null
        and ${table.allowanceRetryNotBefore} is null
        and ${table.allowanceReason} is null
        and ${table.allowanceProvider} is null
        and ${table.allowanceReservationReference} is null
        and ${table.allowanceUpdatedAt} is null
      ) or (
        ${table.translationKind} in ('content-topic-title', 'content-post-body')
        and ${table.allowanceState} is not null
        and ${table.allowanceGeneration} is not null
        and ${table.allowanceAttempt} is not null
        and ${table.allowanceGeneration} = ${table.generation}
        and ${table.allowanceAttempt} = ${table.attemptCount} + 1
        and ${table.allowanceAttempt} <= ${table.maxAttempts}
        and ${table.allowanceUpdatedAt} is not null
        and (
          (
            ${table.allowanceState} = 'leasing'
            and ${table.allowanceClaimToken} is not null
            and ${table.allowanceLeaseExpiresAt} is not null
            and ${table.allowanceLeaseExpiresAt} > ${table.allowanceUpdatedAt}
            and ${table.allowanceRetryNotBefore} is null
            and ${table.allowanceReason} is null
            and ${table.allowanceProvider} is null
            and ${table.allowanceReservationReference} is null
          ) or (
            ${table.allowanceState} = 'admitted'
            and ${table.allowanceClaimToken} is null
            and ${table.allowanceLeaseExpiresAt} is null
            and ${table.allowanceRetryNotBefore} is null
            and ${table.allowanceReason} is null
            and ${table.allowanceProvider} is not null
          ) or (
            ${table.allowanceState} = 'deferred'
            and ${table.allowanceClaimToken} is null
            and ${table.allowanceLeaseExpiresAt} is null
            and ${table.allowanceRetryNotBefore} is not null
            and ${table.allowanceRetryNotBefore} > ${table.allowanceUpdatedAt}
            and ${table.allowanceReason} is not null
            and ${table.allowanceProvider} is null
            and ${table.allowanceReservationReference} is null
          )
        )
      )`,
    ),
    check(
      "translation_tasks_lifecycle_check",
      sql`(
        ${table.status} = 'pending'
        and ${table.claimToken} is null and ${table.claimedAt} is null
        and ${table.leaseExpiresAt} is null and ${table.staleAt} is null
        and ${table.completedAt} is null and ${table.failedAt} is null
        and ${table.failureDisposition} is null and ${table.attemptCount} < ${table.maxAttempts}
      ) or (
        ${table.status} = 'processing'
        and ${table.claimToken} is not null and ${table.claimedAt} is not null
        and ${table.leaseExpiresAt} is not null and ${table.leaseExpiresAt} > ${table.claimedAt}
        and ${table.staleAt} is null and ${table.completedAt} is null
        and ${table.failedAt} is null and ${table.failureDisposition} is null
      ) or (
        ${table.status} = 'stale'
        and ${table.claimToken} is null and ${table.claimedAt} is not null
        and ${table.leaseExpiresAt} is null and ${table.staleAt} is not null
        and ${table.staleAt} >= ${table.claimedAt} and ${table.completedAt} is null
        and ${table.failedAt} is null and ${table.failureDisposition} is null
        and ${table.lastFailureCode} is null
      ) or (
        ${table.status} = 'completed'
        and ${table.claimToken} is null and ${table.claimedAt} is not null
        and ${table.leaseExpiresAt} is null and ${table.staleAt} is null
        and ${table.completedAt} is not null and ${table.completedAt} >= ${table.claimedAt}
        and ${table.failedAt} is null and ${table.failureDisposition} is null
        and ${table.lastFailureCode} is null
      ) or (
        ${table.status} = 'failed'
        and ${table.claimToken} is null and ${table.claimedAt} is not null
        and ${table.leaseExpiresAt} is null and ${table.staleAt} is null
        and ${table.completedAt} is null and ${table.failedAt} is not null
        and ${table.failedAt} >= ${table.claimedAt}
        and ${table.failureDisposition} is not null and ${table.lastFailureCode} is not null
        and ${table.attemptCount} > 0
      )`,
    ),
    check("translation_tasks_timestamps_check", sql`${table.updatedAt} >= ${table.createdAt}`),
  ],
);

export const translationTaskGenerationHeads = pgTable(
  "translation_task_generation_heads",
  {
    translationKind: text("translation_kind").notNull(),
    sourceNamespace: text("source_namespace").notNull(),
    sourceKey: text("source_key").notNull(),
    targetLocale: text("target_locale").notNull(),
    currentGeneration: integer("current_generation").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "translation_task_generation_heads_pk",
      columns: [table.translationKind, table.sourceNamespace, table.sourceKey, table.targetLocale],
    }),
    check(
      "translation_task_generation_heads_kind_check",
      sql`${table.translationKind} in ('ui', 'content-topic-title', 'content-post-body')`,
    ),
    check("translation_task_generation_heads_namespace_check", sql`btrim(${table.sourceNamespace}) <> ''`),
    check("translation_task_generation_heads_key_check", sql`btrim(${table.sourceKey}) <> ''`),
    check(
      "translation_task_generation_heads_locale_check",
      contentTargetLocaleCheck(table.targetLocale),
    ),
    check(
      "translation_task_generation_heads_ui_locale_check",
      sql`${table.translationKind} <> 'ui' or lower(${table.targetLocale}) <> 'en'`,
    ),
    check(
      "translation_task_generation_heads_content_shape_check",
      sql`(${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title')
        and (${table.translationKind} <> 'content-post-body' or ${table.sourceNamespace} = 'post-body')`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
  ],
);

export const contentTranslationRequestBudgetCounters = pgTable(
  "content_translation_request_budget_counters",
  {
    scope: text("scope").notNull(),
    subjectKey: text("subject_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    usedUnits: bigint("used_units", { mode: "number" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "content_translation_request_budget_counters_pk",
      columns: [table.scope, table.subjectKey, table.windowStart],
    }),
    index("content_translation_request_budget_counters_cleanup_idx").on(
      table.expiresAt,
      table.scope,
      table.subjectKey,
      table.windowStart,
    ),
    check(
      "content_translation_request_budget_counters_scope_check",
      sql`${table.scope} = btrim(${table.scope})
        and ${table.scope} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'`,
    ),
    check(
      "content_translation_request_budget_counters_subject_check",
      sql`${table.subjectKey} = '_global' or ${table.subjectKey} ~ '^[A-Za-z0-9_-]{43}$'`,
    ),
    check(
      "content_translation_request_budget_counters_used_units_check",
      sql`${table.usedUnits} >= 0 and ${table.usedUnits} <= 9007199254740991`,
    ),
    check(
      "content_translation_request_budget_counters_window_check",
      sql`${table.expiresAt} > ${table.windowStart}`,
    ),
    check(
      "content_translation_request_budget_counters_timestamps_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

// Better Auth 1.7.4 core schema, generated for PostgreSQL/Drizzle with
// database-backed rate limiting. `locale` is server-owned auth metadata and is
// intentionally not constrained to the persistent locale registry.
export const betterAuthUserAdditionalFields = {
  locale: { type: "string", required: false, input: false },
} satisfies NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  locale: text("locale"),
  // SA-04: server-owned account state; not registered in Better Auth additionalFields.
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deactivatedByUserId: text("deactivated_by_user_id"),
  retainAtLeastUntil: timestamp("retain_at_least_until", { withTimezone: true }),
}, (table) => [
  check("user_deactivation_state_check", sql`(
    (${table.deactivatedAt} is null and ${table.deactivatedByUserId} is null
      and ${table.retainAtLeastUntil} is null)
    or (
      ${table.deactivatedAt} is not null and ${table.deactivatedByUserId} is not null
      and btrim(${table.deactivatedByUserId}, chr(32) || chr(9) || chr(10) || chr(13) || chr(12) || chr(11)) <> ''
      and ${table.retainAtLeastUntil} is not null
      and (${table.retainAtLeastUntil} at time zone 'UTC') >=
        ((${table.deactivatedAt} at time zone 'UTC') + interval '1 year')
    )
  )`),
]);

export const forumProfiles = pgTable("forum_profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio").notNull().default(""),
  githubUrl: text("github_url"),
  websiteUrl: text("website_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("forum_profiles_bio_length", sql`char_length(${table.bio}) <= 500`),
  check("forum_profiles_github_url", sql`${table.githubUrl} is null or (${table.githubUrl} ~ '^https://github[.]com/[A-Za-z0-9][A-Za-z0-9-]{0,38}$')`),
  check("forum_profiles_website_url", sql`${table.websiteUrl} is null or (char_length(${table.websiteUrl}) <= 2048 and ${table.websiteUrl} ~ '^https?://')`),
]);

export interface ForumEditorDraftPayload {
  body: string;
  title: string;
  tags: string;
  parentPostId?: string | null;
  /** Immutable published revision baseline for a recoverable post-edit draft. */
  publishedRevisionId?: string;
  /** Published references retained by a post-edit draft; omitted legacy drafts keep all. */
  retainedAttachmentIds?: string[];
  /** Exact private draft attachment membership bound to this text-draft version. */
  draftAttachmentIds?: string[];
}

export const forumEditorDrafts = pgTable("forum_editor_drafts", {
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  contextKey: text("context_key").notNull(),
  draftId: text("draft_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").$type<ForumEditorDraftPayload>().notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ name: "forum_editor_drafts_pk", columns: [table.ownerId, table.contextKey] }),
  index("forum_editor_drafts_owner_edited_idx").on(table.ownerId, table.editedAt),
]);

// One durable result per client draft generation. A retry is checked under the
// same attachment scope lock before cooldown and before any new write.
export const forumPublicationReceipts = pgTable("forum_publication_receipts", {
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  contextKey: text("context_key").notNull(),
  draftId: text("draft_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  topicId: text("topic_id").notNull(),
  postId: text("post_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ name: "forum_publication_receipts_pk", columns: [table.ownerId, table.contextKey, table.draftId] }),
]);

export const forumOnlinePresence = pgTable("forum_online_presence", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("forum_online_presence_seen_at_idx").on(table.lastSeenAt),
]);

// SET-06: account-wide public online visibility is independent of recent presence.
export const userPrivacyPreferences = pgTable("user_privacy_preferences", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  showOnline: boolean("show_online").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const authzRoles = pgTable("authz_roles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("authz_roles_slug_check", sql`${table.slug} = btrim(${table.slug}) and ${table.slug} ~ '^[a-z][a-z0-9-]{0,62}$'`),
  check("authz_roles_display_name_check", sql`btrim(${table.displayName}) <> ''`),
]);

export const authzPermissions = pgTable("authz_permissions", {
  key: text("key").primaryKey(),
}, (table) => [check("authz_permissions_catalog_check", sql`${table.key} in (
  'forum.topic.create', 'forum.reply.create', 'forum.topic.pin', 'forum.topic.close', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'forum.helpSignal.create', 'forum.helpNeedsDetails.manage',
  'forum.helpDuplicate.manage', 'forum.attachmentSecurity.read', 'forum.sourceLocale.correctOwn', 'forum.sourceLocale.correctAny',
  'forum.translation.generate', 'forum.post.editOwn', 'forum.post.history.read',
  'access.authorization.manage', 'admin.history.read', 'admin.users.read',
  'admin.users.blocks.manage', 'admin.users.blocks.managePrivileged', 'forum.complaint.create', 'forum.complaint.review',
  'forum.complaint.reporterIdentity.read', 'forum.complaint.appeal.review', 'forum.complaint.priority.manage'
)`)]);

export const authzRolePermissions = pgTable("authz_role_permissions", {
  roleId: text("role_id").notNull().references(() => authzRoles.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull().references(() => authzPermissions.key, { onDelete: "restrict" }),
}, (table) => [primaryKey({ name: "authz_role_permissions_pk", columns: [table.roleId, table.permissionKey] })]);

export const authzUserRoles = pgTable("authz_user_roles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => authzRoles.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("authz_user_roles_role_id_idx").on(table.roleId)]);

export const authzUserPermissionOverrides = pgTable("authz_user_permission_overrides", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull().references(() => authzPermissions.key, { onDelete: "restrict" }),
  effect: text("effect").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: "authz_user_permission_overrides_pk", columns: [table.userId, table.permissionKey] }),
  check("authz_user_permission_overrides_effect_check", sql`${table.effect} in ('allow', 'deny')`),
]);

// The singleton row is the serialization boundary for every authorization mutation.
export const authzMutationLock = pgTable("authz_mutation_lock", {
  id: integer("id").primaryKey(),
}, (table) => [check("authz_mutation_lock_singleton_check", sql`${table.id} = 1`)]);

export const forumCategories = pgTable(
  "forum_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("forum_categories_name_check", sql`btrim(${table.name}) <> ''`)],
);

export const forumSections = pgTable(
  "forum_sections",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => forumCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_sections_category_id_idx").on(table.categoryId),
    check("forum_sections_name_check", sql`btrim(${table.name}) <> ''`),
  ],
);

export const forumTopics = pgTable(
  "forum_topics",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => forumSections.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // The migration adds a deferred owner-matching FK to (topic_id, revision_id).
    // Drizzle 0.45.2's PostgreSQL foreign-key builder has no deferrability API.
    currentTitleRevisionId: text("current_title_revision_id").notNull(),
    isSolved: boolean("is_solved").notNull().default(false),
    isClosed: boolean("is_closed").notNull().default(false),
    closureVersion: integer("closure_version").notNull().default(0),
    bestAnswerPostId: text("best_answer_post_id"),
    needsDetails: boolean("needs_details").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_closure_version_check", sql`${table.closureVersion} >= 0`),
  ],
);

export const forumTags = pgTable(
  "forum_tags",
  {
    key: text("key").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("forum_tags_key_check", sql`${table.key} = btrim(${table.key}) and btrim(${table.key}) <> ''`),
    check("forum_tags_name_check", sql`btrim(${table.name}) <> ''`),
  ],
);

export const forumTopicTags = pgTable(
  "forum_topic_tags",
  {
    topicId: text("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    tagKey: text("tag_key")
      .notNull()
      .references(() => forumTags.key, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ name: "forum_topic_tags_pk", columns: [table.topicId, table.tagKey] }),
    index("forum_topic_tags_tag_key_idx").on(table.tagKey),
  ],
);

export const forumTopicPins = pgTable(
  "forum_topic_pins",
  {
    topicId: text("topic_id")
      .primaryKey()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    pinnedByUserId: text("pinned_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topic_pins_order_idx").on(table.pinnedAt, table.topicId),
  ],
);

export const forumHelpDuplicateRelationships = pgTable(
  "forum_help_duplicate_relationships",
  {
    id: text("id").primaryKey(),
    duplicateTopicId: text("duplicate_topic_id").notNull().references(() => forumTopics.id, { onDelete: "cascade" }),
    originalTopicId: text("original_topic_id").notNull().references(() => forumTopics.id, { onDelete: "cascade" }),
    confirmedByUserId: text("confirmed_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    removedByUserId: text("removed_by_user_id").references(() => user.id, { onDelete: "restrict" }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("forum_help_duplicate_relationships_active_duplicate_idx")
      .on(table.duplicateTopicId)
      .where(sql`${table.removedAt} is null`),
    index("forum_help_duplicate_relationships_active_original_idx").on(table.originalTopicId, table.removedAt),
    check(
      "forum_help_duplicate_relationships_not_self_check",
      sql`${table.duplicateTopicId} <> ${table.originalTopicId}`,
    ),
    check(
      "forum_help_duplicate_relationships_removal_check",
      sql`(
        ${table.removedAt} is null and ${table.removedByUserId} is null
      ) or (
        ${table.removedAt} is not null
        and ${table.removedByUserId} is not null
        and ${table.removedAt} >= ${table.confirmedAt}
      )`,
    ),
  ],
);

export const forumHelpDuplicateAppeals = pgTable(
  "forum_help_duplicate_appeals",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id").notNull().references(() => forumHelpDuplicateRelationships.id, { onDelete: "cascade" }),
    appellantUserId: text("appellant_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    explanation: text("explanation").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, { onDelete: "restrict" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("forum_help_duplicate_appeals_pending_relationship_idx")
      .on(table.relationshipId)
      .where(sql`${table.status} = 'pending'`),
    index("forum_help_duplicate_appeals_relationship_created_idx").on(table.relationshipId, table.createdAt, table.id),
    check(
      "forum_help_duplicate_appeals_explanation_check",
      sql`btrim(${table.explanation}) <> '' and char_length(${table.explanation}) <= 1000`,
    ),
    check(
      "forum_help_duplicate_appeals_status_check",
      sql`${table.status} in ('pending', 'rejected', 'accepted')`,
    ),
    check(
      "forum_help_duplicate_appeals_lifecycle_check",
      sql`(
        ${table.status} = 'pending'
        and ${table.resolvedByUserId} is null
        and ${table.resolvedAt} is null
      ) or (
        ${table.status} in ('rejected', 'accepted')
        and ${table.resolvedByUserId} is not null
        and ${table.resolvedAt} is not null
        and ${table.resolvedAt} >= ${table.createdAt}
      )`,
    ),
  ],
);

export const forumTopicTitleRevisions = pgTable(
  "forum_topic_title_revisions",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    originalContent: text("original_content").notNull(),
    sourceLocale: text("source_locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("forum_topic_title_revisions_topic_id_id_unique").on(table.topicId, table.id),
    unique("forum_topic_title_revisions_owner_source_unique").on(table.topicId, table.id, table.sourceLocale),
    foreignKey({
      name: "forum_topic_title_revisions_topic_id_fk",
      columns: [table.topicId],
      foreignColumns: [forumTopics.id],
    }).onDelete("cascade"),
    check("forum_topic_title_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
    check("forum_topic_title_revisions_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
  ],
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // The migration adds a deferred owner-matching FK to (post_id, revision_id).
    currentRevisionId: text("current_revision_id").notNull(),
    parentPostId: text("parent_post_id"),
    solutionModerationStatus: text("solution_moderation_status"),
    solutionOutdatedReason: text("solution_outdated_reason"),
    solutionOutdatedReasonKind: text("solution_outdated_reason_kind"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    index("forum_posts_parent_post_id_idx").on(table.parentPostId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
    foreignKey({
      name: "forum_posts_parent_topic_fk",
      columns: [table.topicId, table.parentPostId],
      foreignColumns: [table.topicId, table.id],
    }),
    check("forum_posts_parent_not_self_check", sql`${table.parentPostId} is null or ${table.parentPostId} <> ${table.id}`),
    check(
      "forum_posts_solution_moderation_status_check",
      sql`${table.solutionModerationStatus} is null or ${table.solutionModerationStatus} in ('needs-review', 'outdated')`,
    ),
    check(
      "forum_posts_solution_outdated_reason_kind_check",
      sql`${table.solutionOutdatedReasonKind} is null or ${table.solutionOutdatedReasonKind} = 'best-answer-replaced'`,
    ),
    check(
      "forum_posts_solution_outdated_reason_check",
      sql`(
        ${table.solutionModerationStatus} is not distinct from 'outdated'
        and (
          (
            ${table.solutionOutdatedReasonKind} is not distinct from 'best-answer-replaced'
            and ${table.solutionOutdatedReason} is null
          )
          or (
            ${table.solutionOutdatedReasonKind} is null
            and ${table.solutionOutdatedReason} is not null
            and btrim(${table.solutionOutdatedReason}) <> ''
            and char_length(${table.solutionOutdatedReason}) <= 1000
          )
        )
      ) or (
        ${table.solutionModerationStatus} is distinct from 'outdated'
        and ${table.solutionOutdatedReason} is null
        and ${table.solutionOutdatedReasonKind} is null
      )`,
    ),
  ],
);


// Written before private bytes, independently of metadata/publication commit.
export const forumAttachmentUploadObjects = pgTable("forum_attachment_upload_objects", {
  objectKey: text("object_key").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reservationEtag: text("reservation_etag"),
  claimToken: text("claim_token"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
}, (table) => [
  index("forum_attachment_upload_objects_cleanup_idx").on(table.createdAt),
  check("forum_attachment_upload_objects_claim_check", sql`
    (${table.claimToken} is null and ${table.claimedAt} is null)
    or (${table.claimToken} is not null and ${table.claimedAt} is not null)
  `),
]);

export const forumAttachments = pgTable(
  "forum_attachments",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    declaredMime: text("declared_mime").notNull(),
    detectedType: text("detected_type").notNull(),
    responseMime: text("response_mime").notNull(),
    byteSize: integer("byte_size").notNull(),
    verificationStatus: text("verification_status").notNull(),
    cleanupStatus: text("cleanup_status").notNull().default("active"),
    cleanupClaimToken: text("cleanup_claim_token"),
    cleanupClaimedAt: timestamp("cleanup_claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "forum_attachments_owner_fk",
      columns: [table.ownerId],
      foreignColumns: [user.id],
    }).onDelete("restrict"),
    unique("forum_attachments_object_key_unique").on(table.objectKey),
    unique("forum_attachments_id_owner_unique").on(table.id, table.ownerId),
    index("forum_attachments_owner_created_idx").on(table.ownerId, table.createdAt),
    index("forum_attachments_cleanup_queue_idx").on(table.cleanupStatus, table.createdAt),
    check("forum_attachments_cleanup_status_check",
      sql`${table.cleanupStatus} in ('active', 'deleting')`),
    check("forum_attachments_cleanup_claim_check", sql`
      (${table.cleanupStatus} = 'active' and ${table.cleanupClaimToken} is null and ${table.cleanupClaimedAt} is null)
      or
      (${table.cleanupStatus} = 'deleting' and ${table.cleanupClaimToken} is not null and ${table.cleanupClaimedAt} is not null)
    `),
  ],
);

export const forumAttachmentDraftRefs = pgTable(
  "forum_attachment_draft_refs",
  {
    attachmentId: text("attachment_id").notNull(),
    ownerId: text("owner_id").notNull(),
    contextKey: text("context_key").notNull(),
    draftId: text("draft_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "forum_attachment_draft_refs_pk",
      columns: [table.attachmentId, table.contextKey, table.draftId],
    }),
    foreignKey({
      name: "forum_attachment_draft_refs_attachment_owner_fk",
      columns: [table.attachmentId, table.ownerId],
      foreignColumns: [forumAttachments.id, forumAttachments.ownerId],
    }).onDelete("restrict"),
    index("forum_attachment_draft_refs_owner_context_idx").on(
      table.ownerId,
      table.contextKey,
      table.draftId,
    ),
  ],
);

// Durable provenance lets a later winning draft CAS restore a reference that
// a concurrent losing DELETE removed, without allowing cross-context reuse.
export const forumAttachmentDraftContexts = pgTable(
  "forum_attachment_draft_contexts",
  {
    attachmentId: text("attachment_id").notNull(),
    ownerId: text("owner_id").notNull(),
    contextKey: text("context_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_attachment_draft_contexts_pk",
      columns: [table.attachmentId, table.ownerId, table.contextKey],
    }),
    foreignKey({
      name: "forum_attachment_draft_contexts_attachment_owner_fk",
      columns: [table.attachmentId, table.ownerId],
      foreignColumns: [forumAttachments.id, forumAttachments.ownerId],
    }).onDelete("cascade"),
    index("forum_attachment_draft_contexts_owner_context_idx").on(
      table.ownerId,
      table.contextKey,
    ),
  ],
);

// Immutable pre-mutation membership for one text-draft version. Explicit
// conflict resolution uses this snapshot to restore the selected version even
// when a same-version attachment request committed before the user's choice.
export const forumAttachmentDraftBoundaries = pgTable(
  "forum_attachment_draft_boundaries",
  {
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    contextKey: text("context_key").notNull(),
    draftId: text("draft_id").notNull(),
    version: integer("version").notNull(),
    attachmentIds: jsonb("attachment_ids").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_attachment_draft_boundaries_pk",
      columns: [table.ownerId, table.contextKey, table.draftId, table.version],
    }),
  ],
);

export const forumAttachmentDraftGenerations = pgTable(
  "forum_attachment_draft_generations",
  {
    ownerId: text("owner_id").notNull(),
    contextKey: text("context_key").notNull(),
    draftId: text("draft_id").notNull(),
    targetDraftId: text("target_draft_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_attachment_draft_generations_pk",
      columns: [table.ownerId, table.contextKey, table.draftId],
    }),
    foreignKey({
      name: "forum_attachment_draft_generations_owner_fk",
      columns: [table.ownerId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    check("forum_attachment_draft_generations_target_check", sql`${table.draftId} <> ${table.targetDraftId}`),
  ],
);

// Records initialization even after the last file is removed. Reopening an edit
// must not copy the published files back into an already initialized generation.
export const forumAttachmentEditSnapshots = pgTable(
  "forum_attachment_edit_snapshots",
  {
    ownerId: text("owner_id").notNull(),
    contextKey: text("context_key").notNull(),
    draftId: text("draft_id").notNull(),
    postId: text("post_id").notNull(),
    revisionId: text("revision_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: "forum_attachment_edit_snapshots_pk", columns: [table.ownerId, table.contextKey, table.draftId] }),
    foreignKey({ name: "forum_attachment_edit_snapshots_owner_fk", columns: [table.ownerId], foreignColumns: [user.id] }).onDelete("cascade"),
    foreignKey({ name: "forum_attachment_edit_snapshots_post_fk", columns: [table.postId], foreignColumns: [forumPosts.id] }).onDelete("cascade"),
  ],
);

export const forumPostAttachments = pgTable(
  "forum_post_attachments",
  {
    postId: text("post_id").notNull(),
    attachmentId: text("attachment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "forum_post_attachments_pk",
      columns: [table.postId, table.attachmentId],
    }),
    foreignKey({
      name: "forum_post_attachments_post_fk",
      columns: [table.postId],
      foreignColumns: [forumPosts.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "forum_post_attachments_attachment_fk",
      columns: [table.attachmentId],
      foreignColumns: [forumAttachments.id],
    }).onDelete("restrict"),
    index("forum_post_attachments_attachment_idx").on(table.attachmentId),
  ],
);

export const forumAttachmentSecurityEvents = pgTable(
  "forum_attachment_security_events",
  {
    id: text("id").primaryKey(),
    uploadId: text("upload_id").notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    contextKey: text("context_key").notNull(),
    draftId: text("draft_id").notNull(),
    fileName: text("file_name").notNull(),
    declaredMime: text("declared_mime").notNull(),
    detectedType: text("detected_type").notNull(),
    reason: text("reason").notNull(),
    declaredByteSize: integer("declared_byte_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("forum_attachment_security_events_upload_id_unique").on(table.uploadId),
    index("forum_attachment_security_events_created_idx").on(table.createdAt, table.id),
    index("forum_attachment_security_events_uploader_created_idx")
      .on(table.uploadedByUserId, table.createdAt.desc(), table.id.desc()),
  ],
);

export const forumHelpSignals = pgTable(
  "forum_help_signals",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    topicId: text("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    targetPostId: text("target_post_id"),
    proposedOriginalTopicId: text("proposed_original_topic_id")
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    explanation: text("explanation"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedByUserId: text("resolved_by_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("forum_help_signals_pending_needs_details_submitter_idx")
      .on(table.topicId, table.submittedByUserId)
      .where(sql`${table.status} = 'pending' and ${table.kind} = 'needs-details'`),
    uniqueIndex("forum_help_signals_pending_solution_submitter_idx")
      .on(table.topicId, table.targetPostId, table.submittedByUserId, table.kind)
      .where(sql`${table.status} = 'pending' and ${table.kind} in ('needs-review', 'solution-outdated')`),
    uniqueIndex("forum_help_signals_pending_duplicate_submitter_idx")
      .on(table.topicId, table.proposedOriginalTopicId, table.submittedByUserId)
      .where(sql`${table.status} = 'pending' and ${table.kind} = 'duplicate'`),
    index("forum_help_signals_pending_review_idx").on(table.status, table.kind, table.createdAt, table.id),
    index("forum_help_signals_submitter_created_idx").on(table.submittedByUserId, table.createdAt, table.id),
    foreignKey({
      name: "forum_help_signals_target_post_topic_fk",
      columns: [table.topicId, table.targetPostId],
      foreignColumns: [forumPosts.topicId, forumPosts.id],
    }).onDelete("cascade"),
    check(
      "forum_help_signals_kind_check",
      sql`${table.kind} in ('needs-details', 'needs-review', 'solution-outdated', 'duplicate')`,
    ),
    check(
      "forum_help_signals_explanation_check",
      sql`${table.explanation} is null or (btrim(${table.explanation}) <> '' and char_length(${table.explanation}) <= 1000)`,
    ),
    check(
      "forum_help_signals_shape_check",
      sql`(
        ${table.kind} = 'needs-details'
        and ${table.targetPostId} is null
        and ${table.proposedOriginalTopicId} is null
        and ${table.explanation} is not null
      ) or (
        ${table.kind} in ('needs-review', 'solution-outdated')
        and ${table.targetPostId} is not null
        and ${table.proposedOriginalTopicId} is null
        and ${table.explanation} is not null
      ) or (
        ${table.kind} = 'duplicate'
        and ${table.targetPostId} is null
        and ${table.proposedOriginalTopicId} is not null
        and ${table.proposedOriginalTopicId} <> ${table.topicId}
      )`,
    ),
    check(
      "forum_help_signals_status_check",
      sql`${table.status} in ('pending', 'accepted', 'rejected', 'withdrawn', 'superseded')`,
    ),
    check(
      "forum_help_signals_lifecycle_check",
      sql`(
        ${table.status} = 'pending'
        and ${table.resolvedByUserId} is null
        and ${table.resolvedAt} is null
      ) or (
        ${table.status} in ('accepted', 'rejected', 'withdrawn', 'superseded')
        and ${table.resolvedByUserId} is not null
        and ${table.resolvedAt} is not null
        and ${table.resolvedAt} >= ${table.createdAt}
      )`,
    ),
  ],
);

export const forumTopicReadStates = pgTable(
  "forum_topic_read_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    lastReadPostId: text("last_read_post_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_topic_read_states_pk",
      columns: [table.userId, table.topicId],
    }),
    foreignKey({
      name: "forum_topic_read_states_post_topic_fk",
      columns: [table.topicId, table.lastReadPostId],
      foreignColumns: [forumPosts.topicId, forumPosts.id],
    }).onDelete("restrict"),
  ],
);

export const forumReplyNotifications = pgTable(
  "forum_reply_notifications",
  {
    id: text("id").primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    topicId: text("topic_id")
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    postId: text("post_id"),
    complaintDecisionId: text("complaint_decision_id"),
    complaintAppealId: text("complaint_appeal_id"),
    kind: text("kind").$type<"reply" | "mention" | "complaint-decision" | "complaint-appeal-result">().notNull().default("reply"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    check("forum_reply_notifications_kind_check", sql`(${table.kind} in ('reply','mention') and ${table.actorUserId} is not null and ${table.topicId} is not null and ${table.postId} is not null and ${table.complaintDecisionId} is null and ${table.complaintAppealId} is null) or (${table.kind} = 'complaint-decision' and ${table.complaintDecisionId} is not null and ${table.complaintAppealId} is null and ${table.actorUserId} is null and ${table.topicId} is null and ${table.postId} is null) or (${table.kind} = 'complaint-appeal-result' and ${table.complaintAppealId} is not null and ${table.complaintDecisionId} is null and ${table.actorUserId} is null and ${table.topicId} is null and ${table.postId} is null)`),
    unique("forum_reply_notifications_recipient_decision_unique").on(table.recipientUserId, table.complaintDecisionId),
    unique("forum_reply_notifications_recipient_appeal_unique").on(table.recipientUserId,table.complaintAppealId),
    foreignKey({name:"forum_reply_notifications_appeal_fk",columns:[table.complaintAppealId],foreignColumns:[forumComplaintAppeals.id]}).onDelete("restrict"),
    foreignKey({name:"forum_reply_notifications_decision_fk",columns:[table.complaintDecisionId],foreignColumns:[forumComplaintDecisions.id]}).onDelete("restrict"),
    unique("forum_reply_notifications_recipient_post_unique").on(table.recipientUserId, table.postId),
    index("forum_reply_notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
      table.id,
    ),
    index("forum_reply_notifications_recipient_read_idx").on(table.recipientUserId, table.readAt),
    foreignKey({
      name: "forum_reply_notifications_post_topic_fk",
      columns: [table.topicId, table.postId],
      foreignColumns: [forumPosts.topicId, forumPosts.id],
    }).onDelete("cascade"),
  ],
);

export const forumPostRevisions = pgTable(
  "forum_post_revisions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    originalContent: text("original_content").notNull(),
    sourceLocale: text("source_locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("forum_post_revisions_post_id_id_unique").on(table.postId, table.id),
    unique("forum_post_revisions_owner_source_unique").on(table.postId, table.id, table.sourceLocale),
    foreignKey({
      name: "forum_post_revisions_post_id_fk",
      columns: [table.postId],
      foreignColumns: [forumPosts.id],
    }).onDelete("cascade"),
    check("forum_post_revisions_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
  ],
);

export const forumTopicTitleTranslations = pgTable(
  "forum_topic_title_translations",
  {
    topicId: text("topic_id").notNull(),
    revisionId: text("revision_id").notNull(),
    targetLocale: text("target_locale").notNull(),
    sourceLocale: text("source_locale").notNull(),
    translatedContent: text("translated_content").notNull(),
    origin: text("origin").notNull(),
    provider: text("provider"),
    providerModel: text("provider_model"),
    attribution: text("attribution"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_topic_title_translations_pk",
      columns: [table.topicId, table.revisionId, table.targetLocale],
    }),
    foreignKey({
      name: "forum_topic_title_translations_revision_fk",
      columns: [table.topicId, table.revisionId, table.sourceLocale],
      foreignColumns: [
        forumTopicTitleRevisions.topicId,
        forumTopicTitleRevisions.id,
        forumTopicTitleRevisions.sourceLocale,
      ],
    }).onDelete("cascade"),
    check("forum_topic_title_translations_target_locale_check", contentTargetLocaleCheck(table.targetLocale)),
    check("forum_topic_title_translations_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
    check(
      "forum_topic_title_translations_distinct_locale_check",
      sql`${table.sourceLocale} = 'und' or lower(${table.sourceLocale}) <> lower(${table.targetLocale})`,
    ),
    check("forum_topic_title_translations_content_check", sql`btrim(${table.translatedContent}) <> ''`),
    check(
      "forum_topic_title_translations_origin_check",
      sql`${table.origin} in ('persistent_manual', 'machine')`,
    ),
    check(
      "forum_topic_title_translations_metadata_check",
      contentTranslationMetadataCheck(table.origin, table.provider, table.providerModel),
    ),
    check(
      "forum_topic_title_translations_attribution_check",
      sql`${table.attribution} is null or btrim(${table.attribution}) <> ''`,
    ),
  ],
);

export const contentTopicTitleTranslationTasks = pgTable(
  "content_topic_title_translation_tasks",
  {
    taskId: uuid("task_id").primaryKey(),
    translationKind: text("translation_kind").notNull(),
    sourceNamespace: text("source_namespace").notNull(),
    topicId: text("topic_id").notNull(),
    revisionId: text("revision_id").notNull(),
    revisionSourceLocale: text("revision_source_locale").notNull(),
    resolvedSourceLocale: text("resolved_source_locale").notNull(),
    sourceResolutionOrigin: text("source_resolution_origin").notNull(),
  },
  (table) => [
    foreignKey({
      name: "content_topic_title_translation_tasks_task_fk",
      columns: [table.taskId, table.translationKind, table.sourceNamespace, table.topicId],
      foreignColumns: [
        translationTasks.id,
        translationTasks.translationKind,
        translationTasks.sourceNamespace,
        translationTasks.sourceKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "content_topic_title_translation_tasks_revision_fk",
      columns: [table.topicId, table.revisionId, table.revisionSourceLocale],
      foreignColumns: [
        forumTopicTitleRevisions.topicId,
        forumTopicTitleRevisions.id,
        forumTopicTitleRevisions.sourceLocale,
      ],
    }).onDelete("cascade"),
    check(
      "content_topic_title_translation_tasks_kind_check",
      sql`${table.translationKind} = 'content-topic-title'`,
    ),
    check(
      "content_topic_title_translation_tasks_namespace_check",
      sql`${table.sourceNamespace} = 'topic-title'`,
    ),
    check(
      "content_topic_title_translation_tasks_revision_source_locale_check",
      sourceLocaleCheck(table.revisionSourceLocale),
    ),
    check(
      "content_topic_title_translation_tasks_resolved_source_locale_check",
      contentTargetLocaleCheck(table.resolvedSourceLocale),
    ),
    check(
      "content_topic_title_translation_tasks_resolution_origin_check",
      sql`${table.sourceResolutionOrigin} in ('revision-metadata', 'detector')`,
    ),
    check(
      "content_topic_title_translation_tasks_resolution_check",
      sql`(
        ${table.sourceResolutionOrigin} = 'revision-metadata'
        and lower(${table.revisionSourceLocale}) <> 'und'
        and ${table.revisionSourceLocale} = ${table.resolvedSourceLocale}
      ) or (
        ${table.sourceResolutionOrigin} = 'detector'
        and lower(${table.revisionSourceLocale}) = 'und'
      )`,
    ),
  ],
);

export const contentPostBodyTranslationTasks = pgTable(
  "content_post_body_translation_tasks",
  {
    taskId: uuid("task_id").primaryKey(),
    translationKind: text("translation_kind").notNull(),
    sourceNamespace: text("source_namespace").notNull(),
    postId: text("post_id").notNull(),
    revisionId: text("revision_id").notNull(),
    revisionSourceLocale: text("revision_source_locale").notNull(),
    resolvedSourceLocale: text("resolved_source_locale").notNull(),
    sourceResolutionOrigin: text("source_resolution_origin").notNull(),
    protectedContentPolicyVersion: text("protected_content_policy_version").notNull(),
  },
  (table) => [
    foreignKey({
      name: "content_post_body_translation_tasks_task_fk",
      columns: [table.taskId, table.translationKind, table.sourceNamespace, table.postId],
      foreignColumns: [
        translationTasks.id,
        translationTasks.translationKind,
        translationTasks.sourceNamespace,
        translationTasks.sourceKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "content_post_body_translation_tasks_revision_fk",
      columns: [table.postId, table.revisionId, table.revisionSourceLocale],
      foreignColumns: [
        forumPostRevisions.postId,
        forumPostRevisions.id,
        forumPostRevisions.sourceLocale,
      ],
    }).onDelete("cascade"),
    check(
      "content_post_body_translation_tasks_kind_check",
      sql`${table.translationKind} = 'content-post-body'`,
    ),
    check(
      "content_post_body_translation_tasks_namespace_check",
      sql`${table.sourceNamespace} = 'post-body'`,
    ),
    check(
      "content_post_body_translation_tasks_revision_source_locale_check",
      sourceLocaleCheck(table.revisionSourceLocale),
    ),
    check(
      "content_post_body_translation_tasks_resolved_source_locale_check",
      contentTargetLocaleCheck(table.resolvedSourceLocale),
    ),
    check(
      "content_post_body_translation_tasks_resolution_origin_check",
      sql`${table.sourceResolutionOrigin} in ('revision-metadata', 'detector')`,
    ),
    check(
      "content_post_body_translation_tasks_resolution_check",
      sql`(
        ${table.sourceResolutionOrigin} = 'revision-metadata'
        and lower(${table.revisionSourceLocale}) <> 'und'
        and ${table.revisionSourceLocale} = ${table.resolvedSourceLocale}
      ) or (
        ${table.sourceResolutionOrigin} = 'detector'
        and lower(${table.revisionSourceLocale}) = 'und'
      )`,
    ),
    check(
      "content_post_body_translation_tasks_protection_policy_check",
      sql`btrim(${table.protectedContentPolicyVersion}) <> ''`,
    ),
  ],
);

export const forumPostBodyTranslations = pgTable(
  "forum_post_body_translations",
  {
    postId: text("post_id").notNull(),
    revisionId: text("revision_id").notNull(),
    targetLocale: text("target_locale").notNull(),
    sourceLocale: text("source_locale").notNull(),
    translatedContent: text("translated_content").notNull(),
    origin: text("origin").notNull(),
    provider: text("provider"),
    providerModel: text("provider_model"),
    attribution: text("attribution"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "forum_post_body_translations_pk",
      columns: [table.postId, table.revisionId, table.targetLocale],
    }),
    foreignKey({
      name: "forum_post_body_translations_revision_fk",
      columns: [table.postId, table.revisionId, table.sourceLocale],
      foreignColumns: [
        forumPostRevisions.postId,
        forumPostRevisions.id,
        forumPostRevisions.sourceLocale,
      ],
    }).onDelete("cascade"),
    check("forum_post_body_translations_target_locale_check", contentTargetLocaleCheck(table.targetLocale)),
    check("forum_post_body_translations_source_locale_check", sourceLocaleCheck(table.sourceLocale)),
    check(
      "forum_post_body_translations_distinct_locale_check",
      sql`${table.sourceLocale} = 'und' or lower(${table.sourceLocale}) <> lower(${table.targetLocale})`,
    ),
    check("forum_post_body_translations_content_check", sql`btrim(${table.translatedContent}) <> ''`),
    check(
      "forum_post_body_translations_origin_check",
      sql`${table.origin} in ('persistent_manual', 'machine')`,
    ),
    check(
      "forum_post_body_translations_metadata_check",
      contentTranslationMetadataCheck(table.origin, table.provider, table.providerModel),
    ),
    check(
      "forum_post_body_translations_attribution_check",
      sql`${table.attribution} is null or btrim(${table.attribution}) <> ''`,
    ),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

function arrayShapeCheck(column: AnyPgColumn) {
  return sql`(
    cardinality(${column}) = 0
    or (array_ndims(${column}) = 1 and array_lower(${column}, 1) = 1)
  ) and array_position(${column}, null) is null`;
}

function sourceLocaleCheck(column: AnyPgColumn) {
  return sql`${column} = btrim(${column}) and ${column} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`;
}

function contentTargetLocaleCheck(column: AnyPgColumn) {
  return sql`${column} = btrim(${column})
    and lower(${column}) <> 'und'
    and ${column} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`;
}

function contentTranslationMetadataCheck(
  origin: AnyPgColumn,
  provider: AnyPgColumn,
  providerModel: AnyPgColumn,
) {
  return sql`(
    ${origin} = 'machine'
    and ${provider} is not null
    and btrim(${provider}) <> ''
    and ${providerModel} is not null
    and btrim(${providerModel}) <> ''
  ) or (
    ${origin} = 'persistent_manual'
    and ${provider} is null
    and ${providerModel} is null
  )`;
}

// One bounded reservation sweep, with durable pagination and fenced lease recovery.
export const forumAttachmentSweep = pgTable("forum_attachment_sweep", {
  id: text("id").primaryKey(),
  cursor: text("cursor"),
  claimToken: text("claim_token"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
}, (table) => [
  check("forum_attachment_sweep_singleton_check", sql`${table.id} = 'reservations-v2'`),
  check("forum_attachment_sweep_claim_check", sql`
    (${table.claimToken} is null and ${table.claimedAt} is null)
    or (${table.claimToken} is not null and ${table.claimedAt} is not null)
  `),
]);


// Complaint evidence uses the existing immutable forum revisions. The migration
// adds the deferred Case -> initial Decision owner-matching FK (as for forum revisions).
export const forumComplaintTargets = pgTable("forum_complaint_targets", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  topicId: text("topic_id").notNull().references(() => forumTopics.id, { onDelete: "restrict" }),
  postId: text("post_id"),
  postRevisionId: text("post_revision_id"),
  titleRevisionId: text("title_revision_id"),
  affectedAuthorId: text("affected_author_id").notNull().references(() => user.id, { onDelete: "restrict" }),
}, t => [
  check("complaint_target_shape", sql`(${t.kind} = 'post' and ${t.postId} is not null and ${t.postRevisionId} is not null and ${t.titleRevisionId} is null) or (${t.kind} = 'topic-title' and ${t.postId} is null and ${t.postRevisionId} is null and ${t.titleRevisionId} is not null)`),
  foreignKey({ name: "complaint_target_post_topic_fk", columns: [t.topicId, t.postId], foreignColumns: [forumPosts.topicId, forumPosts.id] }).onDelete("restrict"),
  foreignKey({ name: "complaint_target_post_revision_fk", columns: [t.postId, t.postRevisionId], foreignColumns: [forumPostRevisions.postId, forumPostRevisions.id] }).onDelete("restrict"),
  foreignKey({ name: "complaint_target_title_revision_fk", columns: [t.topicId, t.titleRevisionId], foreignColumns: [forumTopicTitleRevisions.topicId, forumTopicTitleRevisions.id] }).onDelete("restrict"),
  uniqueIndex("complaint_target_post_unique").on(t.postId, t.postRevisionId).where(sql`${t.kind} = 'post'`),
  uniqueIndex("complaint_target_title_unique").on(t.topicId, t.titleRevisionId).where(sql`${t.kind} = 'topic-title'`),
]);

export const forumComplaintCases = pgTable("forum_complaint_cases", {
  id: text("id").primaryKey(),
  targetId: text("target_id").notNull().references(() => forumComplaintTargets.id, { onDelete: "restrict" }),
  previousCaseId: text("previous_case_id"),
  state: text("state").notNull().default("open"),
  version: integer("version").notNull().default(1),
  priorityOverride: integer("priority_override"),
  initialDecisionId: text("initial_decision_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, t => [
  unique("complaint_case_target_unique").on(t.id, t.targetId),
  foreignKey({ name: "complaint_case_previous_fk", columns: [t.previousCaseId], foreignColumns: [t.id] }).onDelete("restrict"),
  check("complaint_case_previous_not_self", sql`${t.previousCaseId} is null or ${t.previousCaseId} <> ${t.id}`),
  check("complaint_case_priority_check", sql`${t.priorityOverride} is null or ${t.priorityOverride} between 1 and 3`),
  uniqueIndex("complaint_case_open_target_unique").on(t.targetId).where(sql`${t.state} = 'open'`),
  index("complaint_case_target_resolved_idx").on(t.targetId, t.resolvedAt.desc(), t.createdAt.desc(), t.id.desc()).where(sql`${t.state} = 'resolved'`),
  index("complaint_case_state_created_idx").on(t.state, t.createdAt, t.id),
  index("complaint_case_history_idx").on(t.resolvedAt.desc(), t.id.desc()).where(sql`${t.state} = 'resolved'`),
  check("complaint_case_lifecycle", sql`${t.version} > 0 and ((${t.state} = 'open' and ${t.initialDecisionId} is null and ${t.resolvedAt} is null) or (${t.state} = 'resolved' and ${t.initialDecisionId} is not null and ${t.resolvedAt} is not null and ${t.resolvedAt} >= ${t.createdAt}))`),
]);

export const forumComplaints = pgTable("forum_complaints", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  targetId: text("target_id").notNull(),
  reporterUserId: text("reporter_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: "complaint_case_target_fk", columns: [t.caseId, t.targetId], foreignColumns: [forumComplaintCases.id, forumComplaintCases.targetId] }).onDelete("restrict"),
  unique("complaint_reporter_target_unique").on(t.reporterUserId, t.targetId),
  index("complaint_reporter_created_idx").on(t.reporterUserId, t.createdAt.desc(), t.id.desc()),
  unique("complaint_case_id_unique").on(t.caseId, t.id),
  index("complaint_case_created_idx").on(t.caseId, t.createdAt, t.id),
  check("complaint_reason_check", sql`${t.reason} in ('spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other')`),
  check("complaint_explanation_check", sql`(${t.explanation} is null or (btrim(${t.explanation}) <> '' and char_length(${t.explanation}) <= 2000)) and (${t.reason} <> 'other' or ${t.explanation} is not null)`),
]);

export const forumComplaintDecisions = pgTable("forum_complaint_decisions", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => forumComplaintCases.id, { onDelete: "restrict" }),
  outcome: text("outcome").notNull(),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  reasoning: text("reasoning").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("complaint_decision_case_unique").on(t.caseId),
  unique("complaint_decision_owner_unique").on(t.caseId, t.id),
  check("complaint_decision_outcome_check", sql`${t.outcome} in ('confirmed','not-confirmed')`),
  check("complaint_decision_reasoning_check", sql`btrim(${t.reasoning}) <> '' and char_length(${t.reasoning}) <= 10000`),
]);

export const forumComplaintNotes = pgTable("forum_complaint_notes", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => forumComplaintCases.id, { onDelete: "restrict" }),
  authorUserId: text("author_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("complaint_note_owner_unique").on(t.caseId, t.id),
  index("complaint_note_case_created_idx").on(t.caseId, t.createdAt, t.id),
  check("complaint_note_body_check", sql`btrim(${t.body}) <> '' and char_length(${t.body}) <= 10000`),
]);

export const forumComplaintAppeals = pgTable("forum_complaint_appeals", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  decisionId: text("decision_id").notNull(),
  appellantUserId: text("appellant_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  side: text("side").notNull(),
  argument: text("argument").notNull(),
  ordinal: integer("ordinal").notNull(),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome"),
  reasoning: text("reasoning"),
  reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, t => [
  foreignKey({ name: "complaint_appeal_decision_fk", columns: [t.caseId, t.decisionId], foreignColumns: [forumComplaintDecisions.caseId, forumComplaintDecisions.id] }).onDelete("restrict"),
  unique("complaint_appeal_ordinal_unique").on(t.decisionId, t.ordinal),
  unique("complaint_appeal_owner_unique").on(t.caseId, t.id),
  index("complaint_appeal_pending_idx").on(t.status, t.createdAt, t.id),
  uniqueIndex("complaint_appeal_single_pending_idx").on(t.decisionId).where(sql`${t.status} = 'pending'`),
  check("complaint_appeal_ordinal_check", sql`${t.ordinal} between 1 and 3`),
  check("complaint_appeal_side_check", sql`${t.side} in ('author','reporter')`),
  check("complaint_appeal_argument_check", sql`btrim(${t.argument}) <> '' and char_length(${t.argument}) <= 2000`),
  check("complaint_appeal_lifecycle_check", sql`(${t.status} = 'pending' and ${t.outcome} is null and ${t.reasoning} is null and ${t.reviewerUserId} is null and ${t.resolvedAt} is null) or (${t.status} = 'resolved' and ${t.outcome} is not null and ${t.outcome} in ('upheld','overturned') and ${t.reasoning} is not null and btrim(${t.reasoning}) <> '' and char_length(${t.reasoning}) <= 10000 and ${t.reviewerUserId} is not null and ${t.resolvedAt} is not null and ${t.resolvedAt} >= ${t.createdAt})`),
]);

export const forumComplaintEvents = pgTable("forum_complaint_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => forumComplaintCases.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  priorityOverride: integer("priority_override"),
  actorUserId: text("actor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  operationId: text("operation_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  complaintId: text("complaint_id"),
  decisionId: text("decision_id"),
  noteId: text("note_id"),
  appealId: text("appeal_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("complaint_event_operation_unique").on(t.actorUserId, t.operationId),
  index("complaint_event_case_created_idx").on(t.caseId, t.createdAt, t.id),
  foreignKey({ name: "complaint_event_report_fk", columns: [t.caseId,t.complaintId], foreignColumns: [forumComplaints.caseId,forumComplaints.id] }).onDelete("restrict"),
  foreignKey({ name: "complaint_event_decision_fk", columns: [t.caseId,t.decisionId], foreignColumns: [forumComplaintDecisions.caseId,forumComplaintDecisions.id] }).onDelete("restrict"),
  foreignKey({ name: "complaint_event_note_fk", columns: [t.caseId,t.noteId], foreignColumns: [forumComplaintNotes.caseId,forumComplaintNotes.id] }).onDelete("restrict"),
  foreignKey({ name: "complaint_event_appeal_fk", columns: [t.caseId,t.appealId], foreignColumns: [forumComplaintAppeals.caseId,forumComplaintAppeals.id] }).onDelete("restrict"),
  check("complaint_event_fingerprint_check", sql`${t.fingerprint} ~ '^[0-9a-f]{64}$' and btrim(${t.operationId}) <> '' and char_length(${t.operationId}) <= 200`),
  check("complaint_event_priority_check", sql`(${t.priorityOverride} is null or ${t.priorityOverride} between 1 and 3) and (${t.kind} = 'priority-changed' or ${t.priorityOverride} is null)`),
  check("complaint_event_shape_check", sql`(${t.kind} = 'submitted' and ${t.complaintId} is not null and ${t.decisionId} is null and ${t.noteId} is null and ${t.appealId} is null) or (${t.kind} = 'decided' and ${t.decisionId} is not null and ${t.complaintId} is null and ${t.noteId} is null and ${t.appealId} is null) or (${t.kind} = 'noted' and ${t.noteId} is not null and ${t.complaintId} is null and ${t.decisionId} is null and ${t.appealId} is null) or (${t.kind} in ('appealed','appeal-resolved') and ${t.appealId} is not null and ${t.complaintId} is null and ${t.decisionId} is null and ${t.noteId} is null) or (${t.kind} = 'priority-changed' and ${t.complaintId} is null and ${t.decisionId} is null and ${t.noteId} is null and ${t.appealId} is null) or (${t.kind} = 'review-started' and ${t.complaintId} is null and ${t.decisionId} is null and ${t.noteId} is null and ${t.appealId} is null)`),
]);

export const forumComplaintEvidenceAttachments = pgTable("forum_complaint_evidence_attachments", {
  targetId: text("target_id").notNull().references(() => forumComplaintTargets.id, { onDelete: "restrict" }),
  attachmentId: text("attachment_id").notNull().references(() => forumAttachments.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ name: "complaint_evidence_pk", columns: [t.targetId, t.attachmentId] }),
  index("complaint_evidence_attachment_idx").on(t.attachmentId),
]);

// SET-02 global admission policy. The migration owns the one required row.
export const forumRegistrationSettings = pgTable("forum_registration_settings", {
  id: integer("id").primaryKey(),
  googleRegistrationEnabled: boolean("google_registration_enabled").notNull().default(true),
  emailRegistrationEnabled: boolean("email_registration_enabled").notNull().default(true),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
}, t => [
  check("forum_registration_settings_singleton_check", sql`${t.id} = 1`),
  check("forum_registration_settings_version_check", sql`${t.version} > 0`),
]);

// Append-only for the web capability: INSERT/SELECT only; no target FK or deletion cascade.
export const adminHistory = pgTable("admin_history", {
  id: uuid("id").primaryKey(),
  position: bigint("position", {mode: "bigint"}).generatedAlwaysAsIdentity(),
  occurredAt: timestamp("occurred_at", {withTimezone: true, precision: 3}).notNull().default(sql`clock_timestamp()`),
  actorId: text("actor_id").notNull(),
  actorLabel: text("actor_label").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  targetLabel: text("target_label").notNull(),
  context: jsonb("context").notNull(),
  reason: text("reason"),
}, table => [
  uniqueIndex("admin_history_order_idx").on(table.position.desc()),
  index("admin_history_timeline_idx").on(table.occurredAt.desc(), table.id.desc()),
   index("admin_history_actor_occurred_idx").on(table.actorId, table.occurredAt.desc(), table.id.desc()),
   index("admin_history_target_occurred_idx").on(table.targetType, table.targetId,
     table.occurredAt.desc(), table.id.desc()),
  check("admin_history_action_target_check", sql`(
    ${table.action} in ('role.created', 'role.renamed', 'role.deleted', 'role.grantsChanged') and ${table.targetType} = 'role'
  ) or (${table.action} in ('user.roleAssigned', 'user.overrideChanged') and ${table.targetType} = 'user')
  or (${table.action} in ('topic.pinned', 'topic.unpinned', 'topic.solved', 'topic.bestAnswerChanged',
    'help.solutionModerationChanged', 'help.duplicateConfirmed', 'help.duplicateRemoved',
    'help.duplicateAppealResolved', 'help.signalReviewed', 'topic.sourceLocaleCorrected',
    'topic.closed', 'topic.reopened') and ${table.targetType} = 'topic')
  or (${table.action} = 'post.sourceLocaleCorrected' and ${table.targetType} = 'post')
  or (${table.action} in ('measure.created', 'measure.changed', 'measure.lifted', 'measure.appealResolved')
    and ${table.targetType} = 'user-measure')
  or (${table.action} = 'settings.registrationChanged' and ${table.targetType} = 'forum-settings')`),
  check("admin_history_context_check", sql`jsonb_typeof(${table.context}) = 'object' and octet_length(${table.context}::text) <= 16384`),
  check("admin_history_labels_check", sql`char_length(${table.actorLabel}) <= 200 and char_length(${table.targetLabel}) <= 200`),
  check("admin_history_reason_check", sql`${table.reason} is null or (char_length(${table.reason}) <= 2000 and btrim(${table.reason}) <> '')`),
]);


/** Owner history is append-only, independent from ordinary Admin History. */
export const ownerEvents = pgTable("owner_events", {
  id: uuid("id").primaryKey(),
  position: bigint("position", { mode: "bigint" }).generatedAlwaysAsIdentity(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, precision: 3 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
  source: text("source").notNull(),
  occurrenceKey: text("occurrence_key").notNull(),
  kind: text("kind").notNull(),
  monitorKey: text("monitor_key").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  actorUserId: text("actor_user_id"),
  targetUserId: text("target_user_id"),
  correlationId: text("correlation_id"),
  payload: jsonb("payload").notNull(),
}, t => [
  uniqueIndex("owner_events_position_idx").on(t.position.desc()),
  uniqueIndex("owner_events_occurrence_idx").on(t.source, t.occurrenceKey),
  index("owner_events_monitor_idx").on(t.monitorKey, t.position.desc()),
  index("owner_events_kind_idx").on(t.kind, t.position.desc()),
  index("owner_events_entity_idx").on(t.entityType, t.entityId, t.position.desc()),
  index("owner_events_actor_idx").on(t.actorUserId, t.position.desc()),
  index("owner_events_target_idx").on(t.targetUserId, t.position.desc()),
  index("owner_events_timeline_idx").on(t.occurredAt.desc(), t.id.desc()),
   index("owner_events_actor_occurred_idx").on(t.actorUserId, t.occurredAt.desc(), t.id.desc()),
   index("owner_events_target_occurred_idx").on(t.targetUserId, t.occurredAt.desc(), t.id.desc()),
]);

/** Retained measured states are samples, never reconstructed domain events. */
export const ownerMonitorObservations = pgTable("owner_monitor_observations", {
  id: uuid("id").primaryKey(),
  position: bigint("position", { mode: "bigint" }).generatedAlwaysAsIdentity(),
  monitorKey: text("monitor_key").notNull(),
  resourceScope: text("resource_scope").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
  source: text("source").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  quality: text("quality").notNull(),
  value: jsonb("value").notNull(),
  fingerprint: text("fingerprint").notNull(),
}, t => [
  uniqueIndex("owner_monitor_observations_position_idx").on(t.position.desc()),
  index("owner_monitor_observations_scope_idx").on(t.monitorKey, t.resourceScope, t.position.desc()),
  index("owner_monitor_observations_timeline_idx").on(t.observedAt.desc(), t.id.desc()),
]);

/** SA-02: attributed attempts coalesce within a DB-chosen UTC recording hour.
 * Mutable counts never alter the immutable admittedAt pagination key.
 * Epoch admission and per-pool quota are enforced by the transactional writer.
 */
export const ownerAttemptPatterns = pgTable("owner_attempt_patterns", {
  id: uuid("id").primaryKey(),
  recordingEpochStart: timestamp("recording_epoch_start", { withTimezone: true, precision: 3 }).notNull(),
  admittedAt: timestamp("admitted_at", { withTimezone: true, precision: 3 }).notNull()
    .default(sql`clock_timestamp()`),
  pool: text("pool").notNull(),
  actorUserId: text("actor_user_id"),
  networkIp: inet("network_ip"),
  networkQuality: text("network_quality").notNull(),
  surface: text("surface").notNull(),
  operation: text("operation").notNull(),
  outcome: text("outcome").notNull(),
  httpStatus: integer("http_status"),
  directCode: text("direct_code"),
  firstOccurredAt: timestamp("first_occurred_at", { withTimezone: true, precision: 3 }).notNull(),
  lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true, precision: 3 }).notNull(),
  count: bigint("count", { mode: "bigint" }).notNull().default(1n),
  saturatedCount: boolean("saturated_count").notNull().default(false),
}, t => [
  unique("owner_attempt_patterns_epoch_identity_unique").on(
    t.recordingEpochStart, t.pool, t.actorUserId, t.networkIp, t.networkQuality,
    t.surface, t.operation, t.outcome, t.httpStatus, t.directCode,
  ).nullsNotDistinct(),
  index("owner_attempt_patterns_timeline_idx").on(t.admittedAt.desc(), t.id.desc()),
   index("owner_attempt_patterns_actor_admitted_idx").on(t.actorUserId, t.admittedAt.desc(), t.id.desc()),
  index("owner_attempt_patterns_epoch_idx").on(t.recordingEpochStart, t.pool),
  check("owner_attempt_patterns_epoch_check",
    sql`${t.recordingEpochStart} = date_trunc('hour', ${t.recordingEpochStart}, 'UTC')`),
  check("owner_attempt_patterns_source_check",
    sql`(${t.pool} = 'authenticated' and ${t.actorUserId} is not null)
      or (${t.pool} = 'anonymous' and ${t.actorUserId} is null and ${t.networkIp} is not null)`),
  check("owner_attempt_patterns_network_check",
    sql`${t.networkQuality} in ('trusted', 'qualified', 'unknown')
      and (${t.networkIp} is not null or ${t.networkQuality} = 'unknown')
      and (${t.networkIp} is null or masklen(${t.networkIp}) =
        case family(${t.networkIp}) when 4 then 32 else 128 end)`),
  check("owner_attempt_patterns_kind_check",
    sql`${t.surface} in ('auth', 'access')
      and ${t.operation} in (
        'sign-up', 'sign-in', 'method-link', 'password-change',
        'session-revoke', 'session-revoke-all', 'sign-out',
        'registration-admission', 'owner-guard'
      )
      and ${t.outcome} in ('denied', 'failed', 'rate-limited', 'unavailable')
      and ((${t.httpStatus} between 400 and 599 and ${t.directCode} is null)
        or (${t.httpStatus} is null and ${t.directCode} in (
          'unauthorized', 'forbidden', 'invalid', 'rate-limited', 'unavailable'
        )))`),
  check("owner_attempt_patterns_counter_check",
    sql`${t.count} > 0 and ${t.firstOccurredAt} <= ${t.lastOccurredAt}`),
]);

/** Bounded fixed slots per recording hour, including quotas and missing-coverage states. */
export const ownerAttemptTelemetryState = pgTable("owner_attempt_telemetry_state", {
  recordingEpochStart: timestamp("recording_epoch_start", { withTimezone: true, precision: 3 }).notNull(),
  slot: text("slot").notNull(),
  admittedAt: timestamp("admitted_at", { withTimezone: true, precision: 3 }).notNull()
    .default(sql`clock_timestamp()`),
  used: integer("used").notNull().default(0),
  capacity: integer("capacity"),
  firstOccurredAt: timestamp("first_occurred_at", { withTimezone: true, precision: 3 }),
  lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true, precision: 3 }),
  count: bigint("count", { mode: "bigint" }).notNull().default(0n),
  saturatedCount: boolean("saturated_count").notNull().default(false),
}, t => [
  primaryKey({ name: "owner_attempt_telemetry_state_pk", columns: [t.recordingEpochStart, t.slot] }),
  index("owner_attempt_telemetry_state_timeline_idx").on(t.admittedAt.desc(), t.slot),
  check("owner_attempt_telemetry_state_epoch_check",
    sql`${t.recordingEpochStart} = date_trunc('hour', ${t.recordingEpochStart}, 'UTC')`),
  check("owner_attempt_telemetry_state_slot_check", sql`${t.slot} in (
    'quota.authenticated', 'quota.anonymous',
    'unknown.auth', 'unknown.access',
    'overflow.authenticated.auth', 'overflow.authenticated.access',
    'overflow.anonymous.auth', 'overflow.anonymous.access',
    'gap.auth', 'gap.access'
  )`),
  check("owner_attempt_telemetry_state_quota_check",
    sql`(${t.slot} in ('quota.authenticated', 'quota.anonymous')
      and ${t.capacity} = 256 and ${t.used} between 0 and ${t.capacity})
      or (${t.slot} not in ('quota.authenticated', 'quota.anonymous')
        and ${t.capacity} is null and ${t.used} = 0)`),
  check("owner_attempt_telemetry_state_counter_check",
    sql`${t.count} >= 0 and
      ((${t.firstOccurredAt} is null and ${t.lastOccurredAt} is null and ${t.count} = 0)
        or (${t.firstOccurredAt} is not null and ${t.lastOccurredAt} is not null
          and ${t.firstOccurredAt} <= ${t.lastOccurredAt} and ${t.count} > 0))`),
]);

export const forumComplaintActivity = pgTable("forum_complaint_activity", {
  caseId: text("case_id").notNull().references(() => forumComplaintCases.id, { onDelete: "restrict" }),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => [
  primaryKey({ columns: [t.caseId, t.reviewerUserId] }),
  index("complaint_activity_case_expiry_idx").on(t.caseId,t.expiresAt),
]);

// Domain-specific singleton, not a second configuration or authorization framework.
export const forumComplaintPrioritySettings = pgTable("forum_complaint_priority_settings", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull().default(1),
  weights: jsonb("weights").notNull(),
}, t => [
  check("complaint_priority_settings_singleton", sql`${t.id} = 1`),
  check("complaint_priority_settings_version", sql`${t.version} > 0`),
  check("complaint_priority_settings_weights", sql`jsonb_typeof(${t.weights}) = 'object'
    and ${t.weights} - array['spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other'] = '{}'::jsonb
    and ${t.weights}->'spam' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'harassment' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'threats' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'fraud-phishing' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'malicious-content' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'personal-data' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'impersonation' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights}->'other' in ('1'::jsonb,'2'::jsonb,'3'::jsonb)
    and ${t.weights} ?& array['spam','harassment','threats','fraud-phishing','malicious-content','personal-data','impersonation','other']`),
]);


// AP-10 administrative measures retain their own identity and terminal lifecycle.
// The web capability updates restriction membership; it does not delete measures or appeals.
export const userMeasures = pgTable("user_measures", {
  id: uuid("id").primaryKey(),
  targetUserId: text("target_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  issuerUserId: text("issuer_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  issuerAuthorityFloor: integer("issuer_authority_floor").notNull(),
  createFingerprint: text("create_fingerprint").notNull(),
  initialReason: text("initial_reason").notNull(),
  latestChangeReason: text("latest_change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
  expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }),
  version: integer("version").notNull().default(1),
  liftedAt: timestamp("lifted_at", { withTimezone: true, precision: 3 }),
  liftedByUserId: text("lifted_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  liftReason: text("lift_reason"),
}, t => [
  index("user_measures_target_created_idx").on(t.targetUserId, t.createdAt, t.id),
  check("user_measures_issuer_floor_check", sql`${t.issuerAuthorityFloor} between 1 and 3`),
  check("user_measures_version_check", sql`${t.version} > 0`),
  check("user_measures_fingerprint_check", sql`char_length(${t.createFingerprint}) = 64 and ${t.createFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("user_measures_initial_reason_check", sql`btrim(${t.initialReason}) <> '' and char_length(${t.initialReason}) <= 2000`),
  check("user_measures_change_reason_check", sql`${t.latestChangeReason} is null or (btrim(${t.latestChangeReason}) <> '' and char_length(${t.latestChangeReason}) <= 2000)`),
  check("user_measures_lift_reason_check", sql`${t.liftReason} is null or (btrim(${t.liftReason}) <> '' and char_length(${t.liftReason}) <= 2000)`),
  check("user_measures_lift_consistency_check", sql`(
    ${t.liftedAt} is null and ${t.liftedByUserId} is null and ${t.liftReason} is null
  ) or (
    ${t.liftedAt} is not null and ${t.liftedByUserId} is not null and ${t.liftReason} is not null
  )`),
]);

// Soft membership preserves SELECT/INSERT/UPDATE-only web grants on AP-10 tables.
export const userMeasureRestrictions = pgTable("user_measure_restrictions", {
  measureId: uuid("measure_id").notNull().references(() => userMeasures.id, { onDelete: "restrict" }),
  restrictionKey: text("restriction_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
}, t => [
  primaryKey({ name: "user_measure_restrictions_pk", columns: [t.measureId, t.restrictionKey] }),
  check("user_measure_restrictions_key_check", sql`${t.restrictionKey} in (
    'topics.create', 'replies.create', 'attachments.upload',
    'posts.edit', 'profile.edit', 'complaints.submit', 'helpSignals.submit',
    'translations.generate', 'admin.forum', 'admin.complaints',
    'admin.security', 'admin.usersAccess'
  )`),
]);

// A measure may receive at most three sequential appeals, never two pending at once.
export const userMeasureAppeals = pgTable("user_measure_appeals", {
  id: uuid("id").primaryKey(),
  measureId: uuid("measure_id").notNull().references(() => userMeasures.id, { onDelete: "restrict" }),
  subjectUserId: text("subject_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  ordinal: integer("ordinal").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().default(sql`clock_timestamp()`),
  reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, precision: 3 }),
  reviewerExplanation: text("reviewer_explanation"),
  remedy: text("remedy"),
}, t => [
  unique("user_measure_appeals_measure_ordinal_unique").on(t.measureId, t.ordinal),
  uniqueIndex("user_measure_appeals_one_pending_idx").on(t.measureId).where(sql`${t.status} = 'pending'`),
  index("user_measure_appeals_measure_created_idx").on(t.measureId, t.createdAt, t.id),
  check("user_measure_appeals_ordinal_check", sql`${t.ordinal} between 1 and 3`),
  check("user_measure_appeals_status_check", sql`${t.status} in ('pending', 'rejected', 'accepted', 'moot')`),
  check("user_measure_appeals_body_check", sql`btrim(${t.body}) <> '' and char_length(${t.body}) <= 2000`),
  check("user_measure_appeals_explanation_check", sql`${t.reviewerExplanation} is null or (btrim(${t.reviewerExplanation}) <> '' and char_length(${t.reviewerExplanation}) <= 2000)`),
  check("user_measure_appeals_remedy_check", sql`${t.remedy} is null or ${t.remedy} in ('lift', 'change')`),
  check("user_measure_appeals_resolution_check", sql`(
    ${t.status} = 'pending' and ${t.reviewerUserId} is null and ${t.resolvedAt} is null
      and ${t.reviewerExplanation} is null and ${t.remedy} is null
  ) or (
    ${t.status} = 'rejected' and ${t.reviewerUserId} is not null and ${t.resolvedAt} is not null
      and ${t.reviewerExplanation} is not null and ${t.remedy} is null
  ) or (
    ${t.status} = 'accepted' and ${t.reviewerUserId} is not null and ${t.resolvedAt} is not null
      and ${t.reviewerExplanation} is not null and ${t.remedy} in ('lift', 'change')
  ) or (
    ${t.status} = 'moot' and ${t.reviewerUserId} is null and ${t.remedy} is null
  )`),
]);
