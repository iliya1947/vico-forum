import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext, forumWriterContext } from "./request-context";
import { ForumAuthorizationError, ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { topicAction } from "./actions.server";

const target = { locale: "he", topicId: "topic/עברית" };
const privateHeaders = { "Cache-Control": "private, no-store" };
function makeEnv(grants: readonly string[] = [], signedIn = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, signedIn ? { user: { id: "actor-A" } } as never : null);
  const has = vi.fn(async (key: string) => grants.includes(key));
  context.set(authorizationContext, { forUser: () => ({ has }) } as never);
  const correctPostBodySourceLocale = vi.fn(async () => undefined);
  const readPostHistory = vi.fn(async () => [{
    id: "revision-1", authorId: "author", authorName: "Автор",
    originalContent: "Private **original**\n\nשלום", sourceLocale: "he",
    createdAt: new Date("2026-01-02T03:04:05Z"),
  }]);
  context.set(forumWriterContext, { correctPostBodySourceLocale } as never);
  context.set(forumReaderContext, { readPostHistory } as never);
  return { context, has, correctPostBodySourceLocale, readPostHistory };
}
function request(fields: Record<string, string>, origin = "https://forum.example") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request("https://forum.example/he/topics/topic%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA", {
    method: "POST", headers: { Origin: origin }, body: form,
  });
}
const correction = {
  intent: "correctPostSourceLocale", operationScope: "any", inlineQuickAction: "1",
  editorActorId: "actor-A", postId: "post/עברית", expectedRevisionId: "r1", sourceLocale: "fr",
};
const history = { intent: "readPostHistory", editorActorId: "actor-A", postId: "post/עברית" };
const run = (e: ReturnType<typeof makeEnv>, req: Request) =>
  topicAction({ context: e.context, params: target, request: req });

describe("AP-07 canonical message action transport", () => {
  it("uses existing Any-only writer with current actor and inline private data; old caller still redirects", async () => {
    const e = makeEnv(["forum.sourceLocale.correctAny"]);
    const result = await run(e, request(correction));
    expect(result).toMatchObject({ data: { ok: true }, init: { headers: privateHeaders } });
    expect(e.correctPostBodySourceLocale).toHaveBeenCalledWith({
      topicId: "topic/עברית", postId: "post/עברית", expectedRevisionId: "r1",
      sourceLocale: "fr", actorId: "actor-A", scope: "any",
    });
    const old = await run(e, request({ ...correction, inlineQuickAction: "" }));
    expect(old).toMatchObject({ data: { error: "invalid" }, init: { status: 400 } });
    const ordinary = await run(e, request({ ...correction, inlineQuickAction: "1" , editorActorId: "actor-A" }));
    expect(ordinary).toMatchObject({ data: { ok: true } });
    const normalFields = { ...correction };
    delete (normalFields as Partial<typeof correction>).inlineQuickAction;
    const redirectResult = await run(e, request(normalFields));
    expect(redirectResult).toBeInstanceOf(Response);
    expect((redirectResult as Response).headers.get("Location"))
      .toBe("/he/topics/topic%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA#post-post%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA");
  });

  it("requires Any independent of Own, same origin and current session identity before writing", async () => {
    for (const grants of [[], ["forum.sourceLocale.correctOwn"], ["forum.post.history.read"]]) {
      const e = makeEnv(grants);
      expect(await run(e, request(correction))).toMatchObject({
        data: { error: "forbidden" }, init: { status: 403, headers: privateHeaders },
      });
      expect(e.correctPostBodySourceLocale).not.toHaveBeenCalled();
    }
    const origin = makeEnv(["forum.sourceLocale.correctAny"]);
    expect(await run(origin, request(correction, "https://outside.test"))).toMatchObject({
      data: { error: "origin" }, init: { status: 403, headers: privateHeaders },
    });
    const identity = makeEnv(["forum.sourceLocale.correctAny"]);
    expect(await run(identity, request({ ...correction, editorActorId: "old-user" }))).toMatchObject({
      data: { error: "conflict" }, init: { status: 409, headers: privateHeaders },
    });
    const guest = makeEnv(["forum.sourceLocale.correctAny"], false);
    expect(await run(guest, request(correction))).toMatchObject({
      data: { error: "unauthenticated" }, init: { status: 401, headers: privateHeaders },
    });
    for (const e of [origin, identity, guest]) expect(e.correctPostBodySourceLocale).not.toHaveBeenCalled();
  });

  it("returns private, non-redirecting errors for state, membership, CAS and classified storage failures", async () => {
    for (const [error, status, code] of [
      [new ForumStateConflictError(), 409, "conflict"],
      [new ForumAuthorizationError(), 403, "forbidden"],
      [new ForumEntityNotFoundError(), 404, "notFound"],
      [new ForumStorageUnavailableError(), 503, "unavailable"],
    ] as const) {
      const e = makeEnv(["forum.sourceLocale.correctAny"]);
      e.correctPostBodySourceLocale.mockRejectedValueOnce(error);
      expect(await run(e, request(correction))).toMatchObject({
        data: { operation: "sourceLocaleCorrection", error: code },
        init: { status, headers: privateHeaders },
      });
    }
    const unknown = new Error("unexpected DB");
    const e = makeEnv(["forum.sourceLocale.correctAny"]);
    e.correctPostBodySourceLocale.mockRejectedValueOnce(unknown);
    await expect(run(e, request(correction))).rejects.toBe(unknown);
  });

  it("rejects ambiguous message identity and duplicate inline markers before any write", async () => {
    for (const field of ["intent", "postId", "expectedRevisionId", "sourceLocale", "operationScope", "editorActorId", "inlineQuickAction"]) {
      const e = makeEnv(["forum.sourceLocale.correctAny"]);
      const body = new FormData();
      for (const [key, value] of Object.entries(correction)) body.append(key, value);
      body.append(field, "forged");
      const req = new Request("https://forum.example/he/topics/topic", {
        method: "POST", headers: { Origin: "https://forum.example" }, body,
      });
      expect(await run(e, req)).toMatchObject({ init: { status: 400, headers: privateHeaders } });
      expect(e.correctPostBodySourceLocale).not.toHaveBeenCalled();
    }
  });

  it("reads revisions only with independent History permission, bound to topic/post, with private cache headers", async () => {
    const denied = makeEnv(["forum.sourceLocale.correctAny"]);
    expect(await run(denied, request(history))).toMatchObject({
      data: { error: "forbidden" }, init: { status: 403, headers: privateHeaders },
    });
    expect(denied.readPostHistory).not.toHaveBeenCalled();
    const e = makeEnv(["forum.post.history.read"]);
    const res = await run(e, request(history));
    expect(res).toMatchObject({ data: { operation: "postHistory", postId: history.postId },
      init: { status: 200, headers: privateHeaders } });
    expect(e.readPostHistory).toHaveBeenCalledWith("post/עברית", "topic/עברית");
    expect(res).toHaveProperty("data.revisions.0.originalContent", "Private **original**\n\nשלום");
    expect(res).toHaveProperty("data.revisions.0.createdAt", "2026-01-02T03:04:05.000Z");
    const missing = makeEnv(["forum.post.history.read"]);
    missing.readPostHistory.mockResolvedValueOnce([]);
    expect(await run(missing, request(history))).toMatchObject({
      data: { error: "notFound" }, init: { status: 404, headers: privateHeaders },
    });
  });

  it("SA04-H allowlists history .data and masks malformed deleted author without losing revision content", async () => {
    const denied = makeEnv([]);
    const deniedRead = denied.readPostHistory;
    expect(await run(denied, request(history))).toMatchObject({
      init: { status: 403, headers: privateHeaders },
    });
    expect(deniedRead).not.toHaveBeenCalled();

    const e = makeEnv(["forum.post.history.read"]);
    e.readPostHistory.mockResolvedValueOnce([
      {
        id: "old", authorId: "retained-author", authorName: "SECRET_RETAINED_HISTORY_NAME",
        authorIdentityKind: "deleted", originalContent: "Unmodified **private**\\nשלום", sourceLocale: "he",
        createdAt: new Date("2026-10-03T03:04:05Z"),
        email: "SECRET_EMAIL", image: "SECRET_IMAGE", deactivatedAt: "SECRET_LIFECYCLE",
        deactivatedByUserId: "SECRET_DEACTIVATOR", retainAtLeastUntil: "SECRET_RETENTION",
        extra: "SECRET_UNEXPECTED",
      },
      {
        id: "new", authorId: "active-author", authorName: "Active editor",
        originalContent: "Active source", sourceLocale: "en",
        createdAt: new Date("2026-10-04T03:04:05Z"),
      },
    ] as never);
    const response = await run(e, request(history));
    expect(response).toMatchObject({
      init: { status: 200, headers: privateHeaders },
      data: {
        operation: "postHistory", postId: "post/עברית",
        revisions: [
          { id: "old", authorId: "retained-author", authorName: "Deleted user",
            authorIdentityKind: "deleted", originalContent: "Unmodified **private**\\nשלום",
            sourceLocale: "he", createdAt: "2026-10-03T03:04:05.000Z" },
          { id: "new", authorId: "active-author", authorName: "Active editor",
            originalContent: "Active source", sourceLocale: "en",
            createdAt: "2026-10-04T03:04:05.000Z" },
        ],
      },
    });
    const actual = (response as { data: { revisions: unknown[] } }).data.revisions;
    expect(actual[0]).toEqual({
      id: "old", authorId: "retained-author", authorName: "Deleted user",
      authorIdentityKind: "deleted", originalContent: "Unmodified **private**\\nשלום",
      sourceLocale: "he", createdAt: "2026-10-03T03:04:05.000Z",
    });
    expect(actual[1]).toEqual({
      id: "new", authorId: "active-author", authorName: "Active editor",
      originalContent: "Active source", sourceLocale: "en",
      createdAt: "2026-10-04T03:04:05.000Z",
    });
    const serialized = JSON.stringify(response);
    for (const secret of ["SECRET_RETAINED_HISTORY_NAME", "SECRET_EMAIL", "SECRET_IMAGE",
      "SECRET_LIFECYCLE", "SECRET_DEACTIVATOR", "SECRET_RETENTION", "SECRET_UNEXPECTED"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(e.readPostHistory).toHaveBeenCalledExactlyOnceWith("post/עברית", "topic/עברית");
  });

  it("rejects stale actor, cross-origin and typed history reader outages without sending revision bodies", async () => {
    const e = makeEnv(["forum.post.history.read"]);
    for (const req of [
      request({ ...history, editorActorId: "different-user" }),
      request(history, "https://another.test"),
    ]) {
      const result = await run(e, req);
      expect(result).toMatchObject({ init: { headers: privateHeaders } });
      expect(JSON.stringify(result)).not.toContain("Private **original**");
    }
    expect(e.readPostHistory).not.toHaveBeenCalled();
    const failure = makeEnv(["forum.post.history.read"]);
    failure.readPostHistory.mockRejectedValueOnce(new ForumStorageUnavailableError());
    expect(await run(failure, request(history))).toMatchObject({
      data: { error: "unavailable" }, init: { status: 503, headers: privateHeaders },
    });
  });
});
