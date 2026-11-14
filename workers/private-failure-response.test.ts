import { describe, expect, it } from "vitest";
import { protectFrameworkFailure } from "./private-failure-response";

describe("private framework 5xx response cache boundary", () => {
  it.each(["/api/attachments", "/api/attachments/file/valid-id"] as const)(
    "privatizes unexpected GET and HEAD errors on %s only", path => {
      for (const method of ["GET", "HEAD"] as const) {
        const request = new Request("https://forum.test" + path, { method });
        const original = new Response(method === "HEAD" ? null : "Internal Error", {
          status: 500,
          headers: { "Cache-Control": "public, max-age=600", "X-Existing": "kept" },
        });
        const response = protectFrameworkFailure(request, original);
        expect(response.status).toBe(500);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(response.headers.get("X-Existing")).toBe("kept");
      }
    },
  );

  it("keeps public GET failure and all successful responses unchanged", () => {
    const original = new Response("error", {
      status: 500, headers: { "Cache-Control": "public, max-age=60" },
    });
    const publicResponse = protectFrameworkFailure(new Request("https://forum.test/en/topics/example"), original);
    expect(publicResponse).toBe(original);
    expect(publicResponse.headers.get("Cache-Control")).toBe("public, max-age=60");
    const normal = new Response("ok", { status: 200 });
    expect(protectFrameworkFailure(new Request("https://forum.test/api/attachments"), normal)).toBe(normal);
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
