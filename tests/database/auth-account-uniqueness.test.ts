import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import manifest from "../../.github/production-schema-manifest.json";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "auth02a_account_uniqueness_test";
const first = new Client({ connectionString: url, options: "-c search_path=" + schema });
const second = new Client({ connectionString: url, options: "-c search_path=" + schema });
const migration = () => readFile("drizzle/0073_auth_account_uniqueness.sql", "utf8");
const insert = (client: Client, id: string, owner: string, provider: string, accountId: string) =>
  client.query("insert into account(id,user_id,provider_id,account_id,updated_at) values($1,$2,$3,$4,now())",
    [id, owner, provider, accountId]);
const accounts = () => first.query("select id,user_id,provider_id,account_id from account order by id");

beforeAll(async () => { await first.connect(); await second.connect(); });
beforeEach(async () => {
  await first.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  await first.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', '"' + schema + '".'));
  await first.query('insert into "user"(id,name,email,updated_at) values ' +
    "('a','A','a@example.test',now()),('b','B','b@example.test',now())");
});
afterAll(async () => {
  await first.query("drop schema if exists " + schema + " cascade");
  await first.end(); await second.end();
});

describe("AUTH-02a forward account uniqueness", () => {
  it("preserves valid historical accounts and verifies native partial predicate manifest", async () => {
    await insert(first, "a-password", "a", "credential", "a");
    await insert(first, "b-password", "b", "credential", "b");
    await insert(first, "a-google", "a", "google", "provider-sub-a");
    await insert(first, "a-other-google", "a", "google", "provider-sub-a2");
    const original = (await accounts()).rows;
    await first.query(await migration());
    expect((await accounts()).rows).toEqual(original);
    const actual = (await first.query<{name:string; unique:boolean; predicate:string | null}>(`
      select idx.relname name,i.indisunique as unique,pg_get_expr(i.indpred,i.indrelid,false) predicate
      from pg_index i join pg_class idx on idx.oid=i.indexrelid
      where i.indrelid='account'::regclass and idx.relname in
        ('account_provider_identity_uidx','account_credential_user_uidx') order by idx.relname
    `)).rows;
    expect(actual).toHaveLength(2);
    for (const index of actual) {
      expect(index.unique).toBe(true);
      const expected = manifest.tables.account.indexes.find(row => row.name === index.name);
      expect(expected?.unique).toBe(true);
      const hash = index.predicate === null ? null : createHash("sha256").update(index.predicate).digest("hex");
      expect(hash).toBe(expected && "predicateSha256" in expected ? expected.predicateSha256 : null);
    }
    await expect(insert(first, "cross-account", "b", "google", "provider-sub-a")).rejects.toMatchObject({code:"23505"});
    await expect(insert(first, "second-password", "a", "credential", "different-a")).rejects.toMatchObject({code:"23505"});
    expect((await accounts()).rows).toEqual(original);
  });

  it.each(["provider", "credential"])("stops migration on historical %s duplicates without changing identities", async kind => {
    if (kind === "provider") {
      await insert(first, "duplicate-a", "a", "google", "same-provider-sub");
      await insert(first, "duplicate-b", "b", "google", "same-provider-sub");
    } else {
      await insert(first, "duplicate-a", "a", "credential", "a");
      await insert(first, "duplicate-b", "a", "credential", "different-a");
    }
    const original = (await accounts()).rows;
    await expect(first.query(await migration())).rejects.toMatchObject({ code: "23505" });
    expect((await accounts()).rows).toEqual(original);
    expect((await first.query("select to_regclass('account_provider_identity_uidx') as p," +
      "to_regclass('account_credential_user_uidx') as c")).rows[0]).toEqual({ p:null,c:null });
  });

  it("allows exactly one competing native insert for either uniqueness invariant", async () => {
    await first.query(await migration());
    for (const [provider, owners, accountIds] of [
      ["google", ["a","b"], ["same-google","same-google"]],
      ["credential", ["a","a"], ["different-1","different-2"]],
    ] as const) {
      const results = await Promise.allSettled([
        insert(first, provider+"-1", owners[0], provider, accountIds[0]),
        insert(second, provider+"-2", owners[1], provider, accountIds[1]),
      ]);
      expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(results.find(result => result.status === "rejected")).toMatchObject({ reason:{ code:"23505" } });
    }
    expect((await accounts()).rows).toHaveLength(2);
  });
});
