import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_ROLE_GRANTS, PERMISSION_CATALOG } from "../../app/authorization/catalog";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
    || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Structure foundation tests require disposable loopback *_test PostgreSQL");
}
const schema = "structure_foundation_test";
const cleanSchema = "structure_foundation_clean_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
let files: string[];
let before: Record<string, unknown[]>;
const preservedTables = ["forum_categories", "forum_sections", "forum_topics", "forum_posts",
  "forum_topic_title_revisions", "forum_post_revisions"];
async function snapshot() {
  const result: Record<string, unknown[]> = {};
  for (const table of preservedTables) {
    result[table] = (await client.query(`select to_jsonb(t) - 'sort_position' - 'location_version' value
      from ${table} t order by id`)).rows.map(row => row.value);
  }
  return result;
}
async function apply(target: string, names: string[]) {
  await client.query('set search_path="' + target + '"');
  for (const name of names) {
    await client.query((await readFile("drizzle/" + name, "utf8"))
      .replaceAll('"public".', '"' + target + '".'));
  }
}
async function rejected(statement: string, code = "23514", values: unknown[] = []) {
  await client.query("savepoint structure_reject");
  try { await expect(client.query(statement, values)).rejects.toMatchObject({ code }); }
  finally { await client.query("rollback to savepoint structure_reject; release savepoint structure_reject"); }
}
beforeAll(async () => {
  await client.connect();
  expect((await client.query("show server_version")).rows[0].server_version).toMatch(/^17\./);
  for (const name of [schema, cleanSchema]) {
    await client.query(`drop schema if exists ${name} cascade; create schema ${name}`);
  }
  files = (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort();
  expect(files.at(-1)).toBe("0072_forum_structure_foundation.sql");
  await apply(schema, files.slice(0, -1));
  await client.query(`insert into forum_categories(id,name,created_at) values
    ('f1-cat-z','Earlier','2020-01-01'),('f1-cat-b','Tie B','2020-02-01'),('f1-cat-a','Tie A','2020-02-01');
    insert into forum_sections(id,category_id,name,created_at) values
    ('f1-sec-z','f1-cat-z','Earlier','2020-01-01'),('f1-sec-b','f1-cat-z','Tie B','2020-02-01'),
    ('f1-sec-a','f1-cat-z','Tie A','2020-02-01'),('f1-sec-other','f1-cat-b','Other parent','2019-01-01');
    insert into authz_roles(id,slug,display_name) values ('f1-custom','f1-custom','Custom');
    insert into authz_role_permissions(role_id,permission_key) values ('f1-custom','forum.topic.pin')`);
  await client.query("begin");
  await client.query(`insert into "user"(id,name,email) values ('f1-author','Author','f1-author@test.invalid');
    insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values ('f1-topic','f1-sec-z','f1-author','f1-title');
    insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      values ('f1-title','f1-topic','f1-author','Unchanged title','en');
    insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values ('f1-post','f1-topic','f1-author','f1-body');
    insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      values ('f1-body','f1-post','f1-author','Unchanged body','en')`);
  await client.query("commit");
  before = await snapshot();
  await apply(schema, files.slice(-1));
  await apply(cleanSchema, files);
  await client.query('set search_path="' + schema + '"');
}, 30_000);
afterAll(async () => {
  for (const name of [schema, cleanSchema]) await client.query(`drop schema if exists ${name} cascade`);
  await client.end();
});
beforeEach(async () => { await client.query("begin"); });
afterEach(async () => { await client.query("rollback"); });

describe("F1 clean and upgrade PostgreSQL 17 structure foundation", () => {
  it("preserves IDs, names, parents, timestamps, content and revisions without synthetic History", async () => {
    expect(await snapshot()).toEqual(before);
    expect((await client.query("select count(*)::int n from admin_history")).rows[0].n).toBe(0);
    expect((await client.query("select id,version::text from forum_structure_state")).rows).toEqual([{ id: 1, version: "0" }]);
    expect((await client.query("select location_version::text from forum_topics where id='f1-topic'")).rows[0]).toEqual({ location_version: "0" });
  });

  it("backfills distinct positions in legacy order, partitioned per parent, leaving Help reserved", async () => {
    const categories = await client.query("select id,sort_position::text from forum_categories where id<>$1 order by sort_position,id collate \"C\"", [HELP_SOLUTIONS_CATEGORY_ID]);
    expect(categories.rows).toEqual([
      { id: "f1-cat-z", sort_position: "0" }, { id: "f1-cat-a", sort_position: "1" }, { id: "f1-cat-b", sort_position: "2" },
    ]);
    expect((await client.query("select id,sort_position::text from forum_sections where category_id='f1-cat-z' order by sort_position,id collate \"C\"")).rows).toEqual([
      { id: "f1-sec-z", sort_position: "0" }, { id: "f1-sec-a", sort_position: "1" }, { id: "f1-sec-b", sort_position: "2" },
    ]);
    expect((await client.query("select sort_position::text from forum_sections where id='f1-sec-other'")).rows[0].sort_position).toBe("0");
    expect((await client.query("select id,sort_position::text from forum_categories where id=$1", [HELP_SOLUTIONS_CATEGORY_ID])).rows[0]).toEqual({ id: HELP_SOLUTIONS_CATEGORY_ID, sort_position: "0" });
    expect((await client.query("select id,category_id,sort_position::text from forum_sections where id=$1", [HELP_SOLUTIONS_SERVICE_SECTION_ID])).rows[0]).toEqual({ id: HELP_SOLUTIONS_SERVICE_SECTION_ID, category_id: HELP_SOLUTIONS_CATEGORY_ID, sort_position: "0" });
  });

  it("clean installation seeds only one state row and matches the code catalog and initial grants", async () => {
    for (const target of [schema, cleanSchema]) {
      expect((await client.query(`select id,version::text from ${target}.forum_structure_state`)).rows).toEqual([{ id: 1, version: "0" }]);
      expect((await client.query(`select key from ${target}.authz_permissions order by key`)).rows.map(r => r.key)).toEqual([...PERMISSION_CATALOG].sort());
      for (const [role, grants] of Object.entries(INITIAL_ROLE_GRANTS)) {
        expect((await client.query(`select permission_key from ${target}.authz_role_permissions where role_id=$1 order by permission_key`, ["builtin-" + role])).rows.map(r => r.permission_key)).toEqual([...grants].sort());
      }
    }
    expect((await client.query("select permission_key from authz_role_permissions where role_id='f1-custom'")).rows).toEqual([{ permission_key: "forum.topic.pin" }]);
    await rejected("insert into authz_permissions(key) values ('forum.fake')");
  });

  it("enforces singleton and nonnegative signed bigint bounds without JavaScript Number conversion", async () => {
    await rejected("insert into forum_structure_state(id) values (2)");
    const targets = [
      ["forum_structure_state", "version", "id=1"],
      ["forum_categories", "sort_position", "id='f1-cat-a'"],
      ["forum_sections", "sort_position", "id='f1-sec-a'"],
      ["forum_topics", "location_version", "id='f1-topic'"],
    ];
    for (const [table,column,where] of targets) {
      await rejected(`update ${table} set ${column}=-1 where ${where}`);
      await client.query(`update ${table} set ${column}=9223372036854775807 where ${where}`);
      const result = (await client.query(`select ${column} from ${table} where ${where}`)).rows[0][column];
      expect(result).toBe("9223372036854775807");
      expect(JSON.stringify({ value: result })).toBe('{"value":"9223372036854775807"}');
      await rejected(`update ${table} set ${column}=${column}+1 where ${where}`, "22003");
    }
  });

  it("keeps nonunique ordered indexes with explicit C collation and a parent-leading section key", async () => {
    const result = await client.query("select indexname,indexdef from pg_indexes where schemaname=$1 and indexname in ('forum_categories_order_idx','forum_sections_order_idx') order by indexname", [schema]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].indexdef).toContain('(sort_position, id COLLATE "C")');
    expect(result.rows[1].indexdef).toContain('(category_id, sort_position, id COLLATE "C")');
    for (const row of result.rows) expect(row.indexdef).not.toContain("UNIQUE");
  });

  it.each([
    ["category.created", "category"], ["category.renamed", "category"], ["category.reordered", "category"],
    ["section.created", "section"], ["section.renamed", "section"], ["section.moved", "section"],
    ["section.reordered", "section"], ["topic.moved", "topic"],
  ])("accepts %s only for its typed target without requiring a reason", async (action, target) => {
    const statement = `insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context)
      values ($1,'f1-author','Actor',$2,$3,'target','Neutral label','{}')`;
    await client.query(statement, [crypto.randomUUID(),action,target]);
    for (const wrong of ["category", "section", "topic", "post", "user", "role", "forum-settings", "user-measure"].filter(v => v !== target)) {
      await rejected(statement, "23514", [crypto.randomUUID(),action,wrong]);
    }
  });

  it("trusted setup appends distinct sibling positions and returns JSON-safe legacy DTOs", async () => {
    const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema, max: 1 });
    const repository = new DrizzleForumRepository(drizzle(pool));
    try {
      const category = await repository.createCategory({ id: "f1-setup-cat", name: "Setup" });
      const sections = await Promise.all(["a", "b"].map(id => repository.createSection({ id: "f1-setup-sec-" + id, categoryId: category.id, name: id })));
      expect(() => JSON.stringify({ category, sections })).not.toThrow();
      expect((await client.query("select sort_position::text from forum_categories where id='f1-setup-cat'")).rows[0].sort_position).toBe("3");
      expect((await client.query("select sort_position::text from forum_sections where category_id='f1-setup-cat' order by sort_position")).rows).toEqual([{ sort_position: "0" }, { sort_position: "1" }]);
      expect((await client.query("select version::text from forum_structure_state")).rows[0].version).toBe("0");
      expect((await client.query("select count(*)::int n from admin_history")).rows[0].n).toBe(0);
    } finally { await pool.end(); }
  });
});
