import { useAdministrativeRouting } from "../administrative-routing/provider";
import { Form, Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AdminBrowsePage, AdminBrowseQuery } from "../../db/admin-forum";
import type { AdminUserSummary } from "../../db/admin-users";
import { ForumAvatar } from "../forum/avatar";
import { forumProfilePath } from "../forum/paths";
import type { AdminAccess } from "./access";
import { AdminShell } from "./shell";
import { TechnicalDetails } from "../settings/technical-details";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { adminUsersPath, adminUsersBrowsePath } from "./users-paths";

function Joined({ date, locale }: { date: string; locale: string }) {
  const { t } = useTranslation("common");
  return <span>{t("profileJoined")}: <time dateTime={date}>{new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(date))}</time></span>;
}

export function AdminUsersIndex({ locale, access, query, page }: {
  locale: string; access: AdminAccess; query: AdminBrowseQuery; page: AdminBrowsePage<AdminUserSummary>;
}) {
  const { t } = useTranslation("common");
  const header = useHeaderAuthUser();
  const accountId = access.actorId && header?.id === access.actorId ? access.actorId : null;
  const routing = useAdministrativeRouting();
  const path = adminUsersPath(locale,routing);
  return <AdminShell locale={locale} access={access} current="users">
    <section className="admin-forum" aria-labelledby="admin-users-heading">
      <h2 id="admin-users-heading">{t("adminUsers")}</h2>
      <Form method="get" action={path} className="admin-forum-search">
        <label htmlFor="admin-users-query">{t("adminUsersSearch")}</label>
        <div><input id="admin-users-query" name="q" type="search" defaultValue={query.search}
          key={query.search} maxLength={400}/><button type="submit">{t("adminUsersSearchSubmit")}</button></div>
      </Form>
      <p>{t("adminUsersMatches")}: {new Intl.NumberFormat(locale).format(page.total)}</p>
      {page.items.length ? <ul className="admin-forum-objects">
        {page.items.map(user => <li key={user.id}>
          <h3><Link to={forumProfilePath(locale, user.id)}><bdi dir="auto">{user.name}</bdi></Link></h3>
          <ForumAvatar name={user.name} image={user.image} className="profile-avatar" />
          <TechnicalDetails accountId={accountId}><bdi dir="ltr">{user.id}</bdi></TechnicalDetails>
          <p><Joined date={user.joinedAt} locale={locale}/></p>
          <nav aria-label={t("quickActions")}>
            <Link to={forumProfilePath(locale, user.id)}>{t("adminUsersView")}</Link>{" · "}
            {access.canManageAuthorization ? <>{" · "}
              <Link to={forumProfilePath(locale, user.id) + "#authorization"}>{t("authorizationNav")}</Link>
            </> : null}
          </nav>
        </li>)}
      </ul> : <p>{t("adminUsersEmpty")}</p>}
      <nav className="admin-forum-paging" aria-label={t("adminUsersPaging")}>
        {query.after ? <Link to={adminUsersBrowsePath(locale, { search: query.search }, routing)}>{t("adminUsersFirst")}</Link> : null}
        {page.next ? <Link to={adminUsersBrowsePath(locale, { search: query.search, after: page.next }, routing)}>{t("adminUsersNext")}</Link> : null}
      </nav>
    </section>
  </AdminShell>;
}

