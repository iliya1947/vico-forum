import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createHyperdriveUiTranslationStore } from "./hyperdrive-ui-translations";

describe("Hyperdrive UI translation request store", () => {
  it("is lazy, reuses one client, and memoizes identical reads", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    const connect = vi.fn(async () => undefined);
    const createClient = vi.fn(() => ({ connect, query }) as unknown as Client);
    const reportDegraded = vi.fn();
    const store = createHyperdriveUiTranslationStore(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    );

    expect(createClient).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([
      store.readApproved("ru", ["common"]),
      store.readApproved("ru", ["common", "common"]),
    ]);

    expect(first).toEqual([]);
    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
    expect(reportDegraded).not.toHaveBeenCalled();
  });

  it("does not connect for canonical English or an empty namespace request", async () => {
    const createClient = vi.fn(() => ({ connect: vi.fn(), query: vi.fn() }) as unknown as Client);
    const store = createHyperdriveUiTranslationStore("postgres://runtime@hyperdrive/vico", createClient);

    await expect(store.readApproved("en", ["common"])).resolves.toEqual([]);
    await expect(store.readApproved("ru", [])).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("falls back to no persistent rows for a connection outage and reports once", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const createClient = () => ({
      connect: vi.fn(async () => { throw unavailable; }),
      query: vi.fn(),
    }) as unknown as Client;
    const reportDegraded = vi.fn();
    const store = createHyperdriveUiTranslationStore(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    );

    await expect(store.readApproved("ru", ["common"])).resolves.toEqual([]);
    await expect(store.readApproved("he", ["common"])).resolves.toEqual([]);
    expect(reportDegraded).toHaveBeenCalledOnce();
    expect(reportDegraded).toHaveBeenCalledWith("unavailable");
  });

  it("falls back for a missing translation table without masking other SQL failures", async () => {
    const missingTable = Object.assign(new Error("missing table"), { code: "42P01" });
    const query = vi.fn(async () => { throw missingTable; });
    const createClient = () => ({ connect: vi.fn(async () => undefined), query }) as unknown as Client;
    const reportDegraded = vi.fn();
    const store = createHyperdriveUiTranslationStore(
      "postgres://runtime@hyperdrive/vico",
      createClient,
      reportDegraded,
    );

    await expect(store.readApproved("ru", ["common"])).resolves.toEqual([]);
    expect(reportDegraded).toHaveBeenCalledWith("schema-mismatch");

    const authFailure = Object.assign(new Error("permission denied"), { code: "42501" });
    const authStore = createHyperdriveUiTranslationStore(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => undefined),
        query: vi.fn(async () => { throw authFailure; }),
      }) as unknown as Client,
      vi.fn(),
    );
    await expect(authStore.readApproved("ru", ["common"])).rejects.toBe(authFailure);
  });

  it("does not mask a programming failure while connecting", async () => {
    const failure = new TypeError("client programming error");
    const store = createHyperdriveUiTranslationStore(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => { throw failure; }),
        query: vi.fn(),
      }) as unknown as Client,
      vi.fn(),
    );

    await expect(store.readApproved("ru", ["common"])).rejects.toBe(failure);
  });
});
