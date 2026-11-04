import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumWriterContext } from "./request-context";
import type { ForumWriter } from "../../db/hyperdrive-forum";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import {
  ForumEntityNotFoundError, ForumStateConflictError, ForumTopicClosedError,
} from "../../db/forum-repository";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { topicAction } from "./actions.server";

const params = { locale: "en", topicId: "target" };
const canonical = { intent: "closeTopic", expectedClosureVersion: "4", editorActorId: "viewer" };

function writer() {
  const setTopicClosed = vi.fn(async (input: Parameters<ForumWriter["setTopicClosed"]>[0]) => ({
    isClosed: input.isClosed, closureVersion: input.expectedClosureVersion + 1, changed: true,
  }));
  const createReply = vi.fn(async () => ({ postId: "reply-id" }));
  return { setTopicClosed, createReply } as unknown as ForumWriter & {
    setTopicClosed: typeof setTopicClosed; createReply: typeof createReply;
  };
}

function context(w: ForumWriter, permissions: readonly string[] = ["forum.topic.close"], signedIn = true) {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, signedIn ? { user: { id: "viewer" } } as never : null);
  ctx.set(forumWriterContext, w);
  ctx.set(authorizationContext, {
    forUser: () => ({ has: async (permission: string) => permissions.includes(permission) }),
  } as never);
  return ctx;
}

function form(fields: Record<string, string> = canonical) {
  const f = new FormData();
  for (const [name, value] of Object.entries(fields)) f.set(name, value);
  return f;
}
function submit(fields: FormData, ctx: RouterContextProvider, origin: string | null = "https://forum.example") {
  return topicAction({
    request: new Request("https://forum.example/en/topics/target", { method: "POST",
      headers: origin === null ? {} : { Origin: origin }, body: fields }),
    params, context: ctx,
  });
}

describe("AP-08 canonical closure HTTP", () => {
  it("applies a fresh single capability to close/reopen and uses only route target and session actor", async () => {
    for (const intent of ["closeTopic", "reopenTopic"] as const) {
      const w = writer();
      const response = await submit(form({ ...canonical, intent, actorId: "attacker", topicId: "other" }), context(w));
      expect(response).toBeInstanceOf(Response);
      if (!(response instanceof Response)) throw new Error("expected redirect");
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/en/topics/target");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(w.setTopicClosed).toHaveBeenCalledOnce();
      expect(w.setTopicClosed).toHaveBeenCalledWith({
        topicId: "target", actorId: "viewer", expectedClosureVersion: 4, isClosed: intent === "closeTopic",
      });
    }
    const w = writer();
    const inline = await submit(form({ ...canonical, inlineQuickAction: "1" }), context(w));
    expect(inline).toMatchObject({ data: { ok: true }, init: { headers: { "Cache-Control": "private, no-store" } } });
    expect(w.setTopicClosed).toHaveBeenCalledOnce();
  });

  it("rejects missing permissions, guest and invalid Origin without calling writer", async () => {
    for (const [permissions, signedIn, origin, status] of [
      [[], false, "https://forum.example", 401],
      [["forum.topic.close"], true, null, 403],
      [["forum.topic.close"], true, "https://evil.example", 403],
      [["forum.reply.create"], true, "https://forum.example", 403],
      [["forum.topic.pin"], true, "https://forum.example", 403],
      [["forum.solution.manageOwn"], true, "https://forum.example", 403],
      [["admin.history.read"], true, "https://forum.example", 403],
    ] as const) {
      const w = writer();
      expect(await submit(form(), context(w, permissions, signedIn), origin))
        .toMatchObject({ init: { status } });
      expect(w.setTopicClosed).not.toHaveBeenCalled();
    }
  });

  it("rejects malformed versions, duplicate form values and missing/changed actor identity", async () => {
    const w = writer();
    const invalid: FormData[] = [
      form({ intent: "closeTopic", editorActorId: "viewer" }),
      form({ intent: "closeTopic", expectedClosureVersion: "4" }),
      form({ ...canonical, editorActorId: "" }),
      form({ ...canonical, editorActorId: "   " }),
      form({ ...canonical, operationScope: "own" }),
      form({ ...canonical, inlineQuickAction: "bogus" }),
      ...["", "-1", "+1", "01", "1.0", " 1", "1 ", "1e2", "2147483648", "NaN", "０"].map(
        (expectedClosureVersion) => form({ ...canonical, expectedClosureVersion })),
    ];
    for (const field of ["intent", "expectedClosureVersion", "editorActorId", "inlineQuickAction"]) {
      const duplicate = form();
      duplicate.append(field, "tampered");
      invalid.push(duplicate);
    }
    const maskedIntent = form({ ...canonical, intent: "reply", body: "sneaked" });
    maskedIntent.append("intent", "closeTopic");
    invalid.push(maskedIntent);
    const file = form();
    file.set("expectedClosureVersion", new File(["1"], "version.txt"));
    invalid.push(file);
    for (const f of invalid) {
      expect(await submit(f, context(w))).toMatchObject({ init: { status: 400 }, data: { error: "invalid" } });
    }
    expect(w.setTopicClosed).not.toHaveBeenCalled();
    expect(await submit(form({ ...canonical, editorActorId: "other" }), context(w)))
      .toMatchObject({ init: { status: 409 }, data: { error: "conflict" } });
    expect(w.setTopicClosed).not.toHaveBeenCalled();
  });

  it("maps missing topic/CAS/authz outage/storage outage and propagates unexpected failures", async () => {
    for (const [error, status, code] of [
      [new ForumEntityNotFoundError("private"), 404, "notFound"],
      [new ForumStateConflictError("private"), 409, "conflict"],
      [new ForumStorageUnavailableError(), 503, "unavailable"],
    ] as const) {
      const w = writer();
      w.setTopicClosed.mockRejectedValueOnce(error);
      const response = await submit(form(), context(w));
      expect(response).toMatchObject({ init: { status }, data: { error: code } });
      expect(JSON.stringify((response as { data: unknown }).data)).not.toContain("private");
    }
    const w = writer();
    const ctx = context(w);
    ctx.set(authorizationContext, {
      forUser: () => ({ has: async () => { throw new AuthorizationUnavailableError(); } }),
    } as never);
    expect(await submit(form(), ctx)).toMatchObject({ init: { status: 503 } });
    expect(w.setTopicClosed).not.toHaveBeenCalled();

    const failure = new Error("unexpected SQL");
    const broken = writer();
    broken.setTopicClosed.mockRejectedValueOnce(failure);
    await expect(submit(form(), context(broken))).rejects.toBe(failure);
  });

  it("returns a distinct private topicClosed 409 for rejected new replies without HTTP preflight", async () => {
    const w = writer();
    w.createReply.mockRejectedValueOnce(new ForumTopicClosedError("private"));
    const response = await submit(form({ intent: "reply", body: "new post" }), context(w, ["forum.reply.create"]));
    expect(response).toMatchObject({
      init: { status: 409, headers: { "Cache-Control": "private, no-store" } },
      data: { error: "topicClosed" },
    });
    expect(JSON.stringify((response as { data: unknown }).data)).not.toContain("private");
    expect(w.createReply).toHaveBeenCalledOnce();
    const replay = await submit(form({ intent: "reply", body: "committed replay" }), context(w, ["forum.reply.create"]));
    expect(replay).toBeInstanceOf(Response);
  });
});
