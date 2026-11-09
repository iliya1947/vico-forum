import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { localeContext, registryLoaderContext, uiTranslationStoreContext, uiGenerationPolicyContext } from "../localization/request-context";
import { assemblePersistentRegistry } from "../localization/persistent-registry";
import { localeRegistry } from "../localization/registry";
import { sourceFingerprint } from "../localization/fingerprint";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { loader, middleware } from "./locale-boundary";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { ADMIN_ADMISSION_PERMISSIONS } from "../admin/access";
import { requireAdminAccess } from "../admin/access.server";
import { loader as settingsAdministratorLoader } from "./settings-administrator";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { meta as adminMeta } from "./admin";

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

function localeLoaderContext(authorizationError: Error) {
  const context = new RouterContextProvider();
  context.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test-fixture",
    health: { status: "healthy" },
  }));
  context.set(localeContext, {
    translationLocale: "en", fallbackLocales: [], direction: "ltr",
    formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {},
  });
  context.set(uiTranslationStoreContext, {
    readApproved: vi.fn(async () => []),
    read: vi.fn(async () => undefined),
  });
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
    forUser: () => ({ resolve: vi.fn(), has: vi.fn(async () => { throw authorizationError; }) }),
  } as never);
  return context;
}

describe("locale boundary loader", () => {
  it.each([
    ["en", "Admin panel · Vico Forum"],
    ["ru", "Админ-панель · Vico Forum"],
    ["he", "לוח ניהול · Vico Forum"],
  ])("uses the resolved %s UI snapshot for the admin browser title", async (locale, title) => {
    const context = localeLoaderContext(new AuthorizationUnavailableError());
    const args = {
      request: new Request(`https://vico.test/${locale}/admin`), params: { locale }, context,
    };
    await middleware[0](args, async () => new Response());
    const snapshot = await loader(args);
    const matches: Parameters<typeof adminMeta>[0]["matches"] = [
      { id: "root", loaderData: undefined, pathname: "/", params: { locale }, meta: [] },
      { id: "routes/locale-boundary", loaderData: snapshot, pathname: `/${locale}`, params: { locale }, meta: [] },
      { id: "routes/admin", loaderData: { locale, access: { canEnter: true, canReadForum: true, canManageAuthorization: false, actorId: "test-admin" }, counts: null },
        pathname: `/${locale}/admin`, params: { locale }, meta: [] },
    ];
    expect(adminMeta({ matches })).toEqual([{ title }]);

    // Partial target resources use the same canonical-English fallback as the visible UI.
    if (locale !== "en") {
      delete snapshot.resourcesByLocale[locale]?.common?.adminPanelTitle;
      expect(adminMeta({ matches })).toEqual([{ title: "Admin panel · Vico Forum" }]);
    }
  });

  it("keeps public pages available for a classified optional authorization outage", async () => {
    const context = localeLoaderContext(new AuthorizationUnavailableError());
    const snapshot = await loader({
      request: new Request("https://vico.test/en/"), params: { locale: "en" }, context,
    });

    expect(snapshot.authUser).toEqual({ id: "user-1", image: null, name: "Vico", canManageAuthorization: false, canViewSuperAdmin: false, canViewAdminPanel: false, canViewModerationAttention: false, adminEntryDestinations: [], attentionEntryGroups: { signals: [], complaints: [], security: [] } });
    expect(snapshot.locale.translationLocale).toBe("en");
    expect(snapshot.activeLocales).toEqual([
      { tag: "en", nativeName: "English", direction: "ltr" },
      { tag: "he", nativeName: "עברית", direction: "rtl" },
      { tag: "ru", nativeName: "Русский", direction: "ltr" },
    ]);
  });

  it("does not hide unexpected optional authorization errors", async () => {
    const failure = new Error("unexpected authorization bug");
    await expect(loader({
      request: new Request("https://vico.test/en/"),
      params: { locale: "en" },
      context: localeLoaderContext(failure),
    })).rejects.toBe(failure);
  });
});

describe("SET04-LEV-01 Admin admission and Settings entry projection", () => {
  it.each(ADMIN_ADMISSION_PERMISSIONS)("exposes each authoritative Admin admission grant: %s", async permission => {
    const context = localeLoaderContext(new AuthorizationUnavailableError());
    const grants = new Set<PermissionKey>([permission]);
    const has = vi.fn(async (key: PermissionKey) => grants.has(key));
    context.set(authorizationContext, { forUser: () => ({ has }) } as never);
    const admitted = await requireAdminAccess(context);
    expect(admitted.canEnter).toBe(true);
    const snapshot = await loader({
      request: new Request("https://vico.test/en/settings"), params: { locale: "en" }, context,
    });
    expect(snapshot.authUser?.canViewAdminPanel).toBe(true);
    expect(snapshot.authUser?.adminEntryDestinations).toContain("overview");
    if (permission === "forum.topic.close") {
      expect(snapshot.authUser?.adminEntryDestinations).toEqual(["overview", "forum"]);
    }
    expect(has).toHaveBeenCalledWith(permission);
  });

  it("allows close-only Administrator preferences, then drops Settings entry on next-request revoke", async () => {
    const context = localeLoaderContext(new AuthorizationUnavailableError());
    context.set(authorizationOwnerContext, "some-other-owner");
    const grants = new Set<PermissionKey>(["forum.topic.close"]);
    const has = vi.fn(async (key: PermissionKey) => grants.has(key));
    context.set(authorizationContext, { forUser: () => ({ has }) } as never);
    const args = {
      request: new Request("https://vico.test/en/settings"), params: { locale: "en" }, context,
    };
    const current = await loader(args);
    expect(current.authUser).toMatchObject({
      canViewAdminPanel: true,
      canViewModerationAttention: false,
      adminEntryDestinations: ["overview", "forum"],
    });
    const settings = await settingsAdministratorLoader({ params: { locale: "en" }, context });
    expect(settings.data.admin).toEqual(["overview", "forum"]);
    grants.clear();
    const revoked = await loader(args);
    expect(revoked.authUser).toMatchObject({
      canViewAdminPanel: false,
      canViewModerationAttention: false,
      adminEntryDestinations: [],
    });
    await expect(settingsAdministratorLoader({ params: { locale: "en" }, context }))
      .rejects.toMatchObject({ status: 403 });
    await expect(requireAdminAccess(context)).rejects.toMatchObject({ status: 403 });
  });
});

describe("explicit UI machine policy on the runtime miss path", () => {
  it.each([null, "policy-a", "policy-b"])("honors %s without invalidating manual rows", async (policy) => {
    const fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    const row = { locale: "fr", namespace: "common", key: "heading", origin: "machine", status: "approved",
      sourceFingerprint: fingerprint, translatedPayload: "Machine A", generationPolicyVersion: "policy-a" };
    for (const manual of [false, true]) {
      const context = localeLoaderContext(new AuthorizationUnavailableError());
      context.set(localeContext, { translationLocale: "fr", fallbackLocales: ["en"], direction: "ltr",
        formatting: { locale: "fr", timeZone: "UTC" }, nativeName: "Français", presentationMetadata: {} });
      context.set(uiGenerationPolicyContext, policy);
      const read = vi.fn(async () => undefined);
      context.set(uiTranslationStoreContext, { read, readApproved: async (locale) => locale === "fr"
        ? [row, ...(manual ? [{ ...row, origin: "persistent_manual", generationPolicyVersion: null, translatedPayload: "Manuel" }] : [])] : [] });
      const snapshot = await loader({ request: new Request("https://vico.test/fr/"), params: { locale: "fr" }, context });
      expect(snapshot.resourcesByLocale.fr.common.heading).toBe(manual ? "Manuel" : policy === "policy-a" ? "Machine A" : undefined);
      expect(read).toHaveBeenCalledWith("fr", "common", policy);
    }
  });
});
