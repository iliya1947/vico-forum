import { existsSync } from "node:fs";
import { posix, resolve } from "node:path";
import type { RouteConfigEntry } from "@react-router/dev/routes";

export interface PreviewRouteDescriptor {
  id: string;
  file: string;
  path?: string;
  index?: boolean;
  caseSensitive?: boolean;
  children?: PreviewRouteDescriptor[];
}

function routeFile(file: string): string {
  const normalized = posix.normalize(file.replaceAll("\\", "/").replace(/^(\.\/)+/, ""));
  if (
    normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || posix.isAbsolute(normalized)
  ) {
    throw new Error("UI preview route file must be inside the app directory: " + file);
  }
  return normalized;
}

/**
 * Build-only conversion of the actual Framework route config. The same route
 * descriptors will feed the browser router and the local resource dispatcher.
 * This module must never be included in the browser bundle.
 */
export function createPreviewRouteManifest(
  config: readonly RouteConfigEntry[],
  appDirectory: string,
): PreviewRouteDescriptor {
  const ids = new Set(["root"]);

  function convert(entry: RouteConfigEntry): PreviewRouteDescriptor {
    const file = routeFile(entry.file);
    if (!existsSync(resolve(appDirectory, file))) {
      throw new Error("UI preview route file does not exist: " + file);
    }

    const id = entry.id ?? file.replace(/\.[cm]?[jt]sx?$/, "");
    if (!id || ids.has(id)) {
      throw new Error("UI preview duplicate or invalid route ID: " + id);
    }
    ids.add(id);

    if (entry.index && entry.children?.length) {
      throw new Error("UI preview index route cannot have children: " + id);
    }

    return {
      id,
      file,
      ...(entry.path === undefined ? {} : { path: entry.path }),
      ...(entry.index === undefined ? {} : { index: entry.index }),
      ...(entry.caseSensitive === undefined ? {} : { caseSensitive: entry.caseSensitive }),
      ...(entry.children === undefined ? {} : { children: entry.children.map(convert) }),
    };
  }

  if (!existsSync(resolve(appDirectory, "root.tsx"))) {
    throw new Error("UI preview root route file does not exist");
  }

  return { id: "root", file: "root.tsx", children: config.map(convert) };
}
