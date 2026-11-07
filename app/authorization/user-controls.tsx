import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import type { PermissionKey } from "./catalog";
import { BLOCK_MANAGE_PRIVILEGED_PERMISSION } from "../../db/user-measure-authority";
import type { AuthorizationRole, UserAuthorization } from "../../db/authorization-repository";

export interface InlineAuthorizationSubmission {
  action: string;
  fetcherKey: string;
}
export function AuthorizationUserControls({
  userId, authorization, roles, permissions, inline, pending = false,
  canManageElevated = false, elevatedRoleIds = [],
}: {
  userId: string;
  authorization: UserAuthorization;
  roles: readonly AuthorizationRole[];
  permissions: readonly PermissionKey[];
  inline?: InlineAuthorizationSubmission;
  pending?: boolean;
  canManageElevated?: boolean;
  elevatedRoleIds?: readonly string[];
}) {
  const { t } = useTranslation("common");
  const submit = inline ? { action: inline.action, navigate: false as const, fetcherKey: inline.fetcherKey } : {};
  const elevatedRole = elevatedRoleIds.includes(authorization.role.id);
  const roleAssignmentDisabled = pending || (!canManageElevated && elevatedRole);
  const roleOptions = canManageElevated ? roles : roles.filter(role=>
    !elevatedRoleIds.includes(role.id) || role.id===authorization.role.id);
  const displayedPermissions = canManageElevated ? permissions : permissions.filter(permission=>
    permission!==BLOCK_MANAGE_PRIVILEGED_PERMISSION);
  return <div className="admin-user-body">
    <section className="admin-user-panel">
      <h5>{t("assignedRole")}</h5>
      <Form method="post" className="admin-role-assignment" key={authorization.role.id} {...submit}>
        <input type="hidden" name="intent" value="assignRole" />
        <input type="hidden" name="userId" value={userId} />
        <label>
          <span>{t("assignedRole")}</span>
          <select name="roleId" defaultValue={authorization.role.id} disabled={roleAssignmentDisabled}>
            {roleOptions.map(role => <option key={role.id} value={role.id}>{role.displayName}</option>)}
          </select>
        </label>
        {!authorization.explicitAssignment ? <span className="admin-muted-badge">{t("defaultRole")}</span> : null}
        <button className="admin-secondary-action" type="submit" disabled={roleAssignmentDisabled}>{t("save")}</button>
      </Form>
    </section>
    <section className="admin-user-panel admin-user-permissions">
      <h5>{t("permissionsHeading")}</h5>
      <div className="admin-override-list">
        {displayedPermissions.map(permission => <Form method="post" className="admin-override-row"
          key={permission + ":" + (authorization.overrides[permission] ?? "inherit")} {...submit}>
          <input type="hidden" name="intent" value="override" />
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="permission" value={permission} />
          <code>{permission}</code>
          <select name="effect" aria-label={`${permission}: ${t("permissionsHeading")}`}
            defaultValue={authorization.overrides[permission] ?? "inherit"} disabled={pending}>
            <option value="inherit">{t("overrideInherit")}</option>
            <option value="allow">{t("overrideAllow")}</option>
            <option value="deny">{t("overrideDeny")}</option>
          </select>
          <button className="admin-compact-action" type="submit" disabled={pending}>{t("save")}</button>
        </Form>)}
      </div>
    </section>
    <section className="admin-user-panel">
      <h5>{t("effectivePermissions")}</h5>
      {authorization.authoritySource === "owner" ? <p className="admin-owner-authority-note">
        {t("authorizationOwnerEffective")}
      </p> : null}
      <ul className="admin-effective-permissions">
        {authorization.effectivePermissions.map(permission => <li key={permission}><code>{permission}</code></li>)}
      </ul>
    </section>
  </div>;
}
