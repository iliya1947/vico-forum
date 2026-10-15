import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  ContentGenerationStatusIntegrityError,
  ContentGenerationStatusStorageUnavailableError,
} from "../app/localization/content-generation-status";
import { createHyperdriveContentGenerationStatusReader } from "./hyperdrive-content-generation-status";

const identities = [
  { contentType: "topic-title" as const, contentId: "topic-1", revisionId: "title-r1" },
  { contentType: "post-body" as const, contentId: "post-1", revisionId: "post-r1" },
];

function client(rows: unknown[], options: {
  connectError?: unknown;
  queryError?: unknown;
  cleanupError?: unknown;
} = {}) {
  return {
    connect: vi.fn(async () => {
      if (options.connectError) throw options.connectError;
    }),
    query: vi.fn(async () => {
      if (options.queryError) throw options.queryError;
      return { rows };
    }),
    end: vi.fn(async () => {
      if (options.cleanupError) throw options.cleanupError;
    }),
  } as unknown as Client;
}

describe("Hyperdrive content generation status reader", () => {
  it("uses one batch query and collapses only bounded public state", async () => {
    const fake = client([
      {
        ord: 1,
        content_type: "topic-title",
        content_id: "topic-1",
        revision_id: "title-r1",
        task_status: "pending",
        task_revision_id: "title-r1",
        allowance_state: "deferred",
        retry_after_seconds: "17",
      },
      {
        ord: 2,
        content_type: "post-body",
        content_id: "post-1",
        revision_id: "post-r1",
        task_status: "processing",
        task_revision_id: "post-r1",
        allowance_state: null,
        retry_after_seconds: null,
      },
    ]);
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgres://runtime@hyperdrive/vico",
      () => fake,
    );

    await expect(reader.readCurrent(identities, "he")).resolves.toEqual([
      {
        ...identities[0],
        state: "deferred",
        retryAfterSeconds: 17,
      },
      {
        ...identities[1],
        state: "processing",
      },
    ]);
    expect(fake.query).toHaveBeenCalledTimes(1);
    expect(fake.query).toHaveBeenCalledWith(
      expect.stringContaining("jsonb_array_elements"),
      [JSON.stringify(identities), "he"],
    );
  });

  it("ignores current-generation work for a sibling revision", async () => {
    const fake = client([{
      ord: 1,
      content_type: "topic-title",
      content_id: "topic-1",
      revision_id: "title-r1",
      task_status: "pending",
      task_revision_id: "title-r0",
      allowance_state: null,
      retry_after_seconds: null,
    }]);
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgres://runtime@hyperdrive/vico",
      () => fake,
    );

    await expect(reader.readCurrent([identities[0]!], "he")).resolves.toEqual([
      { ...identities[0], state: "idle" },
    ]);
  });

  it("classifies established availability failures and cleanup cannot replace them", async () => {
    const failure = new Error("Query read timeout");
    const fake = client([], {
      queryError: failure,
      cleanupError: new Error("cleanup failed"),
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgres://runtime@hyperdrive/vico",
      () => fake,
    );

    await expect(reader.readCurrent([identities[0]!], "he"))
      .rejects.toBeInstanceOf(ContentGenerationStatusStorageUnavailableError);
  });

  it("preserves unexpected failures across cleanup", async () => {
    const failure = Object.assign(new Error("relation missing"), { code: "42P01" });
    const fake = client([], {
      queryError: failure,
      cleanupError: new Error("cleanup failed"),
    });
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgres://runtime@hyperdrive/vico",
      () => fake,
    );

    await expect(reader.readCurrent([identities[0]!], "he")).rejects.toBe(failure);
  });

  it("rejects malformed batch cardinality as integrity failure", async () => {
    const reader = createHyperdriveContentGenerationStatusReader(
      "postgres://runtime@hyperdrive/vico",
      () => client([]),
    );

    await expect(reader.readCurrent([identities[0]!], "he"))
      .rejects.toBeInstanceOf(ContentGenerationStatusIntegrityError);
  });
});
