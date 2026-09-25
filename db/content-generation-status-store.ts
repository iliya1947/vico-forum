import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  ContentGenerationStatusIntegrityError,
  type ContentGenerationDurableStatus,
  type ContentGenerationStatusReader,
  type ContentGenerationStatusSnapshot,
} from "../app/localization/content-generation-status";
import type { ContentTranslationRevision } from "../app/localization/content-translation";

const MAX_SERIALIZED_RETRY_AFTER_SECONDS = 86_400;

interface StatusRow {
  readonly translation_kind: string;
  readonly source_key: string;
  readonly revision_id: string;
  readonly task_revision_id: string | null;
  readonly task_status: string | null;
  readonly allowance_state: string | null;
  readonly allowance_retry_not_before: Date | null;
  readonly database_now: Date;
}

export class DrizzleContentGenerationStatusReader implements ContentGenerationStatusReader {
  constructor(private readonly database: NodePgDatabase) {}

  async readCurrent(
    revisions: readonly ContentTranslationRevision[],
    targetLocale: string,
  ): Promise<readonly ContentGenerationStatusSnapshot[]> {
    requireNonBlank(targetLocale, "target locale");
    if (revisions.length === 0) return [];

    const requested = revisions.map((revision) => {
      requireNonBlank(revision.contentId, "content id");
      requireNonBlank(revision.revisionId, "revision id");
      if (revision.contentType !== "topic-title" && revision.contentType !== "post-body") {
        throw new TypeError("content generation status content type is invalid");
      }
      return sql`(
        ${revision.contentType === "topic-title" ? "content-topic-title" : "content-post-body"},
        ${revision.contentType === "topic-title" ? "topic-title" : "post-body"},
        ${revision.contentId},
        ${revision.revisionId}
      )`;
    });

    const result = await this.database.execute<StatusRow>(sql`
      with requested(translation_kind, source_namespace, source_key, revision_id) as (
        values ${sql.join(requested, sql.raw(", "))}
      )
      select
        requested.translation_kind,
        requested.source_key,
        requested.revision_id,
        case
          when requested.translation_kind = 'content-topic-title' then title_task.revision_id
          when requested.translation_kind = 'content-post-body' then post_task.revision_id
          else null
        end as task_revision_id,
        task.status as task_status,
        task.allowance_state,
        task.allowance_retry_not_before,
        statement_timestamp() as database_now
      from requested
      left join translation_task_generation_heads as head
        on head.translation_kind = requested.translation_kind
       and head.source_namespace = requested.source_namespace
       and head.source_key = requested.source_key
       and head.target_locale = ${targetLocale}
      left join translation_tasks as task
        on task.translation_kind = head.translation_kind
       and task.source_namespace = head.source_namespace
       and task.source_key = head.source_key
       and task.target_locale = head.target_locale
       and task.generation = head.current_generation
      left join content_topic_title_translation_tasks as title_task
        on requested.translation_kind = 'content-topic-title'
       and title_task.task_id = task.id
      left join content_post_body_translation_tasks as post_task
        on requested.translation_kind = 'content-post-body'
       and post_task.task_id = task.id
    `);

    const byIdentity = new Map<string, ContentGenerationStatusSnapshot>();
    for (const row of result.rows) {
      const contentType = row.translation_kind === "content-topic-title"
        ? "topic-title"
        : row.translation_kind === "content-post-body"
          ? "post-body"
          : undefined;
      if (!contentType) {
        throw new ContentGenerationStatusIntegrityError(
          "content generation status query returned an invalid translation kind",
        );
      }

      const key = identityKey(contentType, row.source_key, row.revision_id, targetLocale);
      if (byIdentity.has(key)) {
        throw new ContentGenerationStatusIntegrityError(
          "content generation status query returned duplicate current-unit rows",
        );
      }

      if (!row.task_status || row.task_revision_id !== row.revision_id) {
        byIdentity.set(key, snapshot(contentType, row, targetLocale, "idle"));
        continue;
      }

      if (
        row.allowance_state === "deferred"
        && row.allowance_retry_not_before instanceof Date
        && row.database_now instanceof Date
      ) {
        const retryAfterSeconds = Math.min(
          MAX_SERIALIZED_RETRY_AFTER_SECONDS,
          Math.max(
            0,
            Math.ceil(
              (row.allowance_retry_not_before.getTime() - row.database_now.getTime()) / 1_000,
            ),
          ),
        );
        byIdentity.set(key, {
          ...snapshot(contentType, row, targetLocale, "deferred"),
          retryAfterSeconds,
        });
        continue;
      }

      const status = normalizeStatus(row.task_status);
      byIdentity.set(key, snapshot(contentType, row, targetLocale, status));
    }

    return revisions.map((revision) =>
      byIdentity.get(identityKey(
        revision.contentType,
        revision.contentId,
        revision.revisionId,
        targetLocale,
      )) ?? {
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
        status: "idle" as const,
      }
    );
  }
}

function snapshot(
  contentType: ContentTranslationRevision["contentType"],
  row: StatusRow,
  targetLocale: string,
  status: ContentGenerationDurableStatus,
): ContentGenerationStatusSnapshot {
  return {
    contentType,
    contentId: row.source_key,
    revisionId: row.revision_id,
    targetLocale,
    status,
  };
}

function normalizeStatus(value: string): ContentGenerationDurableStatus {
  if (
    value === "pending"
    || value === "processing"
    || value === "failed"
    || value === "completed"
  ) {
    return value;
  }
  if (value === "stale") return "idle";
  throw new ContentGenerationStatusIntegrityError(
    "content generation status query returned an invalid task lifecycle state",
  );
}

function identityKey(
  contentType: ContentTranslationRevision["contentType"],
  contentId: string,
  revisionId: string,
  targetLocale: string,
): string {
  return JSON.stringify([contentType, contentId, revisionId, targetLocale]);
}

function requireNonBlank(value: string, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(field + " must be a non-blank string");
  }
}
