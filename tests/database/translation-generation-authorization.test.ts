import { readFile } from "node:fs/promises";

import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresAuthorizationRepository } from "../../db/authorization-repository";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)
  || !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "translation_generation_authz_test";
let pool: Pool;

beforeAll(async () => {
  const setup = new Client({ connectionString: databaseUrl });
  await setup.connect();
  try {
    await setup.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
    await setup.query(`set search_path to ${schemaName}`);
    for (const migration of [
      "drizzle/0003_gorgeous_donald_blake.sql",
      "drizzle/0006_loving_sentinels.sql",
      "drizzle/0018_source_locale_correction_permissions.sql",
      "drizzle/0020_translation_generation_permission.sql",
    ]) {
      const sql = (await readFile(migration, "utf8"))
        .replaceAll('"public".', `"${schemaName}".`);
      await setup.query(sql);
    }
    await setup.query(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at)
      values
        ('default-user', 'Default User', 'default@example.test', true, now(), now()),
        ('override-user', 'Override User', 'override@example.test', true, now(), now())
    `);
    await setup.query(`
      insert into authz_roles (id, slug, display_name, is_system)
      values ('custom-no-generation', 'custom-no-generation', 'No generation', false)
    `);
    await setup.query(`
      insert into authz_user_roles (user_id, role_id)
      values ('override-user', 'custom-no-generation')
    `);
  } finally {
    await setup.end();
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    options: `-c search_path=${schemaName}`,
  });
});

afterAll(async () => {
  await pool?.end();
  const cleanup = new Client({ connectionString: databaseUrl });
  await cleanup.connect();
  try {
    await cleanup.query(`drop schema if exists ${schemaName} cascade`);
  } finally {
    await cleanup.end();
  }
});

describe("translation generation authorization migration", () => {
  it("grants generation to all built-in roles by default", async () => {
    const result = await pool.query<{ slug: string }>(`
      select role.slug
        from authz_roles role
        join authz_role_permissions grant_row on grant_row.role_id = role.id
       where grant_row.permission_key = 'forum.translation.generate'
         and role.slug in ('user', 'moderator', 'admin')
       order by role.slug
    `);
    expect(result.rows.map((row) => row.slug)).toEqual(["admin", "moderator", "user"]);
  });

  it("keeps dynamic deny and allow overrides authoritative", async () => {
    const repository = new PostgresAuthorizationRepository(pool);

    await expect(repository.hasPermission(
      "default-user",
      "forum.translation.generate",
    )).resolves.toBe(true);

    await pool.query(`
      insert into authz_user_permission_overrides (user_id, permission_key, effect)
      values ('default-user', 'forum.translation.generate', 'deny')
    `);
    await expect(repository.hasPermission(
      "default-user",
      "forum.translation.generate",
    )).resolves.toBe(false);

    await expect(repository.hasPermission(
      "override-user",
      "forum.translation.generate",
    )).resolves.toBe(false);
    await pool.query(`
      insert into authz_user_permission_overrides (user_id, permission_key, effect)
      values ('override-user', 'forum.translation.generate', 'allow')
    `);
    await expect(repository.hasPermission(
      "override-user",
      "forum.translation.generate",
    )).resolves.toBe(true);
  });
});
