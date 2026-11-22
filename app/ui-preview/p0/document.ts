import type { createMemoryRouter } from "react-router";
import { rootDocumentLocale } from "../../root-document";

type RouterState = ReturnType<typeof createMemoryRouter>["state"];
type RouteModule = Record<string, unknown>;
type HeadTag = "meta" | "link" | "script";
const HEAD_OWNER = "data-vico-preview-document";

/**
 * The Framework Layout owns html/head/body. Embedded Vite already has those
 * nodes: apply shared root locale data and actual route meta/links exports here,
 * without mounting a second document or running Framework Scripts/hydration.
 */
export function createPreviewDocumentAdapter(
  modules: ReadonlyMap<string, RouteModule>,
  doc: Document = document,
) {
  const initialTitle = doc.title;

  function makeHeadElement(tag: HeadTag, descriptor: Record<string, unknown>) {
    const node = doc.createElement(tag);
    node.setAttribute(HEAD_OWNER, "");
    for (const [key, value] of Object.entries(descriptor)) {
      if (key === "tagName" || key === "title" || key === "script:ld+json") continue;
      if (value === undefined || value === null) continue;
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        throw new TypeError("Unsupported route document attribute: " + key);
      }
      node.setAttribute(key === "charSet" ? "charset" : key, String(value));
    }
    return node;
  }

  function descriptors(raw: unknown, exportName: string): Record<string, unknown>[] {
    if (!Array.isArray(raw) || raw.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new TypeError("Invalid route " + exportName + " export");
    }
    return raw as Record<string, unknown>[];
  }

  function sync(state: RouterState) {
    const matches = state.matches.map((match) => ({
      loaderData: state.loaderData[match.route.id],
    }));
    const locale = rootDocumentLocale(matches);
    doc.documentElement.lang = locale.lang;
    doc.documentElement.dir = locale.dir;

    const metaMatches = state.matches.map((match) => ({
      id: match.route.id,
      pathname: match.pathname,
      params: match.params,
      data: state.loaderData[match.route.id],
      handle: match.route.handle,
    }));
    let meta: Record<string, unknown>[] = [];
    const links: Record<string, unknown>[] = [];
    for (const match of state.matches) {
      const module = modules.get(match.route.id);
      if (!module) throw new Error("Document adapter missing matched module: " + match.route.id);
      if (module.links !== undefined) {
        if (typeof module.links !== "function") throw new TypeError("Invalid route links export");
        links.push(...descriptors(module.links(), "links"));
      }
      if (module.meta !== undefined) {
        if (typeof module.meta !== "function") throw new TypeError("Invalid route meta export");
        meta = descriptors(module.meta({
          data: state.loaderData[match.route.id],
          params: match.params,
          location: state.location,
          matches: metaMatches,
          error: state.errors?.[match.route.id],
        }), "meta");
      }
    }

    const created: Element[] = [];
    let title = initialTitle;
    for (const descriptor of meta) {
      if (Object.hasOwn(descriptor, "title")) {
        if (typeof descriptor.title !== "string") throw new TypeError("Invalid route title");
        title = descriptor.title;
      } else if (Object.hasOwn(descriptor, "script:ld+json")) {
        const script = makeHeadElement("script", { type: "application/ld+json" });
        script.textContent = JSON.stringify(descriptor["script:ld+json"]);
        created.push(script);
      } else {
        const tag = descriptor.tagName === "link" ? "link" : "meta";
        created.push(makeHeadElement(tag, descriptor));
      }
    }
    for (const descriptor of links) {
      created.push(makeHeadElement("link", descriptor));
    }

    // Validate complete next head state before altering the current document.
    doc.head.querySelectorAll("[" + HEAD_OWNER + "]").forEach((node) => node.remove());
    doc.title = title;
    doc.head.append(...created);
  }

  function dispose() {
    doc.head.querySelectorAll("[" + HEAD_OWNER + "]").forEach((node) => node.remove());
    doc.title = initialTitle;
  }

  return { sync, dispose };
}
