import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { registryLoaderContext } from "../localization/request-context";
import { localeRegistry } from "../localization/registry";
import { loader } from "./locale-negotiation";

function contextWithFixtureRegistry() {
  const context = new RouterContextProvider();
  context.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test-fixture",
    health: { status: "healthy" },
  }));
  return context;
}

describe("root locale negotiation route", () => {
  it("returns a non-cacheable request-specific redirect", async () => {
    const request = new Request("https://vico.test/?from=root", {
      headers: { Cookie: "vico_locale=ru" },
    });
    const context = contextWithFixtureRegistry();

    await expect(loader({ request, context })).rejects.toEqual(
      expect.objectContaining({
        status: 307,
        headers: expect.objectContaining({}),
      }),
    );
    try {
      await loader({ request, context });
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.headers.get("Location")).toBe("/ru/?from=root");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("applies root negotiation to HEAD requests", async () => {
    const request = new Request("https://vico.test/?from=head", {
      method: "HEAD",
      headers: { Cookie: "vico_locale=ru" },
    });
    const context = contextWithFixtureRegistry();

    try {
      await loader({ request, context });
      throw new Error("Expected locale negotiation redirect");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("/ru/?from=head");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("fails closed for mutation requests without a locale", async () => {
    const context = contextWithFixtureRegistry();
    await expect(loader({ request: new Request("https://vico.test/", { method: "POST" }), context }))
      .rejects.toEqual(expect.objectContaining({ status: 404 }));
  });
});
