import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumWriterContext } from "./request-context";
import { helpSolutionsCategoryAction, sectionAction, topicAction } from "./actions.server";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-identifiers";

const id = "23b93562-0550-4eef-88af-f951d6ea6138";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";

function setup() {
  const context = new RouterContextProvider();
  context.set(authSessionContext, { user: { id: "author" } } as AuthSession);
  context.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
  const createTopic = vi.fn(async () => ({ topicId: "created-topic" }));
  const createReply = vi.fn(async () => ({ postId: "created-post" }));
  context.set(forumWriterContext, { createTopic, createReply } as never);
  return { context, createTopic, createReply };
}

function request(path: string, intent: string, ids: string) {
  const data = new FormData();
  data.set("intent", intent);
  data.set("title", "Title");
  data.set("body", "Body");
  data.set("editorDraftId", draftId);
  data.set("editorDraftVersion", "0");
  data.set("editorAttachmentIds", ids);
  return new Request("https://forum.test" + path, {
    method: "POST", headers: { Origin: "https://forum.test" }, body: data,
  });
}

describe("authoring attachment manifest boundary", () => {
  it("forwards exact selected IDs for regular topic, Help question, and reply", async () => {
    const ids = JSON.stringify([id]);
    const regular = setup();
    const response = await sectionAction({
      request: request("/en/sections/my-section", "createTopic", ids),
      params: { locale: "en", sectionId: "my-section" }, context: regular.context,
    });
    expect((response as Response).status).toBe(302);
    expect(regular.createTopic).toHaveBeenCalledWith(expect.objectContaining({
      sectionId: "my-section", authorId: "author", attachmentIds: [id], draftId, draftVersion: 0,
    }));

    const help = setup();
    await helpSolutionsCategoryAction({
      request: request("/en/categories/" + HELP_SOLUTIONS_CATEGORY_ID, "createHelpQuestion", ids),
      params: { locale: "en", categoryId: HELP_SOLUTIONS_CATEGORY_ID }, context: help.context,
    });
    expect(help.createTopic).toHaveBeenCalledWith(expect.objectContaining({
      authorId: "author", attachmentIds: [id],
    }));

    const reply = setup();
    await topicAction({
      request: request("/en/topics/some-topic", "reply", ids),
      params: { locale: "en", topicId: "some-topic" }, context: reply.context,
    });
    expect(reply.createReply).toHaveBeenCalledWith(expect.objectContaining({
      topicId: "some-topic", authorId: "author", attachmentIds: [id],
    }));
  });

  it("rejects duplicate or untrusted IDs before making a publication mutation", async () => {
    for (const bad of [JSON.stringify([id, id]), '["bad"]', "not-json", "{}"]) {
      const { context, createReply } = setup();
      const response = await topicAction({
        request: request("/en/topics/some-topic", "reply", bad),
        params: { locale: "en", topicId: "some-topic" }, context,
      });
      expect((response as { init?: { status?: number } }).init?.status).toBe(400);
      expect(createReply).not.toHaveBeenCalled();
    }
  });

  it("permits an explicit empty selection without changing text-only publication", async () => {
    const { context, createReply } = setup();
    await topicAction({
      request: request("/en/topics/some-topic", "reply", "[]"),
      params: { locale: "en", topicId: "some-topic" }, context,
    });
    expect(createReply).toHaveBeenCalledWith(expect.objectContaining({ attachmentIds: [] }));
  });
});
