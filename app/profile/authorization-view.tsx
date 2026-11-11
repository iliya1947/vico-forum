import { useAdministrativeRouting } from "../administrative-routing/provider";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { AuthorizationUserManagementState } from "../../db/authorization-repository";
import type { PermissionKey } from "../authorization/catalog";
import type { AuthorizationFailure } from "../authorization/admin-view";
import { AuthorizationUserControls } from "../authorization/user-controls";
import { canonicalAuthorizationPath } from "../settings/paths";

export function InlineUserAuthorization({ locale, actorId, userId, management,
  permissions, canManageElevated, canMutateAuthorization }: {
  locale: string; actorId: string; userId: string;
  management: AuthorizationUserManagementState; permissions: readonly PermissionKey[];
  canManageElevated: boolean;
  canMutateAuthorization: boolean;
}) {
  const { t } = useTranslation("common");
  const routing = useAdministrativeRouting();
  const fetcherKey = `ap09-user-authz:${actorId}:${userId}`;
  const fetcher = useFetcher<{ ok?: true; error?: AuthorizationFailure }>({ key: fetcherKey });
  const revalidator = useRevalidator();
  const pending = fetcher.state !== "idle";
  return <section id="authorization" className="admin-section" aria-labelledby="admin-user-authorization-heading">
    <h3 id="admin-user-authorization-heading">{t("authorizationHeading")}</h3>
    {fetcher.data?.ok && !pending
      ? <p className="admin-result admin-result-success" role="status">{t("authorizationSaved")}</p>
      : null}
    {fetcher.data?.error && !pending
      ? <div className="admin-result admin-result-error" role="alert">
          <p>{t(`authorizationError_${fetcher.data.error}`)}</p>
          <button type="button" onClick={() => revalidator.revalidate()}>{t("adminRetry")}</button>
        </div>
      : null}
    <AuthorizationUserControls userId={userId} authorization={management.authorization}
      roles={management.roles} permissions={permissions}
      canManageElevated={canManageElevated} canMutateAuthorization={canMutateAuthorization}
      elevatedRoleIds={management.elevatedRoleIds}
      inline={{ action: canonicalAuthorizationPath(locale,routing), fetcherKey }}
      pending={pending}/>
  </section>;
}
