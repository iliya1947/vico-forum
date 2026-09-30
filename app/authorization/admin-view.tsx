import { Form } from "react-router";
import { useTranslation } from "react-i18next";

import type { PermissionKey } from "./catalog";
import type {
  AuthorizationRoleDetails,
  AuthorizationUserDetails,
} from "../../db/authorization-repository";
import { ForumShell } from "../forum/ui";

export type AuthorizationFailure =
  | "invalid"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "unavailable";

export function AuthorizationAdminView({
  locale,
  permissions,
  roles,
  users,
  result,
}: {
  locale: string;
  permissions: readonly PermissionKey[];
  roles: readonly AuthorizationRoleDetails[];
  users: readonly AuthorizationUserDetails[];
  result?: { readonly ok?: boolean; readonly error?: AuthorizationFailure };
}) {
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <section className="page-heading">
        <h1>{t("authorizationHeading")}</h1>
        {result?.ok && <p role="status">{t("authorizationSaved")}</p>}
        {result?.error && <p role="alert">{t(`authorizationError_${result.error}`)}</p>}
      </section>

      <section>
        <h2>{t("rolesHeading")}</h2>
        <Form method="post" className="admin-inline">
          <input type="hidden" name="intent" value="createRole" />
          <label>
            {t("roleSlug")}
            <input name="slug" required pattern="[a-z][a-z0-9-]{0,62}" />
          </label>
          <label>
            {t("displayName")}
            <input name="displayName" required />
          </label>
          <button>{t("createRole")}</button>
        </Form>

        {roles.map((role) => (
          <article className="admin-card" key={role.id}>
            <h3>
              {role.displayName} <code>{role.slug}</code>{" "}
              {role.isSystem && <small>{t("builtInRole")}</small>}
            </h3>
            {!role.isSystem && (
              <Form method="post" className="admin-inline">
                <input type="hidden" name="intent" value="renameRole" />
                <input type="hidden" name="roleId" value={role.id} />
                <label>
                  {t("displayName")}
                  <input name="displayName" defaultValue={role.displayName} required />
                </label>
                <button>{t("save")}</button>
              </Form>
            )}
            <Form method="post">
              <input type="hidden" name="intent" value="roleGrants" />
              <input type="hidden" name="roleId" value={role.id} />
              <fieldset>
                <legend>{t("permissionsHeading")}</legend>
                {permissions.map((permission) => (
                  <label className="permission-row" key={permission}>
                    <input
                      type="checkbox"
                      name="permission"
                      value={permission}
                      defaultChecked={role.grants.includes(permission)}
                    />
                    <code>{permission}</code>
                  </label>
                ))}
              </fieldset>
              <button>{t("save")}</button>
            </Form>
            {!role.isSystem && (
              <Form method="post">
                <input type="hidden" name="intent" value="deleteRole" />
                <input type="hidden" name="roleId" value={role.id} />
                <button>{t("deleteRole")}</button>
              </Form>
            )}
          </article>
        ))}
      </section>

      <section>
        <h2>{t("usersHeading")}</h2>
        {users.map((user) => (
          <article className="admin-card" key={user.id}>
            <h3>{user.name} <small>{user.email}</small></h3>
            <Form method="post" className="admin-inline">
              <input type="hidden" name="intent" value="assignRole" />
              <input type="hidden" name="userId" value={user.id} />
              <label>
                {t("assignedRole")}
                <select name="roleId" defaultValue={user.authorization.role.id}>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.displayName}</option>
                  ))}
                </select>
              </label>
              {!user.authorization.explicitAssignment && <small>{t("defaultRole")}</small>}
              <button>{t("save")}</button>
            </Form>
            <h4>{t("permissionsHeading")}</h4>
            {permissions.map((permission) => (
              <Form method="post" className="permission-row" key={permission}>
                <input type="hidden" name="intent" value="override" />
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="permission" value={permission} />
                <code>{permission}</code>
                <select name="effect" defaultValue={user.authorization.overrides[permission] ?? "inherit"}>
                  <option value="inherit">{t("overrideInherit")}</option>
                  <option value="allow">{t("overrideAllow")}</option>
                  <option value="deny">{t("overrideDeny")}</option>
                </select>
                <button>{t("save")}</button>
              </Form>
            ))}
            <h4>{t("effectivePermissions")}</h4>
            <ul>
              {user.authorization.effectivePermissions.map((permission) => (
                <li key={permission}><code>{permission}</code></li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </ForumShell>
  );
}
