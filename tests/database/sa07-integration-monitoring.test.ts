import { markVerifiedCredentialFixture } from "./verified-credential-fixture";
import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,beforeEach,afterAll,it,expect,vi} from "vitest";
import {PostgresOwnerIntegrationMonitoring} from "../../db/owner-integration-monitoring";
import {PostgresOwnerSystemMonitoring} from "../../db/owner-system-monitoring";
import {PostgresOwnerSa02History} from "../../db/owner-sa02-history";
import {PostgresOwnerUserHistory} from "../../db/owner-user-history";
import {PostgresOwnerStorageObservations} from "../../db/owner-storage-observations";
import {PostgresOwnerOperationalFactSink} from "../../db/owner-operational-facts";
import {PostgresAuthFactWriter,type AuthTransitionFact} from "../../db/owner-auth-facts";
import {DrizzleTranslationTaskStore} from "../../db/translation-task-store";
import {OperationalFactBuffer,OperationalProviderCalls} from "../../app/observability/operational-facts";
import {observeRequiredLocalizationRead,googleParametersPresent,type IntegrationRuntimeFacts} from "../../app/observability/integration-runtime";
import {loadPersistentRegistry} from "../../app/localization/persistent-registry";
import {createHyperdriveRegistryLoader} from "../../db/hyperdrive-registry";
import {createAuth} from "../../app/auth/auth.server";
import {AuthCreationEvidence} from "../../app/auth/auth-creation-evidence";
import {account} from "../../db/schema";
import {canonicalEnglishCatalog} from "../../app/localization/catalog";
import {sourceFingerprint} from "../../app/localization/fingerprint";
import {uiTranslationJobIdentity} from "../../app/localization/ui-translation-service";

const url=process.env.DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith('_test'))throw Error('Local disposable PG17 required');
const schema='sa07_integration_monitoring_test',options='-c search_path='+schema,c=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:4});
const db=drizzle(c),owner='sa07i-owner',system=new PostgresOwnerSystemMonitoring(pool,'test'),history=new PostgresOwnerSa02History(pool);
const runtime:IntegrationRuntimeFacts={webBindingPresent:true,localizationBindingPresent:true,googleParametersPresent:false,bucketBound:false,generationEnabled:false,generationAdmissionWired:true,providerWired:false,enqueuerWired:false,consumerWired:false};
const emptyLocalization=()=>null;
const reader=(config=runtime,readSystem=()=>system.readSystem(),local=emptyLocalization)=>new PostgresOwnerIntegrationMonitoring(pool,readSystem,config,local);
beforeAll(async()=>{await c.connect();await c.query('drop schema if exists '+schema+' cascade;create schema '+schema);for(const name of(await readdir('drizzle')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())await c.query((await readFile('drizzle/'+name,'utf8')).replaceAll('"public".','"'+schema+'".'));});
beforeEach(async()=>{await c.query('truncate "user",translation_tasks,translation_task_generation_heads,owner_events,owner_monitor_observations,owner_attempt_patterns,owner_attempt_telemetry_state cascade');await c.query('insert into "user"(id,name,email) values($1,$1,$1||\'@test.invalid\')',[owner]);});
afterAll(async()=>{await pool.end();await c.query('drop schema if exists '+schema+' cascade');await c.end();});
it('uses the existing System reader exactly once, preserves its original sample and leaves all13 storage slots unmeasured',async()=>{
  const readSystem=vi.fn(()=>system.readSystem()),s=await reader(runtime,readSystem).readCurrent();expect(readSystem).toHaveBeenCalledOnce();
  expect(s.database).toMatchObject({source:'existing-system-dependency-reader',quality:'measured',values:{state:'available'}});
  const original=(await c.query("select id from owner_monitor_observations where monitor_key='system.dependencies' and resource_scope='global'")).rows[0].id;
  expect(s.database.retainedSample?.id).toBe(original);expect(s.requiredLocalizationRead).toBeNull();expect(s.storageSamples).toHaveLength(13);expect(s.storageSamples.every(v=>v.sample===null)).toBe(true);
  expect(s.monitors.every(m=>m.source==='application'&&m.recording==='available')).toBe(true);
  expect((await c.query("select count(*)::text n from owner_monitor_observations where resource_scope like 'storage:%'")).rows[0].n).toBe('0');
  const scoped=await history.readTimeline({monitorKey:'integrations.database'}),native=await history.readTimeline({monitorKey:'system.dependencies'}),all=await history.readTimeline();
  expect(scoped.entries.some(e=>e.id===original)).toBe(true);expect(native.entries.some(e=>e.id===original)).toBe(true);expect(all.entries.filter(e=>e.id===original)).toHaveLength(1);
});
it("retains distinct observed authentication mail outcomes by closed purpose", async () => {
  const buffer = new OperationalFactBuffer(new PostgresOwnerOperationalFactSink(pool));
  for (const mailPurpose of ["email-verification", "password-reset", "password-create"] as const) {
    buffer.captureAuthMail(crypto.randomUUID(), "2026-11-25T00:00:00.123000Z", {
      mailPurpose, mailTransport: "fake", mailOutcome: mailPurpose === "password-create" ? "uncertain" : "accepted",
    });
  }
  await buffer.flush();
  const current = (await reader().readCurrent()).authentication;
  expect(current.verificationMail?.values).toMatchObject({ mailPurpose: "email-verification", mailOutcome: "accepted" });
  expect(current.passwordResetMail?.values).toMatchObject({ mailPurpose: "password-reset", mailOutcome: "accepted" });
  expect(current.passwordCreateMail?.values).toMatchObject({ mailPurpose: "password-create", mailOutcome: "uncertain" });
  const scoped = await history.readTimeline({ monitorKey: "integrations.authentication", kind: "integration.authMailOutcome" });
  expect(scoped.entries.map(entry => entry.values.mailPurpose).sort()).toEqual(["email-verification", "password-create", "password-reset"]);
});
it('does not use web success as localization health or invoke the required loader again',async()=>{
  const load=vi.fn(createHyperdriveRegistryLoader('postgresql://postgres:postgres@127.0.0.1:9/vico_integration_test',undefined,()=>undefined)),observed=observeRequiredLocalizationRead(load);
  await observed.load();expect(load).toHaveBeenCalledOnce();const s=await new PostgresOwnerIntegrationMonitoring(pool,()=>system.readSystem(),runtime,observed.current).readCurrent();
  expect(load).toHaveBeenCalledOnce();expect(s.database.quality).toBe('measured');expect(s.requiredLocalizationRead).toMatchObject({quality:'unavailable',outcome:'dependency-unavailable'});
  expect(s.monitors.find(m=>m.key==='integrations.database')?.values.requiredLocalizationQuality).toBe('unavailable');
});
it('reports validated required-read provenance without copying registry data or adding another read',async()=>{
  const loaded=await loadPersistentRegistry({readAll:async()=>[]}),load=vi.fn(async()=>loaded),observed=observeRequiredLocalizationRead(load);await observed.load();
  const s=await new PostgresOwnerIntegrationMonitoring(pool,()=>system.readSystem(),runtime,observed.current).readCurrent();
  expect(load).toHaveBeenCalledOnce();expect(s.requiredLocalizationRead).toMatchObject({outcome:'valid-registry-returned',phase:'read-and-validation'});expect(JSON.stringify(s)).not.toContain('semanticIdentity');
});
it('keeps real password session creation generic for a dual-method account and preserves the Google link fact identity',async()=>{
  const env={BETTER_AUTH_SECRET:'SA07_I_PRIVATE_SECRET_0123456789abcdef0123456789abcdef',BETTER_AUTH_URL:'http://localhost:3000',GOOGLE_CLIENT_ID:'SA07_I_PRIVATE_GOOGLE_ID',GOOGLE_CLIENT_SECRET:'SA07_I_PRIVATE_GOOGLE_SECRET'};
  const captured:Array<{fact:AuthTransitionFact;at:Date}>=[],capture=(fact:AuthTransitionFact,at=new Date())=>{captured.push({fact,at});},writer=new PostgresAuthFactWriter(pool);
  const auth=createAuth(db,env,undefined,undefined,undefined,{capture,trustedActorFor:()=>null}),email='dual-'+crypto.randomUUID()+'@test.invalid',password='Native-password-only-12345';
  const signed=await auth.api.signUpEmail({body:{name:'Dual method',email,password}});
  expect(signed).toEqual({status:true,token:null});
  const member=await markVerifiedCredentialFixture(c,email);
  expect((await auth.api.signInEmail({body:{email,password}})).user.id).toBe(member);
  async function flush(){for(const {fact,at}of captured.splice(0))await writer.append(fact,at);}
  await flush();const googleId=crypto.randomUUID();
  await db.insert(account).values({id:googleId,userId:member,accountId:'SA07_I_PRIVATE_EXTERNAL_ACCOUNT',providerId:'google'});
  // Existing bounded adapter-confirmation proof verifies the committed native
  // method row. This local fixture does not simulate Google callback/login.
  const proof=new AuthCreationEvidence(db,capture,()=>null,()=>undefined);proof.noteAdapterCreate({model:'account'},{id:googleId,userId:member,providerId:'google'});await proof.flush();await flush();
  const before=await reader({...runtime,googleParametersPresent:googleParametersPresent(env)}).readCurrent(),google=before.authentication.googleMethodLink!;expect(google).not.toBeNull();
  const login=await auth.api.signInEmail({body:{email,password}});expect(login.user.id).toBe(member);await flush();
  const s=await reader({...runtime,googleParametersPresent:true}).readCurrent();expect(s.authentication.values).toMatchObject({googleLinkedUsers:'1',googleMethodLinkFacts:'1',genericSessionCreatedFacts:'2'});
  expect(s.authentication.googleMethodLink?.id).toBe(google.id);expect(s.authentication.genericSession).toMatchObject({kind:'auth.sessionCreated',values:{}});
  expect(s.monitors.find(m=>m.key==='integrations.authentication')?.values).toMatchObject({googleCallbackCoverageMeasured:false,genericSessionProviderKnown:false});
  expect(JSON.stringify(s)).not.toMatch(/SA07_I_PRIVATE|googleLogin|googleCallbackSuccess|access_token|refresh_token/);
  const scoped=await history.readTimeline({monitorKey:'integrations.authentication',origin:'auth-event'}),global=await history.readTimeline({origin:'auth-event'}),person=await new PostgresOwnerUserHistory(pool).readHistory(member);
  expect(scoped.entries.some(e=>e.id===google.id)).toBe(true);expect(global.entries.filter(e=>e.id===google.id)).toHaveLength(1);expect(person.entries.some(e=>e.id===google.id)).toBe(true);
});
it('shows actual local provider execution and native task failure without claiming normal runtime wiring',async()=>{
  const sink=new PostgresOwnerOperationalFactSink(pool),tasks=new DrizzleTranslationTaskStore(drizzle(pool),sink),specification={translationKind:'ui' as const,sourceIdentity:{namespace:'common',key:'heading'},sourceFingerprint:await sourceFingerprint(canonicalEnglishCatalog.common.heading),targetLocale:'fr',generationPolicyVersion:'ui-policy-v1'};
  const pending=await tasks.upsertPending({...specification,taskIdentity:await uiTranslationJobIdentity(specification)},{freshPlanning:true}),claimed=await tasks.claim(pending.id,60000);if(claimed.outcome!=='claimed')throw Error('native claim required');
  const calls=new OperationalProviderCalls(sink);calls.configure({id:pending.id,translationKind:'ui',generation:claimed.task.generation,attemptCount:claimed.task.attemptCount,claimToken:claimed.task.claimToken});
  await calls.observe(async()=>({value:'SA07_I_PRIVATE_PROVIDER_RESPONSE'}));await expect(calls.observe(async()=>{throw Error('SA07_I_PRIVATE_PROVIDER_ERROR');})).rejects.toThrow();await calls.flush();
  await tasks.recordFailure(pending.id,claimed.task.claimToken,{disposition:'terminal',code:'provider-terminal'});
  const s=await reader().readCurrent();expect(s.translation.providerExecution).toMatchObject({kind:'integration.translationCall',values:{calls:2,succeeded:1,failed:1,payloadSchemaRecognized:true}});
  expect(s.translation.taskOutcome).toMatchObject({kind:'task.failed',values:{failureCode:'provider-terminal'}});expect(s.monitors.find(m=>m.key==='integrations.translation')?.values).toMatchObject({generationEnabled:false,providerWired:false,enqueuerWired:false,consumerWired:false,codeAvailable:true});
  expect(JSON.stringify(s)).not.toMatch(/SA07_I_PRIVATE|sourceFingerprint|claimToken/);
  for(const id of [s.translation.taskOutcome!.id,s.translation.providerExecution!.id]){
    expect((await history.readTimeline({monitorKey:'integrations.translation',origin:'operational-event'})).entries.some(e=>e.id===id)).toBe(true);
    expect((await history.readTimeline({monitorKey:'background.translation',origin:'operational-event'})).entries.some(e=>e.id===id)).toBe(true);
    expect((await history.readTimeline({origin:'operational-event'})).entries.filter(e=>e.id===id)).toHaveLength(1);
  }
});
it('reuses the13 selected-call observations without re-admitting them or copying them to owner_events',async()=>{
  await new PostgresOwnerStorageObservations(pool).record([{scope:'storage:get:returned',value:{operation:'get',resultClass:'returned',category:'object-returned',phase:'rpc-return',durationMs:5,callReturnedAt:new Date().toISOString()}}]);
  const before=(await c.query("select id from owner_monitor_observations where resource_scope='storage:get:returned'")).rows[0].id,s=await reader({...runtime,bucketBound:true}).readCurrent();await reader({...runtime,bucketBound:false}).readCurrent();
  expect(s.storageSamples.find(v=>v.scope==='storage:get:returned')?.sample?.id).toBe(before);expect((await c.query("select count(*)::text n from owner_monitor_observations where resource_scope='storage:get:returned'")).rows[0].n).toBe('1');
  expect((await c.query('select count(*)::text n from owner_events')).rows[0].n).toBe('0');
  expect((await history.readTimeline({monitorKey:'integrations.storage'})).entries.some(e=>e.id===before)).toBe(true);expect((await history.readTimeline({monitorKey:'files.operations'})).entries.some(e=>e.id===before)).toBe(true);
  expect((await history.readTimeline()).entries.filter(e=>e.id===before)).toHaveLength(1);
});
it('keeps real measurements on a recorder outage without inventing a persisted outage sample',async()=>{
  await c.query("create function sa07i_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_I_PRIVATE_SQL';end$$;create trigger sa07i_sample_fault before insert on owner_monitor_observations for each row execute function sa07i_sample_fault()");
  try{const s=await reader().readCurrent();expect(s.database.quality).toBe('measured');expect(s.database.recording).toBe('unavailable');expect(s.database.retainedSample).toBeNull();expect(s.monitors.every(m=>m.recording==='unavailable')).toBe(true);expect(JSON.stringify(s)).not.toContain('SA07_I_PRIVATE_SQL');}
  finally{await c.query('drop trigger sa07i_sample_fault on owner_monitor_observations;drop function sa07i_sample_fault()');}
});
it('does not turn a generic recorded HTTP500 into an Integration database failure',async()=>{
  await system.recordRequestFailure(500,20);await reader().readCurrent();
  expect((await history.readTimeline({monitorKey:'integrations.database'})).entries.some(e=>e.kind==='system.requestFailed')).toBe(false);
  await expect(history.readTimeline({monitorKey:'integrations.database',kind:'system.requestFailed'})).rejects.toThrow();
});
it('does not expose extra runtime fields or unrecognized operational payload fields',async()=>{
  await c.query("insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,payload) values($1,clock_timestamp(),'operation',$2,'integration.translationCall','integrations.translation',$3)",[crypto.randomUUID(),'unknown-'+crypto.randomUUID(),{schemaVersion:2,taskKind:'SA07_I_PRIVATE_KIND',error:'SA07_I_PRIVATE_ERROR',endpoint:'SA07_I_PRIVATE_URL'}]);
  const s=await reader({...runtime,...{unexpectedSecret:'SA07_I_PRIVATE_ENV'}}).readCurrent();expect(s.translation.providerExecution?.values).toEqual({payloadSchemaRecognized:false});expect(JSON.stringify(s)).not.toContain('SA07_I_PRIVATE');
});
