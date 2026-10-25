// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { AuthSessionUnavailableError } from "../app/auth/request-context";

const runtime = vi.hoisted(() => ({ getSession: vi.fn(), handle: vi.fn(), router: vi.fn() }));
vi.mock("react-router", async (original) => ({
  ...await original<typeof import("react-router")>(), createRequestHandler: () => runtime.router,
}));
vi.mock("virtual:react-router/server-build", () => ({}));
vi.mock("../app/auth/auth.server", () => ({ createHyperdriveAuthRuntime: () => runtime }));
import worker from "./app";

const env = { HYPERDRIVE: { connectionString: "synthetic-localization" }, WEB_HYPERDRIVE: { connectionString: "synthetic-web" } };
const request = new Request("https://forum.test/en") as Parameters<typeof worker.fetch>[0];
beforeEach(() => {
  vi.clearAllMocks();
  runtime.getSession.mockResolvedValue({ session: null, headers: new Headers() });
  runtime.router.mockResolvedValue(new Response("page"));
});

it("returns a safe no-store 503 before Router on a classified session storage outage", async () => {
  runtime.getSession.mockRejectedValueOnce(new AuthSessionUnavailableError({ cause: new Error("private database details") }));
  const response = await worker.fetch(request, env as never);
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).not.toContain("private database details");
  expect(runtime.router).not.toHaveBeenCalled();
});

it("preserves unexpected failures and ordinary guest routing", async () => {
  const bug = new TypeError("configuration defect");
  runtime.getSession.mockRejectedValueOnce(bug);
  await expect(worker.fetch(request, env as never)).rejects.toBe(bug);
  expect(runtime.router).not.toHaveBeenCalled();
  expect((await worker.fetch(request, env as never)).status).toBe(200);
  expect(runtime.router).toHaveBeenCalledOnce();
});
