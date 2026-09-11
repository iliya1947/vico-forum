import { describe, expect, it, vi } from "vitest";
import {
  RegistryIntegrityError,
  assemblePersistentRegistry,
  createRequestRegistryLoader,
  loadPersistentRegistry,
  parsePersistentLocaleRow,
  type PersistentLocaleRow,
} from "./persistent-registry";

function row(overrides: Partial<PersistentLocaleRow> = {}): PersistentLocaleRow {
  return {
    tag: "ru",
    translationStatus: "draft",
    publicationStatus: "active",
    direction: "ltr",
    fallbackChain: ["en"],
    aliases: [],
    matchTags: [],
    nativeName: "Русский",
    presentationMetadata: {},
    ...overrides,
  };
}

describe("persistent locale registry", () => {
  it("parses rows and rejects non-string metadata and bootstrap English", () => {
    expect(parsePersistentLocaleRow(row()).tag).toBe("ru");
    expect(() => parsePersistentLocaleRow(row({ presentationMetadata: { flag: true } }))).toThrow(
      RegistryIntegrityError,
    );
    expect(() => parsePersistentLocaleRow(row({ tag: "en" }))).toThrow("bootstrap en");
  });

  it("validates the whole graph before publishing it", async () => {
    await expect(assemblePersistentRegistry([row({ fallbackChain: ["missing"] })])).rejects.toThrow(
      "persistent locale graph is invalid",
    );
    await expect(assemblePersistentRegistry([row(), row({ tag: "de", aliases: ["ru"] })])).rejects.toThrow(
      "persistent locale graph is invalid",
    );
  });

  it("normalizes row, alias, match-tag, and metadata-key order for semantic identity", async () => {
    const he = row({
      tag: "he",
      direction: "rtl",
      aliases: ["he-IL", "iw"],
      matchTags: ["he-Hebr", "he-u-ca-hebrew"],
      nativeName: "עברית",
      presentationMetadata: { zed: "last", alpha: "first" },
    });
    const reorderedHe = row({
      tag: "he",
      direction: "rtl",
      aliases: ["iw", "he-IL"],
      matchTags: ["he-u-ca-hebrew", "he-Hebr"],
      nativeName: "עברית",
      presentationMetadata: { alpha: "first", zed: "last" },
    });
    const first = await assemblePersistentRegistry([row(), he]);
    const second = await assemblePersistentRegistry([reorderedHe, row()]);
    expect(first.semanticIdentity).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.semanticIdentity).toBe(second.semanticIdentity);
  });

  it("preserves semantic fallback order in the identity", async () => {
    const de = row({ tag: "de", publicationStatus: "inactive", nativeName: "Deutsch" });
    const first = await assemblePersistentRegistry([de, row({ fallbackChain: ["de", "en"] })]);
    const second = await assemblePersistentRegistry([de, row({ fallbackChain: ["en", "de"] })]);
    expect(first.semanticIdentity).not.toBe(second.semanticIdentity);
  });

  it.each([
    [Object.assign(new Error("offline"), { code: "08006" }), "unavailable"],
    [Object.assign(new Error("missing table"), { code: "42P01" }), "schema-mismatch"],
    [new RegistryIntegrityError("bad graph"), "integrity"],
  ] as const)("degrades to bootstrap English for a classified failure", async (error, reason) => {
    const loaded = await loadPersistentRegistry({ readAll: async () => { throw error; } });
    expect(loaded.health).toEqual({ status: "degraded", reason });
    expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
  });

  it("does not mask programming errors and memoizes one load per request service", async () => {
    const failure = new TypeError("bug");
    await expect(loadPersistentRegistry({ readAll: async () => { throw failure; } })).rejects.toBe(failure);

    const readAll = vi.fn(async () => [row()]);
    const load = createRequestRegistryLoader({ readAll });
    const [one, two] = await Promise.all([load(), load()]);
    expect(one).toBe(two);
    expect(readAll).toHaveBeenCalledOnce();
  });

  it("does not classify semantic hashing failures as registry integrity", async () => {
    const failure = new TypeError("crypto runtime failure");
    const digest = vi.spyOn(crypto.subtle, "digest").mockRejectedValueOnce(failure);
    await expect(loadPersistentRegistry({ readAll: async () => [row()] })).rejects.toBe(failure);
    digest.mockRestore();
  });
});
