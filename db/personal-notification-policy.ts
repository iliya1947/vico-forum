import { sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumPostNotificationSuppressions,
  forumReplyNotifications,
  forumTopicMutes,
  forumUserBlocks,
} from "./schema";

/**
 * Decide one ordinary post-recipient candidate set against one READ COMMITTED
 * statement snapshot. Receipt and visible notice writes remain in the caller's
 * publication transaction. Do not extend this policy to complaint notifications.
 */
export async function recordOrdinaryPostNotifications(
  tx: Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0],
  input: {
    actorId: string;
    topicId: string;
    postId: string;
    createdAt: Date;
    kind: "reply" | "mention";
    candidates: SQL;
  },
): Promise<void> {
  await tx.execute(sql`with candidate_users as materialized (
      select distinct recipients.user_id
      from (${input.candidates}) recipients
      where recipients.user_id is not null and recipients.user_id <> ${input.actorId}
    ),
    decisions as materialized (
      select candidate_users.user_id,
        (exists (
          select 1 from ${forumTopicMutes} m
          where m.user_id = candidate_users.user_id and m.topic_id = ${input.topicId}
        ) or exists (
          select 1 from ${forumUserBlocks} b
          where b.user_id = candidate_users.user_id and b.blocked_user_id = ${input.actorId}
        )) as suppressed
      from candidate_users
    ),
    consumed as (
      insert into ${forumPostNotificationSuppressions} (recipient_user_id, post_id)
      select decisions.user_id, ${input.postId}
      from decisions
      where decisions.suppressed
        and not exists (
          select 1 from ${forumReplyNotifications} existing
          where existing.recipient_user_id = decisions.user_id and existing.post_id = ${input.postId}
        )
      on conflict (recipient_user_id, post_id) do nothing
      returning recipient_user_id
    )
    insert into ${forumReplyNotifications}
      (id, recipient_user_id, actor_user_id, topic_id, post_id, kind, created_at)
    select gen_random_uuid()::text, decisions.user_id, ${input.actorId},
      ${input.topicId}, ${input.postId}, ${input.kind}, ${input.createdAt}
    from decisions
    where not decisions.suppressed
      and not exists (
        select 1 from ${forumPostNotificationSuppressions} receipt
        where receipt.recipient_user_id = decisions.user_id and receipt.post_id = ${input.postId}
      )
    on conflict (recipient_user_id, post_id) do nothing`);
}
