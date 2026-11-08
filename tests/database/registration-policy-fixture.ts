import { readFile } from "node:fs/promises";
import type { Client } from "pg";

/** Small historical Better Auth fixtures load migration 0003 only; add SET-02's exact table DDL/seed. */
export async function installRegistrationPolicyFixture(client: Pick<Client, "query">): Promise<void> {
  const migration = await readFile("drizzle/0060_forum_registration_settings.sql", "utf8");
  const parts = migration.split("--> statement-breakpoint");
  if (parts.length < 3 || !parts[0].includes('CREATE TABLE "forum_registration_settings"')
    || !parts[1].includes('INSERT INTO "forum_registration_settings"')) {
    throw new Error("Unexpected SET-02 registration migration layout");
  }
  await client.query(parts.slice(0, 2).join(""));
}
