import { adminAccess } from "../admin/access";
import { allowedAdminEntries, allowedAttentionEntries, adminEntryPath, attentionEntryPath, canEnterAdministratorPreferences } from "../settings/workspace-access";
import { settingsAccountPath, settingsAdministratorPath, settingsForumPath, settingsPath, settingsPrivacyPath, settingsUserPath } from "../settings/paths";
import { forumBookmarksPath, forumCategoryPath, forumFiltersPath, forumIndexPath, forumNotificationsPath, forumPopularPath, forumProfilePath, forumSearchPath, forumSectionPath, forumTagsPath, forumTopicPath, forumUnansweredPath, forumUnreadPath } from "../forum/paths";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { PermissionKey } from "../authorization/catalog";
import type { UiKey } from "../localization/catalog";
import { admitsLayer, type Disclosure, type DisclosureLayer } from "./disclosure.server";
import type { ConsultantDependencies } from "./dependencies.server";
import { CONSULTANT_CATALOG_VERSION, type ConsultantCard, type ConsultantRequest, type ConsultantResult } from "./contract";

type Key = UiKey<"common">;
interface Entry extends ConsultantCard {
  layer: DisclosureLayer;
  public: boolean;
  allowed: boolean;
  match: RegExp;
}
function card({ feature, labelKey, instructionKey, href }: ConsultantCard): ConsultantCard {
  return { feature, labelKey, instructionKey, href };
}

export async function navigateConsultant(input: ConsultantRequest, actor: string, disclosure: Disclosure, deps: ConsultantDependencies): Promise<ConsultantResult> {
  const locale = deps.locale();
  const routing = deps.routing();
  const has = (key: PermissionKey) => disclosure.permissions.has(key);
  const admin = allowedAdminEntries(adminAccess(disclosure.permissions));
  const attention = allowedAttentionEntries({
    canViewSignals: has("forum.solution.manageAny") || has("forum.helpDuplicate.manage") || has("forum.helpNeedsDetails.manage"),
    canReadSecurity: has("forum.attachmentSecurity.read"),
    canReviewComplaints: has("forum.complaint.review"),
    canManageComplaintPriorities: has("forum.complaint.priority.manage"),
    canReviewAppeals: has("forum.complaint.appeal.review"),
  });
  const entries: Entry[] = [];
  const add = (feature: string, labelKey: Key, instructionKey: Key, href: string,
    match: RegExp, isPublic = false, allowed = true, layer: DisclosureLayer = "User") => {
    entries.push({ feature, labelKey, instructionKey, href, match, public: isPublic, allowed, layer });
  };
  const search = forumSearchPath(locale), help = forumCategoryPath(locale, HELP_SOLUTIONS_CATEGORY_ID);
  const home = forumIndexPath(locale);
  add("search", "searchHeading", "searchIntro", search, /\b(search|find|look for)\b|поиск|найти|ищу|חיפוש|לחפש|למצוא/iu, true);
  add("help", "helpSolutionsHeading", "helpSolutionsIntro", help, /\b(help|solutions?|troubleshoot)\b|помощ|решени|עזרה|פתרו/iu, true);
  add("sections", "homeForumSectionsHeading", "consultantSections", home, /\b(section|category|where.*(?:ask|post)|new topic)\b|раздел|категори|куда.*(?:писать|задать)|איפה.*(?:לשאול|לפרסם)|קטגורי/iu, true);
  add("tags", "tagsNav", "consultantTags", forumTagsPath(locale), /\btags?\b|тег|метк|תגי/iu, true);
  add("popular", "popularNav", "popularNav", forumPopularPath(locale), /\bpopular\b|популяр|פופולר/iu, true);
  add("unanswered", "unansweredNav", "unansweredNav", forumUnansweredPath(locale), /\bunanswered\b|без ответа|ללא תשובה/iu, true);
  add("bookmarks", "bookmarksNav", "bookmarksIntro", forumBookmarksPath(locale), /\b(bookmarks?|saved topics?|save topic)\b|заклад|сохран[а-я]* тем|סימניות|נושאים שמורים/iu);
  add("filters", "personalFiltersNav", "personalFiltersIntro", forumFiltersPath(locale), /\b(mute|unmute|block|unblock|personal filters)\b|заглуш|отключ[а-я]* уведом|блокиров|заблок|חסימ|חסום|השתק/iu);
  add("language", "settingsPreferredLocale", "settingsPreferredLocaleIntro", settingsUserPath(locale), /\b(language|locale)\b|язык|локал[ьи]|שפה|שפות/iu);
  add("account", "settingsAccount", "consultantAccount", settingsAccountPath(locale), /\b(account|password|sessions?|email|security settings)\b|аккаунт|парол|сеанс|почт|חשבון|סיסמ|דוא"ל/iu);
  add("privacy", "settingsPrivacy", "consultantPrivacy", settingsPrivacyPath(locale), /\b(privacy|online visibility)\b|приватност|видимость онлайн|פרטיות/iu);
  add("profile", "profileHeading", "consultantProfile", forumProfilePath(locale, actor), /\bprofile\b|профил|פרופיל/iu);
  add("notifications", "notifications", "notificationIntro", forumNotificationsPath(locale), /\bnotifications?\b|уведомлен|התראות/iu);
  add("unread", "unreadNav", "unreadExistingHeading", forumUnreadPath(locale), /\bunread\b|непрочитан|לא נקרא/iu);
  add("settings", "adminSettings", "settingsIntro", settingsPath(locale), /\bsettings\b|настройк|הגדרות/iu);
  add("watch", "topicWatch", "consultantWatch", search, /\b(watch|unwatch|subscribe|follow topic)\b|подпис|следить за тем|מעקב|לעקוב/iu);
  add("report", "complaintReportPost", "consultantReport", search, /\b(report(?:ing)?|complain)\b|жалоб|пожаловаться|доложить|דיווח|לדווח|תלונ/iu, false, has("forum.complaint.create"));
  add("best-answer", "bestAnswer", "consultantBestAnswer", help, /\bbest answer\b|лучш[а-я]* ответ|лучший ответ|תשובה מיטבית|התשובה הטובה/iu);
  add("hidden-content", "adminHiddenQueueTitle", "consultantOpenPage", routing.admin.forum(locale) + "/content", /\b(hidden content|hide posts?|restore posts?)\b|скрыт[а-я]* контент|скрытые сообщ|תוכן מוסתר/iu, false, has("forum.content.visibility.manage"), "Moderator");
  add("signals", "attentionModeSignals", "consultantOpenPage", attentionEntryPath(locale, "signals", "mixed"), /\b(signals?|moderation queue)\b|сигнал|очередь модерац|אותות/iu, false, attention.signals.length > 0, "Moderator");
  add("complaint-review", "complaintQueueHeading", "consultantOpenPage", attentionEntryPath(locale, "complaints", "group1"), /\b(complaint queue|review complaints)\b|очередь жалоб|рассмотр[а-я]* жалоб|תור תלונות/iu, false, has("forum.complaint.review"), "Moderator");
  add("complaint-appeals", "complaintAppealsHeading", "consultantOpenPage", attentionEntryPath(locale, "complaints", "group2"), /\bcomplaint appeals?\b|апелляци[яи] жалоб|ערעורי תלונות/iu, false, has("forum.complaint.appeal.review"), "Moderator");
  add("attachment-security", "attentionSecurityAttachments", "consultantOpenPage", attentionEntryPath(locale, "security", "attachments"), /\b(attachment security|suspicious files)\b|опасн[а-я]* вложен|безопасност[а-я]* вложен|אבטחת קבצים/iu, false, has("forum.attachmentSecurity.read"), "Moderator");
  add("admin-overview", "adminOverview", "consultantOpenPage", adminEntryPath(locale, "overview", routing), /\b(admin panel|administration|admin overview)\b|админ[а-я]* панел|администрирован|לוח ניהול/iu, false, admin.includes("overview"), "Administrator");
  add("admin-forum", "adminForum", "consultantOpenPage", adminEntryPath(locale, "forum", routing), /\b(forum structure|admin forum)\b|структур[а-я]* форум|מבנה הפורום/iu, false, admin.includes("forum"), "Administrator");
  add("admin-users", "adminUsers", "consultantOpenPage", adminEntryPath(locale, "users", routing), /\b(user directory|manage users|admin users)\b|список пользовател|управлен[а-я]* пользовател|ניהול משתמשים/iu, false, admin.includes("users"), "Administrator");
  add("admin-measures", "measuresAdmin", "consultantOpenPage", adminEntryPath(locale, "measures", routing), /\b(user measures|administrative measures)\b|мер[ыа] ограничен|административн[а-я]* мер|צעדים מנהליים/iu, false, admin.includes("measures"), "Administrator");
  add("admin-roles", "adminRoles", "consultantOpenPage", adminEntryPath(locale, "roles", routing), /\b(roles|permissions|authorization)\b|рол[ьи]|разрешени[яй]|права доступ|הרשאו|תפקידים/iu, false, admin.includes("roles"), "Administrator");
  add("admin-history", "adminHistory", "consultantOpenPage", adminEntryPath(locale, "history", routing), /\b(admin history|audit log)\b|истори[яю] администр|аудит|היסטוריית ניהול/iu, false, admin.includes("history"), "Administrator");
  add("complaint-priorities", "complaintPrioritySettingsHeading", "consultantOpenPage", forumIndexPath(locale) + "/attention/complaints/settings", /\b(complaint priorities|reason priorities)\b|приоритет[а-я]* жалоб|עדיפויות תלונות/iu, false, has("forum.complaint.priority.manage"), "Administrator");
  add("administrator-preferences", "settingsAdministrator", "consultantOpenPage", settingsAdministratorPath(locale), /\b(admin(?:istrator)? preferences)\b|настройк[а-я]* администратор|העדפות מנהל/iu, false, canEnterAdministratorPreferences(admin, attention), "Moderator");
  add("forum-roles", "settingsForumRoles", "consultantOpenPage", settingsForumPath(locale), /\b(forum & roles|registration settings)\b|настройк[а-я]* регистрац|הגדרות הרשמה/iu, false, disclosure.exactOwner && has("access.authorization.manage"), "Administrator");
  add("super-admin", "superAdminTitle", "consultantOpenPage", routing.superAdmin.overview(locale), /\b(super[- ]admin|owner panel)\b|супер.?админ|סופר.?אדמין/iu, false, disclosure.exactOwner, "Administrator");

  const permitted = entries.filter(entry => entry.allowed && admitsLayer(disclosure, entry.layer) && (disclosure.complete || entry.public));
  // Only permitted entries participate in intent selection. Unknown or denied intent is indistinguishable from an ordinary miss.
  const question = input.question.normalize("NFKC").toLowerCase();
  const matches = permitted.filter(entry => entry.match.test(question));
  // Prefer specific routes over generic Search/Settings/Help. Never add denied entries to the response.
  const specific = matches.filter(entry => !["search", "help", "sections", "settings"].includes(entry.feature));
  const selected = specific.at(-1) ?? matches[0];
  const fallback = () => permitted.filter(entry => entry.feature === "search" || entry.feature === "help").map(card);
  let cards: ConsultantCard[] = selected ? [card(selected)] : fallback();
  let kind: ConsultantResult["kind"] = selected ? "navigation" : "fallback";

  if (selected && disclosure.complete) {
    try {
      if (selected.feature === "report" && (await deps.restrictions(actor)).has("complaints.submit")) {
        cards = fallback(); kind = "fallback";
      } else if (["report", "watch", "best-answer"].includes(selected.feature) && input.page.kind === "topic") {
        const page = input.page;
        const topic = await deps.reader().readTopicPage(page.topicId);
        const visible = topic?.posts.filter(post => post.kind !== "hidden");
        const post = page.postId ? visible?.find(item => item.id === page.postId) : undefined;
        const validTarget = topic && (!page.postId || post);
        if (!validTarget) { cards = fallback(); kind = "fallback"; }
        else if (selected.feature === "best-answer" &&
          !(has("forum.solution.manageAny") || (has("forum.solution.manageOwn") && topic.authorId === actor))) {
          cards = fallback(); kind = "fallback";
        } else {
          cards = [{ ...card(selected), href: forumTopicPath(locale, topic.id) +
            (post && selected.feature === "report" ? "#post-" + encodeURIComponent(post.id) : ""),
            ...(selected.feature === "report" && !post ? { labelKey: "complaintReportTitle" as const } : {}) }];
        }
      } else if (selected.feature === "sections") {
        const p = input.page;
        const sectionId = p.kind === "section" || p.kind === "editor" && p.destination === "section" ? p.sectionId : undefined;
        if (sectionId && sectionId !== HELP_SOLUTIONS_SERVICE_SECTION_ID) {
          const section = await deps.reader().readSection(sectionId);
          if (section) cards = [{ ...card(selected), href: forumSectionPath(locale, section.id) }];
        } else if (p.kind === "category" && p.categoryId !== HELP_SOLUTIONS_CATEGORY_ID) {
          const category = await deps.reader().readCategory(p.categoryId);
          if (category) cards = [{ ...card(selected), href: forumCategoryPath(locale, category.id) }];
        } else if (p.kind === "editor" && p.destination === "help" || p.kind === "category" && p.categoryId === HELP_SOLUTIONS_CATEGORY_ID) {
          cards = [{ feature: "help", labelKey: "helpSolutionsHeading", instructionKey: "helpSolutionsIntro", href: help }];
        }
        if (has("forum.topic.create") && !(await deps.restrictions(actor)).has("topics.create")) {
          cards[0] = { ...cards[0], instructionKey: "consultantPlacement" };
        }
      } else if (selected.feature === "search" && input.page.kind === "search" && input.page.term.trim()) {
        // Do not echo submitted questions or context strings into URLs; native Search remains explicit.
        cards = [card(selected)];
      }
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      cards = fallback(); kind = "fallback";
    }
  }
  return { catalogVersion: CONSULTANT_CATALOG_VERSION, consultationId: input.consultationId,
    turnId: input.turnId, kind, cards };
}
