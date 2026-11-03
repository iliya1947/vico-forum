import process from "node:process";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {drizzle} from "drizzle-orm/node-postgres";
import {Client,Pool} from "pg";
import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {RouterContextProvider} from "react-router";
import {ComplaintsService} from "../../db/complaints-service";
import {DrizzleComplaintsRepository} from "../../db/complaints-repository";
import {PostgresAuthorizationRepository} from "../../db/authorization-repository";
import {createAuthorizationCapability} from "../../db/authorization-service";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {ComplaintNotFoundError} from "../../db/complaints-domain";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintSubmissionContext} from "./request-context";
import {complaintReviewContext} from "./review-context";
import {complaintAppealContext} from "./appeal-context";
import {complaintQueueContext} from "./queue-context";
import {forumReaderContext,forumWriterContext} from "../forum/request-context";
import {createHyperdriveComplaintSubmission} from "../../db/hyperdrive-complaints";
import {action as submitAction} from "../routes/complaint-submit";
import {action as caseAction} from "../routes/complaint-review";
import {loader as participantLoader,action as appealAction} from "../routes/complaint-result";
import {action as appealReviewAction} from "../routes/complaint-appeal-review";
import {loader as historyLoader} from "../routes/complaint-history";
import {loader as inboxLoader,action as inboxAction} from "../routes/notifications";

// This TSX fixture belongs to the UI TS project, but only the native database
// Vitest configuration runs it. No browser or production dependencies.
const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL required");
const url=new URL(databaseUrl);
if(!["localhost","127.0.0.1"].includes(url.hostname)||!url.pathname.endsWith("_test"))
  throw new Error("Disposable local *_test database required");
const schema="complaints_p7_connected_test";
const options="-c search_path="+schema;
const client=new Client({connectionString:databaseUrl,options});
const pool=new Pool({connectionString:databaseUrl,options});
const authorization=createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
const service=()=>new ComplaintsService(
  new DrizzleComplaintsRepository(drizzle(client),{tenMinutes:10000,day:10000}),authorization);
const forum=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date()});
async function content(body="Source revision"){
 const topicId=randomUUID(),postId=randomUUID(),revisionId=randomUUID(),titleId=randomUUID();
 await forum.createTopicWithInitialPost({id:topicId,sectionId:"p7-section",authorId:"content-author",
   titleRevision:{id:titleId,originalContent:"P7 title source",sourceLocale:"en"},
   initialPost:{id:postId,topicId,authorId:"content-author",
     bodyRevision:{id:revisionId,originalContent:body,sourceLocale:"en"}}});
 return {post:{kind:"post" as const,topicId,postId,revisionId},
   title:{kind:"topic-title" as const,topicId,revisionId:titleId}};
}
async function asset(postId:string){
 const id=randomUUID();
 await client.query("insert into forum_attachments "+
   "(id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime,byte_size,verification_status,created_at) "+
   "values ($1,'content-author',$2,'evidence.txt','text/plain','text','text/plain',4,'type-checked','2020-01-01')",
   [id,"private/"+id]);
 await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) values ($1,$2,now())",
   [postId,id]);
 return id;
}
async function quotaActor(){
 const id=randomUUID();
 await client.query('insert into "user"(id,name,email) values ($1,$1,$2)',[id,id+"@p7.test"]);
 return id;
}
beforeAll(async()=>{
 await client.connect();
 await client.query("drop schema if exists "+schema+" cascade; create schema "+schema);
 for(const file of (await readdir("drizzle")).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort()){
   await client.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
 }
 for(const id of ["content-author","reviewer","appeal-reviewer"])
   await client.query('insert into "user"(id,name,email) values ($1,$1,$2)',[id,id+"@p7.test"]);
 await client.query("insert into authz_user_roles(user_id,role_id) values ('reviewer','builtin-moderator')");
 await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) "+
   "values ('appeal-reviewer','forum.complaint.appeal.review','allow')");
 await forum.createCategory({id:"p7-category",name:"P7"});
 await forum.createSection({id:"p7-section",categoryId:"p7-category",name:"P7"});
});
afterAll(async()=>{
 await pool.end();
 await client.query("drop schema "+schema+" cascade");
 await client.end();
});

describe("Package 7 connected route-to-PostgreSQL lifecycle", () => {
  it("ties submission, Case, Decision, Appeals, History and inbox to persisted IDs", async () => {
    const reporterA=await quotaActor(),reporterB=await quotaActor(),unrelated=await quotaActor();
    const source=await content("Package 7 immutable evidence"),retained=await asset(source.post.postId);
    const domain=service();
    const context=(actor:string)=>{
      const c=new RouterContextProvider();
      c.set(authSessionContext,{user:{id:actor}} as never);
      c.set(authorizationContext,authorization as never);
      c.set(complaintSubmissionContext,createHyperdriveComplaintSubmission(databaseUrl!,authorization,
        ()=>new Client({connectionString:databaseUrl,options})));
      c.set(complaintReviewContext,{
        addNote:(a:string,x:Parameters<ComplaintsService["addNote"]>[1])=>domain.addNote(a,x),
        decide:(a:string,x:Parameters<ComplaintsService["decide"]>[1])=>domain.decide(a,x)
      } as never);
      c.set(complaintAppealContext,{
        ownResult:(a:string,id:string)=>domain.readOwnResult(a,id),
        submit:(a:string,x:Parameters<ComplaintsService["appeal"]>[1])=>domain.appeal(a,x),
        resolve:(a:string,x:Parameters<ComplaintsService["resolveAppeal"]>[1])=>domain.resolveAppeal(a,x)
      } as never);
      c.set(complaintQueueContext,domain as never);
      c.set(forumReaderContext,forum as never);
      c.set(forumWriterContext,{
        markNotificationRead:({userId,notificationId}:{userId:string;notificationId:string})=>
          forum.markNotificationRead(userId,notificationId)
      } as never);
      return c;
    };
    const post=(url:string,fields:Record<string,string>)=>new Request(url,{
      method:"POST",headers:{Origin:"https://forum.test"},body:new URLSearchParams(fields)
    });
    const submit=(actor:string,kind:"post"|"topic-title",revisionId:string,operationId=randomUUID())=>
      submitAction({params:{topicId:source.post.topicId},context:context(actor),
        request:post("https://forum.test/en/topics/"+source.post.topicId+"/complaints",{
          kind,revisionId,reason:"spam",operationId,
          ...(kind==="post"?{postId:source.post.postId}:{})
        })});
    const caseFor=async(kind:"post"|"topic-title",revisionId:string)=>{
      const rows=await client.query<{case_id:string}>(
        "select distinct r.case_id from forum_complaints r join forum_complaint_targets t on t.id=r.target_id "+
        "where t.topic_id=$1 and t.kind=$2 and coalesce(t.post_revision_id,t.title_revision_id)=$3",
        [source.post.topicId,kind,revisionId]);
      expect(rows.rows).toHaveLength(1);
      return rows.rows[0]!.case_id;
    };
    const firstOperation=randomUUID();
    expect(await submit(reporterA,"post",source.post.revisionId,firstOperation))
      .toMatchObject({data:{ok:true,operationId:firstOperation}});
    expect(await submit(reporterB,"post",source.post.revisionId)).toMatchObject({data:{ok:true}});
    expect(await submit(unrelated,"topic-title",source.title.revisionId)).toMatchObject({data:{ok:true}});
    const caseId=await caseFor("post",source.post.revisionId);
    expect(await caseFor("topic-title",source.title.revisionId)).not.toBe(caseId);
    const reports=async()=>(await client.query<{n:number}>(
      "select count(*)::int n from forum_complaints where case_id=$1",[caseId])).rows[0]!.n;
    expect(await reports()).toBe(2);
    expect(await submit(reporterA,"post",source.post.revisionId,firstOperation))
      .toMatchObject({data:{ok:true,operationId:firstOperation}});
    expect(await reports()).toBe(2);

    const version=async()=>(await client.query<{version:number}>(
      "select version from forum_complaint_cases where id=$1",[caseId])).rows[0]!.version;
    await domain.activity("reviewer",caseId,true);
    await domain.changePriority("reviewer",{caseId,expectedVersion:await version(),
      priority:3,operationId:randomUUID()});
    const oldVersion=await version();
    const reviewPost=(fields:Record<string,string>)=>caseAction({params:{caseId},
      context:context("reviewer"),
      request:post("https://forum.test/en/attention/complaints/"+caseId+"/review",fields)});
    expect(await reviewPost({intent:"note",operationId:randomUUID(),body:"Internal note"}))
      .toMatchObject({data:{ok:true,intent:"note"}});
    expect(await reviewPost({intent:"decision",operationId:randomUUID(),
      expectedVersion:String(oldVersion),outcome:"confirmed",reasoning:"Stale context"}))
      .toMatchObject({data:{error:"conflict"},init:{status:409}});
    expect((await client.query("select id from forum_complaint_decisions where case_id=$1",[caseId])).rows)
      .toHaveLength(0);

    await forum.editPublishedPost({topicId:source.post.topicId,postId:source.post.postId,
      actorId:"content-author",expectedRevisionId:source.post.revisionId,
      body:"Package 7 edited current source",draftId:randomUUID(),attachmentIds:[],retainedAttachmentIds:[]});
    const currentRevision=(await client.query<{current_revision_id:string}>(
      "select current_revision_id from forum_posts where id=$1",[source.post.postId]))
      .rows[0]!.current_revision_id;
    expect(currentRevision).not.toBe(source.post.revisionId);
    expect(await submit(unrelated,"post",currentRevision)).toMatchObject({data:{ok:true}});
    const successor=await caseFor("post",currentRevision);
    expect(successor).not.toBe(caseId);
    expect((await domain.readCase("reviewer",successor)).previousCaseId).toBe(caseId);
    const evidence=await domain.readReview("reviewer",caseId,{reports:0,notes:0,evidence:0,context:0});
    expect(evidence).toMatchObject({state:"open",
      reported:{revisionId:source.post.revisionId,originalContent:"Package 7 immutable evidence"},
      current:{originalContent:"Package 7 edited current source"},
      evidence:{total:1,items:[{id:retained}]},reports:{total:2}});
    await expect(domain.readOwnResult(unrelated,caseId)).rejects.toBeInstanceOf(ComplaintNotFoundError);

    const decisionOperation=randomUUID(),acceptedVersion=await version();
    const decide=()=>reviewPost({intent:"decision",operationId:decisionOperation,
      expectedVersion:String(acceptedVersion),outcome:"confirmed",reasoning:"Confirmed evidence"});
    expect(await decide()).toMatchObject({data:{ok:true,intent:"decision"}});
    const decisionId=(await client.query<{id:string}>(
      "select id from forum_complaint_decisions where case_id=$1",[caseId])).rows[0]!.id;
    const notices=async(column:"complaint_decision_id"|"complaint_appeal_id",id:string)=>
      (await client.query<{id:string;recipient_user_id:string;read_at:Date|null}>(
        "select id,recipient_user_id,read_at from forum_reply_notifications "+
        "where "+column+"=$1 order by recipient_user_id",[id])).rows;
    const recipients=["content-author",reporterA,reporterB].sort();
    expect((await notices("complaint_decision_id",decisionId)).map(x=>x.recipient_user_id)).toEqual(recipients);
    const firstNotice=(await notices("complaint_decision_id",decisionId))
      .find(x=>x.recipient_user_id===reporterA)!;
    expect(await forum.markNotificationRead(reporterA,firstNotice.id))
      .toEqual({kind:"complaint-decision",caseId});
    const readAt=(await client.query<{read_at:Date}>(
      "select read_at from forum_reply_notifications where id=$1",[firstNotice.id])).rows[0]!.read_at;
    expect(readAt).not.toBeNull();
    expect(await decide()).toMatchObject({data:{ok:true,intent:"decision"}});
    expect((await notices("complaint_decision_id",decisionId)).find(x=>x.id===firstNotice.id)!.read_at)
      .toEqual(readAt);
    expect((await domain.readQueue("reviewer",0)).cases.some(x=>x.id===caseId)).toBe(false);
    expect((await domain.readResolvedHistory("reviewer",0)).cases.some(x=>x.id===caseId)).toBe(true);

    const own=(actor:string)=>participantLoader({params:{caseId,locale:"en"},context:context(actor)});
    expect((await own("content-author")).result).toMatchObject({
      outcome:"confirmed",effectiveOutcome:"confirmed",remaining:3,canAppeal:true});
    await expect(own(unrelated)).rejects.toMatchObject({status:404});
    const appeal=(actor:string,operationId:string,argument:string)=>appealAction({
      params:{caseId},context:context(actor),
      request:post("https://forum.test/en/complaints/"+caseId+"/result",
        {intent:"appeal",decisionId,operationId,argument})});
    const appealId=async(ordinal:number)=>(await client.query<{id:string}>(
      "select id from forum_complaint_appeals where decision_id=$1 and ordinal=$2",
      [decisionId,ordinal])).rows[0]!.id;
    const resolve=(id:string,operationId:string,outcome:"upheld"|"overturned")=>
      appealReviewAction({params:{caseId,appealId:id},context:context("appeal-reviewer"),
        request:post("https://forum.test/en/attention/complaints/"+caseId+"/appeals/"+id,
          {intent:"resolve",operationId,outcome,reasoning:"Appeal reasoning"})});
    expect(await appeal("content-author",randomUUID(),"Author Appeal")).toMatchObject({ok:true});
    const id1=await appealId(1),resolution1=randomUUID();
    expect(await appeal("content-author",randomUUID(),"Another pending Appeal"))
      .toMatchObject({data:{error:"conflict"},init:{status:409}});
    expect(await resolve(id1,resolution1,"overturned")).toMatchObject({data:{ok:true}});
    expect((await own(reporterA)).result).toMatchObject({
      effectiveOutcome:"not-confirmed",remaining:2,canAppeal:true});
    expect(await appeal(reporterA,randomUUID(),"Reporter Appeal 2")).toMatchObject({ok:true});
    const id2=await appealId(2);
    expect(await resolve(id2,randomUUID(),"upheld")).toMatchObject({data:{ok:true}});
    expect((await own(reporterA)).result).toMatchObject({
      effectiveOutcome:"not-confirmed",remaining:1,canAppeal:true});
    expect(await appeal(reporterA,randomUUID(),"Reporter Appeal 3")).toMatchObject({ok:true});
    const id3=await appealId(3);
    expect(await resolve(id3,randomUUID(),"overturned")).toMatchObject({data:{ok:true}});
    expect((await own(reporterA)).result).toMatchObject({
      outcome:"confirmed",effectiveOutcome:"confirmed",remaining:0,used:3,canAppeal:false});
    expect(await appeal("content-author",randomUUID(),"Fourth Appeal"))
      .toMatchObject({data:{error:"conflict"},init:{status:409}});
    for(const id of [id1,id2,id3])
      expect((await notices("complaint_appeal_id",id)).map(x=>x.recipient_user_id)).toEqual(recipients);
    expect(await resolve(id1,resolution1,"overturned")).toMatchObject({data:{ok:true}});
    expect(await notices("complaint_appeal_id",id1)).toHaveLength(3);
    expect((await notices("complaint_decision_id",decisionId)).find(x=>x.id===firstNotice.id)!.read_at)
      .toEqual(readAt);

    const timeline=await historyLoader({params:{caseId,locale:"en"},context:context("reviewer"),
      url:new URL("https://forum.test/en/attention/complaints/"+caseId+"/history")});
    expect(timeline.timeline.caseId).toBe(caseId);
    expect(timeline.timeline.events.map(x=>x.kind)).toEqual(expect.arrayContaining([
      "submitted","priority-changed","review-started","noted","decided","appealed","appeal-resolved"
    ]));
    expect(timeline.timeline.events.filter(x=>x.kind==="appealed")).toHaveLength(3);
    expect(timeline.timeline.events.filter(x=>x.kind==="appeal-resolved")).toHaveLength(3);
    expect(JSON.stringify(timeline.timeline)).not.toContain(reporterA);
    const inbox=await inboxLoader({params:{locale:"en"},context:context(reporterB),
      url:new URL("https://forum.test/en/notifications")});
    expect(inbox.notifications.filter(x=>x.kind==="complaint-appeal-result"&&x.caseId===caseId))
      .toHaveLength(3);
    const firstInboxNotice=(await notices("complaint_appeal_id",id1))
      .find(x=>x.recipient_user_id===reporterB)!;
    const opened=await inboxAction({params:{locale:"en"},context:context(reporterB),
      request:post("https://forum.test/en/notifications",{
        intent:"open",notificationId:firstInboxNotice.id})});
    expect(opened).toBeInstanceOf(Response);
    expect((opened as Response).headers.get("Location"))
      .toBe("/en/complaints/"+caseId+"/result#appeal-"+id1);
    expect((await own(reporterB)).result.appeals.map(x=>x.ordinal)).toEqual([1,2,3]);
    await expect(historyLoader({params:{caseId,locale:"en"},context:context(reporterA),
      url:new URL("https://forum.test/en/attention/complaints/"+caseId+"/history")}))
      .rejects.toMatchObject({status:403});
  },30000);
});

