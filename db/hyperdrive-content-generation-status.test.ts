import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  ContentGenerationStatusStorageUnavailableError,
} from "../app/localization/content-generation-status.server";
import {
  ContentGenerationStatusIntegrityError,
  createHyperdriveContentGenerationStatusReader,
} from "./hyperdrive-content-generation-status";

function fakeClient(options: {
  rows?: Array<{ ordinal: number; state: string; retry_after_seconds: number | null }>;
  connectError?: unknown;
  queryError?: unknown;
  cleanupError?: unknown;
}) {
  return {
    connect: vi.fn(async () => {
      if (options.connectError) throw options.connectError;
    }),
    query: vi.fn(async () => {
      if (options.queryError) throw options.queryError;
      return { rows: options.rows ?? [], rowCount: options.rows?.length ?? 0 };
    }),
    end: vi.fn(() => options.cleanupError
      ? Promise.reject(options.cleanupError)
      : Promise.resolve()),
  } as unknown as Client;
}

const units = [
  {
    contentType: "topic-title" as const,
    contentId: "topic-1",
    revisionId: "title-r1",
    targetLocale: "he",
  },
  {
    contentType: "post-body" as const,
    contentId: "post-1",
    revisionId: "post-r1",
    targetLocale: "he",
  },
];

describe("Hyperdrive content generation status reader", () => {
  it("uses one bounded batch query for all page units and preserves input order", async () => {
    const client = fakeClient({
      rows: [
        { ordinal: 0, state: "pending", retry_after_seconds: null },
        { ordinal: 1, state: "deferred", retry_after_seconds: 7 },
      ],
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => client,
    );

    await expect(reader.readCurrent(units)).resolves.toEqual([
      { ...units[0], state: "pending" },
      { ...units[1], state: "deferred", retryAfterSeconds: 7 },
    ]);
    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, values] = vi.mocked(client.query).mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("task.generation = head.current_generation");
    expect(sql).toContain("title_meta.revision_id is distinct from revision_id");
    expect(sql).toContain("body_meta.revision_id is distinct from revision_id");
    expect(values).toHaveLength(12);
  });

  it("performs no database work for an empty page batch", async () => {
    const client = fakeClient({});
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => client,
    );
    await expect(reader.readCurrent([])).resolves.toEqual([]);
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });

  it("classifies established availability failures and keeps cleanup best-effort", async () => {
    const failure = new Error("Query read timeout");
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fakeClient({
        queryError: failure,
        cleanupError: new Error("cleanup failed"),
      }),
    );

    try {
      await reader.readCurrent([units[0]!]);
      throw new Error("expected status storage failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentGenerationStatusStorageUnavailableError);
      expect((error as Error & { cause?: unknown }).cause).toBe(failure);
    }
  });

  it("propagates unexpected failures and rejects malformed result rows", async () => {
    const unexpected = new TypeError("unexpected query bug");
    const broken = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fakeClient({ queryError: unexpected }),
    );
    await expect(broken.readCurrent([units[0]!])).rejects.toBe(unexpected);

    const malformed = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fakeClient({
        rows: [{ ordinal: 1, state: "pending", retry_after_seconds: null }],
      }),
    );
    await expect(malformed.readCurrent([units[0]!]))
      .rejects.toBeInstanceOf(ContentGenerationStatusIntegrityError);
  });
});
