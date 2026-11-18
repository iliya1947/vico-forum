import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumWriterContext } from "./request-context";
import { topicAction } from "./actions.server";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

const session = {
  user: { id: "viewer-a", name: "Ada", email: "ada@example.test",
    emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "s1", token: "token", userId: "viewer-a",
    expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

function setup(authenticated = true) {
  const context = new RouterContextProvider();
  const setTopicBookmark = vi.fn(async ({ bookmarked }: { bookmarked: boolean }) => bookmarked);
  context.set(authSessionContext, authenticated ? session : null);
  context.set(forumWriterContext, { setTopicBookmark } as never);
  return { context, setTopicBookmark };
}

function form(entries: Array<[string, string | File]>) {
  const body = new FormData();
  for (const [key, value] of entries) body.append(key, value);
  return body;
}
const valid = (): Array<[string, string | File]> => [
  ["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"], ["bookmarked", "true"],
];
function request(entries = valid(), origin = "https://forum.example", method = "POST") {
  return new Request("https://forum.example/en/topics/topic-1", {
    method, headers: { Origin: origin }, body: form(entries),
  });
}
function submit(req: Request, context: RouterContextProvider) {
  return topicAction({ request: req,
    params: { locale: "en", topicId: "topic-1" }, context });
}

describe("personal Bookmarks canonical topic action", () => {
  it("uses server session actor and route topic without any RBAC permission", async () => {
    const { context, setTopicBookmark } = setup();
    const add = await submit(request(), context);
    expect(add).toMatchObject({
      data: { operation: "topicBookmark", ok: true, actorId: "viewer-a",
        topicId: "topic-1", bookmarked: true },
      init: { headers: { "Cache-Control": "private, no-store" } },
    });
    expect(setTopicBookmark).toHaveBeenCalledWith({
      topicId: "topic-1", actorId: "viewer-a", bookmarked: true,
    });
    const remove = await submit(request([
      ["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"], ["bookmarked", "false"],
    ]), context);
    expect(remove).toMatchObject({ data: { operation: "topicBookmark", ok: true, bookmarked: false } });
    expect(setTopicBookmark).toHaveBeenCalledTimes(2);
  });

  it.each([
    [false, "https://forum.example", 401],
    [true, "https://evil.example", 403],
  ] as const)("blocks guest and cross-origin before parsing form", async (authenticated, origin, status) => {
    const { context, setTopicBookmark } = setup(authenticated);
    const req = request(valid(), origin);
    const parse = vi.spyOn(req, "formData");
    expect(await submit(req, context)).toMatchObject({ init: { status,
      headers: { "Cache-Control": "private, no-store" } } });
    expect(parse).not.toHaveBeenCalled();
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it.each([
    ["TRUE", 400], ["1", 400], ["", 400],
  ] as const)("rejects noncanonical boolean %s", async (raw, status) => {
    const { context, setTopicBookmark } = setup();
    const result = await submit(request([
      ["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"], ["bookmarked", raw],
    ]), context);
    expect(result).toMatchObject({ data: { operation: "topicBookmark", error: "invalid" },
      init: { status } });
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it.each([
    [["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"]],
    [["intent", "setTopicBookmark"], ["bookmarked", "true"]],
    [...valid(), ["topicId", "forged"]],
    [...valid(), ["userId", "forged"]],
    [...valid(), ["returnTo", "https://evil.example"]],
    [...valid(), ["title", "unrelated"]],
    [...valid(), ["watching", "true"]],
    [...valid(), ["intent", "reply"]],
    [["intent", "reply"], ...valid()],
    [["intent", "setTopicWatch"], ...valid()],
    [...valid(), ["intent", "setTopicWatch"]],
    [["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"],
      ["bookmarked", "true"], ["bookmarked", "false"]],
    [["intent", "setTopicBookmark"], ["editorActorId", "viewer-a"],
      ["editorActorId", "viewer-a"], ["bookmarked", "true"]],
  ] as Array<Array<[string, string | File]>>)("rejects malformed/duplicate/mixed/forged values", async (...entries) => {
    const { context, setTopicBookmark } = setup();
    // it.each spreads the list of entries as the single case's argument tuple.
    const body = entries as Array<[string, string | File]>;
    const result = await submit(request(body), context);
    expect(result).toMatchObject({ data: { operation: "topicBookmark", error: "invalid" },
      init: { status: 400 } });
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it.each(["intent", "editorActorId", "bookmarked"])("rejects File in %s", async field => {
    const { context, setTopicBookmark } = setup();
    const body = valid().map(([key, value]): [string, string | File] =>
      key === field ? [key, new File(["payload"], "file.txt")] : [key, value]);
    const result = await submit(request(body), context);
    // File used for intent cannot select the bookmark writer.
    expect(result).toMatchObject({ data: { error: "invalid" }, init: { status: 400 } });
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it("rejects stale identity with discriminated private 409", async () => {
    const { context, setTopicBookmark } = setup();
    const result = await submit(request([
      ["intent", "setTopicBookmark"], ["editorActorId", "another-user"], ["bookmarked", "true"],
    ]), context);
    expect(result).toMatchObject({ data: { operation: "topicBookmark", error: "conflict" },
      init: { status: 409, headers: { "Cache-Control": "private, no-store" } } });
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it("does not mutate for a non-POST method", async () => {
    const { context, setTopicBookmark } = setup();
    const result = await submit(request(valid(), "https://forum.example", "PUT"), context);
    expect(result).toMatchObject({ data: { operation: "topicBookmark", error: "invalid" },
      init: { status: 400 } });
    expect(setTopicBookmark).not.toHaveBeenCalled();
  });

  it.each([
    [new AccountInactiveError(), 401, "unauthenticated"],
    [new AccountMissingError(), 401, "unauthenticated"],
    [new ForumEntityNotFoundError(), 404, "notFound"],
    [new ForumStorageUnavailableError(), 503, "unavailable"],
  ] as const)("classifies authoritative errors without claiming success", async (error, status, code) => {
    const { context, setTopicBookmark } = setup();
    setTopicBookmark.mockRejectedValueOnce(error);
    expect(await submit(request(), context)).toMatchObject({
      data: { operation: "topicBookmark", error: code },
      init: { status, headers: { "Cache-Control": "private, no-store" } },
    });
  });

  it("propagates unexpected programming failures", async () => {
    const { context, setTopicBookmark } = setup();
    const bug = new TypeError("schema mismatch");
    setTopicBookmark.mockRejectedValueOnce(bug);
    await expect(submit(request(), context)).rejects.toBe(bug);
  });
});
