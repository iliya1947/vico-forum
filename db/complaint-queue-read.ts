import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { COMPLAINT_REASON_PRIORITY, COMPLAINT_QUEUE_PAGE_SIZE, type ComplaintQueuePage } from "../app/complaints/queue-contract";

/** Ordinary triage projection: no reporter IDs, explanations, notes or identity joins. */
export async function readComplaintQueue(database: NodePgDatabase, actorId: string, page: number, caseId: string | null = null): Promise<ComplaintQueuePage> {
  const weights = sql.join(Object.entries(COMPLAINT_REASON_PRIORITY).map(([reason, rank]) => sql`when ${reason} then ${rank}::int`), sql` `);
  const result = await database.execute<{ total: number; items: ComplaintQueuePage["cases"] }>(sql`
    with eligible as (
      select c.* from forum_complaint_cases c where c.state='open' and (${caseId}::text is null or c.id=${caseId}::text)
    ), reasons as (
      select r.case_id,r.reason,count(*)::int as n,min(r.created_at) as first_at,max(r.created_at) as last_at
      from forum_complaints r join eligible c on c.id=r.case_id group by r.case_id,r.reason
    ), stats as (
      select case_id,jsonb_object_agg(reason,n) as reasons,sum(n)::int as n,
        min(first_at) as first_at,max(last_at) as last_at,max(case reason ${weights} else 1 end)::int as automatic
      from reasons group by case_id
    ), ranked as (
      select c.id,c.version,c.state,t.kind,t.topic_id as "topicId",t.post_id as "postId",
        coalesce(t.post_revision_id,t.title_revision_id) as "revisionId",
        left(ct.original_content,200) as "topicTitle",ct.source_locale as "topicLocale",
        left(coalesce(pr.original_content,tr.original_content),240) as excerpt,
        coalesce(pr.source_locale,tr.source_locale) as "sourceLocale",
        s.reasons,s.n as "reportCount",s.first_at as "firstReportedAt",s.last_at as "lastReportedAt",
        s.automatic as "automaticPriority",c.priority_override as "priorityOverride",
        coalesce(c.priority_override,s.automatic) as priority,
        exists(select 1 from forum_complaint_activity a where a.case_id=c.id
          and a.reviewer_user_id<>${actorId} and a.expires_at>statement_timestamp()) as "activeElsewhere"
      from eligible c join stats s on s.case_id=c.id
      join forum_complaint_targets t on t.id=c.target_id
      join forum_topics topic on topic.id=t.topic_id
      join forum_topic_title_revisions ct on ct.id=topic.current_title_revision_id
      left join forum_post_revisions pr on pr.id=t.post_revision_id
      left join forum_topic_title_revisions tr on tr.id=t.title_revision_id
    ) select (select count(*)::int from ranked) as total,
      coalesce((select jsonb_agg(p) from (select * from ranked
        order by priority desc,"firstReportedAt",id limit ${COMPLAINT_QUEUE_PAGE_SIZE+1} offset ${page*COMPLAINT_QUEUE_PAGE_SIZE}) p),'[]'::jsonb) as items`);
  const { total, items } = result.rows[0]!;
  return { total, page, hasMore:items.length>COMPLAINT_QUEUE_PAGE_SIZE,
    cases:items.slice(0,COMPLAINT_QUEUE_PAGE_SIZE).map(c=>({ ...c,
      firstReportedAt:new Date(c.firstReportedAt).toISOString(),lastReportedAt:new Date(c.lastReportedAt).toISOString(),
    })) };
}
