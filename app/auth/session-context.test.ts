import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  authRuntimeForRequest,
  authSessionForRequest,
  type AuthRuntime,
  type AuthSession,
} from "./request-context";
import { initializeAuthContext, withAuthSessionCookies } from "./session-context";

const authenticatedSession: AuthSession = {
  user: {
    id: "user-1", name: "Vico", email: "vico@example.test", emailVerified: true,
    createdAt: new Date("2026-09-14T00:00:00Z"), updatedAt: new Date("2026-09-14T00:00:00Z"),
    locale: "he",
  },
  session: {
    id: "session-1", token: "token", userId: "user-1",
    createdAt: new Date("2026-09-14T00:00:00Z"), updatedAt: new Date("2026-09-14T00:00:00Z"),
    expiresAt: new Date("2026-09-15T00:00:00Z"),
  },
};

function runtime(value: AuthSession | null, headers = new Headers()): AuthRuntime {
  return {
    getSession: vi.fn().mockResolvedValue({ session: value, headers }),
    handle: vi.fn(),
  };
}

describe("request-scoped auth session", () => {
  it("makes an authenticated Better Auth session available server-side", async () => {
    const context = new RouterContextProvider();
    const auth = runtime(authenticatedSession);
    const request = new Request("https://vico.test/en", { headers: { Cookie: "better-auth.session_token=token" } });

    await initializeAuthContext(context, request, auth);

    expect(auth.getSession).toHaveBeenCalledWith(request.headers);
    expect(authRuntimeForRequest(context)).toBe(auth);
    expect(authSessionForRequest(context)).toBe(authenticatedSession);
  });

  it.each([
    ["guest/no-session"],
    ["invalid or expired session"],
  ])("stores null for %s while keeping the request usable", async () => {
    const context = new RouterContextProvider();
    await initializeAuthContext(context, new Request("https://vico.test/en"), runtime(null));
    expect(authSessionForRequest(context)).toBeNull();
  });

  it("propagates Better Auth Set-Cookie values without copying get-session cache headers", async () => {
    const authHeaders = new Headers({
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    });
    authHeaders.append("Set-Cookie", "better-auth.session_token=one; Path=/; HttpOnly");
    authHeaders.append("Set-Cookie", "better-auth.session_data=two; Path=/; HttpOnly");

    const context = new RouterContextProvider();
    const resolvedHeaders = await initializeAuthContext(
      context,
      new Request("https://vico.test/en"),
      runtime(authenticatedSession, authHeaders),
    );
    const response = withAuthSessionCookies(
      new Response("ok", { headers: { "Cache-Control": "public, max-age=60" } }),
      resolvedHeaders,
    );

    expect(response.headers.getSetCookie()).toEqual([
      "better-auth.session_token=one; Path=/; HttpOnly",
      "better-auth.session_data=two; Path=/; HttpOnly",
    ]);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.headers.get("Pragma")).toBeNull();
  });
});
