import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_ROLE_GRANTS, PERMISSION_CATALOG } from "../../app/authorization/catalog";
import { USER_MEASURE_RESTRICTION_IDS } from "../../app/admin/user-measure-restrictions";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}
const schema = "ap10_user_measures_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });

async function measure(options: { id?: string; target?: string; expires?: string | null } = {}) {
  const id = options.id ?? randomUUID();
  await client.query(`insert into user_measures
    (id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason,expires_at)
    values ($1,$2,'issuer',1,$3,'Specific violation', $4)`, [
    id, options.target ?? "target", "a".repeat(64), options.expires ?? null,
  ]);
  return id;
}
async function appeal(measureId: string, ordinal: number, id = randomUUID()) {
  await client.query(`insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body)
    values ($1,$2,'target',$3,'Please review')`, [id, measureId, ordinal]);
  return id;
}
async function rejected(sql: string, values: unknown[], code: string) {
  await client.query("SAVEPOINT ap10_rejected");
  try {
    await expect(client.query(sql, values)).rejects.toMatchObject({ code });
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT ap10_rejected");
    await client.query("RELEASE SAVEPOINT ap10_rejected");
  }
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('target','Target','target-ap10@example.invalid'),
    ('issuer','Issuer','issuer-ap10@example.invalid'),
    ('reviewer','Reviewer','reviewer-ap10@example.invalid')`);
});
afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});
beforeEach(async () => { await client.query("BEGIN"); });
afterEach(async () => { await client.query("ROLLBACK"); });

describe("AP-10 measures forward migration and constraints", () => {
  it("registers both management keys with zero initial grants in every built-in role", async () => {
    const keys = ["admin.users.blocks.manage", "admin.users.blocks.managePrivileged"];
    expect(PERMISSION_CATALOG).toEqual(expect.arrayContaining(keys));
    for (const grants of Object.values(INITIAL_ROLE_GRANTS)) {
      expect(grants).not.toContain(keys[0]);
      expect(grants).not.toContain(keys[1]);
    }
    const permissions = await client.query<{ key: string }>(
      "select key from authz_permissions where key = any($1::text[]) order by key", [keys],
    );
    expect(permissions.rows.map(row => row.key)).toHaveLength(2);
    const defaults = await client.query<{ role_id: string; permission_key: string }>(
      "select role_id, permission_key from authz_role_permissions where permission_key = any($1::text[])", [keys],
    );
    expect(defaults.rows).toEqual([]);
    await client.query("insert into authz_role_permissions(role_id,permission_key) values ('builtin-admin',$1)", [keys[0]]);
    expect((await client.query(
      "select permission_key from authz_role_permissions where role_id = 'builtin-admin' and permission_key = $1",
      [keys[0]],
    )).rowCount).toBe(1);
  });

  it("keeps actual measure/appeal instants as PostgreSQL timestamptz(3)", async () => {
    const result = await client.query<{ table_name: string; column_name: string; type: string }>(`
      select c.relname as table_name, a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as type
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = $1 and c.relname = any($2::text[])
        and a.attname = any($3::text[])
        and a.attnum > 0 and not a.attisdropped
      order by table_name,column_name`, [schema, ["user_measures", "user_measure_appeals"], ["created_at", "expires_at", "lifted_at", "resolved_at"]]);
    expect(result.rows).toHaveLength(5);
    expect(result.rows.every(row => row.type === "timestamp(3) with time zone")).toBe(true);
    const id = await measure({ expires: "2026-12-31T23:30:00+02:00" });
    await client.query("SET LOCAL TIME ZONE 'Asia/Jerusalem'");
    const stamp = await client.query<{ expires_at: Date }>("select expires_at from user_measures where id = $1", [id]);
    expect(stamp.rows[0]?.expires_at.toISOString()).toBe("2026-12-31T21:30:00.000Z");
  });

  it("stores separate measures for the same target and overlapping restriction without merging identities", async () => {
    const first = await measure();
    const second = await measure();
    expect(first).not.toBe(second);
    for (const id of [first, second]) {
      await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values ($1,'replies.create')", [id]);
    }
    expect((await client.query(
      "select count(*)::int as total from user_measure_restrictions where restriction_key='replies.create' and enabled",
    )).rows[0].total).toBe(2);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [first]);
    expect((await client.query(
      "select measure_id from user_measure_restrictions where restriction_key='replies.create' and enabled",
    )).rows.map(row => row.measure_id)).toEqual([second]);
  });

  it("rejects unknown restrictions, duplicate links, blank reasons, invalid issuer floor and foreign targets", async () => {
    const id = await measure();
    for (const key of USER_MEASURE_RESTRICTION_IDS) {
      await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values($1,$2)", [id, key]);
    }
    expect((await client.query(
      "select restriction_key from user_measure_restrictions where measure_id=$1", [id],
    )).rowCount).toBe(USER_MEASURE_RESTRICTION_IDS.length);
    await rejected("insert into user_measure_restrictions(measure_id,restriction_key) values($1,$2)", [id, "future.policy"], "23514");
    await rejected("insert into user_measure_restrictions(measure_id,restriction_key) values($1,$2)", [id, "replies.create"], "23505");
    await rejected("update user_measures set initial_reason='  ' where id=$1", [id], "23514");
    await rejected("update user_measures set issuer_authority_floor=0 where id=$1", [id], "23514");
    await rejected("update user_measures set version=0 where id=$1", [id], "23514");
    await rejected("update user_measures set target_user_id='missing' where id=$1", [id], "23503");
    await rejected("update user_measures set lifted_at=clock_timestamp() where id=$1", [id], "23514");
  });

  it("permits at most one pending appeal, three distinct ordinals, and next appeal after resolution", async () => {
    const m = await measure();
    const first = await appeal(m, 1);
    await rejected("insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body) values($1,$2,'target',2,'Another')", [randomUUID(), m], "23505");
    await client.query(`update user_measure_appeals
      set status='rejected', reviewer_user_id='reviewer', resolved_at=clock_timestamp(), reviewer_explanation='Reason'
      where id=$1`, [first]);
    const second = await appeal(m, 2);
    await rejected("insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body) values($1,$2,'target',4,'Fourth')", [randomUUID(), m], "23514");
    await rejected("insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body) values($1,$2,'target',2,'Duplicate')", [randomUUID(), m], "23505");
    await rejected("update user_measure_appeals set status='accepted' where id=$1", [second], "23514");
    await client.query(`update user_measure_appeals
      set status='accepted', reviewer_user_id='reviewer', resolved_at=clock_timestamp(), reviewer_explanation='Reduced', remedy='change'
      where id=$1`, [second]);
    await appeal(m, 3);
    expect((await client.query(
      "select ordinal,status from user_measure_appeals where measure_id=$1 order by ordinal", [m],
    )).rows).toEqual([
      { ordinal: 1, status: "rejected" }, { ordinal: 2, status: "accepted" }, { ordinal: 3, status: "pending" },
    ]);
  });

  it("allows typed measure History events and rejects an unrelated target/action pairing", async () => {
    const id = await measure();
    await client.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context,reason)
      values($1,'issuer','Internal Actor','measure.created','user-measure',$2,'Target','{}'::jsonb,'Specific violation')`,
    [randomUUID(), id]);
    expect((await client.query(
      "select action,target_type from admin_history where target_id=$1", [id],
    )).rows).toEqual([{ action: "measure.created", target_type: "user-measure" }]);
    await rejected(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context)
      values($1,'issuer','Internal Actor','measure.changed','post',$2,'Target','{}'::jsonb)`, [randomUUID(), id], "23514");
  });
});
