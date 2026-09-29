import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { PERMISSION_CATALOG } from "../authorization/catalog";
import { requireSameOrigin, requiredFormText } from "../forum/mutations.server";
import { AuthorizationForbiddenError, AuthorizationLockoutError, AuthorizationNotFoundError, AuthorizationRoleAssignedError, AuthorizationRoleSlugConflictError } from "../../db/authorization-repository";
import { AuthorizationUnavailableError, InvalidAuthorizationInputError } from "../../db/authorization-service";
import {
  AuthorizationAdminView,
  type AuthorizationFailure,
} from "../authorization/admin-view";

type Failure = AuthorizationFailure;
async function manager(context: RouterContextProvider) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401 });
  const capability = authorizationForRequest(context);
  try {
    if (!(await capability.forUser(session.user.id).has("access.authorization.manage"))) {
      throw new Response("Forbidden", { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
  return { actorId: session.user.id, capability };
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const { capability } = await manager(context);
  try {
    const state = await capability.readManagementState();
    return { locale: params.locale ?? "en", ...state, permissions: PERMISSION_CATALOG };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
}

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  const { actorId, capability } = await manager(context);
  if (!requireSameOrigin(request)) return Response.json({ error: "forbidden" as Failure }, { status: 403 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "invalid" }, { status: 400 }); }
  const intent = requiredFormText(form, "intent");
  try {
    if (intent === "createRole") await capability.createCustomRole(actorId, { slug: required(form, "slug"), displayName: required(form, "displayName") });
    else if (intent === "renameRole") await capability.renameCustomRole(actorId, required(form, "roleId"), { displayName: required(form, "displayName") });
    else if (intent === "roleGrants") await capability.replaceRoleGrants(actorId, required(form, "roleId"), form.getAll("permission"));
    else if (intent === "deleteRole") await capability.deleteCustomRole(actorId, required(form, "roleId"));
    else if (intent === "assignRole") await capability.assignUserRole(actorId, required(form, "userId"), required(form, "roleId"));
    else if (intent === "override") { const effect = required(form, "effect"); await capability.setUserOverride(actorId, required(form, "userId"), required(form, "permission"), effect === "inherit" ? null : effect); }
    else throw new InvalidAuthorizationInputError();
    return { ok: true as const };
  } catch (error) {
    const mapped: [Failure, number] | undefined =
      error instanceof InvalidAuthorizationInputError || error instanceof AuthorizationRoleSlugConflictError ? ["invalid", 400]
      : error instanceof AuthorizationForbiddenError ? ["forbidden", 403]
      : error instanceof AuthorizationNotFoundError ? ["notFound", 404]
      : error instanceof AuthorizationLockoutError || error instanceof AuthorizationRoleAssignedError ? ["conflict", 409]
      : error instanceof AuthorizationUnavailableError ? ["unavailable", 503]
      : undefined;
    if (!mapped) throw error;
    const [name, status] = mapped;
    return Response.json({ error: name }, { status });
  }
}
function required(form: FormData, name: string) { const value = requiredFormText(form, name); if (!value) throw new InvalidAuthorizationInputError(); return value; }

export default function AuthorizationAdmin() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<{ ok?: boolean; error?: Failure }>();
  return <AuthorizationAdminView {...data} result={result} />;
}
