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
import {AuthorizationService} from "../../db/authorization-service";
import {registryLoaderContext} from "../localization/request-context";
import {localeRegistry} from "../localization/registry";
import {privateAttachmentBucketContext} from "../forum/attachment-request-context";
import {createHyperdriveComplaintReview} from "../../db/hyperdrive-complaint-review";
import {createHyperdriveComplaintAppeal} from "../../db/hyperdrive-complaint-appeal";
import {loader as reviewLoader} from "../routes/complaint-review";
import {loader as appealReviewLoader} from "../routes/complaint-appeal-review";
import {loader as appealContextLoader} from "../routes/complaint-appeal-context";
import {loader as appealEvidenceLoader} from "../routes/complaint-appeal-evidence";
import {loader as caseContextLoader} from "../routes/complaint-review-context";
import {loader as caseEvidenceLoader} from "../routes/complaint-review-evidence";
import {ComplaintForbiddenError} from "../../db/complaints-domain";
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
import {topicAction} from "../forum/actions.server";
import {createHyperdriveForumWriter} from "../../db/hyperdrive-forum";

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

  it("links dynamic reviewer grants to private Appeal DTO and retained-resource routes",async()=>{
    const reporter=await quotaActor(),reviewOnly=await quotaActor(),appealOnly=await quotaActor();
    const identityOnly=await quotaActor(),priorityOnly=await quotaActor(),outsider=await quotaActor();
    const managerId=await quotaActor();
    await client.query("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-admin')",[managerId]);
    const manager=new AuthorizationService(new PostgresAuthorizationRepository(pool, managerId));
    const slug="p7-review-"+randomUUID().slice(0,8);
    await manager.createCustomRole(managerId,{slug,displayName:"P7 Appeal reviewer"});
    const roleId=(await client.query<{id:string}>(
      "select id from authz_roles where slug=$1",[slug])).rows[0]!.id;
    await manager.replaceRoleGrants(managerId,roleId,["forum.complaint.appeal.review"]);
    await manager.assignUserRole(managerId,appealOnly,roleId);
    await manager.setUserOverride(managerId,reviewOnly,"forum.complaint.review","allow");
    await manager.setUserOverride(managerId,identityOnly,"forum.complaint.reporterIdentity.read","allow");
    await manager.setUserOverride(managerId,priorityOnly,"forum.complaint.priority.manage","allow");

    const original=await content("B2 immutable reported evidence");
    const retained=await asset(original.post.postId),domain=service();
    const saved=await domain.submit(reporter,{target:original.post,reason:"spam",
      explanation:null,operationId:randomUUID()});
    const decisionId=await domain.decide("reviewer",{caseId:saved.caseId,expectedVersion:1,
      outcome:"not-confirmed",reasoning:"Initial reporter outcome",operationId:randomUUID()});
    const appealId=await domain.appeal(reporter,{caseId:saved.caseId,decisionId,
      argument:"Private appellant reasoning",operationId:randomUUID()});
    const unrelated=await content("B2 unrelated post"),foreignAsset=await asset(unrelated.post.postId);
    const other=await domain.submit(reporter,{target:unrelated.post,reason:"spam",
      explanation:null,operationId:randomUUID()});
    const otherDecision=await domain.decide("reviewer",{caseId:other.caseId,expectedVersion:1,
      outcome:"not-confirmed",reasoning:"Other result",operationId:randomUUID()});
    const otherAppeal=await domain.appeal(reporter,{caseId:other.caseId,decisionId:otherDecision,
      argument:"Other Appeal",operationId:randomUUID()});
    await forum.editPublishedPost({topicId:original.post.topicId,postId:original.post.postId,
      actorId:"content-author",expectedRevisionId:original.post.revisionId,
      body:"B2 new current body",draftId:randomUUID(),attachmentIds:[],retainedAttachmentIds:[]});

    const bucketCalls:string[]=[];
    const bucket={get:async(key:string,range:{range:{offset:number;length:number}})=>{
      bucketCalls.push(key);expect(range).toEqual({range:{offset:0,length:4}});
      return {size:4,body:new Response("data").body!};
    }};
    // New RouterContextProvider per request; real SQL + auth snapshots, not fake DTOs.
    const context=(actor:string|null,withBucket=true)=>{
      const c=new RouterContextProvider();
      c.set(authSessionContext,actor?{user:{id:actor}} as never:null);
      c.set(authorizationContext,authorization as never);
      c.set(registryLoaderContext,async()=>({registry:localeRegistry}) as never);
      c.set(complaintReviewContext,createHyperdriveComplaintReview(databaseUrl!,authorization,
        ()=>new Client({connectionString:databaseUrl,options})));
      c.set(complaintAppealContext,createHyperdriveComplaintAppeal(databaseUrl!,authorization,
        ()=>new Client({connectionString:databaseUrl,options})));
      if(withBucket)c.set(privateAttachmentBucketContext,bucket as never);
      return c;
    };
    const review=(actor:string|null)=>reviewLoader({
      request:new Request("https://forum.test/en/attention/complaints/"+saved.caseId+"/review"),
      url:new URL("https://forum.test/en/attention/complaints/"+saved.caseId+"/review"),
      params:{caseId:saved.caseId,locale:"en"},context:context(actor)
    });
    const appeal=(actor:string|null,caseId=saved.caseId,id=appealId)=>appealReviewLoader({
      url:new URL("https://forum.test/en/attention/complaints/"+caseId+"/appeals/"+id),
      params:{caseId,appealId:id,locale:"en"},context:context(actor)
    });
    const aEvidence=(actor:string|null,caseId=saved.caseId,id=appealId,assetId=retained,
      withBucket=true)=>appealEvidenceLoader({
      params:{caseId,appealId:id,attachmentId:assetId},context:context(actor,withBucket)
    });
    const cEvidence=(actor:string|null,caseId=saved.caseId,assetId=retained)=>
      caseEvidenceLoader({params:{caseId,attachmentId:assetId},context:context(actor)});

    const plainCase=(await review(reviewOnly)).data.item;
    expect(plainCase).toMatchObject({reported:{originalContent:"B2 immutable reported evidence"},
      current:{originalContent:"B2 new current body"},evidence:{items:[{id:retained}]},
      permissions:{identity:false}});
    expect(plainCase.reports.items[0]).not.toHaveProperty("reporter");
    await expect(appeal(reviewOnly)).rejects.toMatchObject({status:403});
    await expect(review(appealOnly)).rejects.toMatchObject({status:403});
    for(const actor of [identityOnly,priorityOnly,outsider])
      await expect(appeal(actor)).rejects.toMatchObject({status:403});
    await expect(appeal(null)).rejects.toMatchObject({status:401});
    expect((await domain.readPrioritySettings(priorityOnly)).weights).toBeDefined();
    await expect(domain.readPrioritySettings(appealOnly)).rejects.toBeInstanceOf(ComplaintForbiddenError);

    const plain=await appeal(appealOnly);
    expect(plain.init?.headers).toMatchObject({"Cache-Control":"private, no-store"});
    const dto=plain.data.result;
    expect(dto.appeal).toMatchObject({id:appealId,argument:"Private appellant reasoning"});
    expect(dto.caseReview).toMatchObject({reports:{total:1},
      evidence:{total:1,items:[{id:retained}]},permissions:{identity:false},
      reported:{originalContent:"B2 immutable reported evidence",direction:"ltr"}});
    expect(dto.appeal).not.toHaveProperty("appellant");
    expect(dto.appeals[0]).not.toHaveProperty("appellant");
    expect(dto.caseReview.reports.items[0]).not.toHaveProperty("reporter");
    expect(JSON.stringify(plain.data)).not.toContain(reporter);
    for(const forbidden of ["objectKey","operationId","@p7.test"])
      expect(JSON.stringify(plain.data)).not.toContain(forbidden);

    await manager.setUserOverride(managerId,appealOnly,"forum.complaint.reporterIdentity.read","allow");
    const identified=(await appeal(appealOnly)).data.result;
    expect(identified.appeal.appellant).toEqual({id:reporter,name:reporter});
    expect(identified.appeals[0].appellant).toEqual({id:reporter,name:reporter});
    expect(identified.caseReview.reports.items[0].reporter).toEqual({id:reporter,name:reporter});
    expect(JSON.stringify(identified)).not.toContain("@p7.test");
    await manager.setUserOverride(managerId,appealOnly,"forum.complaint.reporterIdentity.read",null);
    expect((await appeal(appealOnly)).data.result.appeal).not.toHaveProperty("appellant");
    expect((await appeal(appealOnly)).data.result.caseReview.reports.items[0])
      .not.toHaveProperty("reporter");
    await manager.setUserOverride(managerId,appealOnly,"forum.complaint.appeal.review","deny");
    await expect(appeal(appealOnly)).rejects.toMatchObject({status:403});
    await manager.setUserOverride(managerId,appealOnly,"forum.complaint.appeal.review",null);
    expect((await appeal(appealOnly)).data.result.appeal.id).toBe(appealId);
    await manager.setUserOverride(managerId,reviewOnly,"forum.complaint.review","deny");
    await expect(review(reviewOnly)).rejects.toMatchObject({status:403});
    await manager.setUserOverride(managerId,reviewOnly,"forum.complaint.review","allow");
    expect((await review(reviewOnly)).data.item.id).toBe(saved.caseId);

    const aContext=await appealContextLoader({params:{caseId:saved.caseId,appealId,
      postId:original.post.postId},context:context(appealOnly)});
    expect(aContext.data.source).toMatchObject({originalContent:"B2 new current body",sourceLocale:"und",direction:"auto"});
    const cContext=await caseContextLoader({params:{caseId:saved.caseId,
      postId:original.post.postId},context:context(reviewOnly)});
    expect(cContext.data.source.originalContent).toBe("B2 new current body");

    const bytes=await aEvidence(appealOnly);
    expect(bytes.status).toBe(200);
    expect(await bytes.text()).toBe("data");
    expect(bytes.headers.get("Cache-Control")).toBe("private, no-store");
    expect(bytes.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(bytes.headers.get("Content-Disposition")).toContain("attachment");
    expect(bytes.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(bytes.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const caseBytes=await cEvidence(reviewOnly);
    expect(caseBytes.status).toBe(200);
    expect(await caseBytes.text()).toBe("data");
    expect(bucketCalls).toEqual(["private/"+retained,"private/"+retained]);
    for(const call of [
      ()=>aEvidence(reviewOnly),()=>aEvidence(identityOnly),
      ()=>aEvidence(outsider),()=>cEvidence(appealOnly)
    ])await expect(call()).rejects.toMatchObject({status:403});
    for(const call of [
      ()=>aEvidence(appealOnly,saved.caseId,appealId,foreignAsset),
      ()=>aEvidence(appealOnly,saved.caseId,otherAppeal,retained),
      ()=>aEvidence(appealOnly,other.caseId,appealId,retained),
      ()=>cEvidence(reviewOnly,other.caseId,retained)
    ])await expect(call()).rejects.toMatchObject({status:404});
    expect(bucketCalls).toHaveLength(2);
    await expect(appealContextLoader({params:{caseId:saved.caseId,appealId,
      postId:unrelated.post.postId},context:context(appealOnly)}))
      .rejects.toMatchObject({status:404});
    await expect(appealContextLoader({params:{caseId:saved.caseId,appealId:otherAppeal,
      postId:original.post.postId},context:context(appealOnly)}))
      .rejects.toMatchObject({status:404});
    const unavailable=await aEvidence(appealOnly,saved.caseId,appealId,retained,false);
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("private, no-store");

    // Participant Appeal is membership-based, not a side effect of create/review grants.
    const eligibleSource=await content("B2 eligible reporter");
    const eligible=await domain.submit(reporter,{target:eligibleSource.post,reason:"spam",
      explanation:null,operationId:randomUUID()});
    const eligibleDecision=await domain.decide("reviewer",{caseId:eligible.caseId,
      expectedVersion:1,outcome:"not-confirmed",reasoning:"Appeal eligible",
      operationId:randomUUID()});
    await manager.setUserOverride(managerId,reporter,"forum.complaint.create","deny");
    await manager.setUserOverride(managerId,reporter,"forum.complaint.review","deny");
    expect((await participantLoader({params:{caseId:eligible.caseId,locale:"en"},
      context:context(reporter)})).result).toMatchObject({canAppeal:true,reporter:true});
    await expect(participantLoader({params:{caseId:eligible.caseId,locale:"en"},
      context:context(outsider)})).rejects.toMatchObject({status:404});
    const appealRequest=new Request("https://forum.test/en/complaints/"+eligible.caseId+"/result",{
      method:"POST",headers:{Origin:"https://forum.test"},
      body:new URLSearchParams({intent:"appeal",decisionId:eligibleDecision,
        operationId:randomUUID(),argument:"Eligible even after deny"})
    });
    expect(await appealAction({params:{caseId:eligible.caseId},
      context:context(reporter),request:appealRequest})).toMatchObject({ok:true});
  },30000);

  it("keeps native Appeals, History, timeline and mixed inbox totals independent of page limits",async()=>{
    const domain=service(),baselinePending=(await domain.readAppealQueue("reviewer",0)).total;
    const baselineHistory=(await domain.readResolvedHistory("reviewer",0)).total;
    const beforeInbox=(await forum.readNotifications("content-author",0)).total;
    const secondReviewer=await quotaActor();
    await client.query("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-moderator')",
      [secondReviewer]);
    const cases:Array<{caseId:string;decisionId:string;appealId:string;reporter:string;
      topicId:string;postId:string}>=[];
    // Different reporters and content targets: the anti-abuse budget is not raised or bypassed.
    for(let i=0;i<28;i++){
      const target=await content("P7 pagination Case "+i),reporter=await quotaActor();
      const submitted=await domain.submit(reporter,{target:target.post,reason:"spam",
        explanation:null,operationId:randomUUID()});
      const reviewer=i<2?secondReviewer:"reviewer";
      const decisionId=await domain.decide(reviewer,{caseId:submitted.caseId,expectedVersion:1,
        outcome:"not-confirmed",reasoning:"Pagination Decision",operationId:randomUUID()});
      const appealId=await domain.appeal(reporter,{caseId:submitted.caseId,decisionId,
        argument:"Pagination Appeal",operationId:randomUUID()});
      cases.push({caseId:submitted.caseId,decisionId,appealId,reporter,
        topicId:target.post.topicId,postId:target.post.postId});
    }
    const pending0=await domain.readAppealQueue("reviewer",0);
    const pending1=await domain.readAppealQueue("reviewer",1);
    const pendingAll=[...pending0.appeals,...pending1.appeals];
    expect(pending0).toMatchObject({page:0,total:baselinePending+28,hasMore:true});
    expect(pending0.appeals).toHaveLength(25);
    expect(pending1).toMatchObject({page:1,total:baselinePending+28,hasMore:false});
    expect(pending1.appeals).toHaveLength(baselinePending+3);
    expect(new Set(pendingAll.map(x=>x.id)).size).toBe(baselinePending+28);
    expect(pendingAll.slice(0,2).map(x=>x.caseId)).toEqual(cases.slice(0,2).map(x=>x.caseId));
    expect(pendingAll.slice(0,2).every(x=>!x.ownInitialDecision)).toBe(true);
    expect(pendingAll.slice(2).every(x=>x.ownInitialDecision)).toBe(true);
    for(let i=1;i<pendingAll.length;i++){
      const a=pendingAll[i-1]!,b=pendingAll[i]!;
      if(a.ownInitialDecision===b.ownInitialDecision)
        expect(new Date(a.createdAt).getTime()<=new Date(b.createdAt).getTime() ||
          (new Date(a.createdAt).getTime()===new Date(b.createdAt).getTime()&&a.id<b.id)).toBe(true);
    }
    const resolvedFirst=cases[0]!;
    await domain.resolveAppeal("appeal-reviewer",{caseId:resolvedFirst.caseId,
      appealId:resolvedFirst.appealId,operationId:randomUUID(),
      outcome:"upheld",reasoning:"Pagination review"});
    const afterOne=await domain.readAppealQueue("reviewer",0);
    expect(afterOne.total).toBe(baselinePending+27);
    expect(afterOne.appeals.some(x=>x.id===resolvedFirst.appealId)).toBe(false);
    const history0=await domain.readResolvedHistory("reviewer",0);
    const history1=await domain.readResolvedHistory("reviewer",1);
    const historyBeyond=await domain.readResolvedHistory("reviewer",100);
    expect(history0).toMatchObject({total:baselineHistory+28,hasMore:true,page:0});
    expect(history0.cases).toHaveLength(25);
    expect(history1).toMatchObject({total:baselineHistory+28,hasMore:false,page:1});
    expect(history1.cases).toHaveLength(baselineHistory+3);
    expect(historyBeyond).toMatchObject({total:baselineHistory+28,hasMore:false,cases:[]});
    expect(new Set([...history0.cases,...history1.cases].map(x=>x.id)).size)
      .toBe(baselineHistory+28);
    const pendingOnly=await content("P7 intentionally open Case");
    const openReporter=await quotaActor();
    const open=await domain.submit(openReporter,{target:pendingOnly.post,reason:"spam",
      explanation:null,operationId:randomUUID()});
    expect((await domain.readResolvedHistory("reviewer",0)).cases.some(x=>x.id===open.caseId))
      .toBe(false);
    const beforeTimeline=await domain.readHistoryTimeline("reviewer",resolvedFirst.caseId,0);
    for(let i=0;i<53;i++)
      await domain.addNote("reviewer",{caseId:resolvedFirst.caseId,
        operationId:randomUUID(),body:"Private timeline note "+i});
    const timeline0=await domain.readHistoryTimeline("reviewer",resolvedFirst.caseId,0);
    const timeline1=await domain.readHistoryTimeline("reviewer",resolvedFirst.caseId,1);
    const timelineBeyond=await domain.readHistoryTimeline("reviewer",resolvedFirst.caseId,100);
    const expectedEvents=beforeTimeline.total+53;
    expect(expectedEvents).toBeGreaterThan(50);
    expect(timeline0).toMatchObject({total:expectedEvents,page:0,hasMore:true});
    expect(timeline0.events).toHaveLength(50);
    expect(timeline1).toMatchObject({total:expectedEvents,page:1,hasMore:false});
    expect(timeline1.events).toHaveLength(expectedEvents-50);
    expect(timelineBeyond).toMatchObject({total:expectedEvents,events:[],hasMore:false});
    expect(new Set([...timeline0.events,...timeline1.events].map(x=>x.id)).size)
      .toBe(expectedEvents);
    const review0=await domain.readReview("reviewer",resolvedFirst.caseId,
      {reports:0,notes:0,evidence:0,context:0});
    const review1=await domain.readReview("reviewer",resolvedFirst.caseId,
      {reports:0,notes:1,evidence:0,context:0});
    expect(review0.notes).toMatchObject({total:53,hasMore:true});
    expect(review0.notes.items).toHaveLength(50);
    expect(review1.notes).toMatchObject({total:53,hasMore:false});
    expect(review1.notes.items).toHaveLength(3);
    expect(review0.reports.total).toBe(review1.reports.total);
    expect(review0.evidence.total).toBe(review1.evidence.total);

    // Route loader receives a Framework-normalized page URL, but uses native SQL counts.
    const routeContext=new RouterContextProvider();
    routeContext.set(authSessionContext,{user:{id:"reviewer"}} as never);
    routeContext.set(authorizationContext,authorization as never);
    routeContext.set(complaintQueueContext,domain as never);
    const fromRoute=await historyLoader({params:{caseId:resolvedFirst.caseId,locale:"en"},
      context:routeContext,url:new URL("https://forum.test/en/attention/complaints/"+
        resolvedFirst.caseId+"/history?page=1")});
    expect(fromRoute.timeline).toMatchObject({page:1,total:expectedEvents,hasMore:false});
    expect(fromRoute.timeline.events).toHaveLength(expectedEvents-50);

    for(const item of cases.slice(1))
      await domain.resolveAppeal("appeal-reviewer",{caseId:item.caseId,appealId:item.appealId,
        operationId:randomUUID(),outcome:"upheld",reasoning:"Inbox fanout"});
    expect((await domain.readAppealQueue("reviewer",0)).total).toBe(baselinePending);
    // A single legacy reply row is a controlled fixture, not a replacement producer.
    const legacyId=randomUUID();
    await client.query("insert into forum_reply_notifications "+
      "(id,recipient_user_id,actor_user_id,topic_id,post_id,kind,created_at) "+
      "values ($1,'content-author','reviewer',$2,$3,'reply',now())",
      [legacyId,cases[0]!.topicId,cases[0]!.postId]);
    const inbox0=await forum.readNotifications("content-author",0);
    const inbox1=await forum.readNotifications("content-author",1);
    const all=[...inbox0.items,...inbox1.items];
    const expectedTotal=beforeInbox+56+1;
    expect(inbox0).toMatchObject({total:expectedTotal,page:0,hasMore:true});
    expect(inbox0.items).toHaveLength(50);
    expect(inbox1).toMatchObject({total:expectedTotal,page:1,hasMore:false});
    expect(inbox1.items).toHaveLength(expectedTotal-50);
    expect(new Set(all.map(x=>x.id)).size).toBe(expectedTotal);
    expect(all.filter(x=>x.kind==="complaint-decision").length).toBeGreaterThanOrEqual(28);
    expect(all.filter(x=>x.kind==="complaint-appeal-result").length).toBeGreaterThanOrEqual(28);
    expect(all.some(x=>x.id===legacyId&&x.kind==="reply")).toBe(true);
    expect(await forum.countUnreadNotifications("content-author")).toBe(expectedTotal);
    expect(await forum.countUnreadReplyNotifications("content-author")).toBe(1);
    expect((await forum.readReplyNotifications("content-author")).map(x=>x.id)).toEqual([legacyId]);
    const decisionNotice=all.find(x=>x.kind==="complaint-decision"&&
      x.caseId===cases[0]!.caseId)!;
    const readFirst=await forum.markNotificationRead("content-author",decisionNotice.id);
    expect(readFirst).toEqual({kind:"complaint-decision",caseId:cases[0]!.caseId});
    const markedAt=(await client.query<{read_at:Date}>(
      "select read_at from forum_reply_notifications where id=$1",[decisionNotice.id]))
      .rows[0]!.read_at;
    await forum.markNotificationRead("content-author",decisionNotice.id);
    expect((await client.query<{read_at:Date}>(
      "select read_at from forum_reply_notifications where id=$1",[decisionNotice.id]))
      .rows[0]!.read_at).toEqual(markedAt);
    expect(await forum.countUnreadNotifications("content-author")).toBe(expectedTotal-1);
    expect(await forum.countUnreadReplyNotifications("content-author")).toBe(1);
    await expect(forum.markNotificationRead("reviewer",legacyId)).rejects.toThrow();
    expect(await forum.markReplyNotificationRead("content-author",legacyId))
      .toEqual({topicId:cases[0]!.topicId,postId:cases[0]!.postId});
    expect(await forum.markReplyNotificationRead("content-author",legacyId))
      .toEqual({topicId:cases[0]!.topicId,postId:cases[0]!.postId});
    expect(await forum.countUnreadReplyNotifications("content-author")).toBe(0);
    expect(await forum.countUnreadNotifications("content-author")).toBe(expectedTotal-2);
  },60000);

  it("keeps canonical inline pin authority and Admin History independent of Complaint decisions",async()=>{
    const reporter=await quotaActor(),reviewOnly=await quotaActor();
    await client.query("insert into authz_user_permission_overrides "+
      "(user_id,permission_key,effect) values ($1,'forum.complaint.review','allow')",
      [reviewOnly]);
    const target=await content("P7 canonical Quick action boundary"),domain=service();
    const saved=await domain.submit(reporter,{target:target.post,
      reason:"spam",explanation:null,operationId:randomUUID()});
    const topicId=target.post.topicId;
    const facts=async()=>{
      const row=(await client.query<{
        is_solved:boolean;best_answer_post_id:string|null
      }>("select is_solved,best_answer_post_id from forum_topics where id=$1",[topicId])).rows[0]!;
      const pin=await forum.readTopicPinState(topicId);
      const admin=(await client.query<{action:string}>(
        "select action from admin_history where target_id=$1 order by position",[topicId])).rows;
      const reports=(await client.query<{n:number}>(
        "select count(*)::int n from forum_complaints where case_id=$1",[saved.caseId])).rows[0]!.n;
      const signals=(await client.query<{n:number}>(
        "select count(*)::int n from forum_help_signals where topic_id=$1",[topicId])).rows[0]!.n;
      return {row,pin,admin,reports,signals};
    };
    const initial=await facts();
    expect(initial).toMatchObject({row:{is_solved:false,best_answer_post_id:null},
      pin:false,admin:[],reports:1,signals:0});
    const route=async()=>{
      const ctx=new RouterContextProvider();
      ctx.set(authSessionContext,{user:{id:reviewOnly}} as never);
      ctx.set(authorizationContext,authorization as never);
      ctx.set(forumWriterContext,createHyperdriveForumWriter(databaseUrl!,
        ()=>new Client({connectionString:databaseUrl,options})));
      const body=new FormData();
      body.set("intent","pinTopic");body.set("inlineQuickAction","1");
      return topicAction({request:new Request("https://forum.test/en/topics/"+topicId,{
        method:"POST",headers:{Origin:"https://forum.test"},body}),
        params:{topicId,locale:"en"},context:ctx});
    };
    // Complaint review permission alone cannot invoke an administrative operation.
    expect(await route()).toMatchObject({init:{status:403}});
    expect(await facts()).toEqual(initial);
    const reviewed=await domain.readReview(reviewOnly,saved.caseId,{
      reports:0,notes:0,evidence:0,context:0});
    expect(reviewed.permissions.pin).toBe(false);
    await client.query("insert into authz_user_permission_overrides "+
      "(user_id,permission_key,effect) values ($1,'forum.topic.pin','allow')",
      [reviewOnly]);
    expect(await route()).toMatchObject({data:{ok:true}});
    const afterPin=await facts();
    expect(afterPin).toMatchObject({pin:true,reports:1,signals:0,
      admin:[{action:"topic.pinned"}],row:{is_solved:false,best_answer_post_id:null}});
    expect((await domain.readReview(reviewOnly,saved.caseId,{
      reports:0,notes:0,evidence:0,context:0})).permissions.pin).toBe(true);
    expect(await client.query("select id from forum_complaint_decisions where case_id=$1",
      [saved.caseId]).then(x=>x.rows)).toHaveLength(0);
    expect(await client.query("select id from forum_complaint_appeals where case_id=$1",
      [saved.caseId]).then(x=>x.rows)).toHaveLength(0);

    const decisionId=await domain.decide(reviewOnly,{caseId:saved.caseId,expectedVersion:1,
      outcome:"not-confirmed",reasoning:"Complaint outcome is not pin",
      operationId:randomUUID()});
    const appealId=await domain.appeal(reporter,{caseId:saved.caseId,decisionId,
      operationId:randomUUID(),argument:"Appeal independent of pin"});
    await domain.resolveAppeal("appeal-reviewer",{caseId:saved.caseId,appealId,
      operationId:randomUUID(),outcome:"upheld",reasoning:"No admin action"});
    const afterModeration=await facts();
    expect(afterModeration).toEqual(afterPin);
    const participant=await domain.readOwnResult(reporter,saved.caseId);
    expect(participant).toMatchObject({outcome:"not-confirmed",effectiveOutcome:"not-confirmed",
      used:1,remaining:2});
    expect((await client.query<{n:number}>("select count(*)::int n from "+
      "forum_complaint_events where case_id=$1",[saved.caseId])).rows[0]!.n).toBe(4);
    expect((await client.query<{n:number}>("select count(*)::int n from "+
      "admin_history where target_id=$1",[topicId])).rows[0]!.n).toBe(1);
  },30000);
});

