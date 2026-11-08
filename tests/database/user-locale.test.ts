import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createHyperdriveUserLocale, UserLocaleAccountMissingError, UserLocaleUnavailableError,
} from "../../db/hyperdrive-user-locale";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");

const schema = "settings_user_locale_test";
const client = new Client({ connectionString: url });
const writer = createHyperdriveUserLocale(url, () =>
  new Client({ connectionString: url, options: `-c search_path=${schema}` }));

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  await client.query(`set search_path to ${schema}`);
  const migration = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`)
    .replaceAll("--> statement-breakpoint", "");
  await client.query(migration);
  await client.query(`insert into "user"(id, name, email) values
    ('locale-owner', 'Owner', 'locale-owner@test.invalid'),
    ('locale-other', 'Other', 'locale-other@test.invalid')`);
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("SET-03 own account locale, native PostgreSQL", () => {
  it("writes only the requested identity to existing user.locale, preserving other users", async () => {
    await writer.save("locale-owner", "fr-CA");
    let rows = (await client.query<{ id: string; locale: string | null }>(
      `select id, locale from "user" order by id`)).rows;
    expect(rows).toEqual([
      { id: "locale-other", locale: null }, { id: "locale-owner", locale: "fr-CA" },
    ]);
    await writer.save("locale-other", "he");
    await writer.save("locale-owner", "en");
    rows = (await client.query<{ id: string; locale: string | null }>(
      `select id, locale from "user" order by id`)).rows;
    expect(rows).toEqual([
      { id: "locale-other", locale: "he" }, { id: "locale-owner", locale: "en" },
    ]);
  });

  it("rejects a deleted/stale account without inserting or changing another user", async () => {
    await expect(writer.save("not-an-account", "ru")).rejects.toBeInstanceOf(UserLocaleAccountMissingError);
    const count = await client.query<{ count: number }>(`select count(*)::int as count from "user"`);
    expect(count.rows[0]?.count).toBe(2);
    expect((await client.query(`select locale from "user" where id='locale-other'`)).rows[0]?.locale).toBe("he");
  });

  it("classifies PostgreSQL connection unavailability without a fake successful write", async () => {
    const down = createHyperdriveUserLocale(url, () => ({
      connect: async () => { throw Object.assign(new Error("connection down"), { code: "08006" }); },
      end: async () => {},
    }) as unknown as Client);
    await expect(down.save("locale-owner", "ru")).rejects.toBeInstanceOf(UserLocaleUnavailableError);
    expect((await client.query(`select locale from "user" where id='locale-owner'`)).rows[0]?.locale).toBe("en");
  });
});
