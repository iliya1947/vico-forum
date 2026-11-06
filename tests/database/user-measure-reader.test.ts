import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresUserMeasureReader } from "../../db/user-measure-read";
import { PostgresUserMeasuresRepository, UserMeasuresService, UserMeasureNotFoundError, UserMeasureConflictError } from "../../db/user-measures";
import { UserMeasureConfigurationUnavailableError, UserMeasureForbiddenError } from "../../db/user-measure-authority";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";

const url=process.env.DATABASE_URL;
if (!url || !["localhost","127.0.0.1"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema="ap10_reader_privacy_test";
const client=new Client({connectionString:url,options:"-c search_path="+schema});
const pool=new Pool({connectionString:url,options:"-c search_path="+schema,max:3});
const writer=new UserMeasuresService(new PostgresUserMeasuresRepository(pool,"owner"));
const reader=new PostgresUserMeasureReader(pool,"owner");
const ownReader=new PostgresUserMeasureReader(pool,undefined);
const manager="moderator";
const owner="owner";
const subject="subject";
const other="other";
const reason="Conduct notice";
const uuid=()=>randomUUID();
async function create(targetUserId=subject) {
  return writer.create({id:uuid(),actorId:manager,targetUserId,
    reason,restrictions:["replies.create"],expiresAt:null});
}
beforeAll(async()=>{
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  for (const file of (await readdir("drizzle")).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('owner','Owner confidential','owner-secret@example.invalid'),
    ('moderator','Reviewer confidential','reviewer-secret@example.invalid'),
    ('subject','Subject public','subject-secret@example.invalid'),
    ('other','Other','other-secret@example.invalid')`);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect) values
    ('moderator','admin.users.blocks.manage','allow'),
    ('owner','admin.users.blocks.manage','allow')`);
});
beforeEach(async()=>{
  await client.query("delete from user_measure_appeals");
  await client.query("delete from user_measure_restrictions");
  await client.query("delete from user_measures");
  await client.query("delete from admin_history where target_type='user-measure'");
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
    values('moderator','admin.users.blocks.manage','allow')
    on conflict(user_id,permission_key) do update set effect='allow'`);
});
afterAll(async()=>{
  await pool.end();
  await client.query("drop schema if exists "+schema+" cascade");
  await client.end();
});

describe("AP-10 purpose-limited own/admin measure read (PostgreSQL 17)",()=>{
  it("requires exact subject identity and serializes no actor, reviewer, email, rank or raw History context", async()=>{
    const first=await create();
    await writer.submitAppeal({id:uuid(),measureId:first.id,actorId:subject,body:"Please reconsider"});
    const appeal=await reader.ownDetail(subject,first.id);
    await writer.resolveAppeal({measureId:first.id,appealId:appeal.appeals[0].id,operationId:uuid(),
      actorId:manager,expectedVersion:1,outcome:"rejected",remedy:null,explanation:"Review complete",
      restrictions:null,expiresAt:null});
    const own=await reader.ownDetail(subject,first.id);
    expect(own.appeals[0]).toMatchObject({ordinal:1,status:"rejected",explanation:"Review complete"});
    expect(own.timeline.map(event=>event.action))
      .toEqual(["measure.created","measure.appealResolved"]);
    expect(own.timeline[1].outcome).toBe("rejected");
    const serialized=JSON.stringify({own,all:await reader.ownList(subject)});
    for(const secret of ["Reviewer confidential","Owner confidential","reviewer-secret@example.invalid",
      "owner-secret@example.invalid", '"actorId"', '"actor_id"', '"actorLabel"',
      '"reviewerUserId"', '"reviewer_user_id"', '"issuerUserId"', '"issuer_authority_floor"',
      '"targetUserId"', '"context"']) {
      expect(serialized).not.toContain(secret);
    }
    await expect(reader.ownDetail(other,first.id)).rejects.toBeInstanceOf(UserMeasureNotFoundError);
    expect(await reader.ownList(other)).toEqual([]);
    expect((await ownReader.ownDetail(subject,first.id)).id).toBe(first.id);
  });

  it("admits explicit blocks.manage for exact target but grants no directory role or owner shortcut",async()=>{
    const grant=new PostgresAuthorizationRepository(pool,"owner");
    expect((await grant.resolveUser(manager)).effectivePermissions)
      .not.toContain("admin.users.read");
    const first=await create();
    const target=await reader.adminTarget(manager,subject);
    expect(target).toMatchObject({id:subject,name:"Subject public"});
    expect(target.measures.map(m=>m.id)).toEqual([first.id]);
    expect((await reader.adminDetail(manager,first.id)).targetUserId).toBe(subject);
    await expect(reader.adminTarget(manager,owner)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(reader.adminTarget(manager,manager)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(ownReader.adminTarget(manager,subject))
      .rejects.toBeInstanceOf(UserMeasureConfigurationUnavailableError);
    await client.query(`delete from authz_user_permission_overrides
      where user_id='moderator' and permission_key='admin.users.blocks.manage'`);
    await expect(reader.adminTarget(manager,subject)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(reader.adminDetail(manager,first.id)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    expect((await reader.ownDetail(subject,first.id)).status).toBe("active");
  });

  it("discovers only live pending appeals within raw target and issuer-floor authority",async()=>{
    const ordinary=await create(subject);
    const second=await create(other);
    const ownerIssued=await writer.create({
      id:uuid(),actorId:owner,targetUserId:subject,
      reason:"Owner-only review",restrictions:["replies.create"],expiresAt:null,
    });
    const privileged=await writer.create({
      id:uuid(),actorId:owner,targetUserId:manager,
      reason:"Privileged target",restrictions:["replies.create"],expiresAt:null,
    });
    const ids=[ordinary.id,second.id,ownerIssued.id,privileged.id];
    for(const [index,id] of ids.entries()) {
      await writer.submitAppeal({id:uuid(),measureId:id,
        actorId:index===1?other:index===3?manager:subject,body:"Review request"});
    }
    const normal=await reader.adminPendingAppeals(manager);
    expect(normal.appeals).toHaveLength(2);
    expect(new Set(normal.appeals.map(appeal=>appeal.measureId)))
      .toEqual(new Set([ordinary.id,second.id]));
    expect(normal.appeals.every(appeal=>
      appeal.targetUserId!=="moderator" && appeal.targetName!=="Reviewer confidential")).toBe(true);
    expect(JSON.stringify(normal)).not.toContain("Owner confidential");
    expect(JSON.stringify(normal)).not.toContain("Owner-only review");
    expect(normal.nextPage).toBeNull();
    const ownerQueue=await reader.adminPendingAppeals(owner);
    expect(new Set(ownerQueue.appeals.map(appeal=>appeal.measureId))).toEqual(new Set(ids));
    expect(await reader.adminPendingAppeals(manager,1)).toMatchObject({appeals:[],nextPage:null});
    await expect(reader.adminPendingAppeals(manager,-1)).rejects.toBeInstanceOf(UserMeasureConflictError);
    await client.query(`update user_measures set expires_at=clock_timestamp()-interval '1 second'
      where id=$1`,[ordinary.id]);
    expect((await reader.adminPendingAppeals(manager)).appeals.map(item=>item.measureId))
      .toEqual([second.id]);
    await client.query(`delete from authz_user_permission_overrides
      where user_id='moderator' and permission_key='admin.users.blocks.manage'`);
    await expect(reader.adminPendingAppeals(manager)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    expect((await reader.ownDetail(subject,ordinary.id)).pendingAppeal).toBe(false);
  });

  it("projects only enabled active child keys for an exact subject, without private measure data",async()=>{
    const first=await create(subject);
    const second=await create(subject);
    const otherMeasure=await create(other);
    const initial=await reader.activeRestrictions(subject);
    expect(initial).toEqual(["replies.create"]);
    const serialized=JSON.stringify(initial);
    expect(serialized).not.toContain("Conduct notice");
    expect(serialized).not.toContain(manager);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1",[first.id]);
    expect(await reader.activeRestrictions(subject)).toEqual(["replies.create"]);
    await client.query("update user_measures set expires_at=clock_timestamp()-interval '1 second' where id=$1",[second.id]);
    expect(await reader.activeRestrictions(subject)).toEqual([]);
    expect(await reader.activeRestrictions(other)).toEqual(["replies.create"]);
    await client.query("update user_measures set lifted_at=clock_timestamp(), lifted_by_user_id=$2, lift_reason=$3 where id=$1",[otherMeasure.id,manager,"Completed"]);
    expect(await reader.activeRestrictions(other)).toEqual([]);
    expect(await reader.activeRestrictions(owner)).toEqual([]);
  });

  it("derives effective pending=moot on expiry without a write or History event",async()=>{
    const first=await create();
    await writer.submitAppeal({id:uuid(),measureId:first.id,actorId:subject,body:"Please review"});
    const previous=(await client.query(`select count(*)::int as c from admin_history
      where target_id=$1`,[first.id])).rows[0].c;
    await client.query(`update user_measures set expires_at=clock_timestamp()-interval '1 second'
      where id=$1`,[first.id]);
    const result=await reader.ownDetail(subject,first.id);
    expect(result.status).toBe("expired");
    expect(result.pendingAppeal).toBe(false);
    expect(result.appeals[0].status).toBe("moot");
    expect((await client.query("select status from user_measure_appeals where measure_id=$1",[first.id])).rows)
      .toEqual([{status:"pending"}]);
    expect((await client.query(`select count(*)::int as c from admin_history
      where target_id=$1`,[first.id])).rows[0].c).toBe(previous);
  });
});
