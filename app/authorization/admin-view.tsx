import { Form } from "react-router";
import { useTranslation } from "react-i18next";

import type { PermissionKey } from "./catalog";
import { AuthorizationUserControls, type InlineAuthorizationSubmission } from "./user-controls";
import type {
  AuthorizationRoleDetails,
  AuthorizationUserDetails,
} from "../../db/authorization-repository";
import { AdminShell } from "../admin/shell";
import { BLOCK_MANAGE_PRIVILEGED_PERMISSION } from "../../db/user-measure-authority";
import type { AdminAccess } from "../admin/access";

export type AuthorizationFailure =
  | "invalid"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "unavailable";

export interface AuthorizationManagementProps {
  locale: string;
  access: AdminAccess;
  permissions: readonly PermissionKey[];
  roles: readonly AuthorizationRoleDetails[];
  users: readonly AuthorizationUserDetails[];
  canManageElevated?: boolean;
  canMutateAuthorization: boolean;
  result?: { readonly ok?: boolean; readonly error?: AuthorizationFailure };
  inline?: InlineAuthorizationSubmission;
}

/** Legacy Admin URL remains independently readable and uses the canonical writer. */
export function AuthorizationAdminView(props: AuthorizationManagementProps) {
  return <AdminShell locale={props.locale} access={props.access} current="roles">
    <AuthorizationManagementContent {...props} />
  </AdminShell>;
}

/** Reused by Settings; never installs a second role/permission writer. */
export function AuthorizationManagementContent({
  permissions, roles, users, canManageElevated = false, canMutateAuthorization, result, inline,
}: AuthorizationManagementProps) {
  const { t } = useTranslation("common");
  const submit = inline ? { action: inline.action, navigate: false as const, fetcherKey: inline.fetcherKey } : {};

  return (
    <>
      <section className="admin-heading">
        <div>
          <p className="eyebrow">{t("authorizationNav")}</p>
          <h2>{t("authorizationHeading")}</h2>
        </div>
        {result?.ok ? (
          <p className="admin-result admin-result-success" role="status">
            {t("authorizationSaved")}
          </p>
        ) : null}
        {result?.error ? (
          <p className="admin-result admin-result-error" role="alert">
            {t(`authorizationError_${result.error}`)}
          </p>
        ) : null}
      </section>

      <div className="admin-workspace">
        <section className="admin-section" aria-labelledby="authorization-roles-heading">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">{t("rolesHeading")}</p>
              <h3 id="authorization-roles-heading">{t("rolesHeading")}</h3>
            </div>
            <span className="admin-section-count" aria-label={t("rolesHeading")}>
              {roles.length}
            </span>
          </div>

          {canMutateAuthorization ? <Form method="post" className="admin-create-role" {...submit}>
            <input type="hidden" name="intent" value="createRole" />
            <label>
              <span>{t("roleSlug")}</span>
              <input name="slug" required pattern="[a-z][a-z0-9-]{0,62}" />
            </label>
            <label>
              <span>{t("displayName")}</span>
              <input name="displayName" required />
            </label>
            <button className="admin-primary-action" type="submit">
              {t("createRole")}
            </button>
          </Form> : null}

          <div className="admin-role-list">
            {roles.map((role) => (
              <article className="admin-card admin-role-card" key={role.id}>
                <header className="admin-card-heading">
                  <div className="admin-card-title">
                    <h4>{role.displayName}</h4>
                    <code>{role.slug}</code>
                  </div>
                  <div className="admin-card-badges">
                    {role.isSystem ? <span className="admin-badge">{t("builtInRole")}</span> : null}
                    <span
                      className="admin-meta-count"
                      aria-label={`${t("permissionsHeading")}: ${role.grants.length}/${permissions.length}`}
                    >
                      {role.grants.length}/{permissions.length}
                    </span>
                  </div>
                </header>

                {canMutateAuthorization && !role.isSystem ? (
                  <Form method="post" className="admin-rename-role" {...submit}>
                    <input type="hidden" name="intent" value="renameRole" />
                    <input type="hidden" name="roleId" value={role.id} />
                    <label>
                      <span>{t("displayName")}</span>
                      <input name="displayName" defaultValue={role.displayName} required />
                    </label>
                    <button className="admin-secondary-action" type="submit">{t("save")}</button>
                  </Form>
                ) : null}

                {canMutateAuthorization ? <Form method="post" className="admin-permissions-form" {...submit}>
                  <input type="hidden" name="intent" value="roleGrants" />
                  <input type="hidden" name="roleId" value={role.id} />
                  <fieldset>
                    <legend>{t("permissionsHeading")}</legend>
                    <div className="admin-permission-grid">
                      {permissions.filter(permission=>canManageElevated ||
                        permission!==BLOCK_MANAGE_PRIVILEGED_PERMISSION).map((permission) => (
                        <label className="admin-permission-option" key={permission}>
                          <input
                            type="checkbox"
                            name="permission"
                            value={permission}
                            defaultChecked={role.grants.includes(permission)}
                          />
                          <code>{permission}</code>
                        </label>
                      ))}
                    </div>
                    {!canManageElevated && role.grants.includes(BLOCK_MANAGE_PRIVILEGED_PERMISSION)
                      ? <input type="hidden" name="permission" value={BLOCK_MANAGE_PRIVILEGED_PERMISSION}/>
                      : null}
                  </fieldset>
                  <div className="admin-form-actions">
                    <button className="admin-primary-action" type="submit">{t("save")}</button>
                  </div>
                </Form> : <ul className="admin-effective-permissions" aria-label={t("permissionsHeading")}>
                  {role.grants.map(permission => <li key={permission}><code>{permission}</code></li>)}
                </ul>}

                {canMutateAuthorization && !role.isSystem && (canManageElevated ||
                  !role.grants.includes(BLOCK_MANAGE_PRIVILEGED_PERMISSION)) ? (
                  <div className="admin-danger-zone">
                    <Form method="post" {...submit}>
                      <input type="hidden" name="intent" value="deleteRole" />
                      <input type="hidden" name="roleId" value={role.id} />
                      <button className="admin-danger-action" type="submit">{t("deleteRole")}</button>
                    </Form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section" aria-labelledby="authorization-users-heading">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">{t("usersHeading")}</p>
              <h3 id="authorization-users-heading">{t("usersHeading")}</h3>
            </div>
            <span className="admin-section-count" aria-label={t("usersHeading")}>
              {users.length}
            </span>
          </div>

          <div className="admin-user-list">
            {users.map((user) => (
              <article className="admin-card admin-user-card" key={user.id}>
                <header className="admin-card-heading">
                  <div className="admin-user-identity">
                    <span className="admin-user-avatar" aria-hidden="true">
                      {user.name.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h4>{user.name}</h4>
                      <small>{user.email}</small>
                    </div>
                  </div>
                  <span className="admin-badge">{user.authorization.role.displayName}</span>
                </header>

                <AuthorizationUserControls userId={user.id} authorization={user.authorization}
                  roles={roles} permissions={permissions} canManageElevated={canManageElevated}
                  canMutateAuthorization={canMutateAuthorization} inline={inline} elevatedRoleIds={roles.filter(role=>role.grants.includes(
                    BLOCK_MANAGE_PRIVILEGED_PERMISSION)).map(role=>role.id)}/>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
