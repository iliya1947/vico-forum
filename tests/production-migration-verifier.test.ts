import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production migration verifier persistent-English query", () => {
  it("uses ASCII-whitespace-aware canonical-English detection for both persistent UI tables", async () => {
    const source = await readFile(
      ".github/scripts/verify-production-migration.mjs",
      "utf8",
    );
    const block = source.match(
      /const persistentEnglishRows = await client\.query\(`([\s\S]*?)`\);/u,
    )?.[1];

    expect(block).toBeDefined();

    const normalized = block!.replace(/\s+/gu, " ").trim();
    const canonicalEnglishPredicate =
      "lower(btrim(locale, chr(32) || chr(9) || chr(10) || chr(13) || chr(12) || chr(11))) = 'en'";

    expect(normalized.split(canonicalEnglishPredicate)).toHaveLength(3);
    expect(normalized.match(/lower\(locale\) = 'en'/gu) ?? []).toHaveLength(0);
    expect(normalized.match(/lower\(btrim\(locale\)\) = 'en'/gu) ?? []).toHaveLength(0);
    expect(normalized).toContain(
      `FROM public.ui_translations WHERE ${canonicalEnglishPredicate}`,
    );
    expect(normalized).toContain(
      `FROM public.ui_translation_bundles WHERE ${canonicalEnglishPredicate}`,
    );
  });
});
