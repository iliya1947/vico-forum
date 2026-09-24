import { describe, expect, it, vi } from "vitest";

import {
  TranslationTaskExecutorDispatcher,
  UnknownTranslationTaskKindError,
} from "./translation-task-dispatch";

const message = { translationTaskId: "10000000-0000-4000-8000-000000000001" };

function executors(kind: string | undefined) {
  const ui = vi.fn(async () => ({
    outcome: "already-claimed" as const,
    delivery: "ack" as const,
  }));
  const title = vi.fn(async () => ({
    outcome: "published" as const,
    delivery: "ack" as const,
  }));
  const body = vi.fn(async () => ({
    outcome: "published" as const,
    delivery: "ack" as const,
  }));
  const dispatcher = new TranslationTaskExecutorDispatcher({
    kinds: { findKind: vi.fn(async () => kind) },
    ui: { execute: ui },
    contentTopicTitle: { execute: title },
    contentPostBody: { execute: body },
  });
  return { dispatcher, ui, title, body };
}

describe("TranslationTaskExecutorDispatcher", () => {
  it("routes a UI task before any content interpretation", async () => {
    const { dispatcher, ui, title, body } = executors("ui");

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "already-claimed",
      delivery: "ack",
    });
    expect(ui).toHaveBeenCalledWith(message);
    expect(title).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });

  it("routes a content-topic-title task only to the title executor", async () => {
    const { dispatcher, ui, title, body } = executors("content-topic-title");

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(title).toHaveBeenCalledWith(message);
    expect(ui).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });

  it("routes a content-post-body task only to the body executor", async () => {
    const { dispatcher, ui, title, body } = executors("content-post-body");

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(body).toHaveBeenCalledWith(message);
    expect(ui).not.toHaveBeenCalled();
    expect(title).not.toHaveBeenCalled();
  });

  it("acknowledges a missing task without invoking an executor", async () => {
    const { dispatcher, ui, title, body } = executors(undefined);

    await expect(dispatcher.execute(message)).resolves.toEqual({
      outcome: "not-found",
      delivery: "ack",
    });
    expect(ui).not.toHaveBeenCalled();
    expect(title).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });

  it("fails safely on an unknown persisted kind before any executor can claim it", async () => {
    const { dispatcher, ui, title, body } = executors("unknown-kind");

    await expect(dispatcher.execute(message)).rejects.toBeInstanceOf(
      UnknownTranslationTaskKindError,
    );
    expect(ui).not.toHaveBeenCalled();
    expect(title).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });
});
