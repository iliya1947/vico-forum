import { describe, expect, it } from "vitest";
import { loader } from "./locale-negotiation";

describe("root locale negotiation route", () => {
  it("returns a non-cacheable request-specific redirect", async () => {
    const request = new Request("https://vico.test/?from=root", {
      headers: { Cookie: "vico_locale=ru" },
    });

    await expect(loader({ request })).rejects.toEqual(
      expect.objectContaining({
        status: 307,
        headers: expect.objectContaining({}),
      }),
    );
    try {
      await loader({ request });
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

    try {
      await loader({ request });
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
    await expect(loader({ request: new Request("https://vico.test/", { method: "POST" }) }))
      .rejects.toEqual(expect.objectContaining({ status: 404 }));
  });
});
