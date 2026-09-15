import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { localeContext, registryLoaderContext, uiTranslationStoreContext } from "../localization/request-context";
import { assemblePersistentRegistry } from "../localization/persistent-registry";
import { localeRegistry } from "../localization/registry";
import { loader, middleware } from "./locale-boundary";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";

function contextWithFixtureRegistry() {
  const context = new RouterContextProvider();
  context.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test-fixture",
    health: { status: "healthy" },
  }));
  return context;
}

describe("locale boundary middleware", () => {
  it("does not execute the downstream action for redirect-required mutations", async () => {
    const next = vi.fn(async () => new Response("mutated"));
    const context = contextWithFixtureRegistry();

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
    const context = contextWithFixtureRegistry();
    context.set(authSessionContext, {
      user: {
        id: "user-1", name: "Vico", email: "vico@example.test", emailVerified: true,
        createdAt: new Date(), updatedAt: new Date(), locale: "ru",
      },
      session: {
        id: "session-1", token: "token", userId: "user-1", expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(), updatedAt: new Date(),
      },
    });

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

  it("recognizes extended English through canonical translation identity while degraded", async () => {
    const next = vi.fn(async () => new Response("handled"));
    const context = new RouterContextProvider();
    const bootstrap = await assemblePersistentRegistry([]);
    context.set(registryLoaderContext, async () => ({
      ...bootstrap,
      health: { status: "degraded", reason: "unavailable" },
    }));

    await expect(middleware[0](
      {
        request: new Request("https://vico.test/en-u-nu-arab/"),
        params: { locale: "en-u-nu-arab" },
        context,
      },
      next,
    )).rejects.toMatchObject({
      status: 308,
      headers: expect.objectContaining({}),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("temporarily redirects non-English reads to English while the registry is degraded", async () => {
    const next = vi.fn(async () => new Response("handled"));
    const context = new RouterContextProvider();
    const bootstrap = await assemblePersistentRegistry([]);
    context.set(registryLoaderContext, async () => ({
      ...bootstrap,
      health: { status: "degraded", reason: "unavailable" },
    }));

    try {
      await middleware[0](
        {
          request: new Request("https://vico.test/he/?from=outage"),
          params: { locale: "he" },
          context,
        },
        next,
      );
      throw new Error("Expected degraded locale redirect");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("/en/?from=outage");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(next).not.toHaveBeenCalled();
  });
});

describe("locale boundary loader", () => {
  it("keeps public pages available when the optional authorization-nav lookup fails", async () => {
    const context = new RouterContextProvider();
    context.set(localeContext, {
      translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {},
    });
    context.set(uiTranslationStoreContext, { readApproved: vi.fn(async () => []) });
    context.set(authSessionContext, {
      user: {
        id: "user-1", name: "Vico", email: "vico@example.test", emailVerified: true,
        createdAt: new Date(), updatedAt: new Date(), locale: "en",
      },
      session: {
        id: "session-1", token: "token", userId: "user-1", expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(), updatedAt: new Date(),
      },
    });
    context.set(authorizationContext, {
      forUser: () => ({ resolve: vi.fn(), has: vi.fn(async () => { throw new Error("database unavailable"); }) }),
    } as never);

    const snapshot = await loader({
      request: new Request("https://vico.test/en/"), params: { locale: "en" }, context,
    });

    expect(snapshot.authUser).toEqual({ name: "Vico", canManageAuthorization: false });
    expect(snapshot.locale.translationLocale).toBe("en");
  });
});
