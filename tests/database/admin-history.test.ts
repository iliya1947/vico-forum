import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {beforeAll,afterAll,describe,it,expect,vi} from "vitest";
import {PostgresAuthorizationRepository,AuthorizationLockoutError,AuthorizationForbiddenError} from "../../db/authorization-repository";
import {historyPagePath} from "../../app/admin/history-path";
import {parseHistoryCursor} from "../../app/admin/history.server";
import {PostgresAdminHistoryReader} from "../../db/admin-history";
const url=process.env.DATABASE_URL!;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema="admin_history_test";
const client=new Client({connectionString:url,options:`-c search_path=${schema}`});
const pool=new Pool({connectionString:url,options:`-c search_path=${schema}`});
const auth=new PostgresAuthorizationRepository(pool);
const reader=new PostgresAdminHistoryReader(pool);
const count=async()=>Number((await client.query("select count(*) from admin_history")).rows[0].count);
beforeAll(async()=>{
 await client.connect();await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
 for(const f of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort()) await client.query((await readFile(`drizzle/${f}`,"utf8")).replaceAll('"public".',`"${schema}".`));
 await client.query(`insert into "user"(id,name,email) values('manager','Manager','secret-manager@test.invalid'),('target','Target','secret-target@test.invalid');
 insert into authz_user_roles(user_id,role_id) values('manager','builtin-admin');
 insert into authz_user_permission_overrides(user_id,permission_key,effect) values('manager','admin.history.read','deny')`);
});
afterAll(async()=>{await pool.end();await client.query(`drop schema ${schema} cascade`);await client.end();});
describe("atomic authorization History",()=>{
 it("starts empty, grants only initial admin, records all six operations without needing read permission",async()=>{
  expect(await count()).toBe(0);
  expect((await client.query("select role_id from authz_role_permissions where permission_key='admin.history.read'")).rows).toEqual([{role_id:"builtin-admin"}]);
  await auth.createCustomRole("manager",{id:"history-role",slug:"history-role",displayName:"Before עברית"});
  await auth.renameCustomRole("manager","history-role",{displayName:"After עברית"});
  await auth.replaceRoleGrants("manager","history-role",["forum.topic.pin"]);
  await auth.assignUserRole("manager","target","builtin-moderator");
  await auth.setUserOverride("manager","target","forum.topic.pin","deny");
  await auth.deleteCustomRole("manager","history-role");
  const page=await reader.read();
  expect(page.events.map(e=>e.change.action).sort()).toEqual(["role.created","role.renamed","role.grantsChanged","user.roleAssigned","user.overrideChanged","role.deleted"].sort());
  expect(page.events.find(e=>e.change.action==="role.deleted")?.change).toMatchObject({targetId:"history-role",targetLabel:"After עברית",context:{slug:"history-role"}});
  expect(JSON.stringify(page)).not.toContain("secret-");
  expect(await auth.hasPermission("manager","admin.history.read")).toBe(false);
 });
 it("suppresses unchanged retries and rejects denied, lockout and invalid mutations without events",async()=>{
  const before=await count();
  await auth.assignUserRole("manager","target","builtin-moderator");
  await auth.setUserOverride("manager","target","forum.topic.pin","deny");
  await auth.setUserOverride("manager","target","forum.reply.create",null);
  await auth.createCustomRole("manager",{id:"retry-role",slug:"retry-role",displayName:"Retry"});
  await auth.renameCustomRole("manager","retry-role",{displayName:"Retry"});
  await auth.replaceRoleGrants("manager","retry-role",[]);
  expect(await count()).toBe(before+1);
  await auth.replaceRoleGrants("manager","retry-role",["forum.topic.pin"]);
  await auth.replaceRoleGrants("manager","retry-role",["forum.topic.pin"]);
  expect(await count()).toBe(before+2);
  await expect(auth.setUserOverride("manager","manager","access.authorization.manage","deny")).rejects.toBeInstanceOf(AuthorizationLockoutError);
  await expect(auth.createCustomRole("target",{id:"bad",slug:"bad",displayName:"bad"})).rejects.toBeInstanceOf(AuthorizationForbiddenError);
  await expect(auth.createCustomRole("manager",{id:"retry2",slug:"retry-role",displayName:"Duplicate"})).rejects.toThrow();
  expect(await count()).toBe(before+2);
  expect(await auth.hasPermission("manager","access.authorization.manage")).toBe(true);
 });
 it("rolls back the mutation when append fails, then permits one retry",async()=>{
  const before=await count();
  const previousPosition=(await client.query("select max(position)::text position from admin_history")).rows[0].position;
  await client.query(`create function reject_history() returns trigger language plpgsql as $$begin raise exception 'synthetic append failure'; end$$;
    create trigger reject_history before insert on admin_history for each row execute function reject_history()`);
  try {
   await expect(auth.renameCustomRole("manager","retry-role",{displayName:"Failed"})).rejects.toThrow("synthetic append failure");
   expect((await auth.readRole("retry-role"))?.displayName).toBe("Retry");
   expect(await count()).toBe(before);
  } finally {await client.query("drop trigger reject_history on admin_history;drop function reject_history()");}
  await auth.renameCustomRole("manager","retry-role",{displayName:"Succeeded"});
  await auth.renameCustomRole("manager","retry-role",{displayName:"Succeeded"});
  expect(await count()).toBe(before+1);
  const nextPosition=(await client.query("select max(position)::text position from admin_history")).rows[0].position;
  expect(BigInt(nextPosition)).toBeGreaterThan(BigInt(previousPosition)+1n);
 });
 it("excludes a later committed equal-time event with a lower UUID from an issued page25 cursor",async()=>{
  const fixed="2030-01-01T00:00:00.123Z";
  await client.query(`alter table admin_history alter column occurred_at set default '${fixed}'::timestamptz`);
  try {
   for(let n=0;n<30;n++)await auth.renameCustomRole("manager","retry-role",{displayName:`Page ${n}`});
   const beforeIds=(await client.query("select id from admin_history")).rows.map(r=>r.id).sort();
   const first=await reader.read();expect(first.events).toHaveLength(25);expect(first.next).not.toBeNull();
   const last=first.events.at(-1)!;
   const lowest="00000000-0000-0000-0000-000000000000";
   const random=vi.spyOn(crypto,"randomUUID").mockReturnValue(lowest);
   try{await auth.renameCustomRole("manager","retry-role",{displayName:"Late equal millisecond"});}finally{random.mockRestore();}
   const newest=(await reader.read()).events[0];
   expect(newest.id).toBe(lowest);expect(newest.id<last.id).toBe(true);expect(newest.at).toBe(last.at);
   const seen=first.events.map(e=>e.id);let next=first.next;
   while(next){
    const parsed=parseHistoryCursor("https://vico.test"+historyPagePath("he",next));
    expect(parsed).toEqual(next);
    const page=await reader.read(parsed);seen.push(...page.events.map(e=>e.id));next=page.next;
   }
   expect(new Set(seen).size).toBe(seen.length);
   expect(seen.sort()).toEqual(beforeIds);expect(seen).not.toContain(lowest);
  } finally {await client.query("alter table admin_history alter column occurred_at set default clock_timestamp()");}
 });
 it("keeps bigint positions exact through URL and PostgreSQL beyond the JS safe-integer limit",async()=>{
  await client.query("select setval(pg_get_serial_sequence('admin_history','position'), 9007199254740992, false)");
  await auth.renameCustomRole("manager","retry-role",{displayName:"Big position one"});
  await auth.renameCustomRole("manager","retry-role",{displayName:"Big position two"});
  const first=await reader.read(undefined,1);
  expect(first.next).toEqual({position:"9007199254740993"});
  const cursor=parseHistoryCursor("https://vico.test"+historyPagePath("ru",first.next));
  const older=await reader.read(cursor,1);
  expect(older.events[0].change.targetLabel).toBe("Big position one");
  expect(older.next).toEqual({position:"9007199254740992"});
 });
 it("generates an identity with SELECT/INSERT table grants and no sequence privileges",async()=>{
  const role="history_identity_probe";
  await client.query(`create role ${role} nologin;grant usage on schema ${schema} to ${role};grant select,insert on admin_history to ${role}`);
  await client.query("begin");
  try{
   await client.query(`set local role ${role}`);
   const rights=await client.query("select has_sequence_privilege(current_user,pg_get_serial_sequence('admin_history','position'),'USAGE') usage,has_sequence_privilege(current_user,pg_get_serial_sequence('admin_history','position'),'UPDATE') update");
   expect(rights.rows[0]).toEqual({usage:false,update:false});
   const sequence=await client.query("select cache_size::text,increment_by::text,cycle from pg_sequences where schemaname=$1 and sequencename='admin_history_position_seq'",[schema]);
   expect(sequence.rows[0]).toEqual({cache_size:"1",increment_by:"1",cycle:false});
   const insert=await client.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context)
    values('ffffffff-ffff-4fff-bfff-ffffffffffff','manager','Manager','role.created','role','probe','Probe','{"slug":"probe"}') returning position`);
   expect(typeof insert.rows[0].position).toBe("string");
   expect(BigInt(insert.rows[0].position)).toBeGreaterThan(0n);
   const identity=await client.query("select is_identity,identity_generation from information_schema.columns where table_schema=$1 and table_name='admin_history' and column_name='position'",[schema]);
   expect(identity.rows[0]).toEqual({is_identity:"YES",identity_generation:"ALWAYS"});
  }finally{await client.query("rollback");await client.query(`drop owned by ${role};drop role ${role}`);}
 });

});
