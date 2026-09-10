import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { localeContext } from "../localization/request-context";
import { middleware } from "./locale-boundary";

describe("locale boundary middleware", () => {
  it("does not execute the downstream action for redirect-required mutations", async () => {
    const next = vi.fn(async () => new Response("mutated"));
    const context = new RouterContextProvider();

    await expect(
      middleware[0](
        {
          request: new Request("https://vico.test/RU/topic", { method: "POST" }),
          params: { locale: "RU" },
          context,
        },
        next,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets typed request context and reaches downstream handling for a canonical locale", async () => {
    const next = vi.fn(async () => new Response("handled"));
    const context = new RouterContextProvider();

    const response = await middleware[0](
      {
        request: new Request("https://vico.test/he/topic", { method: "POST" }),
        params: { locale: "he" },
        context,
      },
      next,
    );

    expect(response).toBeInstanceOf(Response);
    expect(next).toHaveBeenCalledOnce();
    expect(context.get(localeContext)).toMatchObject({ translationLocale: "he", direction: "rtl" });
  });
});
