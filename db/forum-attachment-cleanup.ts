import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { EDITOR_DRAFT_EXPIRY_MS, DrizzleForumEditorDrafts } from "./forum-editor-drafts";
import { lockAttachmentDraftScope } from "./attachment-draft-generation";
import type { PrivateAttachmentBucket } from "../app/forum/attachment-r2";

export const ATTACHMENT_CLEANUP_BATCH_SIZE = 20;
export const ATTACHMENT_CLEANUP_CLAIM_LEASE_MS = 5 * 60_000;
export const ATTACHMENT_CLEANUP_GRACE_MS = 60 * 60_000;

interface StaleRef {
  attachment_id: string;
  owner_id: string;
  context_key: string;
  draft_id: string;
}

interface ClaimedObject {
  id: string;
  object_key: string;
  token: string;
}

/**
 * Executes one bounded, repeatable pass against an isolated DB and private bucket.
 * The scheduler/queue is deliberately not part of this class.
 *
 * An asset is claimed in a committed DB transaction before its object is removed.
 * Ref-creation triggers lock and check the parent asset's cleanup_status, so no
 * new ref can appear between claim and object deletion. A crashed or ambiguous
 * object delete leaves a durable 'deleting' claim which can be retried.
 */
export class ForumAttachmentCleanup {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly storage: Pick<PrivateAttachmentBucket, "delete">,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private async pruneStaleRefs(batchSize: number): Promise<number> {
    const expiry = new Date(this.clock().getTime() - EDITOR_DRAFT_EXPIRY_MS);
    const result = await this.db.execute(sql<StaleRef>`
      select r.attachment_id, r.owner_id, r.context_key, r.draft_id
      from forum_attachment_draft_refs r
      left join forum_editor_drafts d
        on d.owner_id = r.owner_id and d.context_key = r.context_key
      left join forum_attachment_draft_generations g
        on g.owner_id = r.owner_id and g.context_key = r.context_key and g.draft_id = r.draft_id
      where (g.draft_id is not null and g.target_draft_id is null)
         or (d.draft_id = r.draft_id and d.status in ('published', 'deleted'))
         or (r.created_at < ${expiry} and (
           d.owner_id is null or d.draft_id <> r.draft_id
           or d.status <> 'active' or d.edited_at < ${expiry}
         ))
      order by r.created_at, r.attachment_id limit ${batchSize}
    `);
    const rows = result.rows as StaleRef[];
    // Make expired active text drafts terminal before removing any of their refs.
    for (const ownerId of new Set(rows.map((row) => row.owner_id))) {
      await new DrizzleForumEditorDrafts(this.db).purgeExpired(ownerId);
    }
    let removed = 0;
    for (const row of rows) {
      const count = await this.db.transaction(async (tx) => {
        await lockAttachmentDraftScope(tx, row.owner_id, row.context_key);
        // Recheck after the scope lock, with a fresh READ COMMITTED snapshot.
        const remaining = await tx.execute(sql`
          delete from forum_attachment_draft_refs r
          where r.attachment_id = ${row.attachment_id}
            and r.owner_id = ${row.owner_id}
            and r.context_key = ${row.context_key}
            and r.draft_id = ${row.draft_id}
            and (
              exists (
                select 1 from forum_attachment_draft_generations g
                where g.owner_id = r.owner_id and g.context_key = r.context_key
                  and g.draft_id = r.draft_id and g.target_draft_id is null
              )
              or exists (
                select 1 from forum_editor_drafts d
                where d.owner_id = r.owner_id and d.context_key = r.context_key
                  and d.draft_id = r.draft_id and d.status in ('published', 'deleted')
              )
              or (r.created_at < ${expiry} and not exists (
                select 1 from forum_editor_drafts d
                where d.owner_id = r.owner_id and d.context_key = r.context_key
                  and d.draft_id = r.draft_id and d.status = 'active'
                  and d.edited_at >= ${expiry}
              ))
            )
          returning r.attachment_id
        `);
        return remaining.rows.length;
      });
      removed += count;
    }
    return removed;
  }

  private async claimOne(): Promise<ClaimedObject | null> {
    const now = this.clock();
    const grace = new Date(now.getTime() - ATTACHMENT_CLEANUP_GRACE_MS);
    const retry = new Date(now.getTime() - ATTACHMENT_CLEANUP_CLAIM_LEASE_MS);
    return this.db.transaction(async (tx) => {
      const result = await tx.execute(sql<{ id: string; object_key: string; cleanup_status: string }>`
        select a.id, a.object_key, a.cleanup_status from forum_attachments a
        where (
          a.cleanup_status = 'deleting' and a.cleanup_claimed_at < ${retry}
        ) or (
          a.cleanup_status = 'active' and a.created_at < ${grace}
          and not exists (select 1 from forum_attachment_draft_refs r where r.attachment_id = a.id)
          and not exists (select 1 from forum_post_attachments p where p.attachment_id = a.id)
        )
        order by a.created_at, a.id limit 1
        for update of a skip locked
      `);
      const candidate = result.rows[0];
      if (!candidate) return null;
      // The row is now exclusively locked. The recheck below observes a fresh
      // snapshot after any transaction which held a reference-trigger FOR SHARE.
      const refs = await tx.execute(sql`
        select 1 from forum_attachment_draft_refs where attachment_id = ${candidate.id}
        union all select 1 from forum_post_attachments where attachment_id = ${candidate.id}
        limit 1
      `);
      if (refs.rows.length > 0) return null;
      const token = crypto.randomUUID();
      await tx.execute(sql`
        update forum_attachments
        set cleanup_status = 'deleting', cleanup_claim_token = ${token},
            cleanup_claimed_at = ${now}
        where id = ${candidate.id}
      `);
      return { id: candidate.id, object_key: candidate.object_key, token };
    });
  }

  async runOnce(batchSize: number = ATTACHMENT_CLEANUP_BATCH_SIZE): Promise<{
    prunedRefs: number; claimed: number; deleted: number; failed: number;
  }> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > ATTACHMENT_CLEANUP_BATCH_SIZE) {
      throw new RangeError("invalid attachment cleanup batch size");
    }
    const prunedRefs = await this.pruneStaleRefs(batchSize);
    let claimed = 0;
    let deleted = 0;
    let failed = 0;
    for (let i = 0; i < batchSize; i++) {
      const item = await this.claimOne();
      if (!item) break;
      claimed++;
      try {
        // delete is idempotent: missing objects succeed (e.g. after a lost ACK).
        await this.storage.delete(item.object_key);
        const result = await this.db.execute(sql`
          delete from forum_attachments a
          where a.id = ${item.id} and a.cleanup_status = 'deleting'
            and a.cleanup_claim_token = ${item.token}
            and not exists (select 1 from forum_attachment_draft_refs r where r.attachment_id = a.id)
            and not exists (select 1 from forum_post_attachments p where p.attachment_id = a.id)
          returning a.id
        `);
        deleted += result.rows.length;
      } catch {
        // Keep the durable claim; another run retries when the lease expires.
        failed++;
      }
    }
    return { prunedRefs, claimed, deleted, failed };
  }
}
