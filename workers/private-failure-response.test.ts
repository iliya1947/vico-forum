import { describe, expect, it } from "vitest";
import { protectFrameworkFailure } from "./private-failure-response";

describe("private framework 5xx response cache boundary", () => {
  it.each([
    "/api/attachments",
    "/api/attachments/",
    "/API/ATTACHMENTS",
    "/api/%61ttachments",
    "/%61pi/ATTACHMENTS/",
    "/api/attachments//",
    "/api/attachments///",
    "/API/%61TTACHMENTS//",
    "/api/attachments/file/valid-id",
    "/api/attachments/file/valid-id/",
    "/API/ATTACHMENTS/FILE/valid-id",
    "/api/attachments/%66ile/valid-id",
    "/api/%61ttachments/%66ile/valid-id/",
    "/api/attachments/file/valid-id//",
    "/api/attachments/file/valid-id///",
    "/API/ATTACHMENTS/%66ILE/valid-id///",
  ] as const)(
    "privatizes unexpected GET and HEAD errors on the accepted resource alias %s", async path => {
      for (const method of ["GET", "HEAD"] as const) {
        const request = new Request("https://forum.test" + path, { method });
        const original = new Response(method === "HEAD" ? null : "Unexpected Error", {
          status: 500,
          headers: {
            "Cache-Control": "public, max-age=600",
            "X-Existing": "kept",
            "Set-Cookie": "session=test; HttpOnly",
          },
        });
        const response = protectFrameworkFailure(request, original);
        expect(response.status).toBe(500);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(response.headers.get("X-Existing")).toBe("kept");
        expect(response.headers.get("Set-Cookie")).toBe("session=test; HttpOnly");
        expect(await response.text()).toBe(method === "HEAD" ? "" : "Unexpected Error");
      }
    },
  );

  it.each([
    "/en/topics/example",
    "/api/attachments-extra",
    "/api/attachments/files/valid-id",
    "/api/attachments/file",
    "/api/attachments/file/id/extra",
    "/api//attachments//",
    "/api/attachments//file/valid-id//",
    "/api/attachments/file//",
    "/api/%2Fattachments",
    "/api/%",
    "/api/%GG",
    "/api/attachments/%GG/file",
  ] as const)("does not reclassify public/unmatched/malformed GET %s", path => {
    const original = new Response("error", {
      status: 500, headers: { "Cache-Control": "public, max-age=60" },
    });
    const response = protectFrameworkFailure(new Request("https://forum.test" + path), original);
    expect(response).toBe(original);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("keeps all successful responses unchanged, including private aliases", () => {
    const normal = new Response("ok", { status: 200 });
    expect(protectFrameworkFailure(new Request("https://forum.test/API/ATTACHMENTS/"), normal)).toBe(normal);
  });

  it("preserves existing write privacy behavior without changing status or body", async () => {
    const original = new Response("unexpected write fault", {
      status: 500, headers: { "Set-Cookie": "session=test; HttpOnly", "X-Test": "retained" },
    });
    const response = protectFrameworkFailure(
      new Request("https://forum.test/en/topics/example", { method: "POST" }), original,
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Set-Cookie")).toContain("session=test");
    expect(await response.text()).toBe("unexpected write fault");
  });
});
