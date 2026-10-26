import { describe, expect, it } from "vitest";
import { redirect, RouterContextProvider, type ClientActionFunctionArgs } from "react-router";
import { editorClientAction } from "./editor-action";

function args(serverAction: () => Promise<unknown>, request = new Request("https://forum.test/en/topics/topic")): ClientActionFunctionArgs {
  return { request, params: {}, context: new RouterContextProvider(), pattern: "", url: new URL(request.url),
    serverAction: serverAction as ClientActionFunctionArgs["serverAction"] };
}
describe("mounted authoring action failure", () => {
  it.each([new TypeError("server fault"), new TypeError("Failed to fetch")])("keeps faults distinct from unavailable", async (error) => {
    expect(await editorClientAction(args(async () => { throw error; })))
      .toMatchObject({ data: { error: "unexpected" }, init: { status: 500 } });
  });
  it("preserves controlled results and successful navigation", async () => {
    const result = { error: "unavailable" };
    expect(await editorClientAction(args(async () => result))).toBe(result);
    const location = redirect("/en/topics/topic#post-p1");
    await expect(editorClientAction(args(async () => { throw location; }))).rejects.toBe(location);
  });
  it("does not reinterpret an aborted navigation as an action failure", async () => {
    const controller = new AbortController(); controller.abort();
    const error = new DOMException("aborted", "AbortError");
    await expect(editorClientAction(args(async () => { throw error; },
      new Request("https://forum.test/en", { signal: controller.signal })))).rejects.toBe(error);
  });
});
