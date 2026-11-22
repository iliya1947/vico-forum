// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import { createElement } from "react";
import { createPagesAddressCodec } from "./pages-address";
import { installPagesLocationAdapter } from "./pages-location";

const id = { actor: "p0-preview-user", scenario: "default", initialPath: "/en/topics/p0-preview-topic" };

beforeEach(() => {
  window.history.replaceState(null, "", "/preview-sandbox/");
});
afterEach(() => {
  window.history.replaceState(null, "", "/preview-sandbox/");
});

describe("shared Pages bootstrap URL codec", () => {
  it("derives arbitrary project base and round trips virtual query/hash and identity", () => {
    const codec = createPagesAddressCodec(new URL("https://pages.invalid/custom-project/"), id);
    const virtual = "/he/topics/topic-1?sort=new&filter=%2F#post-42";
    const href = codec.href(virtual);
    expect(href.startsWith("/custom-project/?embed=1&")).toBe(true);
    expect(codec.fromUrl(new URL(href, "https://pages.invalid"))).toBe(virtual);
    expect(codec.base).toBe("/custom-project/");
    const root = createPagesAddressCodec(new URL("https://pages.invalid/"), id);
    expect(root.base).toBe("/");
    expect(root.fromUrl(new URL("https://pages.invalid/"))).toBe("/en/topics/p0-preview-topic");
  });

  it("rejects foreign base, malformed/duplicate identity and protocol-relative paths", () => {
    const codec = createPagesAddressCodec(new URL("https://pages.invalid/preview/"), id);
    expect(() => codec.href("//outside.invalid/topic")).toThrow(/Invalid preview virtual path/);
    expect(() => codec.href("/topic\nmore")).toThrow(/Invalid preview virtual path/);
    expect(() => codec.fromUrl(new URL("https://pages.invalid/elsewhere/"))).toThrow(/outside hosted/);
    expect(() => codec.fromUrl(new URL("https://pages.invalid/preview/?embed=1&path=%2Ftopic&actor=not-user&scenario=default")))
      .toThrow(/Invalid preview bootstrap/);
    const dup = new URL(codec.href("/en/topics/p0-preview-topic"), "https://pages.invalid");
    dup.searchParams.append("path", "/elsewhere");
    expect(() => codec.fromUrl(dup)).toThrow(/fields/);
    expect(() => codec.fromUrl(new URL("https://pages.invalid/preview/?embed=1&path=%2F%2Fevil.test&actor=p0-preview-user&scenario=default")))
      .toThrow(/Invalid preview virtual path/);
  });
});

describe("React Router public createHref seam", () => {
  it("renders a real relative Link as a Pages href and leaves router matching virtual", async () => {
    const codec = createPagesAddressCodec(new URL(window.location.href), id);
    const router = createMemoryRouter([{
      path: "/en/topics/:topicId",
      Component: () => createElement(Link, { to: "." }, "same topic"),
    }], {
      initialEntries: ["/en/topics/p0-preview-topic?state=x"],
    });
    const adapter = installPagesLocationAdapter(router, { codec });
    try {
      render(createElement(RouterProvider, { router }));
      const link = await screen.findByRole("link", { name: "same topic" });
      const url = new URL(link.getAttribute("href")!, window.location.origin);
      expect(url.pathname).toBe("/preview-sandbox/");
      expect(url.searchParams.get("path")).toBe("/en/topics/p0-preview-topic");
      expect(url.searchParams.get("actor")).toBe("p0-preview-user");
      expect(router.state.location.pathname).toBe("/en/topics/p0-preview-topic");
      expect(window.location.pathname).toBe("/preview-sandbox/");
    } finally {
      adapter.dispose();
      router.dispose();
    }
  });
});
