import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresUserMeasureReader } from "../../db/user-measure-read";
import { PostgresUserMeasuresRepository, UserMeasuresService, UserMeasureNotFoundError } from "../../db/user-measures";
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
