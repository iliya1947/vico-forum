import { describe, expect, it, vi } from "vitest";

import {
  TranslationTaskExecutorDispatcher,
  TranslationTaskExecutorUnavailableError,
  UnknownTranslationTaskKindError,
} from "./translation-task-dispatch";

const message = { translationTaskId: "10000000-0000-4000-8000-000000000001" };

describe("TranslationTaskExecutorDispatcher", () => {
  it("routes a UI task to the unchanged UI executor before any content interpretation", async () => {
    const ui = vi.fn(async () => ({ outcome: "already-claimed" as const, delivery: "ack" as const }));
    const content = vi.fn(async () => ({ outcome: "already-claimed" as const, delivery: "ack" as const }));
    const dispatcher = new TranslationTaskExecutorDispatcher({
      kinds: { findKind: vi.fn(async () => "ui") },
      ui: { execute: ui },
      contentTopicTitle: { execute: content },
    });

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "already-claimed",
      delivery: "ack",
    });
    expect(ui).toHaveBeenCalledWith(message);
    expect(content).not.toHaveBeenCalled();
  });

  it("routes a content-topic-title task only to the content executor", async () => {
    const ui = vi.fn(async () => ({ outcome: "already-claimed" as const, delivery: "ack" as const }));
    const content = vi.fn(async () => ({ outcome: "published" as const, delivery: "ack" as const }));
    const dispatcher = new TranslationTaskExecutorDispatcher({
      kinds: { findKind: vi.fn(async () => "content-topic-title") },
      ui: { execute: ui },
      contentTopicTitle: { execute: content },
    });

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(content).toHaveBeenCalledWith(message);
    expect(ui).not.toHaveBeenCalled();
  });

  it("rejects post-body delivery before any existing executor can claim it", async () => {
    const ui = vi.fn();
    const content = vi.fn();
    const dispatcher = new TranslationTaskExecutorDispatcher({
      kinds: { findKind: vi.fn(async () => "content-post-body") },
      ui: { execute: ui },
      contentTopicTitle: { execute: content },
    });

    await expect(dispatcher.execute(message)).rejects.toMatchObject({
      name: "TranslationTaskExecutorUnavailableError",
      translationKind: "content-post-body",
    });
    await expect(dispatcher.execute(message)).rejects.toBeInstanceOf(
      TranslationTaskExecutorUnavailableError,
    );
    expect(ui).not.toHaveBeenCalled();
    expect(content).not.toHaveBeenCalled();
  });

  it("acknowledges a missing task without invoking either executor", async () => {
    const ui = vi.fn();
    const content = vi.fn();
    const dispatcher = new TranslationTaskExecutorDispatcher({
      kinds: { findKind: vi.fn(async () => undefined) },
      ui: { execute: ui },
      contentTopicTitle: { execute: content },
    });

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "not-found",
      delivery: "ack",
    });
    expect(ui).not.toHaveBeenCalled();
    expect(content).not.toHaveBeenCalled();
  });

  it("fails safely on an unknown persisted kind before any executor can claim it", async () => {
    const ui = vi.fn();
    const content = vi.fn();
    const dispatcher = new TranslationTaskExecutorDispatcher({
      kinds: { findKind: vi.fn(async () => "unknown-kind") },
      ui: { execute: ui },
      contentTopicTitle: { execute: content },
    });

    await expect(dispatcher.execute(message)).rejects.toBeInstanceOf(
      UnknownTranslationTaskKindError,
    );
    expect(ui).not.toHaveBeenCalled();
    expect(content).not.toHaveBeenCalled();
  });
});
