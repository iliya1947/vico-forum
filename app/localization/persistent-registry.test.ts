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

  it("builds deterministic semantic identities independent of row and unordered metadata order", async () => {
    const he = row({ tag: "he", direction: "rtl", aliases: ["iw"], nativeName: "עברית" });
    const first = await assemblePersistentRegistry([row(), he]);
    const second = await assemblePersistentRegistry([he, row()]);
    expect(first.semanticIdentity).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.semanticIdentity).toBe(second.semanticIdentity);
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
});
