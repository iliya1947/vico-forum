import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import type { HiddenQueueCursor, HiddenQueueKind, HiddenQueueQuery, HiddenInspectionTarget } from "../../db/private-visibility-queue";

const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const APPLICATION_KEYS = new Set(["kind", "beforeChangedAt", "beforeId"]);

/** Strict application query. Router transport metadata is filtered by the route. */
export function hiddenQueueQuery(params: URLSearchParams): HiddenQueueQuery {
  const invalid = (): never => {
    throw new Response("Invalid queue query", {
      status: 400, headers: { "Cache-Control": "private, no-store" },
    });
  };
  if ([...params.keys()].some(key => !APPLICATION_KEYS.has(key))
    || [...APPLICATION_KEYS].some(key => params.getAll(key).length > 1)) return invalid();
  const kind = params.get("kind") ?? "topic";
  if (kind !== "topic" && kind !== "post") return invalid();
  const changedAt = params.get("beforeChangedAt");
  const id = params.get("beforeId");
  if ((changedAt === null) !== (id === null)) return invalid();
  if (changedAt === null || id === null) return { kind };
  const parsed = new Date(changedAt);
  if (!UTC_MILLIS.test(changedAt) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString() !== changedAt
    || !id || id !== id.trim() || new TextEncoder().encode(id).length > 256
    || [...id].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) return invalid();
  return { kind, before: { changedAt, id } };
}

/** Outgoing typed private queue address, using the existing admin forum family. */
export function hiddenQueuePath(
  locale: string, kind: HiddenQueueKind, before?: HiddenQueueCursor,
  routing: AdministrativeRouting = defaultAdministrativeRouting,
): string {
  const params = new URLSearchParams({ kind });
  if (before) {
    params.set("beforeChangedAt", before.changedAt);
    params.set("beforeId", before.id);
  }
  return `${routing.admin.forum(locale)}/content?${params}`;
}

/** This route is a private inspection resource, not an ordinary Admin topic read. */
export function hiddenInspectionPath(
  locale: string, target: HiddenInspectionTarget,
  routing: AdministrativeRouting = defaultAdministrativeRouting,
): string {
  const path = routing.admin.topic(locale, target.topicId) + "/inspect";
  return target.kind === "post" ? path + "?" + new URLSearchParams({ postId: target.postId }) : path;
}

/** Parse after capability admission to prevent denied actors from using query validation as an oracle. */
export function hiddenInspectionTarget(topicId: string, params: URLSearchParams): HiddenInspectionTarget {
  const invalid = (): never => {
    throw new Response("Invalid inspection query", {
      status: 400, headers: { "Cache-Control": "private, no-store" },
    });
  };
  if ([...params.keys()].some(key => key !== "postId") || params.getAll("postId").length > 1) return invalid();
  const postId = params.get("postId");
  if (postId === null) return { kind: "topic", topicId };
  if (!postId || postId !== postId.trim() || new TextEncoder().encode(postId).length > 2048
    || [...postId].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) return invalid();
  return { kind: "post", topicId, postId };
}
