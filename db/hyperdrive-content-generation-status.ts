import { Client } from "pg";

import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusReader,
  type ContentGenerationStatusState,
  type ContentGenerationStatusUnit,
  type ContentGenerationUnitStatus,
} from "../app/localization/content-generation-status.server";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

interface StatusRow {
  ordinal: number;
  state: ContentGenerationStatusState;
  retry_after_seconds: number | null;
}

const MAX_SERIALIZED_RETRY_AFTER_SECONDS = 86_400;
const defaultClientFactory: PostgreSqlClientFactory = createLocalizationClient;

/** Reads current content-generation state for one topic page in one bounded batch query. */
export function createHyperdriveContentGenerationStatusReader(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
): ContentGenerationStatusReader {
  return {
    async readCurrent(units) {
      if (units.length === 0) return [];
      units.forEach(validateUnit);

      const client = createClient(connectionString);
      try {
        await client.connect();
        const values: unknown[] = [];
        const rowsSql = units.map((unit, index) => {
          const offset = index * 6;
          values.push(
            index,
            unit.contentType === "topic-title" ? "content-topic-title" : "content-post-body",
            unit.contentType === "topic-title" ? "topic-title" : "post-body",
            unit.contentId,
            unit.revisionId,
            unit.targetLocale,
          );
          return `($${offset + 1}::int, $${offset + 2}::text, $${offset + 3}::text, $${offset + 4}::text, $${offset + 5}::text, $${offset + 6}::text)`;
        }).join(", ");

        const result = await client.query<StatusRow>(`
          with requested (
            ordinal,
            translation_kind,
            source_namespace,
            source_key,
            revision_id,
            target_locale
          ) as (
            values ${rowsSql}
          ),
          selected as (
            select
              request.ordinal,
              request.translation_kind,
              request.revision_id,
              task.status,
              task.allowance_state,
              task.allowance_retry_not_before,
              title_meta.revision_id as title_revision_id,
              body_meta.revision_id as body_revision_id
            from requested request
            left join translation_task_generation_heads head
              on head.translation_kind = request.translation_kind
             and head.source_namespace = request.source_namespace
             and head.source_key = request.source_key
             and head.target_locale = request.target_locale
            left join translation_tasks task
              on task.translation_kind = request.translation_kind
             and task.source_namespace = request.source_namespace
             and task.source_key = request.source_key
             and task.target_locale = request.target_locale
             and task.generation = head.current_generation
            left join content_topic_title_translation_tasks title_meta
              on request.translation_kind = 'content-topic-title'
             and title_meta.task_id = task.id
            left join content_post_body_translation_tasks body_meta
              on request.translation_kind = 'content-post-body'
             and body_meta.task_id = task.id
          )
          select
            ordinal,
            case
              when status is null then 'idle'
              when translation_kind = 'content-topic-title'
                and title_revision_id is distinct from revision_id then 'idle'
              when translation_kind = 'content-post-body'
                and body_revision_id is distinct from revision_id then 'idle'
              when status = 'completed' then 'completed'
              when status = 'failed' then 'failed'
              when status = 'processing' then 'processing'
              when status = 'pending' and allowance_state = 'deferred' then 'deferred'
              when status = 'pending' then 'pending'
              else 'idle'
            end as state,
            case
              when status = 'pending'
                and allowance_state = 'deferred'
                and allowance_retry_not_before is not null
              then greatest(
                0,
                least(
                  ${MAX_SERIALIZED_RETRY_AFTER_SECONDS},
                  ceil(extract(epoch from allowance_retry_not_before - statement_timestamp()))::int
                )
              )
              else null
            end as retry_after_seconds
          from selected
          order by ordinal
        `, values);

        if (result.rows.length !== units.length) {
          throw new ContentGenerationStatusIntegrityError(
            "content generation status batch returned an unexpected row count",
          );
        }

        return result.rows.map((row, index) => {
          const unit = units[index]!;
          if (row.ordinal !== index || !isStatusState(row.state)) {
            throw new ContentGenerationStatusIntegrityError(
              "content generation status batch returned invalid ordering or state",
            );
          }
          const retryAfterSeconds = row.retry_after_seconds;
          if (
            retryAfterSeconds !== null
            && (!Number.isSafeInteger(retryAfterSeconds)
              || retryAfterSeconds < 0
              || retryAfterSeconds > MAX_SERIALIZED_RETRY_AFTER_SECONDS)
          ) {
            throw new ContentGenerationStatusIntegrityError(
              "content generation status retry delay is invalid",
            );
          }
          return {
            ...unit,
            state: row.state,
            ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
          } satisfies ContentGenerationUnitStatus;
        });
      } catch (error) {
        if (isAvailabilityFailure(error)) {
          throw new ContentGenerationStatusStorageUnavailableError({ cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}

export class ContentGenerationStatusIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationStatusIntegrityError";
  }
}

function validateUnit(unit: ContentGenerationStatusUnit): void {
  if (
    (unit.contentType !== "topic-title" && unit.contentType !== "post-body")
    || typeof unit.contentId !== "string"
    || !unit.contentId.trim()
    || typeof unit.revisionId !== "string"
    || !unit.revisionId.trim()
    || typeof unit.targetLocale !== "string"
    || !unit.targetLocale.trim()
  ) {
    throw new TypeError("content generation status unit is invalid");
  }
}

function isStatusState(value: string): value is ContentGenerationStatusState {
  return value === "idle"
    || value === "pending"
    || value === "processing"
    || value === "deferred"
    || value === "failed"
    || value === "completed";
}

function isAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current
    && (typeof current === "object" || typeof current === "function")
    && !seen.has(current)
  ) {
    seen.add(current);
    if (
      isPostgresAvailabilityFailure(current)
      || isPostgresConnectionTimeout(current)
      || isPostgresQueryTimeout(current)
    ) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
