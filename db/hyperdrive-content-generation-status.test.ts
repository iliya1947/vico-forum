import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  ContentGenerationStatusStorageUnavailableError,
} from "../app/localization/content-generation-status";
import { createHyperdriveContentGenerationStatusReader } from "./hyperdrive-content-generation-status";

const revisions = [
  {
    contentType: "topic-title" as const,
    contentId: "topic-1",
    revisionId: "title-r1",
    originalContent: "Title",
    sourceLocale: "en",
  },
  {
    contentType: "post-body" as const,
    contentId: "post-1",
    revisionId: "post-r1",
    originalContent: "Body",
    sourceLocale: "en",
  },
];

function client(options: {
  connectError?: unknown;
  queryError?: unknown;
  rows?: readonly Record<string, unknown>[];
  cleanupError?: unknown;
  cleanupThrows?: boolean;
}) {
  return {
    connect: vi.fn(async () => {
      if (options.connectError) throw options.connectError;
    }),
    query: vi.fn(async () => {
      if (options.queryError) throw options.queryError;
      return { rows: options.rows ?? [], rowCount: options.rows?.length ?? 0 };
    }),
    end: vi.fn(() => {
      if (options.cleanupThrows) throw options.cleanupError;
      if (options.cleanupError) return Promise.reject(options.cleanupError);
      return Promise.resolve();
    }),
  } as unknown as Client;
}

describe("Hyperdrive content generation status reader", () => {
  it("reads every requested unit with one bounded PostgreSQL query", async () => {
    const now = new Date("2026-09-25T16:00:00.000Z");
    const fake = client({
      rows: [
        {
          translation_kind: "content-topic-title",
          source_key: "topic-1",
          revision_id: "title-r1",
          task_revision_id: "title-r1",
          task_status: "pending",
          allowance_state: null,
          allowance_retry_not_before: null,
          database_now: now,
        },
        {
          translation_kind: "content-post-body",
          source_key: "post-1",
          revision_id: "post-r1",
          task_revision_id: "post-r1",
          task_status: "processing",
          allowance_state: null,
          allowance_retry_not_before: null,
          database_now: now,
        },
      ],
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fake,
    );

    await expect(reader.readCurrent(revisions, "he")).resolves.toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
        status: "pending",
      },
      {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "post-r1",
        targetLocale: "he",
        status: "processing",
      },
    ]);
    expect(fake.query).toHaveBeenCalledTimes(1);
  });

  it("ignores sibling-revision task state and returns idle for the requested exact revision", async () => {
    const fake = client({
      rows: [{
        translation_kind: "content-post-body",
        source_key: "post-1",
        revision_id: "post-r1",
        task_revision_id: "post-old",
        task_status: "processing",
        allowance_state: null,
        allowance_retry_not_before: null,
        database_now: new Date(),
      }],
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fake,
    );

    await expect(reader.readCurrent([revisions[1]!], "he")).resolves.toEqual([{
      contentType: "post-body",
      contentId: "post-1",
      revisionId: "post-r1",
      targetLocale: "he",
      status: "idle",
    }]);
  });

  it("classifies established availability failures and preserves unexpected failures", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const unavailableReader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => client({ connectError: unavailable }),
    );
    await expect(unavailableReader.readCurrent(revisions, "he"))
      .rejects.toMatchObject({
        name: "ContentGenerationStatusStorageUnavailableError",
        cause: unavailable,
      });

    const queryTimeout = new Error("Query read timeout");
    const wrapped = Object.assign(new Error("wrapped"), { cause: queryTimeout });
    const timeoutReader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => client({ queryError: wrapped }),
    );
    await expect(timeoutReader.readCurrent(revisions, "he"))
      .rejects.toBeInstanceOf(ContentGenerationStatusStorageUnavailableError);

    const unexpected = new TypeError("unexpected configuration bug");
    const brokenReader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => client({ connectError: unexpected }),
    );
    await expect(brokenReader.readCurrent(revisions, "he")).rejects.toBe(unexpected);
  });

  it.each([
    ["synchronous cleanup throw", true],
    ["asynchronous cleanup rejection", false],
  ])("cleanup cannot replace a successful status read across %s", async (_label, cleanupThrows) => {
    const fake = client({
      rows: [],
      cleanupError: new Error("cleanup failed"),
      cleanupThrows,
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgresql://example.invalid/db",
      () => fake,
    );

    await expect(reader.readCurrent([], "he")).resolves.toEqual([]);
  });
});
