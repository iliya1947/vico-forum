import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PostgresAdminUsersReader } from "../../db/admin-users";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}

const schema = "admin_users_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const reader = new PostgresAdminUsersReader(client);

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (let i = 0; i < 61; i++) {
    const id = `u-${String(i).padStart(3, "0")}`;
    await client.query('insert into "user"(id,name,email) values ($1,$2,$3)', [
      id, i === 60 ? "Literal %_\\ עברית 😀" : `Name ${i}`, `secret-${i}@private.invalid`,
    ]);
  }
  await client.query('insert into "user"(id,name,email) values ($1,$2,$3)', [
    "id/עברית-😀", "Unicode slash", "secret-slash@private.invalid",
  ]);
});

afterAll(async () => {
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});

describe("AP-09 admin users directory PostgreSQL projection", () => {
  it("pages a full matching set with ID keyset, lookahead and exact totals", async () => {
    const ids: string[] = [];
    let after: string | undefined;
    do {
      const page = await reader.listUsers({ search: "", after });
      expect(page.total).toBe(62);
      expect(page.items.length).toBeLessThanOrEqual(25);
      ids.push(...page.items.map(user => user.id));
      after = page.next ?? undefined;
    } while (after);
    expect(ids).toHaveLength(62);
    expect(new Set(ids).size).toBe(62);
    expect(ids).toEqual(["id/עברית-😀", ...Array.from({ length: 61 }, (_, i) => `u-${String(i).padStart(3, "0")}`)]);
  });

  it("filters before paging, escapes literal wildcards and never searches email", async () => {
    for (const term of ["%_\\", "u-060"]) {
      const result = await reader.listUsers({ search: term });
      expect(result.items.map(user => user.id)).toEqual(["u-060"]);
      expect(result.total).toBe(1);
    }
    for (const term of ["עברית", "😀"]) {
      const result = await reader.listUsers({ search: term });
      expect(result.items.map(user => user.id)).toEqual(["id/עברית-😀", "u-060"]);
      expect(result.total).toBe(2);
    }
    const idSearch = await reader.listUsers({ search: "id/עברית-😀" });
    expect(idSearch.items.map(user => user.id)).toEqual(["id/עברית-😀"]);
    expect(await reader.listUsers({ search: "secret-60@private.invalid" })).toEqual({
      items: [], total: 0, next: null,
    });
    expect(await reader.listUsers({ search: "nonexistent" })).toEqual({ items: [], total: 0, next: null });
    const cursor = await reader.listUsers({ search: "u-", after: "u-040" });
    expect(cursor.total).toBe(61);
    expect(cursor.items[0]?.id).toBe("u-041");
  });

  it("returns only public identity fields and works with existing SELECT privilege", async () => {
    const page = await reader.listUsers({ search: "u-000" });
    expect(page.items).toHaveLength(1);
    expect(Object.keys(page.items[0]).sort()).toEqual(["id", "image", "joinedAt", "name"]);
    expect(page.items[0]).toMatchObject({ id: "u-000", name: "Name 0", image: null });
    expect(page.items[0].joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(new Date(page.items[0].joinedAt).toISOString()).toMatch(/^\d{4}-/);
    const serialized = JSON.stringify(await reader.listUsers({ search: "" }));
    for (const secret of ["@private.invalid", "email", "password", "grants", "overrides"]) {
      expect(serialized).not.toContain(secret);
    }
    const role = "ap09_users_reader_probe";
    await client.query(`create role ${role} nologin;grant usage on schema ${schema} to ${role};grant select on "user" to ${role}`);
    await client.query("begin");
    try {
      await client.query(`set local role ${role}`);
      expect((await reader.listUsers({ search: "u-" })).total).toBe(61);
    } finally {
      await client.query("rollback");
      await client.query(`drop owned by ${role};drop role ${role}`);
    }
  });
});
