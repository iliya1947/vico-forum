import {sql} from "drizzle-orm";
import type {NodePgDatabase} from "drizzle-orm/node-postgres";
import {adminHistory,forumTopics,forumTopicTitleRevisions,user} from "./schema";
import {eq} from "drizzle-orm";
import {ADMIN_HISTORY_ORDER_LOCK_SQL,historyLabel,visibilityHistoryLabel,type ForumHistoryChange,type VisibilityHistoryChange} from "./admin-history";
type ForumHistoryInput<C = ForumHistoryChange> = C extends ForumHistoryChange ? Omit<C,"targetLabel"> : never;
type Transaction=Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
/** Append last, after domain locks/writes. The shared order lock stays held through COMMIT. */
export async function appendForumHistory(tx:Transaction,actorId:string,change:ForumHistoryInput){
  const [actor]=await tx.select({name:user.name}).from(user).where(eq(user.id,actorId));
  if(!actor)throw new Error("History actor no longer exists");
  const topicId=change.targetType==="post"?change.context.topicId:change.targetId;
  const [topic]=await tx.select({title:forumTopicTitleRevisions.originalContent}).from(forumTopics)
    .innerJoin(forumTopicTitleRevisions,eq(forumTopicTitleRevisions.id,forumTopics.currentTitleRevisionId)).where(eq(forumTopics.id,topicId));
  if(!topic)throw new Error("History topic no longer exists");
  await tx.execute(sql.raw(ADMIN_HISTORY_ORDER_LOCK_SQL));
  await tx.insert(adminHistory).values({id:crypto.randomUUID(),actorId,actorLabel:historyLabel(actor.name),
    action:change.action,targetType:change.targetType,targetId:change.targetId,targetLabel:historyLabel(topic.title),
    context:change.context,reason:change.reason??null});
}

type VisibilityHistoryInput<C = VisibilityHistoryChange> =
  C extends VisibilityHistoryChange ? Omit<C, "targetLabel"> : never;

/**
 * Visibility History never reads or retains a topic title, post body or current revision text.
 * The caller owns the state transaction; this must be its final write.
 */
export async function appendVisibilityHistory(
  tx: Transaction, actorId: string, change: VisibilityHistoryInput,
): Promise<void> {
  const [actor] = await tx.select({ name: user.name }).from(user).where(eq(user.id, actorId));
  if (!actor) throw new Error("History actor no longer exists");
  await tx.execute(sql.raw(ADMIN_HISTORY_ORDER_LOCK_SQL));
  await tx.insert(adminHistory).values({
    id: crypto.randomUUID(),
    actorId,
    actorLabel: historyLabel(actor.name),
    action: change.action,
    targetType: change.targetType,
    targetId: change.targetId,
    targetLabel: visibilityHistoryLabel(change.targetType, change.targetId),
    context: change.context,
    reason: change.reason,
  });
}
