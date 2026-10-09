import { Form, Link, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumProfile } from "./profile";
import { safeHttpUrl, PROFILE_BIO_LIMIT, PROFILE_URL_LIMIT } from "./profile";
import type { ProfileActionData } from "../routes/profile";
import { ForumAvatar } from "./avatar";
import { forumIndexPath, forumProfilePath } from "./paths";
import { ForumShell } from "./ui";

export function ProfileView({ locale, profile, isOwner = false, editing = false, saved = false, feedback }: {
  locale: string; profile: Omit<ForumProfile, "joinedAt"> & { joinedAt: string };
  isOwner?: boolean; editing?: boolean; saved?: boolean; feedback?: ProfileActionData;
}) {
  const { t } = useTranslation("common");
  const navigation = useNavigation();
  const path = forumProfilePath(locale, profile.id);
  const pending = navigation.state === "submitting" && navigation.formData?.get("intent") === "save-profile";
  const roleKey = profile.role.isSystem ? ({ user: "profileRoleUser", moderator: "profileRoleModerator", admin: "profileRoleAdmin" } as const)[profile.role.slug as "user" | "moderator" | "admin"] : undefined;
  const role = roleKey ? t(roleKey) : profile.role.displayName;
  const github = safeHttpUrl(profile.githubUrl);
  const website = safeHttpUrl(profile.websiteUrl);
  const fields = feedback?.draft ?? profile;
  return <ForumShell locale={locale} variant="profile">
    <nav className="profile-breadcrumb" aria-label={t("breadcrumbsLabel")}><Link to={forumIndexPath(locale)}>{t("forumHomeNav")}</Link><span aria-hidden="true"> / </span><span>{t("profileHeading")}</span></nav>
    <section className="profile-card" aria-labelledby="profile-name">
      <header className="profile-identity">
        <ForumAvatar name={profile.name} image={profile.image} className="profile-avatar" />
        <div className="profile-identity-copy"><p className="profile-eyebrow">{t("profileHeading")}</p><h1 id="profile-name" dir="auto">{profile.name}</h1><span className="profile-role" dir="auto">{role}</span></div>
        {isOwner && !editing && <Link className="profile-button" to={`${path}?edit=1`}>{t("profileEdit")}</Link>}
      </header>
      <dl className="profile-statistics">
        <div><dt>{t("profileJoined")}</dt><dd><time dateTime={profile.joinedAt}>{new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(profile.joinedAt))}</time></dd></div>
        <div><dt>{t("profileMessages")}</dt><dd>{new Intl.NumberFormat(locale).format(profile.messageCount)}</dd></div>
        <div><dt>{t("profileBestAnswers")}</dt><dd>{new Intl.NumberFormat(locale).format(profile.bestAnswerCount)}</dd></div>
      </dl>
      {saved && !editing && <p className="profile-feedback" role="status">{t("profileSaved")}</p>}
      {editing && isOwner ? <Form className="profile-form" method="post" action={`${path}?edit=1`} aria-label={t("profileEdit")} aria-busy={pending}>
        <input type="hidden" name="intent" value="save-profile" />
        {feedback && <p className="profile-feedback is-error" role="alert">{t(feedback.error === "invalid" ? "profileInvalid" : `profileError_${feedback.error}`)}</p>}
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
  </ForumShell>;
}
