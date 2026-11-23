// @vitest-environment jsdom
import { expect, it } from "vitest";
import { action as upload } from "../../routes/attachment-upload";
import { loader as download } from "../../routes/attachment-download";
import { authSessionContext } from "../../auth/request-context";
import { createP1AttachmentFixture } from "./attachment-fixture";
import { P0_TOPIC_ID } from "../p0/fixture";

const operationId = "11111111-1111-4111-8111-111111111111";
const attachmentId = "22222222-2222-4222-8222-222222222222";
function request(origin = "http://localhost") {
  return new Request("http://localhost/api/attachments", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "text/plain",
      "X-Vico-Attachment-Id": attachmentId,
      "X-Vico-Attachment-Name": encodeURIComponent("notes.txt"),
      "X-Vico-Attachment-Size": "13",
      "X-Vico-Editor-Context": encodeURIComponent("topic:" + P0_TOPIC_ID + ":reply"),
      "X-Vico-Operation-Id": operationId,
    },
    body: "hello preview",
  });
}

it("routes real upload action through original admission, streaming validation and test bucket", async () => {
  const environment = createP1AttachmentFixture();
  try {
    const context = environment.createContext();
    const response = await upload({ request: request(), context });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      outcome: "stored",
      attachment: {
        id: attachmentId, fileName: "notes.txt", byteSize: 13,
        detectedType: "text", verificationStatus: "type-checked",
      },
    });
    const replay = await upload({ request: request(), context: environment.createContext() });
    expect(replay.status).toBe(201);
    expect(await replay.json()).toMatchObject({ attachment: { id: attachmentId } });

    const draftContext = "topic:" + P0_TOPIC_ID + ":reply";
    const downloadPath = "/api/attachments/file/" + attachmentId;
    const query = "?operation=" + operationId + "&context=" + encodeURIComponent(draftContext);
    const read = (suffix = "", customContext = environment.createContext()) => download({
      request: new Request("http://localhost" + downloadPath + query + suffix),
      params: { attachmentId },
      context: customContext,
    });
    const privateText = await read("&view=text");
    expect(privateText.status).toBe(200);
    expect(privateText.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(privateText.headers.get("Content-Disposition")).toBe("inline");
    expect(privateText.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(privateText.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(privateText.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await privateText.text()).toBe("hello preview");
    const privateDownload = await read();
    expect(privateDownload.status).toBe(200);
    expect(privateDownload.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(privateDownload.headers.get("Content-Disposition")).toContain("attachment;");
    expect(privateDownload.headers.get("Content-Disposition")).toContain("notes.txt");
    expect([...new Uint8Array(await privateDownload.arrayBuffer())])
      .toEqual([...new TextEncoder().encode("hello preview")]);

    // Wrong operation, context and user cannot reuse a known asset ID.
    const wrongContext = await download({
      request: new Request("http://localhost" + downloadPath
        + "?operation=" + operationId + "&context=topic%3Aother%3Areply"),
      params: { attachmentId },
      context: environment.createContext(),
    });
    expect(wrongContext.status).toBe(404);
    expect(wrongContext.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await wrongContext.text()).toBe("");
    const wrongOperation = await download({
      request: new Request("http://localhost" + downloadPath
        + "?operation=33333333-3333-4333-8333-333333333333"
        + "&context=" + encodeURIComponent(draftContext)),
      params: { attachmentId },
      context: environment.createContext(),
    });
    expect(wrongOperation.status).toBe(404);
    const guest = environment.createContext();
    guest.set(authSessionContext, null);
    expect((await read("", guest)).status).toBe(401);
    const foreign = environment.createContext();
    const session = foreign.get(authSessionContext);
    foreign.set(authSessionContext, { ...session, user: { ...session.user, id: "other-actor" } });
    expect((await read("", foreign)).status).toBe(404);
    expect((await read("&view=inline")).status).toBe(404);
    expect((await read("&view=unrecognized")).status).toBe(400);

    const denied = await upload({
      request: request("https://foreign.example.invalid"), context: environment.createContext(),
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "origin" });
  } finally {
    environment.dispose();
  }
});
