import { data, redirect, useActionData, useLoaderData, useLocation, useNavigate, useRouteError, isRouteErrorResponse, type RouterContextProvider } from "react-router";
import { useEffect, useRef } from "react";
import { authSessionForRequest } from "../auth/request-context";
import { measureRestrictionsForPresentation } from "../measures/presentation.server";
import { forumReaderForRequest, forumWriterForRequest } from "../forum/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { forumProfilePath } from "../forum/paths";
import { InvalidProfileError, validateProfileFields } from "../forum/profile";
import { ProfileView } from "../forum/profile-view";
import { readProfilePrivilegedSections } from "../profile/sections.server";
import { ForumRouteError } from "../forum/ui";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";

type ProfileArgs = { request: Request; params: { locale?: string; userId?: string }; context: RouterContextProvider };
export type ProfileActionError = "invalid" | "unauthenticated" | "origin" | "forbidden" | "notFound" | "unavailable";
export interface ProfileDraft { bio: string; githubUrl: string; websiteUrl: string }
export interface ProfileActionData { error: ProfileActionError; draft?: ProfileDraft }

export function headers() { return { "Cache-Control": "private, no-store" }; }
export function meta() { return [{ title: "Profile · Vico Forum" }]; }

export async function loader({ request, params, context }: ProfileArgs) {
  if (!params.userId) throw new Response("Not Found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  try {
    const profile = await forumReaderForRequest(context).readProfile(params.userId);
    if (!profile) throw new Response("Not Found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const isSelf = authSessionForRequest(context)?.user.id === profile.id;
    const canEditProfile = isSelf && profile.identityKind !== "deleted" &&
      !(await measureRestrictionsForPresentation(context,profile.id)).has("profile.edit");
    const query = new URL(request.url).searchParams;
    const privileged = await readProfilePrivilegedSections(request, context, profile.id);
    return data({
      locale: params.locale ?? "en",
      profile: {
        id: profile.id, name: profile.name, image: profile.image, joinedAt: profile.joinedAt.toISOString(),
        bio: profile.bio, githubUrl: profile.githubUrl, websiteUrl: profile.websiteUrl,
        role: { slug: profile.role.slug, displayName: profile.role.displayName, isSystem: profile.role.isSystem },
        messageCount: profile.messageCount, bestAnswerCount: profile.bestAnswerCount,
        ...(profile.identityKind === "deleted" ? { identityKind: "deleted" as const } : {}),
      },
      isSelf, canEditProfile, privileged,
      editing: canEditProfile && query.get("edit") === "1", saved: isSelf && query.get("saved") === "1",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) throw new Response("Unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
    throw error;
  }
}

export async function action({ request, params, context }: ProfileArgs) {
  const failure = (error: ProfileActionError, status: number, draft?: ProfileDraft) => data<ProfileActionData>({ error, ...(draft ? { draft } : {}) }, { status, headers: { "Cache-Control": "private, no-store" } });
  if (request.method !== "POST") throw new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "private, no-store" } });
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
    return redirect(`${forumProfilePath(params.locale, session.user.id)}?saved=1`, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AccountInactiveError || error instanceof AccountMissingError)
      return failure("unauthenticated", 401);
    if (error instanceof InvalidProfileError) return failure("invalid", 400, draft);
    if (error instanceof ForumEntityNotFoundError) return failure("notFound", 404);
    if (error instanceof UserMeasureRestrictedError) {
      return data<ProfileActionData>({ error: "forbidden", draft }, {
        status: 403, headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (error instanceof ForumStorageUnavailableError) return failure("unavailable", 503, draft);
    throw error;
  }
}

export default function ProfileRoute() {
  return <ProfileView {...useLoaderData<typeof loader>()} feedback={useActionData<typeof action>()} />;
}
export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  const navigate = useNavigate();
  const recoveryAttempted = useRef(false);
  const revoked = isRouteErrorResponse(error) && (error.status === 401 || error.status === 403);
  useEffect(() => {
    if (!revoked || recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    // A new GET refreshes actor and permissions. Never replay the rejected POST.
    void navigate(location.pathname + location.search + location.hash, { replace: true });
  }, [revoked, location.pathname, location.search, location.hash, navigate]);
  return <ForumRouteError />;
}
