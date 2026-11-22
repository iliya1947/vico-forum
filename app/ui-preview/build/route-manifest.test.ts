// @vitest-environment node
import { resolve } from "node:path";
import type { RouteConfigEntry } from "@react-router/dev/routes";
import { describe, expect, it } from "vitest";
import routes from "../../routes";
import { createPreviewRouteManifest, type PreviewRouteDescriptor } from "./route-manifest";

const appDirectory = resolve(process.cwd(), "app");

function flatten(route: PreviewRouteDescriptor): PreviewRouteDescriptor[] {
  return [route, ...(route.children ?? []).flatMap(flatten)];
}

describe("generated UI preview route manifest", () => {
  it("preserves real Framework IDs, nested paths, index routes and resource routes", () => {
    const manifest = createPreviewRouteManifest(routes, appDirectory);
    const all = flatten(manifest);
    expect(manifest.id).toBe("root");
    expect(new Set(all.map((entry) => entry.id)).size).toBe(all.length);
    expect(all).toContainEqual(expect.objectContaining({
      id: "routes/locale-boundary", path: ":locale",
    }));
    expect(all).toContainEqual(expect.objectContaining({
      id: "routes/home", index: true,
    }));
    expect(all).toContainEqual(expect.objectContaining({
      id: "routes/topic", path: "topics/:topicId",
    }));
    expect(all).toContainEqual(expect.objectContaining({
      id: "routes/attachment-download", path: "api/attachments/file/:attachmentId",
    }));
    expect(manifest.children?.find((entry) => entry.id === "routes/locale-boundary")
      ?.children?.some((entry) => entry.id === "routes/topic")).toBe(true);
  });

  it("rejects duplicate IDs, unresolved files and index children", () => {
    const duplicate = [
      { file: "routes/home.tsx", id: "same" },
      { file: "routes/topic.tsx", id: "same" },
    ] satisfies RouteConfigEntry[];
    expect(() => createPreviewRouteManifest(duplicate, appDirectory)).toThrow(/duplicate/);
    expect(() => createPreviewRouteManifest([{ file: "routes/missing-preview.tsx" }], appDirectory))
      .toThrow(/does not exist/);
    expect(() => createPreviewRouteManifest([
      { file: "routes/home.tsx", index: true, children: [{ file: "routes/topic.tsx" }] },
    ] as RouteConfigEntry[], appDirectory)).toThrow(/index route/);
    expect(() => createPreviewRouteManifest([{ file: "../outside.ts" }], appDirectory))
      .toThrow(/inside the app directory/);
  });

  it("retains explicit IDs and case sensitivity without guessing from paths", () => {
    const manifest = createPreviewRouteManifest([{
      id: "my-explicit-id", file: "routes/topic.tsx",
      path: "Topics/:topicId", caseSensitive: true,
    }], appDirectory);
    expect(manifest.children).toEqual([{
      id: "my-explicit-id", file: "routes/topic.tsx",
      path: "Topics/:topicId", caseSensitive: true,
    }]);
  });
});
