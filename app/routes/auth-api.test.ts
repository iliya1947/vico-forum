import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authRuntimeContext, authSessionContext, type AuthRuntime } from "../auth/request-context";
import { loader } from "./auth-api";
import routes from "../routes";

describe("Better Auth resource route", () => {
  it("forwards /api/auth/* to the request-scoped Better Auth handler", async () => {
    const request = new Request("https://vico.test/api/auth/get-session");
    const response = new Response(JSON.stringify({ session: null }), { status: 200 });
    const runtime: AuthRuntime = { getSession: vi.fn(), handle: vi.fn().mockResolvedValue(response) };
    const context = new RouterContextProvider();
    context.set(authRuntimeContext, runtime);
    context.set(authSessionContext, null);

    await expect(loader({ request, context })).resolves.toBe(response);
    expect(runtime.handle).toHaveBeenCalledWith(request);
  });

  it("is registered before the existing API catch-all", () => {
    expect(routes.map((route) => route.path).slice(0, 3)).toEqual([undefined, "api/auth/*", "api/*"]);
  });
});
