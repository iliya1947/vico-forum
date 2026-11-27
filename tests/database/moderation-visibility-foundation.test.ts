import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_ROLE_GRANTS, PERMISSION_CATALOG } from "../../app/authorization/catalog";
import { visibilityHistoryLabel } from "../../db/admin-history";
import { ADMIN_MONITOR_SCOPES_SQL } from "../../db/owner-monitor-catalog";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
    || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Visibility foundation tests require disposable loopback *_test PostgreSQL");
}
const schema = "visibility_foundation_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
async function rejected(statement: string, values: unknown[] = []) {
  await client.query("savepoint vis_reject");
  try {
    await expect(client.query(statement, values)).rejects.toMatchObject({ code: "23514" });
  } finally {
    await client.query("rollback to savepoint vis_reject");
    await client.query("release savepoint vis_reject");
  }
}
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const filename of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await client.query((await readFile("drizzle/" + filename, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});
beforeEach(async () => { await client.query("begin"); });
afterEach(async () => { await client.query("rollback"); });

describe("B1 moderation visibility schema, grants and typed History foundation", () => {
  async function content() {
    await client.query(`insert into "user"(id,name,email)
      values ('vis-author','Visibility author','vis-author@test.invalid')`);
    await client.query("insert into forum_categories(id,name) values ('vis-category','Visibility')");
    await client.query("insert into forum_sections(id,category_id,name) values ('vis-section','vis-category','Visibility')");
    await client.query(`insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values ('vis-topic','vis-section','vis-author','vis-title')`);
    await client.query(`insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      values ('vis-title','vis-topic','vis-author','Original title','en')`);
    await client.query(`insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values ('vis-post','vis-topic','vis-author','vis-post-rev')`);
    await client.query(`insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      values ('vis-post-rev','vis-post','vis-author','Original body','en')`);
    await client.query("set constraints all immediate");
  }

  it("defaults both entities to visible version zero with no change timestamp", async () => {
    await content();
    for (const [table,id] of [["forum_topics","vis-topic"],["forum_posts","vis-post"]] as const) {
      const result = await client.query(`select is_hidden,visibility_version,visibility_changed_at
        from ${table} where id=$1`, [id]);
      expect(result.rows[0]).toEqual({
        is_hidden: false, visibility_version: 0, visibility_changed_at: null,
      });
      const types = await client.query<{ type: string }>(`select
        pg_catalog.format_type(a.atttypid,a.atttypmod) type
        from pg_catalog.pg_attribute a
        where a.attrelid=$1::regclass and a.attname='visibility_changed_at'`,
        [table]);
      expect(types.rows[0]?.type).toBe("timestamp(3) with time zone");
    }
  });

  it.each([["forum_topics","vis-topic"],["forum_posts","vis-post"]] as const)(
    "%s rejects impossible visibility combinations and permits explicit hide/restore snapshots",
    async (table, id) => {
      await content();
      await rejected(`update ${table} set is_hidden=true where id=$1`, [id]);
      await rejected(`update ${table} set visibility_version=-1 where id=$1`, [id]);
      await rejected(`update ${table} set visibility_version=1 where id=$1`, [id]);
      await rejected(`update ${table} set visibility_changed_at=now() where id=$1`, [id]);
      await client.query(`update ${table} set is_hidden=true,
        visibility_version=1,visibility_changed_at=clock_timestamp() where id=$1`, [id]);
      await client.query(`update ${table} set is_hidden=false,
        visibility_version=2,visibility_changed_at=clock_timestamp() where id=$1`, [id]);
      const observed = await client.query(`select is_hidden,visibility_version,
        visibility_changed_at is not null changed from ${table} where id=$1`, [id]);
      expect(observed.rows[0]).toEqual({ is_hidden: false, visibility_version: 2, changed: true });
    },
  );

  it("uses partial hidden queues with changedAt/id descending and no visible rows", async () => {
    await content();
    const indexes = await client.query<{ tablename: string; indexname: string; indexdef: string }>(`
      select tablename,indexname,indexdef from pg_indexes where schemaname=$1
        and indexname in ('forum_topics_hidden_queue_idx','forum_posts_hidden_queue_idx')
      order by tablename`, [schema]);
    expect(indexes.rows).toHaveLength(2);
    for (const row of indexes.rows) {
      expect(row.indexdef).toContain("visibility_changed_at DESC NULLS LAST");
      expect(row.indexdef).toContain("id DESC NULLS LAST");
      expect(row.indexdef).toMatch(/WHERE\s+is_hidden/);
    }
  });

  it("catalogs the independent visibility permission with moderator/admin only initial grants", async () => {
    const key = "forum.content.visibility.manage";
    expect(PERMISSION_CATALOG).toContain(key);
    expect(INITIAL_ROLE_GRANTS.user).not.toContain(key);
    expect(INITIAL_ROLE_GRANTS.moderator).toContain(key);
    expect(INITIAL_ROLE_GRANTS.admin).toContain(key);
    const catalog = await client.query("select key from authz_permissions where key=$1", [key]);
    expect(catalog.rows).toEqual([{ key }]);
    const grants = await client.query("select role_id from authz_role_permissions where permission_key=$1 order by role_id", [key]);
    expect(grants.rows).toEqual([{ role_id: "builtin-admin" }, { role_id: "builtin-moderator" }]);
    await client.query("insert into authz_roles(id,slug,display_name) values ('vis-custom','vis-custom','Custom')");
    await client.query("insert into authz_role_permissions(role_id,permission_key) values ('vis-custom',$1)", [key]);
    expect((await client.query("select count(*)::int n from authz_role_permissions where role_id='vis-custom' and permission_key=$1", [key])).rows[0].n).toBe(1);
  });

  it("requires nonblank bounded reasons and correct action/target pairs in append-only History", async () => {
    await content();
    expect(visibilityHistoryLabel("topic","vis-topic")).toBe("topic:vis-topic");
    const insert = `insert into admin_history (id,actor_id,actor_label,action,target_type,target_id,target_label,context,reason)
      values ($1,'vis-author','Author',$2,$3,'vis-topic','topic:vis-topic','{}'::jsonb,$4)`;
    const actions = [
      ["topic.hidden","topic"],["topic.restored","topic"],
      ["post.hidden","post"],["post.restored","post"],
    ] as const;
    for (const [action,targetType] of actions) {
      await rejected(insert, [crypto.randomUUID(),action,targetType,"  "]);
      await rejected(insert, [crypto.randomUUID(),action,targetType,null]);
      await rejected(insert, [crypto.randomUUID(),action,targetType,"x".repeat(2001)]);
      await rejected(insert, [crypto.randomUUID(),action,targetType==="topic"?"post":"topic","Changed"]);
      await client.query(insert, [crypto.randomUUID(),action,targetType,"Evidence retained"]);
    }
    const events = await client.query("select action, target_type,reason,target_label from admin_history order by action");
    expect(events.rows).toHaveLength(4);
    expect(events.rows.every(row => row.reason === "Evidence retained" && row.target_label === "topic:vis-topic")).toBe(true);
    const scopes = await client.query(`select a.action, ${ADMIN_MONITOR_SCOPES_SQL} as monitors
      from admin_history a where a.action = any($1::text[]) order by a.action`,
      [actions.map(([action]) => action)]);
    expect(scopes.rows).toHaveLength(4);
    expect(scopes.rows.every(row => JSON.stringify(row.monitors) === JSON.stringify(["forum.content","forum.state"]))).toBe(true);
    // Previously accepted ordinary History kinds retain their optional reason semantics.
    await client.query(insert, [crypto.randomUUID(),"topic.closed","topic",null]);
  });
});
