import { data, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { ForumPersonalFilterCursor } from "../../db/forum-repository";
import { ForumRouteError } from "../forum/ui";
import { FiltersView } from "../forum/filters-view";

const PRIVATE_CACHE = "private, no-store";
const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
export function headers({ parentHeaders }: HeadersArgs) {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", PRIVATE_CACHE);
  return result;
}
export function meta() { return [{ title: "Personal filters · Vico Forum" }]; }

export function personalFiltersQuery(params: URLSearchParams): {
  tab: "topics" | "users"; before?: ForumPersonalFilterCursor;
} {
  const invalid = (): never => { throw new Response("Invalid filters query", {
    status: 400, headers: { "Cache-Control": PRIVATE_CACHE },
  }); };
  if ([...params.keys()].some(key => !["tab", "beforeCreatedAt", "beforeTargetId"].includes(key))
    || ["tab", "beforeCreatedAt", "beforeTargetId"].some(key => params.getAll(key).length > 1)) invalid();
  const tab = params.get("tab") ?? "topics";
  if (tab !== "topics" && tab !== "users") return invalid();
  const rawDate = params.get("beforeCreatedAt");
  const targetId = params.get("beforeTargetId");
  if ((rawDate === null) !== (targetId === null)) return invalid();
  if (rawDate === null || targetId === null) return { tab };
  const createdAt = new Date(rawDate);
  if (!UTC_MILLIS.test(rawDate) || !Number.isFinite(createdAt.getTime())
    || createdAt.toISOString() !== rawDate
    || !targetId.trim() || targetId !== targetId.trim() || targetId.length > 256
    || [...targetId].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return invalid();
  return { tab, before: { createdAt, targetId } };
}

export async function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", {
    status: 401, headers: { "Cache-Control": PRIVATE_CACHE },
  });
  const search = new URL(request.url).searchParams;
  // Single-fetch transport parameters do not extend the application cursor.
  const query = new URLSearchParams();
  for (const [key, value] of search) if (key !== ".data" && key !== "_routes") query.append(key, value);
  const { tab, before } = personalFiltersQuery(query);
  try {
    if (tab === "topics") {
      const page = await forumReaderForRequest(context).readMutedTopics(session.user.id, before);
      return data({
        locale: params.locale ?? "en", actorId: session.user.id, tab,
        items: page.items.map(item => ({
          kind: "topic" as const, id: item.id, name: item.title,
          createdAt: item.mutedAt.toISOString(),
          authorName: item.authorName, authorIdentityKind: item.authorIdentityKind,
          category: item.category, section: item.section,
        })),
        next: page.next && { beforeCreatedAt: page.next.createdAt.toISOString(), beforeTargetId: page.next.targetId },
      }, { headers: { "Cache-Control": PRIVATE_CACHE } });
    }
    const page = await forumReaderForRequest(context).readBlockedUsers(session.user.id, before);
    return data({
      locale: params.locale ?? "en", actorId: session.user.id, tab,
      items: page.items.map(item => ({
        kind: "user" as const, id: item.id, name: item.name,
        createdAt: item.blockedAt.toISOString(), identityKind: item.identityKind,
      })),
      next: page.next && { beforeCreatedAt: page.next.createdAt.toISOString(), beforeTargetId: page.next.targetId },
    }, { headers: { "Cache-Control": PRIVATE_CACHE } });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) throw new Response("Unavailable", {
      status: 503, headers: { "Cache-Control": PRIVATE_CACHE },
    });
    throw error;
  }
}
export default function FiltersRoute() {
  return <FiltersView {...useLoaderData<typeof loader>()} />;
}
export const ErrorBoundary = ForumRouteError;
