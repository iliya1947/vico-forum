import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { settingsForumPath, settingsUserPath, settingsAdministratorPath, settingsAccountPath } from "../settings/paths";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export const settingsPrivateHeaders = { "Cache-Control": "private, no-store" } as const;
export function headers() { return settingsPrivateHeaders; }

export function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  return data({
    locale: params.locale ?? "en",
    canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
  }, { headers: settingsPrivateHeaders });
}

export default function SettingsRoute() {
  const { locale, canViewForum } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const header = useHeaderAuthUser();
  const canViewAdministrator = !!(header?.canViewAdminPanel || header?.canViewModerationAttention);
  return <SettingsShell locale={locale} canViewForum={canViewForum}>
    <section className="admin-overview settings-overview">
      <h2>{t("adminSettings")}</h2>
      <p>{t("settingsIntro")}</p>
      {canViewForum ? <Link className="admin-destination" to={settingsForumPath(locale)}>{t("settingsForumRoles")}</Link> : null}
      {canViewAdministrator ? <Link className="admin-destination" to={settingsAdministratorPath(locale)}>
        {t("settingsAdministrator")}</Link> : null}
      <Link className="admin-destination" to={settingsUserPath(locale)}>{t("settingsUser")}</Link>
      <Link className="admin-destination" to={settingsAccountPath(locale)}>{t("settingsAccount")}</Link>
    </section>
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
