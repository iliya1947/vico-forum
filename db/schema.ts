import type { BetterAuthOptions } from "better-auth";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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
    contentId: text("content_id"),
    contentRevisionId: text("content_revision_id"),
    revisionSourceLocale: text("revision_source_locale"),
    resolvedSourceLocale: text("resolved_source_locale"),
    sourceResolutionOrigin: text("source_resolution_origin"),
    generation: integer("generation").notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastFailureCode: text("last_failure_code"),
    failureDisposition: text("failure_disposition"),
    reconciliationAttemptedAt: timestamp("reconciliation_attempted_at", { withTimezone: true }),
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
    foreignKey({
      name: "translation_tasks_content_revision_fk",
      columns: [table.contentId, table.contentRevisionId, table.revisionSourceLocale],
      foreignColumns: [
        forumTopicTitleRevisions.topicId,
        forumTopicTitleRevisions.id,
        forumTopicTitleRevisions.sourceLocale,
      ],
    }).onDelete("cascade"),
    check("translation_tasks_identity_check", sql`${table.taskIdentity} ~ '^[0-9a-f]{64}$'`),
    check(
      "translation_tasks_kind_check",
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`(
        ${table.translationKind} = 'ui'
        and ${table.contentId} is null
        and ${table.contentRevisionId} is null
        and ${table.revisionSourceLocale} is null
        and ${table.resolvedSourceLocale} is null
        and ${table.sourceResolutionOrigin} is null
      ) or (
        ${table.translationKind} = 'content-topic-title'
        and ${table.contentId} is not null and btrim(${table.contentId}) <> ''
        and ${table.contentRevisionId} is not null and btrim(${table.contentRevisionId}) <> ''
        and ${table.revisionSourceLocale} is not null
        and ${table.revisionSourceLocale} = btrim(${table.revisionSourceLocale})
        and ${table.revisionSourceLocale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'
        and ${table.resolvedSourceLocale} is not null
        and ${table.resolvedSourceLocale} = btrim(${table.resolvedSourceLocale})
        and lower(${table.resolvedSourceLocale}) <> 'und'
        and ${table.resolvedSourceLocale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'
        and ${table.sourceResolutionOrigin} in ('revision-metadata', 'detector')
        and ${table.sourceNamespace} = 'topic-title'
        and ${table.sourceKey} = ${table.contentId}
        and (
          (
            ${table.sourceResolutionOrigin} = 'revision-metadata'
            and lower(${table.revisionSourceLocale}) <> 'und'
            and ${table.revisionSourceLocale} = ${table.resolvedSourceLocale}
          ) or (
            ${table.sourceResolutionOrigin} = 'detector'
            and lower(${table.revisionSourceLocale}) = 'und'
          )
        )
      )`,
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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

        and ${table.resolvedSourceLocale} is not null
        and ${table.resolvedSourceLocale} = btrim(${table.resolvedSourceLocale})
        and lower(${table.resolvedSourceLocale}) <> 'und'
        and ${table.resolvedSourceLocale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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

        and ${table.sourceResolutionOrigin} in ('revision-metadata', 'detector')
        and ${table.sourceNamespace} = 'topic-title'
        and ${table.sourceKey} = ${table.contentId}
        and (
          (
            ${table.sourceResolutionOrigin} = 'revision-metadata'
            and lower(${table.revisionSourceLocale}) <> 'und'
            and ${table.revisionSourceLocale} = ${table.resolvedSourceLocale}
          ) or (
            ${table.sourceResolutionOrigin} = 'detector'
            and lower(${table.revisionSourceLocale}) = 'und'
          )
        )
      )`,
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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
`),
    check(
      "translation_tasks_kind_check",
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`(
        ${table.translationKind} = 'ui'
        and ${table.contentId} is null
        and ${table.contentRevisionId} is null
        and ${table.revisionSourceLocale} is null
        and ${table.resolvedSourceLocale} is null
        and ${table.sourceResolutionOrigin} is null
      ) or (
        ${table.translationKind} = 'content-topic-title'
        and ${table.contentId} is not null and btrim(${table.contentId}) <> ''
        and ${table.contentRevisionId} is not null and btrim(${table.contentRevisionId}) <> ''
        and ${table.revisionSourceLocale} is not null
        and ${table.revisionSourceLocale} = btrim(${table.revisionSourceLocale})
        and ${table.revisionSourceLocale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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

        and ${table.resolvedSourceLocale} is not null
        and ${table.resolvedSourceLocale} = btrim(${table.resolvedSourceLocale})
        and lower(${table.resolvedSourceLocale}) <> 'und'
        and ${table.resolvedSourceLocale} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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

        and ${table.sourceResolutionOrigin} in ('revision-metadata', 'detector')
        and ${table.sourceNamespace} = 'topic-title'
        and ${table.sourceKey} = ${table.contentId}
        and (
          (
            ${table.sourceResolutionOrigin} = 'revision-metadata'
            and lower(${table.revisionSourceLocale}) <> 'und'
            and ${table.revisionSourceLocale} = ${table.resolvedSourceLocale}
          ) or (
            ${table.sourceResolutionOrigin} = 'detector'
            and lower(${table.revisionSourceLocale}) = 'und'
          )
        )
      )`,
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
      sql`${table.translationKind} in ('ui', 'content-topic-title')`,
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
      sql`${table.translationKind} <> 'content-topic-title' or ${table.sourceNamespace} = 'topic-title'`,
    ),
    check("translation_task_generation_heads_generation_check", sql`${table.currentGeneration} > 0`),
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
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
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
  managersEverExisted: boolean("managers_ever_existed").notNull().default(false),
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
    bestAnswerPostId: text("best_answer_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_topics_section_id_idx").on(table.sectionId),
    index("forum_topics_author_id_idx").on(table.authorId),
    check("forum_topics_best_answer_requires_solved_check", sql`${table.bestAnswerPostId} is null or ${table.isSolved}`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forum_posts_topic_id_idx").on(table.topicId),
    index("forum_posts_author_id_idx").on(table.authorId),
    unique("forum_posts_topic_id_id_unique").on(table.topicId, table.id),
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
    check("forum_post_revisions_content_check", sql`btrim(${table.originalContent}) <> ''`),
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
