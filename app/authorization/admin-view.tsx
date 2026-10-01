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
    <ForumShell locale={locale} variant="admin">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">{t("authorizationNav")}</p>
          <h1>{t("authorizationHeading")}</h1>
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
              <h2 id="authorization-roles-heading">{t("rolesHeading")}</h2>
            </div>
            <span className="admin-section-count" aria-label={t("rolesHeading")}>
              {roles.length}
            </span>
          </div>

          <Form method="post" className="admin-create-role">
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
          </Form>

          <div className="admin-role-list">
            {roles.map((role) => (
              <article className="admin-card admin-role-card" key={role.id}>
                <header className="admin-card-heading">
                  <div className="admin-card-title">
                    <h3>{role.displayName}</h3>
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

                {!role.isSystem ? (
                  <Form method="post" className="admin-rename-role">
                    <input type="hidden" name="intent" value="renameRole" />
                    <input type="hidden" name="roleId" value={role.id} />
                    <label>
                      <span>{t("displayName")}</span>
                      <input name="displayName" defaultValue={role.displayName} required />
                    </label>
                    <button className="admin-secondary-action" type="submit">{t("save")}</button>
                  </Form>
                ) : null}

                <Form method="post" className="admin-permissions-form">
                  <input type="hidden" name="intent" value="roleGrants" />
                  <input type="hidden" name="roleId" value={role.id} />
                  <fieldset>
                    <legend>{t("permissionsHeading")}</legend>
                    <div className="admin-permission-grid">
                      {permissions.map((permission) => (
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
                  </fieldset>
                  <div className="admin-form-actions">
                    <button className="admin-primary-action" type="submit">{t("save")}</button>
                  </div>
                </Form>

                {!role.isSystem ? (
                  <div className="admin-danger-zone">
                    <Form method="post">
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
              <h2 id="authorization-users-heading">{t("usersHeading")}</h2>
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
                      <h3>{user.name}</h3>
                      <small>{user.email}</small>
                    </div>
                  </div>
                  <span className="admin-badge">{user.authorization.role.displayName}</span>
                </header>

                <div className="admin-user-body">
                  <section className="admin-user-panel">
                    <h4>{t("assignedRole")}</h4>
                    <Form method="post" className="admin-role-assignment">
                      <input type="hidden" name="intent" value="assignRole" />
                      <input type="hidden" name="userId" value={user.id} />
                      <label>
                        <span>{t("assignedRole")}</span>
                        <select name="roleId" defaultValue={user.authorization.role.id}>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.displayName}</option>
                          ))}
                        </select>
                      </label>
                      {!user.authorization.explicitAssignment ? (
                        <span className="admin-muted-badge">{t("defaultRole")}</span>
                      ) : null}
                      <button className="admin-secondary-action" type="submit">{t("save")}</button>
                    </Form>
                  </section>

                  <section className="admin-user-panel admin-user-permissions">
                    <h4>{t("permissionsHeading")}</h4>
                    <div className="admin-override-list">
                      {permissions.map((permission) => (
                        <Form method="post" className="admin-override-row" key={permission}>
                          <input type="hidden" name="intent" value="override" />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="permission" value={permission} />
                          <code>{permission}</code>
                          <select
                            name="effect"
                            aria-label={`${permission}: ${t("permissionsHeading")}`}
                            defaultValue={user.authorization.overrides[permission] ?? "inherit"}
                          >
                            <option value="inherit">{t("overrideInherit")}</option>
                            <option value="allow">{t("overrideAllow")}</option>
                            <option value="deny">{t("overrideDeny")}</option>
                          </select>
                          <button className="admin-compact-action" type="submit">{t("save")}</button>
                        </Form>
                      ))}
                    </div>
                  </section>

                  <section className="admin-user-panel">
                    <h4>{t("effectivePermissions")}</h4>
                    <ul className="admin-effective-permissions">
                      {user.authorization.effectivePermissions.map((permission) => (
                        <li key={permission}><code>{permission}</code></li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ForumShell>
  );
}
