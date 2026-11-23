import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { createAuthorizationCapability, type AuthorizationCapability } from "../../db/authorization-service";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { appendStructureHistory, PostgresAdminHistoryReader } from "../../db/admin-history";
import {
  PostgresStructureWriter, StructureConflictError, StructureForbiddenError,
  StructureInvariantError, StructureNotFoundError, StructureValidationError,
} from "../../db/forum-structure";
import { HELP_SOLUTIONS_CATEGORY_ID as HELP, HELP_SOLUTIONS_SERVICE_SECTION_ID as SERVICE } from "../../db/forum-identifiers";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Structure commands require a disposable loopback *_test PostgreSQL");
}
const schema = "structure_commands_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema, max: 8 });
const authorization = createAuthorizationCapability(new PostgresAuthorizationRepository(pool, "owner"));
const writer = new PostgresStructureWriter(pool, authorization, "owner");
const current = (v = "0") => ({ expectedStructureVersion: v });
const rename = (name = "Renamed", v = "0") => ({ name, ...current(v) });
async function version() { return (await client.query("select version::text from forum_structure_state where id=1")).rows[0].version; }
async function events() { return (await new PostgresAdminHistoryReader(pool).read(undefined, 50)).events; }
async function snapshot() {
  const result: Record<string, unknown> = {};
  for (const table of ["forum_structure_state", "forum_categories", "forum_sections", "forum_topics", "forum_posts", "forum_topic_title_revisions", "forum_post_revisions", "admin_history"]) {
    result[table] = (await client.query(`select to_jsonb(t) value from ${table} t order by id`)).rows.map(r => r.value);
  }
  return result;
}
async function measure(target: string, floor = 3) {
  const id = crypto.randomUUID();
  await client.query(`insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason)
    values($1,$2,'issuer',$3,$4,'Fixture')`, [id,target,floor,"a".repeat(64)]);
  await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values($1,'admin.forum')", [id]);
  return id;
}
async function deactivate(connection: Pick<PoolClient, "query"> | Client, actor = "actor") {
  await connection.query(`update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id='issuer',
    retain_at_least_until=clock_timestamp()+interval '2 years' where id=$1`, [actor]);
}
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
/** Pause only AFTER PostgreSQL actually acquired the selected row lock. */
function gate(match: (sql: string) => boolean) {
  const acquired = deferred<number>(), release = deferred(); let paused = false;
  const gated = new Proxy(pool, {
    get(target, property) {
      if (property === "connect") return async () => {
        const connection = await target.connect();
        return new Proxy(connection, { get(c, key) {
          if (key === "query") return async (...args: unknown[]) => {
            const result = await Reflect.apply(c.query, c, args);
            const sql = typeof args[0] === "string" ? args[0] : (args[0] as { text?: string })?.text ?? "";
            if (!paused && match(sql)) {
              paused = true;
              const pid = (await c.query("select pg_backend_pid() pid")).rows[0].pid;
              acquired.resolve(pid); await release.promise;
            }
            return result;
          };
          const value = Reflect.get(c, key); return typeof value === "function" ? value.bind(c) : value;
        } });
      };
      const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { pool: gated, acquired: acquired.promise, resume: () => release.resolve() };
}
async function blockedBy(pid: number) {
  for (let i = 0; i < 300; i++) {
    const result = await client.query("select pid from pg_stat_activity where $1::integer=any(pg_blocking_pids(pid))", [pid]);
    if (result.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected real PostgreSQL row-lock blocker " + pid);
}
const actorLock = (sql: string) => /from "user"/.test(sql) && /for no key update/i.test(sql);
const sectionLock = (sql: string) => /from forum_sections/.test(sql) && /for no key update/i.test(sql);
const resultOf = <T>(p: Promise<T>) => p.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));

beforeAll(async () => {
  await client.connect();
  expect((await client.query("show server_version")).rows[0].server_version).toMatch(/^17\./);
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => { await pool.end(); await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });
beforeEach(async () => {
  await client.query(`truncate "user",forum_categories,admin_history cascade;
    update forum_structure_state set version=0 where id=1;
    insert into "user"(id,name,email) select id,id,id||'@structure.invalid'
      from unnest(array['actor','second','custom','normal','moderator','owner','issuer']) id;
    insert into authz_roles(id,slug,display_name) values('f2-custom','f2-custom','Renamed administrator') on conflict do nothing;
    delete from authz_role_permissions where role_id='f2-custom';
    insert into authz_user_roles(user_id,role_id) values ('actor','builtin-admin'),('second','builtin-admin'),
      ('moderator','builtin-moderator'),('custom','f2-custom');
    insert into forum_categories(id,name,sort_position) values ('help-solutions','Help',0),('c-a','A',0),('c-b','B',10),('c-empty','Empty',20);
    insert into forum_sections(id,category_id,name,sort_position) values
      ('help-solutions-questions','help-solutions','Questions',0),('s-a','c-a','Alpha',0),('s-b','c-a','Beta',10),('s-x','c-b','Destination sibling',5)`);
  await client.query("begin");
  await client.query(`insert into forum_topics(id,section_id,author_id,current_title_revision_id) values('topic','s-a','normal','title');
    insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values('title','topic','normal','Title','en');
    insert into forum_posts(id,topic_id,author_id,current_revision_id) values('post','topic','normal','body');
    insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale) values('body','post','normal','Body','en')`);
  await client.query("commit");
});

describe("F2 real authoritative structure commands and History", () => {
  it("creates server IDs, trims Unicode, allows duplicate display names and appends positions", async () => {
    const a = await writer.createCategory("actor", rename("  Категория עברית 🦁  "));
    expect(a).toMatchObject({ changed: true, structureVersion: "1", value: { name: "Категория עברית 🦁", sortPosition: "21" } });
    expect(a.value.id).toMatch(/^[0-9a-f-]{36}$/);
    const b = await writer.createCategory("actor", rename(a.value.name, "1"));
    expect(b.value.id).not.toBe(a.value.id); expect(b.value.sortPosition).toBe("22");
    const s = await writer.createSection("actor", "c-empty", rename("Same name", "2"));
    const t = await writer.createSection("actor", "c-empty", rename("Same name", "3"));
    expect([s.value.sortPosition,t.value.sortPosition]).toEqual(["0","1"]);
    expect(() => JSON.stringify([a,b,s,t])).not.toThrow();
    const history = await events(); expect(history).toHaveLength(4);
    expect(history.find(e => e.change.targetId === a.value.id)?.change).toMatchObject({
      action: "category.created", targetType: "category", targetLabel: a.value.name,
      context: { before: null, after: { name: a.value.name, sortPosition: "21" }, previousVersion: "0", version: "1" },
    });
    expect(history.find(e => e.change.targetId === t.value.id)?.change).toMatchObject({
      action: "section.created", context: { after: { categoryId: "c-empty", name: "Same name", sortPosition: "1" } },
    });
  });
  it("starts the first ordinary category at zero regardless of reserved Help position", async () => {
    await client.query("delete from forum_categories where id<>$1",[HELP]);
    await client.query("update forum_categories set sort_position=9223372036854775807 where id=$1",[HELP]);
    const created = await writer.createCategory("actor",rename("First ordinary"));
    expect(created.value.sortPosition).toBe("0"); expect(created.structureVersion).toBe("1");
  });
  it("reparents to an empty ordinary category at zero and leaves the source hole", async () => {
    const moved = await writer.moveSection("actor","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-empty"});
    expect(moved.value).toMatchObject({id:"s-a",categoryId:"c-empty",sortPosition:"0"});
    expect((await client.query("select sort_position::text from forum_sections where id='s-b'")).rows[0].sort_position).toBe("10");
  });
  it("uses reserved IDs, not display names, and refuses forged Help relationships", async () => {
    await writer.renameCategory("actor","c-a",rename("Help"));
    await writer.createSection("actor","c-a",rename("Questions","1"));
    await client.query("update forum_sections set category_id=$1 where id='s-a'",[HELP]);
    await expect(writer.renameSection("actor","s-a",rename("Alpha","2"))).rejects.toBeInstanceOf(StructureNotFoundError);
    await expect(writer.moveSection("actor","s-a",{...current("2"),expectedCategoryId:HELP,targetCategoryId:"c-b"})).rejects.toBeInstanceOf(StructureNotFoundError);
    expect(await version()).toBe("2"); expect(await events()).toHaveLength(2);
  });
  it("renames stable IDs without changing timestamps or subtree; no-op requires current CAS", async () => {
    const before = await snapshot();
    await writer.renameCategory("actor", "c-a", rename(" New category "));
    await writer.renameSection("actor", "s-a", rename("New section", "1"));
    const currentSnapshot = await snapshot();
    for (const table of ["forum_topics","forum_posts","forum_topic_title_revisions","forum_post_revisions"]) expect(currentSnapshot[table]).toEqual(before[table]);
    const timestamps = await client.query("select to_jsonb(created_at) created_at from forum_categories where id='c-a'");
    expect(timestamps.rows[0].created_at).toBe((before.forum_categories as { id: string; created_at: string }[]).find(r => r.id === "c-a")?.created_at);
    expect(await writer.renameCategory("actor", "c-a", rename("New category", "2"))).toMatchObject({ changed: false, structureVersion: "2" });
    expect(await writer.renameSection("actor", "s-a", rename("New section", "2"))).toMatchObject({ changed: false, structureVersion: "2" });
    await expect(writer.renameSection("actor", "s-a", rename("New section", "1"))).rejects.toMatchObject({ reason: "stale" });
    expect((await events()).map(e => e.change.action).sort()).toEqual(["category.renamed","section.renamed"]);
    expect((await events())[0].change).toMatchObject({ targetId: "s-a", context: { before: { name: "Alpha" }, after: { name: "New section" }, previousVersion: "1", version: "2" } });
  });
  it("reparents the same section and subtree to the destination tail, then admits only a fresh no-op", async () => {
    await deactivate(client,"normal"); // Content author state is irrelevant to structural authority.
    const before = await snapshot();
    const moved = await writer.moveSection("actor", "s-a", { ...current(), expectedCategoryId: "c-a", targetCategoryId: "c-b" });
    expect(moved).toMatchObject({ changed: true, value: { id: "s-a", categoryId: "c-b", sortPosition: "6" }, structureVersion: "1" });
    const after = await snapshot();
    for (const table of ["forum_topics","forum_posts","forum_topic_title_revisions","forum_post_revisions"]) expect(after[table]).toEqual(before[table]);
    expect((await events())[0].change).toMatchObject({ action: "section.moved", context: { before: { categoryId: "c-a", sortPosition: "0" }, after: { categoryId: "c-b", sortPosition: "6" } } });
    await expect(writer.moveSection("actor", "s-a", { ...current("1"), expectedCategoryId: "c-a", targetCategoryId: "c-b" })).rejects.toMatchObject({ reason: "parent-changed" });
    expect(await writer.moveSection("actor", "s-a", { ...current("1"), expectedCategoryId: "c-b", targetCategoryId: "c-b" })).toMatchObject({ changed: false });
    expect(await version()).toBe("1"); expect(await events()).toHaveLength(1);
  });
  it("uses the global adjacent category/section even among hundreds of unrelated search names", async () => {
    await client.query(`insert into forum_categories(id,name,sort_position) select 'z-'||n,'Unrelated',100+n from generate_series(1,150) n;
      insert into forum_sections(id,category_id,name,sort_position) select 'z-s-'||n,'c-a','Unrelated',100+n from generate_series(1,150) n`);
    const category = await writer.reorderCategory("actor", "z-1", { ...current(), direction: "down" });
    expect(category.value.sortPosition).toBe("102");
    expect((await events())[0].change).toMatchObject({ action: "category.reordered", context: { neighborId: "z-2", neighborBeforePosition: "102", neighborAfterPosition: "101" } });
    const section = await writer.reorderSection("actor", "z-s-1", { ...current("1"), direction: "up" });
    expect(section.value.sortPosition).toBe("10");
    expect((await events())[0].change).toMatchObject({ action: "section.reordered", context: { neighborId: "s-b", neighborBeforePosition: "10", neighborAfterPosition: "101" } });
    expect((await client.query("select sort_position::text from forum_sections where id='s-x'")).rows[0].sort_position).toBe("5");
    expect(await events()).toHaveLength(2); // One action, not one event per swapped row.
  });
  it("validates current boundary no-ops and rejects equal-position swaps without fake events", async () => {
    expect(await writer.reorderCategory("actor", "c-a", { ...current(), direction: "up" })).toMatchObject({ changed: false });
    expect(await writer.reorderSection("actor", "s-a", { ...current(), direction: "up" })).toMatchObject({ changed: false });
    await client.query("update forum_categories set sort_position=0 where id='c-b'; update forum_sections set sort_position=0 where id='s-b'");
    await expect(writer.reorderCategory("actor", "c-a", { ...current(), direction: "down" })).rejects.toMatchObject({ reason: "order-invariant" });
    await expect(writer.reorderSection("actor", "s-a", { ...current(), direction: "down" })).rejects.toMatchObject({ reason: "order-invariant" });
    expect(await version()).toBe("0"); expect(await events()).toHaveLength(0);
  });
  it("increments counters beyond Number precision, permits current no-op at max and rejects actual overflow atomically", async () => {
    await client.query("update forum_structure_state set version=9007199254740993");
    expect((await writer.renameCategory("actor", "c-a", rename("Exact", "9007199254740993"))).structureVersion).toBe("9007199254740994");
    await client.query("update forum_structure_state set version=9223372036854775807");
    const before = await snapshot();
    expect((await writer.renameCategory("actor", "c-a", rename("Exact", "9223372036854775807"))).changed).toBe(false);
    await expect(writer.renameCategory("actor", "c-a", rename("Overflow", "9223372036854775807"))).rejects.toMatchObject({ reason: "version-exhausted" });
    expect(await snapshot()).toEqual(before);
  });
  it("rejects exhausted append positions for category create, section create and reparent", async () => {
    await client.query("update forum_categories set sort_position=9223372036854775807 where id='c-b'; update forum_sections set sort_position=9223372036854775807 where id='s-x'");
    const before = await snapshot();
    await expect(writer.createCategory("actor", rename())).rejects.toMatchObject({ reason: "position-exhausted" });
    await expect(writer.createSection("actor", "c-b", rename())).rejects.toMatchObject({ reason: "position-exhausted" });
    await expect(writer.moveSection("actor", "s-a", { ...current(), expectedCategoryId: "c-a", targetCategoryId: "c-b" })).rejects.toMatchObject({ reason: "position-exhausted" });
    expect(await snapshot()).toEqual(before);
  });
  it("rejects missing/reserved containers and malformed payloads even on desired-state no-ops", async () => {
    const before = await snapshot();
    for (const id of [HELP,"absent"]) {
      await expect(writer.renameCategory("actor", id, rename("Help"))).rejects.toBeInstanceOf(StructureNotFoundError);
      await expect(writer.reorderCategory("actor", id, { ...current(), direction: "up" })).rejects.toBeInstanceOf(StructureNotFoundError);
      await expect(writer.createSection("actor", id, rename())).rejects.toBeInstanceOf(StructureNotFoundError);
      await expect(writer.moveSection("actor", "s-a", { ...current(), expectedCategoryId: "c-a", targetCategoryId: id })).rejects.toBeInstanceOf(StructureNotFoundError);
    }
    for (const id of [SERVICE,"absent"]) {
      await expect(writer.renameSection("actor", id, rename("Questions"))).rejects.toBeInstanceOf(StructureNotFoundError);
      await expect(writer.reorderSection("actor", id, { ...current(), direction: "up" })).rejects.toBeInstanceOf(StructureNotFoundError);
      await expect(writer.moveSection("actor", id, { ...current(), expectedCategoryId: HELP, targetCategoryId: HELP })).rejects.toBeInstanceOf(StructureNotFoundError);
    }
    await expect(writer.createCategory("actor", rename("\nBad"))).rejects.toBeInstanceOf(StructureValidationError);
    await expect(writer.reorderCategory("actor", "c-a", { ...current(), direction: "sideways" as never })).rejects.toBeInstanceOf(StructureValidationError);
    await expect(writer.renameCategory("actor", "c-a", rename("A", "00"))).rejects.toBeInstanceOf(StructureValidationError);
    expect(await snapshot()).toEqual(before);
  });
  it("requires the exact permission, respects role/override revocation and admits the bound Owner", async () => {
    for (const actor of ["normal","moderator","custom"]) await expect(writer.renameCategory(actor,"c-a",rename())).rejects.toBeInstanceOf(StructureForbiddenError);
    await client.query("insert into authz_role_permissions(role_id,permission_key) values('f2-custom','forum.structure.manage')");
    await writer.renameCategory("custom", "c-a", rename("Allowed"));
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('custom','forum.structure.manage','deny')");
    await expect(writer.renameCategory("custom","c-a",rename("Denied","1"))).rejects.toBeInstanceOf(StructureForbiddenError);
    await client.query("delete from authz_role_permissions where role_id='f2-custom'; update authz_user_permission_overrides set effect='allow' where user_id='custom'");
    await writer.renameCategory("custom", "c-a", rename("Override", "1"));
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('owner','forum.structure.manage','deny')");
    await writer.renameCategory("owner", "c-a", rename("Owner", "2"));
    expect(await version()).toBe("3");
  });
  it("applies AP-10 floor, expiration and Owner immunity using transaction-local policy including no-op", async () => {
    const id = await measure("actor");
    await expect(writer.renameCategory("actor","c-a",rename("A"))).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await version()).toBe("0");
    await client.query("update user_measures set issuer_authority_floor=1 where id=$1",[id]);
    await writer.renameCategory("actor","c-a",rename("Equal floor allowed"));
    await client.query("update user_measures set issuer_authority_floor=3,expires_at=clock_timestamp()-interval '1 second' where id=$1",[id]);
    await writer.renameCategory("actor","c-a",rename("Expired allowed","1"));
    await measure("owner");
    await writer.renameCategory("owner","c-a",rename("Owner allowed","2"));
    expect(await version()).toBe("3");
  });
  it("does not accept a fabricated request capability as database authority, or missing/inactive actors", async () => {
    const hints = { forUser: () => ({ has: async () => true }) } as unknown as AuthorizationCapability;
    const guarded = new PostgresStructureWriter(pool,hints,"owner");
    await expect(guarded.renameCategory("normal","c-a",rename("A"))).rejects.toBeInstanceOf(StructureForbiddenError);
    await expect(guarded.renameCategory("missing","c-a",rename("A"))).rejects.toBeInstanceOf(AccountMissingError);
    await deactivate(client);
    await expect(guarded.renameCategory("actor","c-a",rename("A"))).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await version()).toBe("0"); expect(await events()).toHaveLength(0);
  });
  it("fails closed on a missing singleton without synthesizing a new global state", async () => {
    await client.query("delete from forum_structure_state");
    try { await expect(writer.createCategory("actor",rename())).rejects.toBeInstanceOf(StructureInvariantError); }
    finally { await client.query("insert into forum_structure_state(id,version) values(1,0)"); }
    expect(await events()).toHaveLength(0);
  });
  it.each(["category.create","category.rename","category.reorder","section.create","section.rename","section.reorder","section.move"])("rolls back every domain/version effect on %s History failure", async operation => {
    await client.query(`create function reject_f2_history() returns trigger language plpgsql as $$ begin raise exception 'F2 synthetic History failure'; end $$;
      create trigger reject_f2_history before insert on admin_history for each row execute function reject_f2_history()`);
    const before = await snapshot();
    const commands: Record<string, () => Promise<unknown>> = {
      "category.create": () => writer.createCategory("actor",rename()),
      "category.rename": () => writer.renameCategory("actor","c-a",rename()),
      "category.reorder": () => writer.reorderCategory("actor","c-a",{...current(),direction:"down"}),
      "section.create": () => writer.createSection("actor","c-a",rename()),
      "section.rename": () => writer.renameSection("actor","s-a",rename()),
      "section.reorder": () => writer.reorderSection("actor","s-a",{...current(),direction:"down"}),
      "section.move": () => writer.moveSection("actor","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-b"}),
    };
    try { await expect(commands[operation]()).rejects.toThrow("F2 synthetic History failure"); expect(await snapshot()).toEqual(before); }
    finally { await client.query("drop trigger reject_f2_history on admin_history; drop function reject_f2_history()"); }
  });
  it("executes every F2 command through the exact web role without DELETE, singleton INSERT or DDL", async () => {
    const { runtimeCapabilityContracts }: { runtimeCapabilityContracts: { web: { relations: Record<string, readonly string[]> } } } =
      await import(new URL("../../.github/scripts/runtime-privileges.mjs", import.meta.url).href);
    const role = "f2_web_" + crypto.randomUUID().replaceAll("-", "");
    await client.query(`create role ${role} nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls`);
    await client.query(`grant usage on schema ${schema} to ${role}`);
    for (const [table,privileges] of Object.entries(runtimeCapabilityContracts.web.relations)) {
      await client.query(`grant ${privileges.join(",")} on ${schema}."${table}" to ${role}`);
    }
    const web = new Pool({ connectionString:url,options:`-c search_path=${schema} -c role=${role}`,max:1 });
    try {
      expect((await web.query("select current_user role")).rows[0].role).toBe(role);
      const auth = createAuthorizationCapability(new PostgresAuthorizationRepository(web,"owner"));
      const commands = new PostgresStructureWriter(web,auth,"owner");
      const a = await commands.createCategory("actor",rename("Web"));
      await commands.renameCategory("actor",a.value.id,rename("Web renamed","1"));
      await commands.reorderCategory("actor",a.value.id,{...current("2"),direction:"up"});
      const b = await commands.createSection("actor","c-a",rename("Web section","3"));
      await commands.renameSection("actor",b.value.id,rename("Web renamed section","4"));
      await commands.reorderSection("actor",b.value.id,{...current("5"),direction:"up"});
      await commands.moveSection("actor",b.value.id,{...current("6"),expectedCategoryId:"c-a",targetCategoryId:"c-b"});
      expect(await version()).toBe("7"); expect(await events()).toHaveLength(7);
      for (const table of ["forum_categories","forum_sections","forum_structure_state"])
        await expect(web.query(`delete from ${table} where false`)).rejects.toMatchObject({code:"42501"});
      await expect(web.query("insert into forum_structure_state(id) select 1 where false")).rejects.toMatchObject({code:"42501"});
      await expect(web.query("create table forbidden_f2_probe(id integer)")).rejects.toMatchObject({code:"42501"});
    } finally {
      await web.end(); await client.query(`drop owned by ${role}; drop role ${role}`);
    }
  });
  it("bounds legacy name snapshots and cannot read a topic title while appending a structural fact", async () => {
    await client.query("update forum_categories set name=$1 where id='c-a'",["🦁".repeat(10000)]);
    await writer.renameCategory("actor","c-a",rename("Short"));
    const change = (await events())[0].change;
    expect(change).toMatchObject({ action:"category.renamed", context:{ before:{name:"🦁".repeat(200)}, after:{name:"Short"} } });
    // The shared producer also enforces neutral labeling for its future topic-move caller.
    const c = await pool.connect();
    try {
      await c.query("begin");
      await appendStructureHistory(c,"actor",{ action:"topic.moved",targetType:"topic",targetId:"nonexistent-topic",targetLabel:"Never read source",
        context:{ previousVersion:"0",version:"1",before:{categoryId:"c-a",categoryName:"A",sectionId:"s-a",sectionName:"Alpha"},
          after:{categoryId:"c-b",categoryName:"B",sectionId:"s-x",sectionName:"Destination"} } });
      expect((await c.query("select target_label from admin_history where action='topic.moved'")).rows[0].target_label).toBe("topic:nonexistent-topic");
    } finally { await c.query("rollback"); c.release(); }
  });
});

describe("F2 actual PostgreSQL row-lock concurrency", () => {
  it("serializes writers with one global expected version; the loser is stale without a second event", async () => {
    const first = gate(sql => /from forum_structure_state/.test(sql) && /for update/.test(sql));
    const command = new PostgresStructureWriter(first.pool,authorization,"owner");
    const one = resultOf(command.renameCategory("actor","c-a",rename()));
    const pid = await first.acquired;
    const two = resultOf(writer.moveSection("second","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-b"}));
    try { await blockedBy(pid); } finally { first.resume(); }
    expect((await one).error).toBeUndefined(); expect((await two).error).toBeInstanceOf(StructureConflictError);
    expect(await version()).toBe("1"); expect(await events()).toHaveLength(1);
  });
  it.each(["create","reorder","reparent"])("serializes %s against an unrelated rename with the same global CAS", async kind => {
    const first = gate(sql => /from forum_structure_state/.test(sql) && /for update/.test(sql));
    const commands = new PostgresStructureWriter(first.pool,authorization,"owner");
    const one = resultOf(kind === "create" ? commands.createSection("actor","c-a",rename())
      : kind === "reorder" ? commands.reorderSection("actor","s-a",{...current(),direction:"down"})
      : commands.moveSection("actor","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-b"}));
    const pid = await first.acquired;
    const two = resultOf(writer.renameCategory("second","c-b",rename()));
    try { await blockedBy(pid); } finally { first.resume(); }
    expect((await one).error).toBeUndefined(); expect((await two).error).toBeInstanceOf(StructureConflictError);
    expect(await version()).toBe("1"); expect(await events()).toHaveLength(1);
  });
  it.each(["revoke","measure"])("rechecks %s after domain locks instead of trusting earlier request admission", async kind => {
    const first = gate(sectionLock);
    const command = resultOf(new PostgresStructureWriter(first.pool,authorization,"owner").renameSection("actor","s-a",rename()));
    await first.acquired;
    try {
      if (kind === "measure") await measure("actor");
      else await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('actor','forum.structure.manage','deny')");
    } finally { first.resume(); }
    expect((await command).error).toBeInstanceOf(kind === "measure" ? UserMeasureRestrictedError : StructureForbiddenError);
    expect(await version()).toBe("0"); expect(await events()).toHaveLength(0);
  });
  it.each([false,true])("deactivation committed first denies effect/no-op=%s under actual actor row wait", async noop => {
    await client.query("begin"); await deactivate(client);
    const pid = (await client.query("select pg_backend_pid() pid")).rows[0].pid;
    const command = resultOf(writer.renameCategory("actor","c-a",rename(noop?"A":"Changed")));
    try { await blockedBy(pid); } finally { await client.query("commit"); }
    expect((await command).error).toBeInstanceOf(AccountInactiveError);
    expect(await version()).toBe("0"); expect(await events()).toHaveLength(0);
  });
  it.each([false,true])("admission first holds actor through effect/no-op=%s commit before deactivation", async noop => {
    const first = gate(actorLock);
    const command = resultOf(new PostgresStructureWriter(first.pool,authorization,"owner").renameCategory("actor","c-a",rename(noop?"A":"Changed")));
    const pid = await first.acquired;
    const c = await pool.connect();
    const deactivation = resultOf(deactivate(c));
    try { await blockedBy(pid); } finally { first.resume(); }
    expect((await command).error).toBeUndefined(); expect((await deactivation).error).toBeUndefined(); c.release();
    expect(await version()).toBe(noop?"0":"1"); expect(await events()).toHaveLength(noop?0:1);
    await expect(writer.renameCategory("actor","c-a",rename("Next",noop?"0":"1"))).rejects.toBeInstanceOf(AccountInactiveError);
  });
  it("keeps section NO KEY UPDATE compatible with publication FK KEY SHARE while structure waits on the same actor", async () => {
    const structure = gate(sectionLock), publication = gate(actorLock);
    const moved = resultOf(new PostgresStructureWriter(structure.pool,authorization,"owner").moveSection("actor","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-b"}));
    await structure.acquired;
    const forum = new DrizzleForumRepository(drizzle(publication.pool),{cooldownMs:0,now:()=>new Date()});
    const published = resultOf(forum.createTopicWithInitialPost({id:"concurrent-topic",sectionId:"s-a",authorId:"actor",
      titleRevision:{id:"concurrent-title",originalContent:"Concurrent",sourceLocale:"en"},
      initialPost:{id:"concurrent-post",topicId:"concurrent-topic",authorId:"actor",bodyRevision:{id:"concurrent-body",originalContent:"Body",sourceLocale:"en"}}}));
    const publisherPid = await publication.acquired;
    structure.resume();
    try { await blockedBy(publisherPid); } finally { publication.resume(); }
    expect((await published).error).toBeUndefined(); expect((await moved).error).toBeUndefined();
    expect((await client.query("select t.section_id,s.category_id from forum_topics t join forum_sections s on s.id=t.section_id where t.id='concurrent-topic'")).rows[0]).toEqual({section_id:"s-a",category_id:"c-b"});
    expect(await events()).toHaveLength(1);
  });
  it("allows publication after a structure command has admitted the same actor and committed", async () => {
    const structure = gate(actorLock);
    const moved = resultOf(new PostgresStructureWriter(structure.pool,authorization,"owner").moveSection("actor","s-a",{...current(),expectedCategoryId:"c-a",targetCategoryId:"c-b"}));
    const pid = await structure.acquired;
    const forum = new DrizzleForumRepository(drizzle(pool),{cooldownMs:0,now:()=>new Date()});
    const published = resultOf(forum.createTopicWithInitialPost({id:"after-topic",sectionId:"s-a",authorId:"actor",
      titleRevision:{id:"after-title",originalContent:"After",sourceLocale:"en"},
      initialPost:{id:"after-post",topicId:"after-topic",authorId:"actor",bodyRevision:{id:"after-body",originalContent:"Body",sourceLocale:"en"}}}));
    try { await blockedBy(pid); } finally { structure.resume(); }
    expect((await moved).error).toBeUndefined(); expect((await published).error).toBeUndefined();
    expect((await client.query("select category_id from forum_sections where id='s-a'")).rows[0].category_id).toBe("c-b");
  });
});
