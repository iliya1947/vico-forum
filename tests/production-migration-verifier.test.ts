import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production migration verifier persistent-English query", () => {
  it("uses trimmed canonical-English detection for both persistent UI tables", async () => {
    const source = await readFile(
      ".github/scripts/verify-production-migration.mjs",
      "utf8",
    );
    const block = source.match(
      /const persistentEnglishRows = await client\.query\(`([\s\S]*?)`\);/u,
    )?.[1];

    expect(block).toBeDefined();

    const normalized = block!.replace(/\s+/gu, " ").trim();
    expect(normalized.match(/lower\(btrim\(locale\)\) = 'en'/gu) ?? []).toHaveLength(2);
    expect(normalized.match(/lower\(locale\) = 'en'/gu) ?? []).toHaveLength(0);
    expect(normalized).toContain(
      "FROM public.ui_translations WHERE lower(btrim(locale)) = 'en'",
    );
    expect(normalized).toContain(
      "FROM public.ui_translation_bundles WHERE lower(btrim(locale)) = 'en'",
    );
  });
});
