import { describe, expect, it } from "vitest";
import { headers } from "./topic";

const args = (options: {
  parent?: HeadersInit; loader?: HeadersInit; action?: HeadersInit; error?: HeadersInit;
} = {}) => ({
  parentHeaders: new Headers(options.parent),
  loaderHeaders: new Headers(options.loader),
  actionHeaders: new Headers(options.action),
  errorHeaders: options.error ? new Headers(options.error) : undefined,
});

describe("canonical topic final HTTP header policy", () => {
  it("transfers private/no-store for successful inline and private history action responses", () => {
    for (const outcome of ["readPostHistory", "correctPostSourceLocale"]) {
      const actual = headers(args({
        parent: { "X-Parent-Policy": "keep" },
        action: { "Cache-Control": "private, no-store" },
      }));
      expect(actual.get("Cache-Control"), outcome).toBe("private, no-store");
      expect(actual.get("X-Parent-Policy")).toBe("keep");
    }
  });

  it("passes action privacy and Retry-After on controlled errors without discarding parent cookies", () => {
    const result = headers(args({
      parent: { "Set-Cookie": "language=en; Path=/", "Cache-Control": "public, max-age=60" },
      action: { "Cache-Control": "private, no-store", "Retry-After": "12" },
    }));
    expect(result.get("Cache-Control")).toBe("private, no-store");
    expect(result.get("Retry-After")).toBe("12");
    expect(result.get("Set-Cookie")).toBe("language=en; Path=/");
  });

  it("keeps privacy on thrown action errors but does not turn normal public GETs private", () => {
    const denied = headers(args({ error: { "Cache-Control": "private, no-store" } }));
    expect(denied.get("Cache-Control")).toBe("private, no-store");
    const publicGet = headers(args({
      parent: { "Cache-Control": "public, max-age=300", "Vary": "Accept-Language" },
    }));
    expect(publicGet.get("Cache-Control")).toBe("public, max-age=300");
    expect(publicGet.get("Vary")).toBe("Accept-Language");
    expect(headers(args()).has("Cache-Control")).toBe(false);
  });

  it("preserves loader-specified policies and prioritizes error over action/loader", () => {
    const result = headers(args({
      loader: { "Cache-Control": "public, max-age=60" },
      action: { "Cache-Control": "private, no-store" },
      error: { "Cache-Control": "no-store" },
    }));
    expect(result.get("Cache-Control")).toBe("no-store");
    expect(headers(args({ loader: { "Cache-Control": "private, no-store" } }))
      .get("Cache-Control")).toBe("private, no-store");
  });
});
