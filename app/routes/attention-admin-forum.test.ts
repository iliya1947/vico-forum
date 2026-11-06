import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { action } from "./attention";

describe("private Help signal action admission", () => {
  it("rejects before reading a guessed private signal for an actor without active Forum/Help permission", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "restricted-reviewer" } } as never);
    const has = vi.fn(async () => false);
    context.set(authorizationContext, { forUser: () => ({ has }) } as never);
    const readHelpSignal = vi.fn(async () => ({ id: "private-signal" }));
    context.set(forumReaderContext, { readHelpSignal } as never);
    const response = await action({
      request: new Request("https://forum.test/en/attention?mode=signals", {
        method: "POST", headers: { Origin: "https://forum.test" },
        body: new URLSearchParams({
          intent: "acceptHelpSignal", topicId: "private-topic", caseId: "private-signal",
        }),
      }),
      context,
    });
    expect(response).toMatchObject({
      data: { error: "forbidden" },
      init: { status: 403, headers: { "Cache-Control": "private, no-store" } },
    });
    expect(has).toHaveBeenCalledTimes(3);
    expect(readHelpSignal).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain("private-signal");
  });
});
