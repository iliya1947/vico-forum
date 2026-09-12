import { describe, expect, it, vi } from "vitest";
import type { ClientBase } from "pg";
import { ControlledLocaleWriter } from "./locale-repository";
import type { LocaleDefinition } from "../app/localization/locale";
import type { PersistentLocaleRow } from "../app/localization/persistent-registry";

function locale(tag: string): LocaleDefinition {
  return {
    tag,
    translationStatus: "draft",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: tag,
  };
}

function row(tag: string): PersistentLocaleRow {
  return {
    tag,
    translationStatus: "draft",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["en"],
    aliases: [],
    matchTags: [],
    nativeName: tag,
    presentationMetadata: {},
  };
}

describe("ControlledLocaleWriter canonical identity", () => {
  it("sets transaction-local deadlines before reading or mutating without retrying a timeout", async () => {
    const timeout = Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" });
    const query = vi.fn(async (text: string) => {
      if (text.startsWith("select tag")) throw timeout;
      return { rows: [] };
    });
    const readAll = vi.fn(async () => []);
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll },
    );

    await expect(writer.apply({ type: "put", locale: locale("fr") })).rejects.toBe(timeout);
    expect(query.mock.calls.map(([text]) => text)).toEqual([
      "begin isolation level serializable",
      "set local lock_timeout = '2s'",
      "set local statement_timeout = '10s'",
      expect.stringMatching(/^select tag/),
      "rollback",
    ]);
    expect(readAll).not.toHaveBeenCalled();
  });

  it("reconciles an exact PostgreSQL statement timeout returned during commit", async () => {
    const timeout = Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" });
    const query = vi.fn(async (text: string) => {
      if (text.startsWith("select tag")) return { rows: [] };
      if (text === "commit") throw timeout;
      return { rows: [] };
    });
    const readAll = vi.fn(async () => [row("fr")]);
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll },
    );

    await expect(writer.apply({ type: "put", locale: locale("fr") })).resolves.toBeUndefined();
    expect(readAll).toHaveBeenCalledOnce();
    expect(query.mock.calls.filter(([text]) => text === "commit")).toHaveLength(1);
    expect(query.mock.calls.filter(([text]) => text === "begin isolation level serializable")).toHaveLength(1);
  });

  it("does not reconcile a user-request 57014 returned during commit", async () => {
    const canceled = Object.assign(new Error("canceling statement due to user request"), { code: "57014" });
    const query = vi.fn(async (text: string) => {
      if (text.startsWith("select tag")) return { rows: [] };
      if (text === "commit") throw canceled;
      return { rows: [] };
    });
    const readAll = vi.fn(async () => [row("fr")]);
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll },
    );

    await expect(writer.apply({ type: "put", locale: locale("fr") })).rejects.toBe(canceled);
    expect(readAll).not.toHaveBeenCalled();
    expect(query.mock.calls.filter(([text]) => text === "commit")).toHaveLength(1);
    expect(query.mock.calls.filter(([text]) => text === "begin isolation level serializable")).toHaveLength(1);
  });

  it("uses one canonical tag for state replacement and SQL DML", async () => {
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const query = vi.fn(async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      if (text.startsWith("select tag")) return { rows: [row("fr")] };
      return { rows: [] };
    });
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll: async () => [row("fr")] },
    );

    await writer.apply({ type: "put", locale: locale("FR") });
    await writer.apply({ type: "delete", tag: "FR" });

    const insert = queries.find(({ text }) => text.startsWith("insert into locales"));
    const deletion = queries.find(({ text }) => text.startsWith("delete from locales"));
    expect(insert?.values?.[0]).toBe("fr");
    expect(deletion?.values?.[0]).toBe("fr");
  });

  it("preserves canonical BCP-47 casing instead of lowercasing tags", async () => {
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const query = vi.fn(async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      if (text.startsWith("select tag")) return { rows: [] };
      return { rows: [] };
    });
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll: async () => [] },
    );

    await writer.apply({ type: "put", locale: locale("ZH-hant-tw") });

    const insert = queries.find(({ text }) => text.startsWith("insert into locales"));
    expect(insert?.values?.[0]).toBe("zh-Hant-TW");
  });

  it("rejects formatting extensions and bootstrap English before opening a transaction", async () => {
    const query = vi.fn();
    const writer = new ControlledLocaleWriter(
      { query } as unknown as ClientBase,
      { readAll: async () => [] },
    );

    await expect(writer.apply({ type: "put", locale: locale("fr-u-ca-gregory") })).rejects.toThrow(
      "without formatting extensions",
    );
    await expect(writer.apply({ type: "delete", tag: "EN" })).rejects.toThrow("bootstrap en");
    expect(query).not.toHaveBeenCalled();
  });
});
