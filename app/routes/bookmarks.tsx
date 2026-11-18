import { useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { DELETED_USER_NAME } from "../../db/public-identity";
import type { ForumTopicBookmarkCursor } from "../../db/forum-repository";
import { ForumRouteError } from "../forum/ui";

const PRIVATE_CACHE = "private, no-store";
const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export function headers({ parentHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", PRIVATE_CACHE);
  return result;
}

export function meta() {
  return [{ title: "Bookmarks · Vico Forum" }];
}

/** Parse only app-level URL params, not React Router's .data/_routes metadata. */
export function bookmarkListCursor(params: URLSearchParams): ForumTopicBookmarkCursor | undefined {
  if (params.size === 0) return undefined;
  if ([...params.keys()].some(key => key !== "beforeSavedAt" && key !== "beforeTopicId")
    || params.getAll("beforeSavedAt").length !== 1
    || params.getAll("beforeTopicId").length !== 1) {
    throw new Response("Invalid bookmark cursor", { status: 400,
      headers: { "Cache-Control": PRIVATE_CACHE } });
  }
  const rawDate = params.get("beforeSavedAt")!;
  const topicId = params.get("beforeTopicId")!;
  const savedAt = new Date(rawDate);
  if (!UTC_MILLIS.test(rawDate) || !Number.isFinite(savedAt.getTime())
    || savedAt.toISOString() !== rawDate
    || !topicId.trim() || topicId !== topicId.trim() || topicId.length > 256
    || /[\u0000-\u001f\u007f]/u.test(topicId)) {
    throw new Response("Invalid bookmark cursor", { status: 400,
      headers: { "Cache-Control": PRIVATE_CACHE } });
  }
  return { savedAt, topicId };
}

export async function loader({ params, context, url }: {
  params: { locale?: string };
  context: RouterContextProvider;
  url?: URL;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", {
    status: 401, headers: { "Cache-Control": PRIVATE_CACHE },
  });
  const before = bookmarkListCursor(url?.searchParams ?? new URLSearchParams());
  try {
    const page = await forumReaderForRequest(context).readTopicBookmarks(session.user.id, before);
    return {
      locale: params.locale ?? "en",
      actorId: session.user.id,
      items: page.items.map(item => ({
        id: item.id, title: item.title,
        authorName: item.authorIdentityKind === "deleted" ? DELETED_USER_NAME : item.authorName,
        ...(item.authorIdentityKind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
        category: item.category, section: item.section,
        savedAt: new Date(item.savedAt).toISOString(),
      })),
      next: page.next === null ? null
        : { beforeSavedAt: new Date(page.next.savedAt).toISOString(), beforeTopicId: page.next.topicId },
    };
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503,
        headers: { "Cache-Control": PRIVATE_CACHE } });
    }
    throw error;
  }
}

// The list presentation is built in the next isolated UI/localization slice.
export default function BookmarksRoute() {
  useLoaderData<typeof loader>();
  return null;
}

export const ErrorBoundary = ForumRouteError;
