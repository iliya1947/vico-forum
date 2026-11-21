import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import type { HiddenQueueCursor, HiddenQueueKind, HiddenQueueQuery } from "../../db/private-visibility-queue";

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
