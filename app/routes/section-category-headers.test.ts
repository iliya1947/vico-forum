import { describe, expect, it } from "vitest";
import { headers as sectionHeaders } from "./section";
import { headers as categoryHeaders } from "./category";

const args = (options: {
  parent?: HeadersInit; loader?: HeadersInit; action?: HeadersInit; error?: HeadersInit;
} = {}) => ({
  parentHeaders: new Headers(options.parent),
  loaderHeaders: new Headers(options.loader),
  actionHeaders: new Headers(options.action),
  errorHeaders: options.error ? new Headers(options.error) : undefined,
});

describe.each([
  ["ordinary section", sectionHeaders],
  ["Help category", categoryHeaders],
])("%s canonical publication HTTP headers", (_label, headers) => {
  it("propagates private no-store and Retry-After for denied and unavailable actions", () => {
    for (const status of ["401", "503"]) {
      const result = headers(args({
        parent: { "Cache-Control": "public, max-age=30", "Set-Cookie": "locale=en; Path=/" },
        action: { "Cache-Control": "private, no-store", "X-Action-Status": status,
          "Retry-After": status === "503" ? "4" : "1" },
      }));
      expect(result.get("Cache-Control")).toBe("private, no-store");
      expect(result.get("Retry-After")).toBe(status === "503" ? "4" : "1");
      expect(result.get("Set-Cookie")).toBe("locale=en; Path=/");
    }
  });

  it("preserves normal public GET caching and gives thrown errors precedence", () => {
    const publicGet = headers(args({
      parent: { "Cache-Control": "public, max-age=30", "Vary": "Accept-Language" },
    }));
    expect(publicGet.get("Cache-Control")).toBe("public, max-age=30");
    expect(publicGet.get("Vary")).toBe("Accept-Language");
    expect(headers(args({ error: { "Cache-Control": "private, no-store" },
      loader: { "Cache-Control": "public, max-age=30" } })).get("Cache-Control"))
      .toBe("private, no-store");
  });
});
