import { Form, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { PERMISSION_CATALOG } from "../authorization/catalog";
import { requireSameOrigin, requiredFormText } from "../forum/mutations.server";
import { ForumShell } from "../forum/ui";
import { AuthorizationForbiddenError, AuthorizationLockoutError, AuthorizationNotFoundError, AuthorizationRoleAssignedError, AuthorizationRoleSlugConflictError } from "../../db/authorization-repository";
import { AuthorizationUnavailableError, InvalidAuthorizationInputError } from "../../db/authorization-service";

type Failure = "invalid" | "forbidden" | "notFound" | "conflict" | "unavailable";
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
  const data = useLoaderData<typeof loader>(); const result = useActionData<{ ok?: boolean; error?: Failure }>(); const { t } = useTranslation("common");
  return <ForumShell locale={data.locale}><section className="page-heading"><h1>{t("authorizationHeading")}</h1>{result?.ok && <p role="status">{t("authorizationSaved")}</p>}{result?.error && <p role="alert">{t(`authorizationError_${result.error}`)}</p>}</section>
    <section><h2>{t("rolesHeading")}</h2><Form method="post" className="admin-inline"><input type="hidden" name="intent" value="createRole"/><label>{t("roleSlug")}<input name="slug" required pattern="[a-z][a-z0-9-]{0,62}"/></label><label>{t("displayName")}<input name="displayName" required/></label><button>{t("createRole")}</button></Form>
    {data.roles.map((role) => <article className="admin-card" key={role.id}><h3>{role.displayName} <code>{role.slug}</code> {role.isSystem && <small>{t("builtInRole")}</small>}</h3>{!role.isSystem && <Form method="post" className="admin-inline"><input type="hidden" name="intent" value="renameRole"/><input type="hidden" name="roleId" value={role.id}/><label>{t("displayName")}<input name="displayName" defaultValue={role.displayName} required/></label><button>{t("save")}</button></Form>}<Form method="post"><input type="hidden" name="intent" value="roleGrants"/><input type="hidden" name="roleId" value={role.id}/><fieldset><legend>{t("permissionsHeading")}</legend>{data.permissions.map((p) => <label className="permission-row" key={p}><input type="checkbox" name="permission" value={p} defaultChecked={role.grants.includes(p)}/><code>{p}</code></label>)}</fieldset><button>{t("save")}</button></Form>{!role.isSystem && <Form method="post"><input type="hidden" name="intent" value="deleteRole"/><input type="hidden" name="roleId" value={role.id}/><button>{t("deleteRole")}</button></Form>}</article>)}</section>
    <section><h2>{t("usersHeading")}</h2>{data.users.map((user) => <article className="admin-card" key={user.id}><h3>{user.name} <small>{user.email}</small></h3><Form method="post" className="admin-inline"><input type="hidden" name="intent" value="assignRole"/><input type="hidden" name="userId" value={user.id}/><label>{t("assignedRole")}<select name="roleId" defaultValue={user.authorization.role.id}>{data.roles.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>{!user.authorization.explicitAssignment && <small>{t("defaultRole")}</small>}<button>{t("save")}</button></Form><h4>{t("permissionsHeading")}</h4>{data.permissions.map((p) => <Form method="post" className="permission-row" key={p}><input type="hidden" name="intent" value="override"/><input type="hidden" name="userId" value={user.id}/><input type="hidden" name="permission" value={p}/><code>{p}</code><select name="effect" defaultValue={user.authorization.overrides[p] ?? "inherit"}><option value="inherit">{t("overrideInherit")}</option><option value="allow">{t("overrideAllow")}</option><option value="deny">{t("overrideDeny")}</option></select><button>{t("save")}</button></Form>)}<h4>{t("effectivePermissions")}</h4><ul>{user.authorization.effectivePermissions.map((p) => <li key={p}><code>{p}</code></li>)}</ul></article>)}</section></ForumShell>;
}
