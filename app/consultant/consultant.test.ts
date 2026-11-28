// @vitest-environment node
import { readFileSync } from "node:fs";
import { matchPath, RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { action, loader, headers } from "../routes/consultant";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { INITIAL_ROLE_GRANTS, PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { ownerAwareEffectivePermissions } from "../authorization/owner";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { hebrewCommonValues, russianCommonValues } from "../localization/manual-values";
import { sourceFingerprint } from "../localization/fingerprint";
import { localeContext } from "../localization/request-context";
import { localeRegistry } from "../localization/registry";
import { resolveExplicitLocale } from "../localization/resolver";
import { forumReaderContext } from "../forum/request-context";
import { userMeasureContext, type UserMeasureCapability } from "../measures/request-context";
import type { UserMeasureRestrictionId } from "../admin/user-measure-restrictions";
import type { ForumReader, ForumTopicPage } from "../../db/forum-repository";
import type { AuthorizationManagementCapability } from "../../db/authorization-service";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import type { UserAuthorization } from "../../db/authorization-repository";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { CONSULTANT_CATALOG_VERSION, CONSULTANT_FEATURES, CONSULTANT_MAX_BODY_BYTES, consultantPath, type ConsultantPage, type ConsultantRequest, type ConsultantResult } from "./contract";
import { consultantDependenciesContext, createConsultantDependencies } from "./dependencies.server";
import { projectDisclosure } from "./disclosure.server";
import { permittedNavigationCatalog } from "./navigation.server";
import { isConsultantPath, protectFrameworkFailure } from "../../workers/private-failure-response";

const origin = "https://forum.test";
const actor = "actor";
const base: ConsultantRequest = {
  consultationId: "12345678-1234-4234-8234-123456789abc",
  turnId: "12345678-1234-4234-9234-123456789abc",
  question: "Where are my bookmarks?",
  page: { kind: "none" },
};
function snapshot(permissions: readonly PermissionKey[], role = "custom", owner = false): UserAuthorization {
  return { role: { id: role, slug: role, displayName: role, isSystem: false },
    explicitAssignment: true, grants: [], overrides: {}, effectivePermissions: [...permissions],
    ...(owner ? { authoritySource: "owner" as const } : {}) };
}
function session(userId = actor): AuthSession {
  const date = new Date();
  return {
    user: { id: userId, name: "Private name", email: "private@example.test", emailVerified: true, createdAt: date, updatedAt: date },
    session: { id: "private-session", token: "private-token", userId, createdAt: date, updatedAt: date,
      expiresAt: new Date(date.getTime() + 60_000) },
  };
}
function setup(options: {
  locale?: string; user?: AuthSession | null; permissions?: readonly PermissionKey[];
  role?: string; ownerId?: string; owner?: boolean; enabled?: boolean;
  restrictions?: UserMeasureRestrictionId[];
} = {}) {
  const context = new RouterContextProvider();
  const current = options.user === undefined ? session() : options.user;
  const locale = options.locale ?? "en";
  const resolved = resolveExplicitLocale(new Request(origin + consultantPath(locale), { method: "POST" }), locale, localeRegistry);
  if (resolved.type !== "resolved") throw Error("invalid fixture locale");
  context.set(localeContext, resolved.context);
  context.set(authSessionContext, current);
  context.set(authorizationOwnerContext, options.ownerId);
  const resolve = vi.fn(async () => snapshot(options.permissions ?? INITIAL_ROLE_GRANTS.user, options.role, options.owner));
  const has = vi.fn(async () => { throw Error("a second permission lookup is not permitted"); });
  const forUser = vi.fn(() => ({ resolve, has }));
  context.set(authorizationContext, { forUser } as unknown as AuthorizationManagementCapability);
  const readTopicPage = vi.fn<ForumReader["readTopicPage"]>(async () => undefined);
  const readSection = vi.fn<ForumReader["readSection"]>(async () => undefined);
  const readCategory = vi.fn<ForumReader["readCategory"]>(async () => undefined);
  const readHomepage = vi.fn<ForumReader["readHomepage"]>(async () => []);
  context.set(forumReaderContext, { readTopicPage, readSection, readCategory, readHomepage } as unknown as ForumReader);
  const activeRestrictions = vi.fn(async () => options.restrictions ?? []);
  context.set(userMeasureContext, { activeRestrictions } as unknown as UserMeasureCapability);
  const assertActive = vi.fn<(id: string) => Promise<void>>(async () => {});
  const deps = createConsultantDependencies(context, assertActive, options.enabled ?? true);
  context.set(consultantDependenciesContext, deps);
  return { context, deps, locale, resolve, has, forUser, assertActive, readTopicPage, readSection, readCategory, readHomepage, activeRestrictions };
}
function request(body: unknown = base, options: { method?: string; origin?: string | null; type?: string; locale?: string; raw?: boolean } = {}) {
  const method = options.method ?? "POST";
  const h = new Headers({ "Content-Type": options.type ?? "application/json" });
  if (options.origin !== null) h.set("Origin", options.origin ?? origin);
  return new Request(origin + consultantPath(options.locale ?? "en"), {
    method, headers: h, ...(method === "GET" || method === "HEAD" ? {} : { body: options.raw ? String(body) : JSON.stringify(body) }),
  });
}
async function ask(env: ReturnType<typeof setup>, question = base.question, page: ConsultantPage = base.page,
  continuation?: ConsultantRequest["continuation"]) {
  const response = await action({ request: request({ ...base, question, page, ...(continuation ? { continuation } : {}) }, { locale: env.locale }), context: env.context });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  return await response.json() as ConsultantResult;
}
function topic(authorId = actor): ForumTopicPage {
  return { id: "public-topic", authorId, duplicateOf: null, bestAnswerPostId: null,
    posts: [{ id: "question" }, { id: "public-reply" }, { kind: "hidden", id: "hidden-reply" }],
    title: { originalContent: "not returned" } } as unknown as ForumTopicPage;
}

describe("Consultant U1 private request admission", () => {
  it("rejects guest, inactive, missing, expired, cross-origin, disabled and non-POST without resolving permissions", async () => {
    const expired = session();
    const cases = [
      { env: setup({ user: null }), req: request(), status: 401 },
      { env: setup({ user: { ...expired, session: { ...expired.session, expiresAt: new Date(0) } } }), req: request(), status: 401 },
      { env: setup(), req: request(base, { origin: "https://else.test" }), status: 403 },
      { env: setup(), req: request(base, { origin: null }), status: 403 },
      { env: setup({ enabled: false }), req: request(), status: 503 },
      { env: setup(), req: request(base, { method: "PUT" }), status: 405 },
    ];
    for (const { env, req, status } of cases) {
      const result = await action({ request: req, context: env.context });
      expect(result.status).toBe(status);
      expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      expect(env.assertActive).not.toHaveBeenCalled();
      expect(env.resolve).not.toHaveBeenCalled();
      expect(env.readTopicPage).not.toHaveBeenCalled();
    }
    for (const error of [new AccountInactiveError(), new AccountMissingError(), new AccountStateUnavailableError()]) {
      const env = setup();
      env.assertActive.mockRejectedValueOnce(error);
      const result = await action({ request: request(), context: env.context });
      expect(result.status).toBe(error instanceof AccountStateUnavailableError ? 503 : 401);
      expect(env.resolve).not.toHaveBeenCalled();
    }
    expect(loader().status).toBe(405);
    expect(headers()["Cache-Control"]).toBe("private, no-store");
  });
  it("rejects unknown fields, forged authority/URL, malformed contexts and oversized bodies before admission", async () => {
    const env = setup();
    const invalid = [
      { ...base, actorId: "victim" }, { ...base, disclosure: "Administrator" },
      { ...base, url: "https://evil.test" },
      { ...base, page: { kind: "topic", topicId: "id", url: "https://evil.test" } },
      { ...base, page: { kind: "editor", destination: "section" } },
      { ...base, page: { kind: "editor", destination: "help", sectionId: "id" } },
      { ...base, page: { kind: "editor", destination: "help", tagIds: Array(9).fill("x") } },
      { ...base, page: { kind: "topic", topicId: ".." } },
      { ...base, continuation: { selectedFeature: "invented" } },
      { ...base, consultationId: "not-random-id" }, { ...base, question: " " },
      { ...base, question: "x".repeat(1001) },
    ];
    for (const input of invalid) expect((await action({ request: request(input), context: env.context })).status).toBe(400);
    expect((await action({ request: request("{", { raw: true }), context: env.context })).status).toBe(400);
    expect((await action({ request: request(base, { type: "text/plain" }), context: env.context })).status).toBe(415);
    expect((await action({ request: request("x".repeat(CONSULTANT_MAX_BODY_BYTES + 1), { raw: true }), context: env.context })).status).toBe(413);
    expect(env.assertActive).not.toHaveBeenCalled();
    expect(env.resolve).not.toHaveBeenCalled();
  });
  it("uses one current effective resolver snapshot and the actual session actor; never a provider", async () => {
    const env = setup();
    const result = await ask(env);
    expect(result).toEqual({ catalogVersion: CONSULTANT_CATALOG_VERSION, consultationId: base.consultationId,
      turnId: base.turnId, kind: "navigation", cards: [
        { feature: "bookmarks", labelKey: "bookmarksNav", instructionKey: "bookmarksIntro", href: "/en/bookmarks" },
      ] });
    expect(env.assertActive).toHaveBeenCalledExactlyOnceWith(actor);
    expect(env.forUser).toHaveBeenCalledExactlyOnceWith(actor);
    expect(env.resolve).toHaveBeenCalledTimes(1);
    expect(env.has).not.toHaveBeenCalled();
    expect(env.readHomepage).not.toHaveBeenCalled();
    expect(env.readTopicPage).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private-");
    expect(JSON.stringify(result)).not.toContain("private@example.test");
  });
  it("keeps all errors and route aliases private, even when Router drops resource headers", () => {
    for (const path of ["/en/consultant", "/ru/CONSULTANT/", "/he/%63onsultant.data", "/en/consultant.data/"]) {
      expect(isConsultantPath(path)).toBe(true);
      const result = protectFrameworkFailure(new Request(origin + path), new Response("failure", { status: 500 }));
      expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      expect(result.headers.get("Referrer-Policy")).toBe("no-referrer");
    }
    expect(isConsultantPath("/en/search")).toBe(false);
  });
});

describe("Consultant effective disclosure, not role-name authority", () => {
  it("selects built-in and custom roles by effective anchors, including independently denied entries", async () => {
    expect(projectDisclosure(snapshot(INITIAL_ROLE_GRANTS.user, "admin"), false).layer).toBe("User");
    expect(projectDisclosure(snapshot(INITIAL_ROLE_GRANTS.moderator), false).layer).toBe("Moderator");
    expect(projectDisclosure(snapshot(INITIAL_ROLE_GRANTS.admin), false).layer).toBe("Administrator");
    const effective = snapshot(["admin.users.read"], "user");
    effective.grants = ["forum.complaint.review"];
    effective.overrides = { "forum.complaint.review": "deny", "admin.users.read": "allow" };
    const env = setup();
    env.resolve.mockResolvedValue(effective);
    expect((await ask(env, "admin users")).cards[0]?.href).toBe("/en/admin/users");
    expect((await ask(env, "complaint queue")).cards.every(card => !card.href.includes("attention"))).toBe(true);
    const moderator = setup({ permissions: ["forum.content.visibility.manage"], role: "administrator" });
    expect((await ask(moderator, "hidden content")).cards[0]?.href).toBe("/en/admin/forum/content");
    expect((await ask(moderator, "admin panel")).kind).toBe("fallback");
  });
  it("requires exact trusted Owner binding for Owner-only knowledge", async () => {
    const perms = ownerAwareEffectivePermissions(actor, actor, []);
    const owner = setup({ permissions: perms, owner: true, ownerId: actor });
    expect((await ask(owner, "super-admin")).cards[0]?.href).toBe("/en/super-admin");
    expect((await ask(owner, "registration settings")).cards[0]?.href).toBe("/en/settings/forum");
    const ordinary = setup({ permissions: PERMISSION_CATALOG, owner: true, ownerId: "other" });
    expect((await ask(ordinary, "super-admin")).cards.every(card => !card.href.includes("super-admin"))).toBe(true);
    expect((await ask(ordinary, "registration settings")).cards.every(card => !card.href.includes("settings/forum"))).toBe(true);
  });
  it("fails closed to public navigation on unavailable or missing permission state", async () => {
    const env = setup({ permissions: PERMISSION_CATALOG, ownerId: actor, owner: true });
    env.resolve.mockRejectedValueOnce(new AuthorizationUnavailableError());
    const result = await ask(env, "super-admin");
    expect(result.kind).toBe("fallback");
    expect(result.cards.map(card => card.href)).toEqual(["/en/search", "/en/categories/help-solutions"]);
    expect(projectDisclosure(null, true)).toMatchObject({ layer: "User", complete: false, exactOwner: false });
    const bug = new Error("unexpected");
    env.resolve.mockRejectedValueOnce(bug);
    await expect(action({ request: request(), context: env.context })).rejects.toBe(bug);
  });
});

describe("Consultant deterministic canonical navigation", () => {
  it.each([
    ["en", "Where are my bookmarks?", "/en/bookmarks"],
    ["ru", "Где изменить язык?", "/ru/settings/user"],
    ["he", "איפה משנים שפה?", "/he/settings/user"],
    ["en", "Where do I watch a topic?", "/en/search"],
    ["ru", "Где посмотреть уведомления?", "/ru/notifications"],
    ["en", "How do I mute notifications?", "/en/filters"],
    ["en", "Where is Help?", "/en/categories/help-solutions"],
    ["ru", "Куда писать, если перевод сообщения неправильный?", "/ru/categories/help-solutions"],
    ["he", "איפה הסימניות שלי?", "/he/bookmarks"],
  ])("routes %s navigation without model calls", async (locale, question, href) => {
    expect((await ask(setup({ locale }), question)).cards[0]?.href).toBe(href);
  });
  it("builds current public topic/report links; a hidden or missing target yields the same fallback", async () => {
    const env = setup();
    env.readTopicPage.mockResolvedValue(topic());
    expect((await ask(env, "report message", { kind: "topic", topicId: "public-topic", postId: "public-reply" })).cards[0]?.href)
      .toBe("/en/topics/public-topic#post-public-reply");
    expect((await ask(env, "watch topic", { kind: "topic", topicId: "public-topic" })).cards[0]?.href).toBe("/en/topics/public-topic");
    const hidden = await ask(env, "report message", { kind: "topic", topicId: "public-topic", postId: "hidden-reply" });
    const missing = await ask(env, "report message", { kind: "topic", topicId: "public-topic", postId: "missing-reply" });
    expect(hidden).toEqual(missing);
    expect(hidden.kind).toBe("fallback");
    expect(JSON.stringify(hidden)).not.toContain("hidden-reply");
    expect(JSON.stringify(hidden)).not.toContain("not returned");
    const restricted = setup({ restrictions: ["complaints.submit"] });
    expect((await ask(restricted, "report message", { kind: "topic", topicId: "public-topic" })).kind).toBe("fallback");
    expect(restricted.readTopicPage).not.toHaveBeenCalled();
    env.readTopicPage.mockRejectedValueOnce(new ForumStorageUnavailableError());
    expect((await ask(env, "watch topic", { kind: "topic", topicId: "public-topic" })).kind).toBe("fallback");
  });
  it("separates reading best answers from managing them, with own-resource admission", async () => {
    const env = setup();
    env.readTopicPage.mockResolvedValue(topic("other-author"));
    expect((await ask(env, "where is best answer", { kind: "topic", topicId: "public-topic" })).cards[0]?.href).toBe("/en/topics/public-topic");
    expect((await ask(env, "select best answer", { kind: "topic", topicId: "public-topic" })).kind).toBe("fallback");
    env.readTopicPage.mockResolvedValue(topic());
    expect((await ask(env, "select best answer", { kind: "topic", topicId: "public-topic" })).cards[0]?.feature).toBe("select-best-answer");
  });
  it("reuses the public ordinary structure for placement and never links the Help service section", async () => {
    const env = setup();
    env.readHomepage.mockResolvedValue([
      { id: "development", name: "Development", sectionCount: 1, topicCount: 0, messageCount: 0,
        sections: [{ id: "cloudflare", name: "Cloudflare Workers", topicCount: 0, messageCount: 0 }] },
      { id: HELP_SOLUTIONS_CATEGORY_ID, name: "Help", sectionCount: 1, topicCount: 0, messageCount: 0,
        sections: [{ id: HELP_SOLUTIONS_SERVICE_SECTION_ID, name: "Private service section", topicCount: 0, messageCount: 0 }] },
    ]);
    expect((await ask(env, "Which section for Cloudflare Workers?")).cards[0]).toMatchObject({
      href: "/en/sections/cloudflare", resourceLabel: "Cloudflare Workers", instructionKey: "consultantPlacement" });
    expect((await ask(env, "Which section?", { kind: "section", sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID })).cards[0]?.href).toBe("/en");
    expect(env.readSection).not.toHaveBeenCalled();
    const restricted = setup({ restrictions: ["topics.create"] });
    expect((await ask(restricted, "where to ask a question")).kind).toBe("fallback");
  });
  it("rechecks continuation hints against current capabilities and canonical public readers", async () => {
    const env = setup();
    expect((await ask(env, "open it", { kind: "none" }, { selectedFeature: "super-admin" })).kind).toBe("fallback");
    env.readTopicPage.mockResolvedValue(topic());
    expect((await ask(env, "open it", { kind: "none" }, { selectedFeature: "watch", selectedTopicId: "public-topic" })).cards[0]?.href)
      .toBe("/en/topics/public-topic");
  });
  it("matches every catalog link against a real registered route and every label against current translations", async () => {
    const source = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    const patterns = ["/:locale", ...[...source.matchAll(/^    route\("([^"*]+)", "routes\//gm)].map(match => "/:locale/" + match[1])];
    const disclosure = projectDisclosure(snapshot(PERMISSION_CATALOG, "owner", true), true);
    for (const locale of ["en", "ru", "he"]) {
      const env = setup({ locale });
      const catalog = permittedNavigationCatalog(actor, disclosure, env.deps);
      expect(new Set(catalog.map(entry => entry.feature))).toEqual(new Set(CONSULTANT_FEATURES));
      for (const entry of catalog) {
        const url = new URL(entry.href, origin);
        expect(url.origin).toBe(origin);
        expect(patterns.some(path => matchPath({ path, end: true }, url.pathname))).toBe(true);
        for (const key of [entry.labelKey, entry.instructionKey]) {
          const descriptor = canonicalEnglishCatalog.common[key];
          expect(descriptor).toBeDefined();
          expect(russianCommonValues[key]).toBeDefined();
          expect(hebrewCommonValues[key]).toBeDefined();
          if (key.startsWith("consultant")) expect(await sourceFingerprint(descriptor)).toBe(reviewedCommonFingerprints[key]);
        }
      }
    }
    expect(patterns.some(path => matchPath({ path, end: true }, consultantPath("en")))).toBe(true);
    for (const locale of ["iw", "ka", "invalid"]) {
      expect(resolveExplicitLocale(request(base, { locale }), locale, localeRegistry).type).toBe("not-found");
    }
  });
});
