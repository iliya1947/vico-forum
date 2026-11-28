// @vitest-environment node
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import routes from "../../routes";
import { createPreviewRouteManifest } from "./route-manifest";
import { createPreviewRouteModuleSource, PREVIEW_ROUTES_MODULE_ID } from "./route-modules";

const appDirectory = resolve(process.cwd(), "app");
const manifest = createPreviewRouteManifest(routes, appDirectory);

describe("browser route module generation", () => {
  it("uses the original Framework IDs and imports the actual module files", () => {
    const source = createPreviewRouteModuleSource(
      manifest, appDirectory, ["root", "routes/locale-boundary", "routes/topic"],
    );
    expect(PREVIEW_ROUTES_MODULE_ID).toBe("virtual:vico-ui-preview-routes");
    expect(source).toContain('"routes/topic": () => import(');
    expect(source).toContain('routes/topic.tsx")');
    expect(source).toContain('"routes/locale-boundary": () => import(');
    expect(source).toContain('routes/locale-boundary.tsx")');
    expect(source).toContain('"root": () => import(');
    expect(source).toContain('root.tsx")');
    expect(source).toContain('"routes/attachment-download"');
    // Only the selected P0 imports are bundled; the route descriptors remain complete.
    expect(source).not.toContain('"routes/attachment-download": () => import(');
    expect(source).not.toContain('import("app/routes.ts")');
    expect(source).not.toContain("@react-router/dev");
  });

  it("automatically registers every current Framework route without a handwritten list", () => {
    const source = createPreviewRouteModuleSource(manifest, appDirectory);
    const entries = [manifest];
    for (let index = 0; index < entries.length; index += 1) {
      entries.push(...(entries[index]!.children ?? []));
    }
    for (const descriptor of entries) {
      const absoluteFile = resolve(appDirectory, descriptor.file).replaceAll("\\", "/");
      expect(source).toContain(
        JSON.stringify(descriptor.id) + ": () => import(" + JSON.stringify(absoluteFile) + ")",
      );
    }
    expect(source.match(/: \(\) => import\(/gu)).toHaveLength(entries.length);
    expect(source).not.toContain("not bundled in P0");
  });

  it("includes an additional generated descriptor without a manual route registration", () => {
    const source = createPreviewRouteModuleSource({
      ...manifest,
      children: [...(manifest.children ?? []), {
        id: "routes/extra-preview-test", file: "routes/home.tsx", path: "extra",
      }],
    }, appDirectory);
    expect(source).toContain('"routes/extra-preview-test": () => import(');
  });

  it("fails explicitly for unrecognized or duplicated modules", () => {
    expect(() => createPreviewRouteModuleSource(manifest, appDirectory, ["not-a-route"]))
      .toThrow(/unknown route module ID/);
    expect(() => createPreviewRouteModuleSource(manifest, appDirectory, ["root", "root"]))
      .toThrow(/duplicate module IDs/);
  });
});
