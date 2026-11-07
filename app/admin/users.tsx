import { Form, Link, useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { AdminBrowsePage, AdminBrowseQuery } from "../../db/admin-forum";
import type { AdminUserSummary } from "../../db/admin-users";
import { ForumAvatar } from "../forum/avatar";
import { forumProfilePath } from "../forum/paths";
import { safeHttpUrl } from "../forum/profile";
import type { AdminAccess } from "./access";
import type { AuthorizationUserManagementState } from "../../db/authorization-repository";
import type { PermissionKey } from "../authorization/catalog";
import type { AuthorizationFailure } from "../authorization/admin-view";
import { AuthorizationUserControls } from "../authorization/user-controls";
import { AdminShell } from "./shell";
import { adminUserPath, adminUsersPath, adminUsersBrowsePath } from "./users-paths";
import { adminMeasuresPath } from "../measures/paths";

export interface AdminUserDetailData extends AdminUserSummary {
  bio: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  role: { slug: string; displayName: string; isSystem: boolean };
  messageCount: number;
  bestAnswerCount: number;
}

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
  const path = adminUsersPath(locale);
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
          <h3><Link to={adminUserPath(locale, user.id)}><bdi dir="auto">{user.name}</bdi></Link></h3>
          <ForumAvatar name={user.name} image={user.image} className="profile-avatar" />
          <p><bdi dir="ltr">{user.id}</bdi></p>
          <p><Joined date={user.joinedAt} locale={locale}/></p>
          <nav aria-label={t("quickActions")}>
            <Link to={adminUserPath(locale, user.id)}>{t("adminUsersView")}</Link>{" · "}
            <Link to={forumProfilePath(locale, user.id)}>{t("adminUsersPublicProfile")}</Link>
            {access.canManageAuthorization ? <>{" · "}
              <Link to={adminUserPath(locale, user.id) + "#authorization"}>{t("authorizationNav")}</Link>
            </> : null}
          </nav>
        </li>)}
      </ul> : <p>{t("adminUsersEmpty")}</p>}
      <nav className="admin-forum-paging" aria-label={t("adminUsersPaging")}>
        {query.after ? <Link to={adminUsersBrowsePath(locale, { search: query.search })}>{t("adminUsersFirst")}</Link> : null}
        {page.next ? <Link to={adminUsersBrowsePath(locale, { search: query.search, after: page.next })}>{t("adminUsersNext")}</Link> : null}
      </nav>
    </section>
  </AdminShell>;
}

export function AdminUserDetail({ locale, access, user, management, managerActorId,
  permissions, canManageElevated = false }: {
  locale: string; access: AdminAccess; user: AdminUserDetailData;
  management?: AuthorizationUserManagementState;
  managerActorId?: string;
  permissions?: readonly PermissionKey[];
  canManageElevated?: boolean;
}) {
  const { t } = useTranslation("common");
  const github = safeHttpUrl(user.githubUrl), website = safeHttpUrl(user.websiteUrl);
  const roleKey = user.role.isSystem
    ? ({ user: "profileRoleUser", moderator: "profileRoleModerator", admin: "profileRoleAdmin" } as const)[user.role.slug as "user" | "moderator" | "admin"]
    : undefined;
  const role = roleKey ? t(roleKey) : user.role.displayName;
  return <AdminShell locale={locale} access={access} current="users">
    <section className="admin-forum" aria-labelledby="admin-user-detail-heading">
      <nav className="admin-forum-trail" aria-label={t("adminNavigation")}>
        <Link to={adminUsersPath(locale)}>{t("adminUsers")}</Link>
        <span aria-current="page"><bdi dir="auto">{user.name}</bdi></span>
      </nav>
      <h2 id="admin-user-detail-heading">{t("adminUsersDetail")}</h2>
      <div className="profile-identity">
        <ForumAvatar name={user.name} image={user.image} className="profile-avatar" />
        <div className="profile-identity-copy"><h3><bdi dir="auto">{user.name}</bdi></h3><bdi dir="ltr">{user.id}</bdi></div>
      </div>
      <dl className="profile-statistics">
        <div><dt>{t("profileJoined")}</dt><dd><time dateTime={user.joinedAt}>{new Intl.DateTimeFormat(locale, {
          year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
        }).format(new Date(user.joinedAt))}</time></dd></div>
        <div><dt>{t("assignedRole")}</dt><dd><bdi dir="auto">{role}</bdi></dd></div>
        <div><dt>{t("profileMessages")}</dt><dd>{new Intl.NumberFormat(locale).format(user.messageCount)}</dd></div>
        <div><dt>{t("profileBestAnswers")}</dt><dd>{new Intl.NumberFormat(locale).format(user.bestAnswerCount)}</dd></div>
      </dl>
      <section className="profile-about">
        <h3>{t("profileBio")}</h3><p dir="auto">{user.bio || t("profileNoBio")}</p>
        {(github || website) ? <nav className="profile-links" aria-label={t("profileLinks")}>
          {github ? <a href={github} rel="nofollow ugc noreferrer">GitHub</a> : null}
          {website ? <a href={website} rel="nofollow ugc noreferrer">{t("profileWebsite")}</a> : null}
        </nav> : null}
      </section>
      <Link to={forumProfilePath(locale, user.id)}>{t("adminUsersPublicProfile")}</Link>
      {access.canManageMeasures ? <p><Link to={adminMeasuresPath(locale)+"?target="+encodeURIComponent(user.id)}>
        {t("measuresAdmin")}</Link></p> : null}
      {access.canManageAuthorization && management && managerActorId && permissions
        ? <InlineUserAuthorization key={managerActorId + ":" + user.id}
          locale={locale} userId={user.id} actorId={managerActorId}
          management={management} permissions={permissions}
          canManageElevated={canManageElevated}/>
        : null}
    </section>
  </AdminShell>;
}

function InlineUserAuthorization({ locale, actorId, userId, management,
  permissions, canManageElevated }: {
  locale: string; actorId: string; userId: string;
  management: AuthorizationUserManagementState; permissions: readonly PermissionKey[];
  canManageElevated: boolean;
}) {
  const { t } = useTranslation("common");
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
      canManageElevated={canManageElevated} elevatedRoleIds={management.elevatedRoleIds}
      inline={{ action: `/${encodeURIComponent(locale)}/admin/authorization`, fetcherKey }}
      pending={pending}/>
  </section>;
}
