import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider, type HeaderAuthUser } from "../auth/auth-controls";
import { OnlinePresenceHeartbeat } from "./online-presence-heartbeat";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function show(user: HeaderAuthUser | null, locale = "en") {
  const router = createMemoryRouter([{
    path: ":locale",
    element: <HeaderAuthProvider initialUser={user}><OnlinePresenceHeartbeat /></HeaderAuthProvider>,
  }], { initialEntries: [`/${locale}`] });
  return render(<RouterProvider router={router} />);
}

describe("browser presence heartbeat", () => {
  it("never sends a heartbeat for a guest", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    show(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends authenticated session heartbeat via a same-origin POST", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("/en/presence");
      expect(init).toMatchObject({
        method: "POST", credentials: "same-origin", body: "intent=heartbeat",
      });
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    show({ id: "member", name: "Member" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("skips a hidden tab and resumes on visibility change in RTL locale", async () => {
    const visible = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      expect(input).toBe("/he/presence");
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    show({ id: "member", name: "Member" }, "he");
    expect(fetchMock).not.toHaveBeenCalled();
    visible.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
