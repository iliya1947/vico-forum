import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

/** Shared inbox producer; must use the caller's existing Decision transaction. */
export async function insertComplaintDecisionNotifications(tx:Tx,caseId:string,decisionId:string):Promise<void>{
  await tx.execute(sql`
    insert into forum_reply_notifications(id,recipient_user_id,complaint_decision_id,kind,created_at)
    select gen_random_uuid()::text,recipients.user_id,d.id,'complaint-decision',d.created_at
    from forum_complaint_decisions d
    join forum_complaint_cases c on c.id=d.case_id
    join forum_complaint_targets target on target.id=c.target_id
    cross join lateral (
      select target.affected_author_id as user_id
      union
      select complaint.reporter_user_id from forum_complaints complaint where complaint.case_id=c.id
    ) recipients
    where d.case_id=${caseId} and d.id=${decisionId}
    on conflict (recipient_user_id,complaint_decision_id) do nothing
  `);
}

/** Within the same Appeal resolution transaction as CAS and immutable event. */
export async function insertComplaintAppealResultNotifications(tx:Tx,caseId:string,appealId:string):Promise<void>{
 await tx.execute(sql`
   insert into forum_reply_notifications(id,recipient_user_id,complaint_appeal_id,kind,created_at)
   select gen_random_uuid()::text,recipients.user_id,a.id,'complaint-appeal-result',a.resolved_at
   from forum_complaint_appeals a
   join forum_complaint_cases c on c.id=a.case_id and c.initial_decision_id=a.decision_id
   join forum_complaint_targets target on target.id=c.target_id
   cross join lateral (
     select target.affected_author_id as user_id
     union
     select report.reporter_user_id from forum_complaints report where report.case_id=c.id
   ) recipients
   where a.id=${appealId} and c.id=${caseId} and a.status='resolved'
   on conflict (recipient_user_id,complaint_appeal_id) do nothing
 `);
}
