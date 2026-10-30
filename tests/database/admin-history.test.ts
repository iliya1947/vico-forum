import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {PostgresAuthorizationRepository,AuthorizationLockoutError,AuthorizationForbiddenError} from "../../db/authorization-repository";
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
 });
 it("pages equal timestamps by immutable UUID without duplicates; newer inserts do not shift older pages",async()=>{
  await client.query("update admin_history set occurred_at='2030-01-01T00:00:00.123Z'");
  const first=await reader.read(undefined,3);expect(first.next).not.toBeNull();
  const seen=first.events.map(e=>e.id);let next=first.next;
  await auth.renameCustomRole("manager","retry-role",{displayName:"Newer"});
  // Force this additional fixture to be newer than the fixed historical test timestamp.
  await client.query("update admin_history set occurred_at='2031-01-01' where target_label='Newer'");
  while(next){const page=await reader.read(next,3);seen.push(...page.events.map(e=>e.id));next=page.next;}
  expect(new Set(seen).size).toBe(seen.length);expect(seen.length).toBe((await count())-1);
  expect((await reader.read()).events[0].change.targetLabel).toBe("Newer");
 });
});
