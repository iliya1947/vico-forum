import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {RouterContextProvider} from "react-router";
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {PostgresAuthorizationRepository} from "../../db/authorization-repository";
import {createAuthorizationCapability,AuthorizationService} from "../../db/authorization-service";
import {requireAdminAccess} from "../../app/admin/access.server";
import {authSessionContext} from "../../app/auth/request-context";
import {authorizationContext} from "../../app/authorization/request-context";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL required");
const url=new URL(databaseUrl);
if(!["localhost","127.0.0.1"].includes(url.hostname)||!url.pathname.endsWith("_test"))throw new Error("Disposable local *_test DB required");
const schema="admin_overview_test",options=`-c search_path=${schema}`;
const client=new Client({connectionString:databaseUrl,options});
const pool=new Pool({connectionString:databaseUrl,options});
let clock=Date.parse("2030-01-01T00:00:00Z");
const repository=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date(clock+=1)});
const authRepository=new PostgresAuthorizationRepository(pool);
const authorization=createAuthorizationCapability(authRepository);
const management=new AuthorizationService(authRepository);
function context(actor:string){const c=new RouterContextProvider();c.set(authSessionContext,{user:{id:actor}} as never);c.set(authorizationContext,authorization as never);return c;}
beforeAll(async()=>{
 await client.connect();await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
 for(const f of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())
  await client.query((await readFile(`drizzle/${f}`,"utf8")).replaceAll('"public".',`"${schema}".`));
 for(const id of ["admin-counter-author","admin-counter-manager","admin-counter-custom"])
  await client.query('insert into "user"(id,name,email) values($1,$1,$2)',[id,`${id}@test.invalid`]);
 await client.query(`insert into authz_user_roles(user_id,role_id) values('admin-counter-manager','builtin-admin')`);
});
afterAll(async()=>{await pool.end();await client.query(`drop schema ${schema} cascade`);await client.end();});

describe("admin Overview native aggregates and admission",()=>{
 it("counts independently of capped public lists and excludes the internal service section",async()=>{
  const before=await repository.readAdminOverviewCounts();
  expect(before).toEqual({categories:1,sections:0,topics:0,posts:0});
  await repository.createCategory({id:"admin-counter-category",name:"Counter"});
  await repository.createSection({id:"admin-counter-section",categoryId:"admin-counter-category",name:"Public"});
  for(let i=0;i<105;i++)await repository.createTopicWithInitialPost({id:`admin-count-${i}`,sectionId:i===104?"help-solutions-questions":"admin-counter-section",authorId:"admin-counter-author",
   titleRevision:{id:`admin-count-title-${i}`,originalContent:"Title",sourceLocale:"en"},
   initialPost:{id:`admin-count-post-${i}`,topicId:`admin-count-${i}`,authorId:"admin-counter-author",bodyRevision:{id:`admin-count-body-${i}`,originalContent:"Body",sourceLocale:"en"}}});
  expect(await repository.readAdminOverviewCounts()).toEqual({categories:2,sections:1,topics:105,posts:105});
 });
 it("honors custom role grants and next-call allow/deny/inherit without an extra admission permission",async()=>{
  await management.createCustomRole("admin-counter-manager",{slug:"ordinary-custom-reviewer",displayName:"Unrelated role label"});
  const role=(await management.listRoles()).find(role=>role.slug==="ordinary-custom-reviewer")!;
  await management.replaceRoleGrants("admin-counter-manager",role.id,["forum.post.history.read"]);
  await management.assignUserRole("admin-counter-manager","admin-counter-custom",role.id);
  expect(await requireAdminAccess(context("admin-counter-custom"))).toEqual({canEnter:true,canReadForum:true,canManageAuthorization:false});
  await management.setUserOverride("admin-counter-manager","admin-counter-custom","forum.post.history.read","deny");
  await expect(requireAdminAccess(context("admin-counter-custom"))).rejects.toMatchObject({status:403});
  await management.setUserOverride("admin-counter-manager","admin-counter-custom","access.authorization.manage","allow");
  expect(await requireAdminAccess(context("admin-counter-custom"))).toEqual({canEnter:true,canReadForum:false,canManageAuthorization:true});
  await management.setUserOverride("admin-counter-manager","admin-counter-custom","access.authorization.manage",null);
  await management.setUserOverride("admin-counter-manager","admin-counter-custom","forum.post.history.read",null);
  expect((await requireAdminAccess(context("admin-counter-custom"))).canReadForum).toBe(true);
  await management.replaceRoleGrants("admin-counter-manager",role.id,["forum.attachmentSecurity.read","forum.helpNeedsDetails.manage"]);
  await expect(requireAdminAccess(context("admin-counter-custom"))).rejects.toMatchObject({status:403});
 });
});
