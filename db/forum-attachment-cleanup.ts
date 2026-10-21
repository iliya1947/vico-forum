import { and, eq } from "drizzle-orm";
import { forumAttachmentDraftRefs } from "./schema";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { lockAttachmentDraftScope, retireAttachmentDraftGeneration } from "./attachment-draft-generation";
import type { PrivateAttachmentBucket } from "../app/forum/attachment-r2";

// Temporary uploads expire after 24 hours without another successful upload. No text is stored.
export const ATTACHMENT_OPERATION_IDLE_MS = 24 * 60 * 60_000;

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
    const expiry = new Date(this.clock().getTime() - ATTACHMENT_OPERATION_IDLE_MS);
    const candidates = await this.db.execute(sql<StaleRef>`
      select owner_id, context_key, draft_id from forum_attachment_draft_refs
      group by owner_id, context_key, draft_id having max(created_at) < ${expiry}
      order by max(created_at) limit ${batchSize}
    `);
    let removed = 0;
    for (const row of candidates.rows) await this.db.transaction(async (tx) => {
      const owner = String(row.owner_id), context = String(row.context_key), operation = String(row.draft_id);
      await lockAttachmentDraftScope(tx, owner, context);
      const recent = await tx.execute(sql`select 1 from forum_attachment_draft_refs where owner_id=${owner}
        and context_key=${context} and draft_id=${operation} and created_at>=${expiry} limit 1`);
      if (recent.rows.length) return;
      await retireAttachmentDraftGeneration(tx, owner, context, operation);
      const result = await tx.delete(forumAttachmentDraftRefs).where(and(eq(forumAttachmentDraftRefs.ownerId, owner),
        eq(forumAttachmentDraftRefs.contextKey, context), eq(forumAttachmentDraftRefs.draftId, operation)))
        .returning({id: forumAttachmentDraftRefs.attachmentId});
      removed += result.length;
    });
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
      if (typeof candidate.id !== "string" || typeof candidate.object_key !== "string") {
        throw new Error("invalid attachment cleanup claim row");
      }
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
