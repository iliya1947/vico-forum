import { Client } from "pg";

import {
  ContentGenerationStatusIntegrityError,
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusIdentity,
  type ContentGenerationStatusReader,
  type ContentGenerationTaskStatus,
} from "../app/localization/content-generation-status";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

type ClientFactory = (connectionString: string) => Client;

type StatusRow = {
  ord: number;
  content_type: string;
  content_id: string;
  revision_id: string;
  task_status: string | null;
  task_revision_id: string | null;
  allowance_state: string | null;
  retry_after_seconds: number | string | null;
};

const defaultClientFactory: ClientFactory = createLocalizationClient;
const MAX_PUBLIC_RETRY_AFTER_SECONDS = 86_400;

export function createHyperdriveContentGenerationStatusReader(
  connectionString: string,
  createClient: ClientFactory = defaultClientFactory,
): ContentGenerationStatusReader {
  return {
    async readCurrent(identities, targetLocale) {
      if (identities.length === 0) return [];
      validateIdentities(identities, targetLocale);

      const client = createClient(connectionString);
      try {
        await client.connect();
        const result = await client.query<StatusRow>(
          `
            with requested as (
              select
                ord::int as ord,
                value->>'contentType' as content_type,
                value->>'contentId' as content_id,
                value->>'revisionId' as revision_id
              from jsonb_array_elements($1::jsonb) with ordinality as items(value, ord)
            )
            select
              requested.ord,
              requested.content_type,
              requested.content_id,
              requested.revision_id,
              task.status as task_status,
              case
                when requested.content_type = 'topic-title' then title_meta.revision_id
                when requested.content_type = 'post-body' then body_meta.revision_id
                else null
              end as task_revision_id,
              task.allowance_state,
              case
                when task.allowance_retry_not_before is null then null
                else greatest(
                  0,
                  ceil(extract(epoch from (task.allowance_retry_not_before - statement_timestamp())))
                )::bigint
              end as retry_after_seconds
            from requested
            left join translation_task_generation_heads head
              on head.source_key = requested.content_id
             and head.target_locale = $2
             and (
               (
                 requested.content_type = 'topic-title'
                 and head.translation_kind = 'content-topic-title'
                 and head.source_namespace = 'topic-title'
               )
               or (
                 requested.content_type = 'post-body'
                 and head.translation_kind = 'content-post-body'
                 and head.source_namespace = 'post-body'
               )
             )
            left join translation_tasks task
              on task.translation_kind = head.translation_kind
             and task.source_namespace = head.source_namespace
             and task.source_key = head.source_key
             and task.target_locale = head.target_locale
             and task.generation = head.current_generation
            left join content_topic_title_translation_tasks title_meta
              on requested.content_type = 'topic-title'
             and title_meta.task_id = task.id
            left join content_post_body_translation_tasks body_meta
              on requested.content_type = 'post-body'
             and body_meta.task_id = task.id
            order by requested.ord
          `,
          [JSON.stringify(identities), targetLocale],
        );

        if (result.rows.length !== identities.length) {
          throw new ContentGenerationStatusIntegrityError(
            "content generation status batch cardinality is invalid",
          );
        }

        return result.rows.map((row, index) =>
          parseRow(row, identities[index]!)
        );
      } catch (error) {
        if (error instanceof ContentGenerationStatusIntegrityError) throw error;
        if (isStatusAvailabilityFailure(error)) {
          throw new ContentGenerationStatusStorageUnavailableError({ cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}

function validateIdentities(
  identities: readonly ContentGenerationStatusIdentity[],
  targetLocale: string,
): void {
  if (typeof targetLocale !== "string" || !targetLocale.trim()) {
    throw new TypeError("content generation status target locale must be non-blank");
  }
  for (const identity of identities) {
    if (
      (identity.contentType !== "topic-title" && identity.contentType !== "post-body")
      || typeof identity.contentId !== "string"
      || !identity.contentId.trim()
      || typeof identity.revisionId !== "string"
      || !identity.revisionId.trim()
    ) {
      throw new TypeError("content generation status identity is invalid");
    }
  }
}

function parseRow(
  row: StatusRow,
  expected: ContentGenerationStatusIdentity,
): ContentGenerationTaskStatus {
  if (
    row.content_type !== expected.contentType
    || row.content_id !== expected.contentId
    || row.revision_id !== expected.revisionId
  ) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation status row identity is invalid",
    );
  }

  if (row.task_status === null) {
    return { ...expected, state: "idle" };
  }
  if (row.task_revision_id === null) {
    throw new ContentGenerationStatusIntegrityError(
      "current content generation task is missing revision metadata",
    );
  }
  if (row.task_revision_id !== expected.revisionId || row.task_status === "stale") {
    return { ...expected, state: "idle" };
  }

  if (row.task_status === "pending") {
    const retryAfterSeconds = boundedRetryAfter(row.retry_after_seconds);
    if (row.allowance_state === "deferred" && retryAfterSeconds > 0) {
      return { ...expected, state: "deferred", retryAfterSeconds };
    }
    return { ...expected, state: "pending" };
  }
  if (row.task_status === "processing") return { ...expected, state: "processing" };
  if (row.task_status === "failed") return { ...expected, state: "failed" };
  if (row.task_status === "completed") return { ...expected, state: "completed" };

  throw new ContentGenerationStatusIntegrityError(
    "content generation status task state is invalid",
  );
}

function boundedRetryAfter(value: number | string | null): number {
  if (value === null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation deferred retry timing is invalid",
    );
  }
  return Math.min(MAX_PUBLIC_RETRY_AFTER_SECONDS, Math.ceil(parsed));
}

function isStatusAvailabilityFailure(error: unknown): boolean {
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
