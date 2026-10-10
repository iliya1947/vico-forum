import { data, redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest, forumWriterForRequest } from "../forum/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { forumProfilePath } from "../forum/paths";
import { InvalidProfileError, validateProfileFields } from "../forum/profile";
import { ProfileView } from "../forum/profile-view";
import { ForumRouteError } from "../forum/ui";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

type ProfileArgs = { request: Request; params: { locale?: string; userId?: string }; context: RouterContextProvider };
export type ProfileActionError = "invalid" | "unauthenticated" | "origin" | "forbidden" | "notFound" | "unavailable";
export interface ProfileDraft { bio: string; githubUrl: string; websiteUrl: string }
export interface ProfileActionData { error: ProfileActionError; draft?: ProfileDraft }

export function meta() { return [{ title: "Profile · Vico Forum" }]; }

export async function loader({ request, params, context }: ProfileArgs) {
  if (!params.userId) throw new Response("Not Found", { status: 404 });
  try {
    const profile = await forumReaderForRequest(context).readProfile(params.userId);
    if (!profile) throw new Response("Not Found", { status: 404 });
    const isOwner = authSessionForRequest(context)?.user.id === profile.id;
    const query = new URL(request.url).searchParams;
    return {
      locale: params.locale ?? "en",
      profile: {
        id: profile.id, name: profile.name, image: profile.image, joinedAt: profile.joinedAt.toISOString(),
        bio: profile.bio, githubUrl: profile.githubUrl, websiteUrl: profile.websiteUrl,
        role: { slug: profile.role.slug, displayName: profile.role.displayName, isSystem: profile.role.isSystem },
        messageCount: profile.messageCount, bestAnswerCount: profile.bestAnswerCount,
      },
      isOwner, editing: isOwner && query.get("edit") === "1", saved: isOwner && query.get("saved") === "1",
    };
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) throw new Response("Unavailable", { status: 503 });
    throw error;
  }
}

export async function action({ request, params, context }: ProfileArgs) {
  const failure = (error: ProfileActionError, status: number, draft?: ProfileDraft) => data<ProfileActionData>({ error, ...(draft ? { draft } : {}) }, { status });
  if (request.method !== "POST") throw new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  const session = authSessionForRequest(context);
  if (!session) return failure("unauthenticated", 401);
  if (!requireSameOrigin(request)) return failure("origin", 403);
  if (session.user.id !== params.userId) return failure("forbidden", 403);
  if (!params.locale) return failure("invalid", 400);
  let form: FormData;
  try { form = await request.formData(); } catch { return failure("invalid", 400); }
  const values = [form.get("bio"), form.get("githubUrl"), form.get("websiteUrl")];
  if (values.some((value) => typeof value !== "string") || form.get("intent") !== "save-profile") return failure("invalid", 400);
  const [bio, githubUrl, websiteUrl] = values as string[];
  // Preserve bounded draft text on recoverable failures without trusting it as stored data.
  const draft = { bio: bio.slice(0, 2000), githubUrl: githubUrl.slice(0, 2048), websiteUrl: websiteUrl.slice(0, 2048) };
  try {
    const fields = validateProfileFields({ bio, githubUrl, websiteUrl });
    await forumWriterForRequest(context).updateProfile({ actorId: session.user.id, fields });
    return redirect(`${forumProfilePath(params.locale, session.user.id)}?saved=1`);
  } catch (error) {
    if (error instanceof InvalidProfileError) return failure("invalid", 400, draft);
    if (error instanceof ForumEntityNotFoundError) return failure("notFound", 404);
    if (error instanceof ForumStorageUnavailableError) return failure("unavailable", 503, draft);
    throw error;
  }
}

export default function ProfileRoute() {
  return <ProfileView {...useLoaderData<typeof loader>()} feedback={useActionData<typeof action>()} />;
}
export const ErrorBoundary = ForumRouteError;
