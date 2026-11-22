// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { editorClientAction } from "../../forum/editor-action";
import { previewAction } from "./action-bridge";

function postRequest(origin?: string): Request {
  const body = new URLSearchParams({ intent: "reply", body: "live editor test" });
  return new Request("http://localhost/en/topics/test-topic", {
    method: "POST",
    body,
    ...(origin === undefined ? {} : { headers: { Origin: origin } }),
  });
}

describe("embedded Framework clientAction serverAction bridge", () => {
  it("invokes the real clientAction before the server handler with a local URL and missing Origin filled", async () => {
    const seen: string[] = [];
    const originalServer = async ({ request }: { request: Request }) => {
      seen.push("server");
      expect(new URL(request.url).origin).toBe("https://preview.test");
      expect(request.headers.get("Origin")).toBe("https://preview.test");
      expect((await request.formData()).get("body")).toBe("live editor test");
      return { accepted: true };
    };
    const originalClient = async (args: Parameters<typeof editorClientAction>[0]) => {
      seen.push("client");
      return editorClientAction(args);
    };
    const action = previewAction("routes/topic", {
      action: originalServer, clientAction: originalClient,
    }, () => "https://preview.test");
    const result = await action({
      request: postRequest(), params: { topicId: "test-topic", locale: "en" },
      context: new RouterContextProvider(), url: new URL("http://localhost/en/topics/test-topic"),
      pattern: "/:locale/topics/:topicId",
    });
    expect(seen).toEqual(["client", "server"]);
    expect(result).toEqual({ accepted: true });
  });

  it("preserves explicit foreign Origin for the product guard", async () => {
    const action = previewAction("routes/topic", {
      action: async ({ request }: { request: Request }) => ({
        origin: request.headers.get("Origin"),
        target: new URL(request.url).origin,
      }),
      clientAction: editorClientAction,
    }, () => "https://preview.test");
    expect(await action({ request: postRequest("https://evil.test"), params: {},
      context: new RouterContextProvider(), url: new URL("http://localhost/en/topics/test-topic"),
      pattern: "/:locale/topics/:topicId",
    })).toEqual({
      origin: "https://evil.test",
      target: "https://preview.test",
    });
  });

  it("requires both actual exports, never faking an accepted mutation", () => {
    expect(() => previewAction("routes/topic", { clientAction: editorClientAction })).toThrow(/Expected original/);
  });
});
