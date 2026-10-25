import { describe, expect, it, vi } from "vitest";
import { reportRouteError, reportSsrStreamError } from "./server-logging";

describe("safe server logging", () => {
  it("logs only allowlisted SSR error metadata", () => {
    const sink = vi.fn<(message: string) => void>();
    const error = Object.assign(
      new TypeError("OAuth callback failed: code=oauth-secret&state=session-secret"),
      {
        authorization: "Bearer bearer-secret",
        cookie: "session=session-cookie-secret",
        requestUrl: "https://example.test/callback?code=query-secret",
      },
    );

    reportSsrStreamError(error, sink);

    expect(sink).toHaveBeenCalledOnce();
    const message = sink.mock.calls[0]![0];
    expect(JSON.parse(message)).toEqual({
      event: "ssr_stream_error",
      phase: "after-shell",
      errorKind: "type-error",
    });
    for (const sensitiveValue of [
      "oauth-secret",
      "session-secret",
      "bearer-secret",
      "session-cookie-secret",
      "query-secret",
    ]) {
      expect(message).not.toContain(sensitiveValue);
    }
  });

  it("does not stringify a non-Error thrown value", () => {
    const sink = vi.fn<(message: string) => void>();

    reportSsrStreamError("Authorization: Bearer raw-secret", sink);

    const message = sink.mock.calls[0]![0];
    expect(JSON.parse(message)).toEqual({
      event: "ssr_stream_error",
      phase: "after-shell",
      errorKind: "non-error",
    });
    expect(message).not.toContain("raw-secret");
  });
});

it("ignores arbitrary values and cyclic causes in route diagnostics", () => {
  const sink = vi.fn(); const failure = Object.assign(new TypeError("private-text"), { code: "private-code", cause: null as unknown });
  failure.cause = failure;
  reportRouteError(failure, sink);
  expect(JSON.parse(sink.mock.calls[0]![0])).toMatchObject({ event: "route_error", errorKind: "type-error" });
  expect(sink.mock.calls[0]![0]).not.toMatch(/private-text|private-code/);
});

it("does not mistake multiline SQL parameter text for diagnostic stack frames", () => {
  const sink = vi.fn();
  reportRouteError(new Error("params: private\n    at app/private-bio-secret.ts:1:2"), sink);
  expect(sink.mock.calls[0]![0]).not.toContain("private-bio-secret");
});
