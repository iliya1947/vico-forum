// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import type { RouteObject } from "react-router";
import routes from "../../routes";
import { createPreviewRouteManifest } from "../build/route-manifest";
import { createPreviewDataRoutes } from "./route-adapter";

const manifest = createPreviewRouteManifest(routes, resolve(process.cwd(), "app"));
const dummy = () => null;
const fakeLoader = async () => ({ ok: true });
const nextMiddleware = async (_args: unknown, next: () => Promise<unknown>) => next();

function fixtures() {
  return new Map<string, Record<string, unknown>>([
    ["root", { default: dummy }],
    ["routes/locale-boundary", { default: dummy, loader: fakeLoader, middleware: [nextMiddleware] }],
    ["routes/topic", { default: dummy, loader: fakeLoader, action: fakeLoader }],
    ["routes/presence", { action: fakeLoader, loader: fakeLoader }],
  ]);
}

describe("P0 generated Data Router adaptation", () => {
  it("retains Framework route IDs, paths, real handlers and ancestor middleware", () => {
    const root = createPreviewDataRoutes(manifest, fixtures())[0]!;
    expect(root.id).toBe("root");
    const locale = (root as RouteObject & { children: RouteObject[] }).children[0]!;
    expect(locale.id).toBe("routes/locale-boundary");
    expect(locale.path).toBe(":locale");
    expect(locale.loader).toBe(fakeLoader);
    expect(locale.middleware).toEqual([nextMiddleware]);
    const topic = (locale as RouteObject & { children: RouteObject[] }).children[0]!;
    expect(topic.id).toBe("routes/topic");
    expect(topic.path).toBe("topics/:topicId");
    expect(topic.loader).toBe(fakeLoader);
    expect(topic.action).toBe(fakeLoader);
    const presence = (locale as RouteObject & { children: RouteObject[] }).children[1]!;
    expect(presence.id).toBe("routes/presence");
    expect(presence.path).toBe("presence");
    expect(presence.action).toBe(fakeLoader);
    expect(presence.loader).toBe(fakeLoader);
    expect(presence.Component).toBeUndefined();
    expect((locale as RouteObject & { children: RouteObject[] }).children).toHaveLength(2);
  });

  it("does not silently replace missing ancestor routes or foreign modules", () => {
    const modules = fixtures();
    modules.delete("routes/locale-boundary");
    expect(() => createPreviewDataRoutes(manifest, modules)).toThrow(/cannot omit ancestor/);
    const rogue = fixtures();
    rogue.set("no-such-route", { default: dummy });
    expect(() => createPreviewDataRoutes(manifest, rogue)).toThrow(/not present/);
  });
});
