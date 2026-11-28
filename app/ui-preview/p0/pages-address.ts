import {
  createPath, type To,
} from "react-router";

export interface PagesBootstrapIdentity {
  readonly actor: string;
  readonly scenario: string;
  readonly initialPath: string;
}

function virtualPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some((char) => char.charCodeAt(0) < 32)) {
    throw new Error("Invalid preview virtual path");
  }
  const parsed = new URL(value, "https://preview-virtual.invalid");
  const normalized = parsed.pathname + parsed.search + parsed.hash;
  if (parsed.origin !== "https://preview-virtual.invalid" || !parsed.pathname.startsWith("/")) {
    throw new Error("Invalid preview virtual path origin");
  }
  return normalized;
}

function identity(value: string, field: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/u.test(value)) {
    throw new Error("Invalid preview " + field);
  }
  return value;
}

/** One virtual ↔ Pages bootstrap codec; base comes from the actual hosted entry. */
export function createPagesAddressCodec(pageUrl: URL, identityInfo: PagesBootstrapIdentity) {
  const base = new URL(".", pageUrl);
  const actor = identity(identityInfo.actor, "actor");
  const scenario = identity(identityInfo.scenario, "scenario");
  const defaultPath = virtualPath(identityInfo.initialPath);

  function href(to: string | To): string {
    const raw = typeof to === "string" ? to : createPath(to);
    const path = virtualPath(raw);
    const query = new URLSearchParams();
    query.set("embed", "1");
    query.set("path", path);
    query.set("actor", actor);
    query.set("scenario", scenario);
    return base.pathname + "?" + query.toString();
  }

  function fromUrl(url: URL): string {
    if (url.origin !== base.origin || url.pathname !== base.pathname) {
      throw new Error("Preview bootstrap outside hosted Pages base");
    }
    const fields = url.searchParams;
    if (fields.size === 0) return defaultPath;
    if (fields.get("embed") !== "1" || fields.get("actor") !== actor
      || fields.get("scenario") !== scenario || !fields.has("path")) {
      throw new Error("Invalid preview bootstrap identity or fields");
    }
    for (const key of fields.keys()) {
      if (!["embed", "path", "actor", "scenario"].includes(key) || fields.getAll(key).length !== 1) {
        throw new Error("Invalid preview bootstrap fields");
      }
    }
    if (url.hash) throw new Error("Preview fragment must live inside the virtual path");
    return virtualPath(fields.get("path")!);
  }

  return { base: base.pathname, actor, scenario, href, fromUrl };
}

export { virtualPath as validatePreviewVirtualPath };
