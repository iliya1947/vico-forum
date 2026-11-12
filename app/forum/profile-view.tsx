import { useAdministrativeRouting } from "../administrative-routing/provider";
import { Form, Link, useNavigation } from "react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ForumProfile } from "./profile";
import { safeHttpUrl, PROFILE_BIO_LIMIT, PROFILE_URL_LIMIT } from "./profile";
import type { ProfileActionData } from "../routes/profile";
import { ForumAvatar } from "./avatar";
import { forumIndexPath, forumProfilePath } from "./paths";
import { ForumShell } from "./ui";
import { settingsAccountPath } from "../settings/paths";
import { ownMeasuresPath } from "../measures/paths";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { superAdminPath } from "../super-admin/paths";
import type { ProfilePrivilegedSections } from "../profile/sections";
import { SectionUnavailable, OwnerProfileSections } from "../profile/owner-view";
import { InlineUserAuthorization } from "../profile/authorization-view";
import { GroupedMeasures } from "../measures/views";
import { adminMeasuresPath } from "../measures/paths";

export function ProfileView({ locale, profile, isSelf = false, canEditProfile = true,
  editing = false, saved = false, privileged = {}, feedback }: {
  locale: string; profile: Omit<ForumProfile, "joinedAt"> & { joinedAt: string };
  isSelf?: boolean; canEditProfile?: boolean; privileged?: ProfilePrivilegedSections;
  editing?: boolean; saved?: boolean; feedback?: ProfileActionData;
}) {
  const { t } = useTranslation("common");
  const routing = useAdministrativeRouting();
  const currentSessionUser = useHeaderAuthUser();
  const navigation = useNavigation();
  const path = forumProfilePath(locale, profile.id);
  const pending = navigation.state === "submitting" && navigation.formData?.get("intent") === "save-profile";
  const roleKey = profile.role.isSystem ? ({ user: "profileRoleUser", moderator: "profileRoleModerator", admin: "profileRoleAdmin" } as const)[profile.role.slug as "user" | "moderator" | "admin"] : undefined;
  const role = roleKey ? t(roleKey) : profile.role.displayName;
  const publicName = profile.identityKind === "deleted" ? t("deletedUser") : profile.name;
  const github = safeHttpUrl(profile.githubUrl);
  const website = safeHttpUrl(profile.websiteUrl);
  // The parent HeaderAuth local state may lag behind a newly loaded actor during SPA
  // navigation. Hide a new snapshot until viewers match; invalidate permanently only
  // after that same snapshot has been presented to its authenticated viewer.
  const snapshot = useRef({
    privileged, targetId: profile.id, isSelf, matched: false, invalidated: false,
  });
  if (snapshot.current.privileged !== privileged ||
      snapshot.current.targetId !== profile.id || snapshot.current.isSelf !== isSelf) {
    snapshot.current = { privileged, targetId: profile.id, isSelf, matched: false, invalidated: false };
  }
  const expectedViewer = privileged.viewerId ?? (isSelf ? profile.id : null);
  const matchesViewer = !!expectedViewer && currentSessionUser?.id === expectedViewer;
  if (snapshot.current.matched && !matchesViewer) snapshot.current.invalidated = true;
  if (matchesViewer && !snapshot.current.invalidated) snapshot.current.matched = true;
  const currentSnapshot = matchesViewer && !snapshot.current.invalidated;
  const currentIsSelf = isSelf && currentSnapshot && currentSessionUser?.id === profile.id;
  const visiblePrivileged: ProfilePrivilegedSections =
    currentSnapshot && privileged.viewerId === currentSessionUser?.id ? privileged : {};
  const visibleFeedback = currentIsSelf ? feedback : undefined;
  const fields = visibleFeedback?.draft ?? profile;
  // The exact bound Owner self-view reads AP-10 through ownList, never adminTarget.
  const ownerSelfMeasures = visiblePrivileged.owner?.viewerId === profile.id;
  return <ForumShell locale={locale} variant="profile">
    <nav className="profile-breadcrumb" aria-label={t("breadcrumbsLabel")}><Link to={forumIndexPath(locale)}>{t("forumHomeNav")}</Link><span aria-hidden="true"> / </span><span>{t("profileHeading")}</span></nav>
    <section className="profile-card" aria-labelledby="profile-name">
      <header className="profile-identity">
        <ForumAvatar name={publicName} image={profile.image} className="profile-avatar" />
        <div className="profile-identity-copy"><p className="profile-eyebrow">{t("profileHeading")}</p><h1 id="profile-name"><bdi dir="auto">{publicName}</bdi></h1><span className="profile-role" dir="auto">{role}</span></div>
        {currentIsSelf && canEditProfile && !editing && <Link className="profile-button" to={`${path}?edit=1`}>{t("profileEdit")}</Link>}
      </header>
      {currentIsSelf ? <nav>
        <Link to={ownMeasuresPath(locale)}>{t("measuresOwn")}</Link>
        <Link to={settingsAccountPath(locale)}>{t("settingsAccount")}</Link>
        {currentSessionUser?.id === profile.id && currentSessionUser.canViewSuperAdmin ?
          <Link to={superAdminPath(locale,routing)}>{t("superAdminTitle")}</Link> : null}
      </nav> : null}
      <dl className="profile-statistics">
        <div><dt>{t("profileJoined")}</dt><dd><time dateTime={profile.joinedAt}>{new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(profile.joinedAt))}</time></dd></div>
        <div><dt>{t("profileMessages")}</dt><dd>{new Intl.NumberFormat(locale).format(profile.messageCount)}</dd></div>
        <div><dt>{t("profileBestAnswers")}</dt><dd>{new Intl.NumberFormat(locale).format(profile.bestAnswerCount)}</dd></div>
      </dl>
      {currentIsSelf && saved && !editing && <p className="profile-feedback" role="status">{t("profileSaved")}</p>}
      {editing && currentIsSelf && canEditProfile ? <Form className="profile-form" method="post" action={`${path}?edit=1`} aria-label={t("profileEdit")} aria-busy={pending}>
        <input type="hidden" name="intent" value="save-profile" />
        {visibleFeedback && <p className="profile-feedback is-error" role="alert">{t(visibleFeedback.error === "invalid" ? "profileInvalid" : `profileError_${visibleFeedback.error}`)}</p>}
        <label htmlFor="profile-bio">{t("profileBio")}</label><p id="profile-bio-hint">{t("profileBioHint")}</p>
        <textarea id="profile-bio" name="bio" rows={4} defaultValue={fields.bio} aria-describedby="profile-bio-hint" maxLength={PROFILE_BIO_LIMIT * 2} dir="auto" />
        <label htmlFor="profile-github">GitHub</label><p id="profile-github-hint">{t("profileGithubHint")}</p>
        <input id="profile-github" name="githubUrl" type="url" defaultValue={fields.githubUrl ?? ""} placeholder="https://github.com/username" maxLength={PROFILE_URL_LIMIT} aria-describedby="profile-github-hint" dir="ltr" />
        <label htmlFor="profile-website">{t("profileWebsite")}</label><p id="profile-website-hint">{t("profileWebsiteHint")}</p>
        <input id="profile-website" name="websiteUrl" type="url" defaultValue={fields.websiteUrl ?? ""} placeholder="https://example.com" maxLength={PROFILE_URL_LIMIT} aria-describedby="profile-website-hint" dir="ltr" />
        <div className="profile-form-actions"><button className="profile-button" type="submit" disabled={pending}>{t(pending ? "profileSaving" : "profileSave")}</button><Link to={path}>{t("profileCancel")}</Link></div>
      </Form> : <div className="profile-about"><h2>{t("profileBio")}</h2><p className={profile.bio ? "profile-bio" : "profile-empty"} dir="auto">{profile.bio || t("profileNoBio")}</p>
        {(github || website) && <nav className="profile-links" aria-label={t("profileLinks")}>{github && <a href={github} rel="nofollow ugc noreferrer">GitHub ↗</a>}{website && <a href={website} rel="nofollow ugc noreferrer">{t("profileWebsite")} ↗</a>}</nav>}
      </div>}
    </section>
    {visiblePrivileged.measures ? (
      visiblePrivileged.measures.status === "unavailable" ?
        <SectionUnavailable id="measures" label={t(ownerSelfMeasures ? "measuresOwn" : "measuresAdmin")} /> :
        <section id="measures" className="profile-card" aria-labelledby="profile-measures-heading">
          <h2 id="profile-measures-heading">{t(ownerSelfMeasures ? "measuresOwn" : "measuresAdmin")}</h2>
          {visiblePrivileged.measures.value.length ?
            <GroupedMeasures measures={visiblePrivileged.measures.value} locale={locale} admin
              detailRoute={ownerSelfMeasures ? "own" : "admin"}/> :
            <p>{t("measuresNone")}</p>}
          <p><Link to={ownerSelfMeasures ? ownMeasuresPath(locale)
            : adminMeasuresPath(locale,routing)+"?target="+encodeURIComponent(profile.id)}>
            {t(ownerSelfMeasures ? "measuresOwn" : "measuresAdmin")}</Link></p>
        </section>
    ) : null}
    {visiblePrivileged.authorization ? (
      visiblePrivileged.authorization.status === "unavailable" ?
        <SectionUnavailable id="authorization" label={t("authorizationHeading")} /> :
        <div className="profile-card">
          <InlineUserAuthorization key={visiblePrivileged.authorization.value.actorId + ":" + profile.id}
            locale={locale} actorId={visiblePrivileged.authorization.value.actorId} userId={profile.id}
            management={visiblePrivileged.authorization.value.management}
            permissions={visiblePrivileged.authorization.value.permissions}
            canManageElevated={visiblePrivileged.authorization.value.canManageElevated}
            canMutateAuthorization={visiblePrivileged.authorization.value.canMutateAuthorization}/>
        </div>
    ) : null}
    {visiblePrivileged.owner ?
      <OwnerProfileSections key={visiblePrivileged.owner.viewerId + ":" + profile.id}
        locale={locale} targetId={profile.id} owner={visiblePrivileged.owner}/> : null}
  </ForumShell>;
}
