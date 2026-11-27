import { forumReadLoader } from "../forum/read-availability.server";
import { redirect, type HeadersArgs, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { forumTopicPath } from "../forum/paths";

const privateHeaders = { "Cache-Control": "private, no-store" };

/** The legacy edit alias is private even when its target is missing. */
export function headers({ parentHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "private, no-store");
  return result;
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string; postId?: string }; context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401, headers: privateHeaders });
  const postId = params.postId ?? "";
  const post = await forumReaderForRequest(context).readPostLocation(postId);
  if (!post) throw new Response("Not Found", { status: 404, headers: privateHeaders });
  if (post.authorId !== session.user.id
    || !(await authorizationForRequest(context).forUser(session.user.id).has("forum.post.editOwn"))) {
    throw new Response("Forbidden", { status: 403, headers: privateHeaders });
  }
  return redirect(forumTopicPath(params.locale ?? "en", post.topicId)
    + "?editPost=" + encodeURIComponent(postId) + "#post-" + encodeURIComponent(postId), { headers: privateHeaders });
});

export { ForumRouteError as ErrorBoundary } from "../forum/ui";
