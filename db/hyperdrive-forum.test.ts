import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  createHyperdriveForumReader,
  ForumStorageUnavailableError,
} from "./hyperdrive-forum";

function client(options: {
  connectError?: unknown;
  queryError?: unknown;
}) {
  return {
    connect: vi.fn(async () => {
      if (options.connectError) throw options.connectError;
    }),
    query: vi.fn(async () => {
      if (options.queryError) throw options.queryError;
      return { rows: [], rowCount: 0 };
    }),
    end: vi.fn(async () => undefined),
  } as unknown as Client;
}

describe("Hyperdrive forum reader availability boundary", () => {
  it.each([
    Object.assign(new Error("connection unavailable"), { code: "08006" }),
    new Error("timeout expired"),
  ])("classifies established connection availability failures", async (failure) => {
    const reader = createHyperdriveForumReader(
      "postgresql://example.invalid/db",
      () => client({ connectError: failure }),
    );

    await expect(reader.readTopicPage("topic-1")).rejects.toMatchObject({
      name: "ForumStorageUnavailableError",
      cause: failure,
    });
  });

  it("classifies established query timeout failures through the Drizzle cause chain", async () => {
    const failure = new Error("Query read timeout");
    const reader = createHyperdriveForumReader(
      "postgresql://example.invalid/db",
      () => client({ queryError: failure }),
    );

    try {
      await reader.readTopicPage("topic-1");
      throw new Error("expected reader failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ForumStorageUnavailableError);
      const drizzleError = (error as Error & { cause?: unknown }).cause as Error & { cause?: unknown };
      expect(drizzleError).toBeInstanceOf(Error);
      expect(drizzleError.cause).toBe(failure);
    }
  });

  it.each([
    Object.assign(new Error("relation does not exist"), { code: "42P01" }),
    new TypeError("unexpected repository bug"),
  ])("does not reclassify unexpected query failures", async (failure) => {
    const reader = createHyperdriveForumReader(
      "postgresql://example.invalid/db",
      () => client({ queryError: failure }),
    );

    try {
      await reader.readTopicPage("topic-1");
      throw new Error("expected reader failure");
    } catch (error) {
      expect(error).not.toBeInstanceOf(ForumStorageUnavailableError);
      expect((error as Error & { cause?: unknown }).cause).toBe(failure);
    }
  });

  it("uses the typed forum storage error for classified failures", async () => {
    const failure = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    const reader = createHyperdriveForumReader(
      "postgresql://example.invalid/db",
      () => client({ connectError: failure }),
    );

    try {
      await reader.readTopicPage("topic-1");
      throw new Error("expected reader failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ForumStorageUnavailableError);
      expect((error as Error & { cause?: unknown }).cause).toBe(failure);
    }
  });
});
