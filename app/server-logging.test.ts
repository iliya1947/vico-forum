import { describe, expect, it, vi } from "vitest";
import { reportSsrStreamError } from "./server-logging";

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
