// @vitest-environment jsdom
import { expect, it } from "vitest";
import { action as upload } from "../../routes/attachment-upload";
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

    const denied = await upload({
      request: request("https://foreign.example.invalid"), context: environment.createContext(),
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "origin" });
  } finally {
    environment.dispose();
  }
});
