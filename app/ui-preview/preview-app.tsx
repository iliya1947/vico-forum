import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { Link, RouterProvider, createMemoryRouter, redirect, useActionData, useLoaderData, useParams, useSearchParams } from "react-router";
import { defaultAdministrativeRouting } from "../administrative-routing/addresses";

import {
  HeaderAuthProvider,
  type HeaderAuthPresentationState,
  type HeaderAuthUser,
} from "../auth/auth-controls";
import { PERMISSION_CATALOG, type PermissionKey } from "../authorization/catalog";
import { BLOCK_MANAGE_PRIVILEGED_PERMISSION } from "../../db/user-measure-authority";
import { COMPLAINT_REASONS } from "../../db/complaints-domain";
import type { ProfilePrivilegedSections } from "../profile/sections";
import type { OwnerUserProfileSnapshot } from "../../db/owner-user-profile";
import type { OwnerHistoryEntry, OwnerHistoryOptions } from "../../db/owner-sa02-history";
import { DEFAULT_COMPLAINT_REASON_PRIORITY } from "../complaints/queue-contract";
import type { ComplaintPriority, ComplaintPrioritySettings, ComplaintQueueCase, ComplaintQueuePage } from "../complaints/queue-contract";
import type { ReviewCase, ReviewFullPost } from "../complaints/review-contract";
import type { ComplaintSubmissionResponse } from "../complaints/response";
import type { AppealReviewPage, PendingAppealsPage } from "../../db/complaint-appeal-read";
import type { ComplaintResolvedHistoryPage, ComplaintTimelineEvent, ComplaintTimelinePage } from "../../db/complaint-history-read";
import { CredentialView } from "../auth/credential-view";
import { credentialReturnPath } from "../auth/credential-path";
import type { EmailAuthActions, AuthClientActions } from "../auth/auth-client";
import { AuthorizationAdminView } from "../authorization/admin-view";
import { AdminTopicView } from "../admin/topic";
import { AdminCategoryView, AdminForumView, AdminSectionView } from "../admin/forum";
import { AdminOverview } from "../admin/overview";
import { AdminUsersIndex } from "../admin/users";
import { AdminShell } from "../admin/shell";
import { HistoryEvents } from "../admin/history";
import { ComplaintReviewView } from "../complaints/review-view";
import { ComplaintTriageView } from "../complaints/queue-view";
import { ComplaintAppealReviewView } from "../complaints/appeal-review-view";
import { ComplaintTimelineView } from "../complaints/history-view";
import { ComplaintPrioritySettingsView } from "../complaints/priority-settings-view";
import { ComplaintResultView, type ComplaintParticipantResultPresentation } from "../complaints/result-view";
import { SuperAdminOverview } from "../super-admin/overview";
import { SuperAdminSa02Current } from "../super-admin/current-route";
import { SuperAdminBackground } from "../super-admin/task-current";
import { SuperAdminLocalization } from "../super-admin/localization-current";
import { SuperAdminIntegrations } from "../super-admin/integration-current";
import { SuperAdminData } from "../super-admin/data-current";
import { SuperAdminFiles } from "../super-admin/file-current";
import { SuperAdminNativeCurrent } from "../super-admin/native-current";
import { ownerAreaLabels, ownerAreaPath } from "../super-admin/area-navigation";
import { HistoryFilters } from "../super-admin/history-filters";
import type { HistoryFilterCatalog } from "../super-admin/history-filter-types";
import { SuperAdminMonitoringIndex, SuperAdminShell, SystemMonitorCards, Timeline } from "../super-admin/view";
import { superAdminMonitoringPath } from "../super-admin/paths";
import type { AdminHistoryChange, AdminHistoryEvent } from "../../db/admin-history";
import { projectAdminTopic } from "../admin/topic-model";
import type { ForumHelpSolutionsFilters, ForumPopularPage } from "../../db/forum-repository";
import {
  HELP_SOLUTIONS_CATEGORY_ID,
  HELP_SOLUTIONS_SERVICE_SECTION_ID,
} from "../../db/forum-identifiers";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { UnderDevelopmentView } from "../forum/under-development-view";
import { ProfileView } from "../forum/profile-view";
import { BookmarksView, type BookmarkItemPresentation } from "../forum/bookmarks-view";
import { FiltersView, type FilterListItem } from "../forum/filters-view";
import { InvalidProfileError, validateProfileFields, type ProfileFields } from "../forum/profile";
import { forumProfilePath, forumTopicPath } from "../forum/paths";
import { ForumRouteError } from "../forum/ui";
import { AdminMeasureDetail, AdminMeasuresIndex, OwnMeasureDetail, OwnMeasuresIndex } from "../measures/views";
import type { UserMeasureDetail } from "../../db/user-measure-read";
import SettingsRoute from "../routes/settings";
import SettingsAccountRoute from "../routes/settings-account";
import SettingsAdministratorRoute from "../routes/settings-administrator";
import SettingsForumRoute from "../routes/settings-forum";
import SettingsPrivacyRoute from "../routes/settings-privacy";
import SettingsUserRoute from "../routes/settings-user";
import {
  AttentionCenterView,
  CategoryView,
  HelpSolutionsView,
  HomeView,
  NotificationsView,
  PopularView,
  SearchView,
  SectionView,
  TagsView,
  TagView,
  UnansweredView,
  UnreadView,
  TopicView,
} from "../forum/views";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import { isPreviewLocale, previewTranslationRuntime, type PreviewLocale } from "./preview-i18n";
import { LocaleNavigationProvider } from "../localization/locale-navigation";
import { localeRegistry } from "../localization/registry";
import { settingsUserPath } from "../settings/paths";

type Direction = "ltr" | "rtl";
export const previewIdentities = ["guest", "user", "manager", "owner"] as const;
export type PreviewIdentity = typeof previewIdentities[number];
type PreviewView = "attention" | "credentials" | "profile" | "home" | "search" | "popular" | "unanswered" | "unread" | "notifications" | "tags" | "tag" | "category" | "section" | "topic" | "admin" | "admin-topic" | "super-admin" | "empty" | "under-development" | "not-found";

type PreviewVariant =
  | "section-form-error"
  | "topic-reply-error"
  | "topic-unsolved"
  | "topic-best-answer-unsolved"
  | "admin-success"
  | "admin-conflict"
  | "route-401"
  | "route-403"
  | "route-503"
  | "route-500"
  | "search-no-results"
  | "notifications-empty"
  | "help-solutions-open-empty"
  | "help-solutions-active-empty"
  | "help-solutions-want-empty"
  | "help-solutions-for-me-empty"
  | "attention-empty"
  | "help-solutions-mine-empty"
  | "help-solutions-similar-results"
  | "help-solutions-similar-empty"
  | "help-solutions-similar-invalid"
  | "help-solutions-similar-unavailable"
  | "help-solution-outdated"
  | "category-no-pins"
  | "profile-empty"
  | "profile-error"
  | "profile-long"
  | "settings-account-not-fresh"
  | "settings-account-google-only"
  | "settings-account-invalid-password"
  | "settings-account-rate-limited"
  | "settings-account-session-not-found"
  | "settings-account-unavailable"
  | "settings-account-stale"
  | "settings-forum-registration-conflict"
  | "settings-forum-registration-unavailable"
  | "settings-forum-registration-invalid"
  | "settings-forum-registration-forbidden";

interface Scenario {
  id: string;
  label: string;
  locale: PreviewLocale;
  direction: Direction;
  identity: PreviewIdentity;
  path: string;
  view: PreviewView;
  variant?: PreviewVariant;
  authPresentationState?: HeaderAuthPresentationState;
  allowedIdentities?: readonly PreviewIdentity[];
}

export const scenarios: readonly Scenario[] = [
  { id: "credentials-sign-in", label: "Email sign-in", locale: "en", direction: "ltr", identity: "guest", path: "/en/sign-in", view: "credentials", allowedIdentities: ["guest"] },
  { id: "credentials-sign-in-authenticated", label: "Email sign-in · authenticated redirect", locale: "en", direction: "ltr", identity: "user", path: "/en/sign-in", view: "credentials", allowedIdentities: ["user", "manager", "owner"] },
  { id: "credentials-sign-in-return-to", label: "Email sign-in · return destination", locale: "en", direction: "ltr", identity: "guest", path: "/en/sign-in?returnTo=%2Fen%2Ftopics%2Ftyped-api%23post-answer", view: "credentials", allowedIdentities: ["guest"] },
  { id: "credentials-register", label: "Registration", locale: "en", direction: "ltr", identity: "guest", path: "/en/sign-up", view: "credentials", allowedIdentities: ["guest"] },
  { id: "credentials-register-authenticated", label: "Registration · authenticated redirect", locale: "en", direction: "ltr", identity: "user", path: "/en/sign-up", view: "credentials", allowedIdentities: ["user", "manager", "owner"] },
  { id: "profile-public", label: "Profile", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/maya", view: "profile" },
  { id: "profile-own", label: "Profile · own", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex", view: "profile", allowedIdentities: ["user", "manager"] },
  { id: "profile-owner-self", label: "Profile · private self", locale: "en", direction: "ltr", identity: "owner", path: "/en/users/owner", view: "profile", allowedIdentities: ["owner"] },
  { id: "profile-edit", label: "Profile · edit", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex?edit=1", view: "profile", allowedIdentities: ["user", "manager"] },
  { id: "profile-error", label: "Profile · validation error", locale: "en", direction: "ltr", identity: "user", path: "/en/users/alex?edit=1", view: "profile", variant: "profile-error", allowedIdentities: ["user", "manager"] },
  { id: "profile-long", label: "Profile · long text", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/maya", view: "profile", variant: "profile-long" },
  { id: "profile-empty", label: "Profile · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/sam", view: "profile", variant: "profile-empty" },
  { id: "profile-missing", label: "Profile · missing", locale: "en", direction: "ltr", identity: "guest", path: "/en/users/missing-user", view: "profile", allowedIdentities: ["guest"] },
  { id: "account-measures-user", label: "My measures", locale: "en", direction: "ltr", identity: "user", path: "/en/account/measures", view: "profile", allowedIdentities: ["user", "manager", "owner"] },
  { id: "account-measures-guest", label: "My measures · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/account/measures", view: "profile", allowedIdentities: ["guest"] },
  { id: "account-measure-detail", label: "My measures · detail", locale: "en", direction: "ltr", identity: "user", path: "/en/account/measures/11111111-1111-4111-8111-111111111111", view: "profile", allowedIdentities: ["user", "manager", "owner"] },
  { id: "home-guest", label: "Home", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home" },
  { id: "auth-pending", label: "Authentication · pending", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "pending", allowedIdentities: ["guest"] },
  { id: "auth-error", label: "Authentication · failed", locale: "en", direction: "ltr", identity: "guest", path: "/en", view: "home", authPresentationState: "error", allowedIdentities: ["guest"] },
  { id: "notifications-user", label: "Notifications · mixed", locale: "en", direction: "ltr", identity: "user", path: "/en/notifications", view: "notifications", allowedIdentities: ["user", "manager"] },
  { id: "complaint-result-non-participant", label: "Complaint result · non-participant", locale: "en", direction: "ltr", identity: "manager", path: "/en/complaints/55555555-5555-4555-8555-555555555555/result", view: "notifications", allowedIdentities: ["manager", "owner"] },
  { id: "notifications-guest-unauthenticated", label: "Notifications · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/notifications", view: "notifications", allowedIdentities: ["guest"] },
  { id: "notifications-empty", label: "Notifications · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/notifications", view: "notifications", variant: "notifications-empty", allowedIdentities: ["user", "manager"] },
  { id: "search-results-guest", label: "Search · results", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=TypeScript", view: "search" },
  { id: "search-no-results-guest", label: "Search · no results", locale: "en", direction: "ltr", identity: "guest", path: "/en/search?q=WebAssembly", view: "search", variant: "search-no-results" },
  { id: "popular-guest", label: "Popular", locale: "en", direction: "ltr", identity: "guest", path: "/en/popular", view: "popular" },
  { id: "unanswered-guest", label: "Unanswered", locale: "en", direction: "ltr", identity: "guest", path: "/en/unanswered", view: "unanswered" },
  { id: "unread-user", label: "Unread", locale: "en", direction: "ltr", identity: "user", path: "/en/unread", view: "unread", allowedIdentities: ["user", "manager"] },
  { id: "unread-guest-unauthenticated", label: "Unread · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/unread", view: "unread", allowedIdentities: ["guest"] },
  { id: "tags-guest", label: "Tags", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags", view: "tags" },
  { id: "tag-typescript-guest", label: "Tag · TypeScript", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags/typescript", view: "tag" },
  { id: "tag-cloudflare-guest", label: "Tag · Cloudflare", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags/cloudflare", view: "tag", allowedIdentities: ["guest"] },
  { id: "tag-missing", label: "Tag · missing", locale: "en", direction: "ltr", identity: "guest", path: "/en/tags/missing-tag", view: "tag", allowedIdentities: ["guest"] },
  { id: "help-solutions-all", label: "Help & solutions · All", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions", view: "category" },
  { id: "help-solutions-ask", label: "Help & solutions · Ask", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "editor-help-draft", label: "Editor · Help question draft", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-results", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-results", label: "Help & solutions · Similar questions", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-results", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-empty", label: "Help & solutions · Similar · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-invalid", label: "Help & solutions · Similar · invalid", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-invalid", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-similar-unavailable", label: "Help & solutions · Similar · unavailable", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions", view: "category", variant: "help-solutions-similar-unavailable", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-needs-help", label: "Help & solutions · Needs help", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=open", view: "category" },
  { id: "help-solutions-needs-help-empty", label: "Help & solutions · Needs help · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=open", view: "category", variant: "help-solutions-open-empty" },
  { id: "help-solutions-want", label: "Help & solutions · Want to help", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=help", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-want-empty", label: "Help & solutions · Want to help · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=help", view: "category", variant: "help-solutions-want-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-want-guest", label: "Help & solutions · Want to help · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=help", view: "category", allowedIdentities: ["guest"] },
  { id: "help-solutions-for-me", label: "Help & solutions · For me", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=for-me", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-for-me-empty", label: "Help & solutions · For me · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=for-me", view: "category", variant: "help-solutions-for-me-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-for-me-guest", label: "Help & solutions · For me · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=for-me", view: "category", allowedIdentities: ["guest"] },
  { id: "help-solutions-active", label: "Help & solutions · Active", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active", view: "category" },
  { id: "help-solutions-active-empty", label: "Help & solutions · Active · empty", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active", view: "category", variant: "help-solutions-active-empty" },
  { id: "attention-signals", label: "Moderation · Signals", locale: "en", direction: "ltr", identity: "manager", path: "/en/attention?mode=signals", view: "attention", allowedIdentities: ["manager"] },
  { id: "attention-guest-unauthenticated", label: "Moderation · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/attention?mode=signals", view: "attention", allowedIdentities: ["guest"] },
  { id: "attention-user-forbidden", label: "Moderation · ordinary user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/attention?mode=signals", view: "attention", allowedIdentities: ["user"] },
  { id: "attention-complaints", label: "Moderation · Complaints queue", locale: "en", direction: "ltr", identity: "manager", path: "/en/attention?mode=complaints", view: "attention", allowedIdentities: ["manager", "owner"] },
  { id: "attention-security", label: "Moderation · Security attachments", locale: "en", direction: "ltr", identity: "manager", path: "/en/attention?mode=security", view: "attention", allowedIdentities: ["manager"] },
  { id: "attention-empty", label: "Moderation · Signals · empty", locale: "en", direction: "ltr", identity: "manager", path: "/en/attention?mode=signals", view: "attention", variant: "attention-empty", allowedIdentities: ["manager"] },
  { id: "help-solutions-solutions", label: "Help & solutions · Solutions", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=solutions", view: "category" },
  { id: "help-solutions-filters", label: "Help & solutions · Combined filters", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=active&solution=outdated&answers=has&quality=normal&relation=standalone", view: "category" },
  { id: "help-solutions-filters-needs-details", label: "Help & solutions · Needs details filter", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?answers=has&quality=needs-details&relation=standalone", view: "category" },
  { id: "help-solutions-filters-needs-review-guest", label: "Help & solutions · Needs review filter · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?solution=needs-review", view: "category", allowedIdentities: ["guest"] },
  { id: "help-solutions-filters-needs-review-user", label: "Help & solutions · Needs review filter · ordinary user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?solution=needs-review", view: "category", allowedIdentities: ["user"] },
  { id: "help-solutions-filters-manager", label: "Help & solutions · Needs review filter", locale: "en", direction: "ltr", identity: "manager", path: "/en/categories/help-solutions?solution=needs-review&answers=has&quality=normal&relation=standalone", view: "category", allowedIdentities: ["manager"] },
  { id: "help-solution-current", label: "Help solution · current", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-cloudflare-cache", view: "topic", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solution-needs-review", label: "Help solution · needs review", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-neon-pooling", view: "topic", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solution-outdated", label: "Help solution · outdated", locale: "en", direction: "ltr", identity: "manager", path: "/en/topics/help-postgres-timeout", view: "topic", variant: "help-solution-outdated", allowedIdentities: ["guest", "user", "manager"] },
  { id: "help-solutions-mine", label: "Help & solutions · My questions", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=mine", view: "category", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-mine-empty", label: "Help & solutions · My questions · empty", locale: "en", direction: "ltr", identity: "user", path: "/en/categories/help-solutions?mode=mine", view: "category", variant: "help-solutions-mine-empty", allowedIdentities: ["user", "manager"] },
  { id: "help-solutions-mine-guest", label: "Help & solutions · My questions · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/help-solutions?mode=mine", view: "category", allowedIdentities: ["guest"] },
  { id: "category-guest", label: "Category", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category" },
  { id: "category-vibe-ai-guest", label: "Category · Vibe Coding & AI tools", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/vibe-ai-tools", view: "category", allowedIdentities: ["guest"] },
  { id: "category-missing", label: "Category · missing", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/missing-category", view: "category", allowedIdentities: ["guest"] },
  { id: "category-no-pins", label: "Category · no pins", locale: "en", direction: "ltr", identity: "guest", path: "/en/categories/development", view: "category", variant: "category-no-pins" },
  { id: "section-user", label: "Section", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section" },
  { id: "section-missing", label: "Section · missing", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/missing-section", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-overview-guest-unauthenticated", label: "Settings · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-account-guest-unauthenticated", label: "Settings · Account & security · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings/account", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-privacy-guest-unauthenticated", label: "Settings · Privacy · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings/privacy", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-user-guest-unauthenticated", label: "Settings · User preferences · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings/user", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-account-not-fresh", label: "Settings · Account · session not fresh", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-not-fresh", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-google-only", label: "Settings · Account · Google only", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-google-only", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-invalid-password", label: "Settings · Account · wrong password", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-invalid-password", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-rate-limited", label: "Settings · Account · rate limited", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-rate-limited", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-session-not-found", label: "Settings · Account · session no longer active", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-session-not-found", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-unavailable", label: "Settings · Account · temporarily unavailable", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-unavailable", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-account-stale", label: "Settings · Account · stale account/session", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/account", view: "section", variant: "settings-account-stale", allowedIdentities: ["user", "manager", "owner"] },
  { id: "settings-administrator-guest-unauthenticated", label: "Settings · Administrator preferences · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings/administrator", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-administrator-user-forbidden", label: "Settings · Administrator preferences · user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/administrator", view: "section", allowedIdentities: ["user"] },
  { id: "settings-administrator-manager", label: "Settings · Administrator preferences · standard access", locale: "en", direction: "ltr", identity: "manager", path: "/en/settings/administrator", view: "section", allowedIdentities: ["manager"] },
  { id: "settings-administrator-owner", label: "Settings · Administrator preferences · elevated access", locale: "en", direction: "ltr", identity: "owner", path: "/en/settings/administrator", view: "section", allowedIdentities: ["owner"] },
  { id: "settings-forum-guest-unauthenticated", label: "Settings · Forum & roles · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/settings/forum", view: "section", allowedIdentities: ["guest"] },
  { id: "settings-forum-user-forbidden", label: "Settings · Forum & roles · user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/settings/forum", view: "section", allowedIdentities: ["user"] },
  { id: "settings-forum-manager-forbidden", label: "Settings · Forum & roles · manager forbidden", locale: "en", direction: "ltr", identity: "manager", path: "/en/settings/forum", view: "section", allowedIdentities: ["manager"] },
  { id: "settings-forum-registration-conflict", label: "Settings · Forum & roles · registration conflict", locale: "en", direction: "ltr", identity: "owner", path: "/en/settings/forum", view: "section", variant: "settings-forum-registration-conflict", allowedIdentities: ["owner"] },
  { id: "settings-forum-registration-unavailable", label: "Settings · Forum & roles · registration unavailable", locale: "en", direction: "ltr", identity: "owner", path: "/en/settings/forum", view: "section", variant: "settings-forum-registration-unavailable", allowedIdentities: ["owner"] },
  { id: "settings-forum-registration-invalid", label: "Settings · Forum & roles · invalid registration request", locale: "en", direction: "ltr", identity: "owner", path: "/en/settings/forum", view: "section", variant: "settings-forum-registration-invalid", allowedIdentities: ["owner"] },
  { id: "settings-forum-registration-forbidden", label: "Settings · Forum & roles · forbidden registration update", locale: "en", direction: "ltr", identity: "owner", path: "/en/settings/forum", view: "section", variant: "settings-forum-registration-forbidden", allowedIdentities: ["owner"] },
  { id: "editor-create-topic", label: "Editor · Create topic", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section", allowedIdentities: ["user", "manager"] },
  { id: "section-form-error", label: "Create topic error", locale: "en", direction: "ltr", identity: "user", path: "/en/sections/typescript", view: "section", variant: "section-form-error", allowedIdentities: ["user", "manager"] },
  { id: "topic-solved-user", label: "Solved topic", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic" },
  { id: "editor-published-post", label: "Editor · Published post", locale: "en", direction: "ltr", identity: "user", path: "/en/posts/question/edit", view: "topic", allowedIdentities: ["user"] },
  { id: "editor-reply", label: "Editor · Reply", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic", variant: "topic-unsolved", allowedIdentities: ["user", "manager"] },
  { id: "topic-best-answer-unsolved", label: "Best answer · confirmation", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api?solutionPrompt=answer#solution-confirmation", view: "topic", variant: "topic-best-answer-unsolved", allowedIdentities: ["user"] },
  { id: "topic-reply-error", label: "Reply error", locale: "en", direction: "ltr", identity: "user", path: "/en/topics/typed-api", view: "topic", variant: "topic-reply-error", allowedIdentities: ["user", "manager"] },
  { id: "topic-unsolved", label: "Unsolved topic", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "topic", variant: "topic-unsolved" },
  { id: "super-admin-overview-owner", label: "Super-admin · Overview", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-monitoring-owner", label: "Super-admin · Monitoring", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-system-owner", label: "Super-admin · System", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/system", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-accounts-owner", label: "Super-admin · Accounts", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/accounts", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-security-owner", label: "Super-admin · Security", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/security", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-background-owner", label: "Super-admin · Background processes", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/background", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-localization-owner", label: "Super-admin · Localization", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/localization", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-integrations-owner", label: "Super-admin · Integrations", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/integrations", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-data-owner", label: "Super-admin · Data", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/data", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-files-owner", label: "Super-admin · Files", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/files", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-forum-owner", label: "Super-admin · Forum", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/forum", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-administration-owner", label: "Super-admin · Administration", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/administration", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-moderation-owner", label: "Super-admin · Moderation", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/moderation", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-notifications-owner", label: "Super-admin · Notifications", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/notifications", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-events-owner", label: "Super-admin · Events", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/events", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-infrastructure-owner", label: "Super-admin · Infrastructure · Stage 6", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/infrastructure", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-monitor-history-owner", label: "Super-admin · Monitor history", locale: "en", direction: "ltr", identity: "owner", path: "/en/super-admin/monitoring/system/system.runtime/history", view: "super-admin", allowedIdentities: ["owner"] },
  { id: "super-admin-guest-unauthenticated", label: "Super-admin · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/super-admin", view: "super-admin", allowedIdentities: ["guest"] },
  { id: "super-admin-manager-forbidden", label: "Super-admin · manager forbidden", locale: "en", direction: "ltr", identity: "manager", path: "/en/super-admin", view: "super-admin", allowedIdentities: ["manager"] },
  { id: "admin", label: "Authorization", locale: "en", direction: "ltr", identity: "owner", path: "/en/admin/authorization", view: "admin", allowedIdentities: ["manager", "owner"] },
  { id: "admin-guest-unauthenticated", label: "Authorization · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/authorization", view: "admin", allowedIdentities: ["guest"] },
  { id: "admin-user-forbidden", label: "Authorization · ordinary user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/admin/authorization", view: "admin", allowedIdentities: ["user"] },
  { id: "admin-topic", label: "Admin topic & messages", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/forum/topics/typed-api", view: "admin-topic", allowedIdentities: ["manager", "owner"] },
  { id: "admin-topic-worker-auth", label: "Admin topic & messages · Worker auth", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/forum/topics/worker-auth", view: "admin-topic", allowedIdentities: ["manager", "owner"] },
  { id: "admin-topic-missing", label: "Admin topic & messages · missing", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/forum/topics/missing-topic", view: "admin-topic", allowedIdentities: ["manager", "owner"] },
  { id: "admin-topic-missing-guest", label: "Admin topic & messages · missing · unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/forum/topics/missing-topic", view: "admin-topic", allowedIdentities: ["guest"] },
  { id: "admin-topic-guest-unauthenticated", label: "Admin topic & messages · guest unauthenticated", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/forum/topics/typed-api", view: "admin-topic", allowedIdentities: ["guest"] },
  { id: "admin-topic-user-forbidden", label: "Admin topic & messages · ordinary user forbidden", locale: "en", direction: "ltr", identity: "user", path: "/en/admin/forum/topics/typed-api", view: "admin-topic", allowedIdentities: ["user"] },
  { id: "admin-success", label: "Authorization · saved", locale: "en", direction: "ltr", identity: "owner", path: "/en/admin/authorization", view: "admin", variant: "admin-success", allowedIdentities: ["owner"] },
  { id: "admin-conflict", label: "Authorization · conflict", locale: "en", direction: "ltr", identity: "owner", path: "/en/admin/authorization", view: "admin", variant: "admin-conflict", allowedIdentities: ["owner"] },
  { id: "empty-section", label: "Empty section", locale: "en", direction: "ltr", identity: "guest", path: "/en/sections/empty", view: "empty" },
  { id: "route-401", label: "System · 401", locale: "en", direction: "ltr", identity: "guest", path: "/en/admin/authorization", view: "not-found", variant: "route-401", allowedIdentities: ["guest"] },
  { id: "route-403", label: "System · 403", locale: "en", direction: "ltr", identity: "user", path: "/en/admin/authorization", view: "not-found", variant: "route-403", allowedIdentities: ["user"] },
  { id: "not-found", label: "System · 404", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing", view: "not-found" },
  { id: "route-real-404", label: "System · real route 404", locale: "en", direction: "ltr", identity: "guest", path: "/en/missing-real-route", view: "home", allowedIdentities: ["guest"] },
  { id: "topic-missing", label: "Topic · missing", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/missing-topic", view: "topic", allowedIdentities: ["guest"] },
  { id: "route-503", label: "System · 503", locale: "en", direction: "ltr", identity: "manager", path: "/en/admin/authorization", view: "not-found", variant: "route-503", allowedIdentities: ["manager"] },
  { id: "route-500", label: "System · unexpected", locale: "en", direction: "ltr", identity: "guest", path: "/en/topics/typed-api", view: "not-found", variant: "route-500" },
] as const;

function supportsPreviewIdentity(scenario: Scenario, identity: PreviewIdentity): boolean {
  return scenario.allowedIdentities?.includes(identity) ?? true;
}

const categoryId = "development";
const sectionId = "typescript";
const topicId = "typed-api";

type PreviewTopicPage = Parameters<typeof TopicView>[0]["topic"];
type PreviewTopicPost = PreviewTopicPage["posts"][number];

type PreviewCreatedTopic = {
  id: string;
  sectionId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tags: { key: string; name: string }[];
  sourceLocale: PreviewLocale;
  createdAt: Date;
};

type PreviewReply = {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  body: string;
  parentPostId: string | null;
  sourceLocale: PreviewLocale;
  createdAt: Date;
};

type PreviewPostEditRevision = {
  id: string;
  originalContent: string;
  sourceLocale: string;
  editedAt: Date;
};

type PreviewTopicOverride = {
  isSolved?: boolean;
  bestAnswerPostId?: string | null;
  isPinned?: boolean;
  isClosed?: boolean;
  closureVersion?: number;
};

type PreviewAuthorizationRoleState = {
  id: string;
  slug: string;
  displayName: string;
  isSystem: boolean;
  grants: PermissionKey[];
};

type PreviewAuthorizationUserState = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  explicitAssignment: boolean;
  overrides: Partial<Record<PermissionKey, "allow" | "deny">>;
  owner?: boolean;
};

const PREVIEW_REGISTRATION_STORAGE_KEY = "vico:ui-preview:registration-policy:v1";

type PreviewAuthorizationState = {
  sequence: number;
  roles: PreviewAuthorizationRoleState[];
  users: PreviewAuthorizationUserState[];
};

type PreviewAdminMeasure = UserMeasureDetail & {
  targetUserId: string;
  targetName: string;
  canMutate: boolean;
};

type PreviewOwnerDeactivation = {
  deactivatedAt: string;
  retainAtLeastUntil: string;
  eventId: string;
};

type PreviewInteractionState = {
  sequence: number;
  createdTopics: Map<string, PreviewCreatedTopic>;
  replies: Map<string, PreviewReply[]>;
  topicOverrides: Map<string, PreviewTopicOverride>;
  topicTitleEdits: Map<string, { id: string; originalContent: string; sourceLocale: string }>;
  postEdits: Map<string, PreviewPostEditRevision[]>;
  topicWatches: Set<string>;
  topicBookmarks: Set<string>;
  topicMutes: Set<string>;
  userBlocks: Set<string>;
  topicTitleSourceLocales: Map<string, string>;
  postSourceLocales: Map<string, string>;
  profileOverrides: Map<string, ProfileFields>;
  readNotifications: Set<string>;
  resolvedAttentionCases: Set<string>;
  complaintNotes: ReviewCase["notes"]["items"];
  complaintDecision: ReviewCase["decision"];
  complaintPriorityOverride: ComplaintPriority | null;
  complaintVersion: number;
  complaintPrioritySettings: ComplaintPrioritySettings;
  participantComplaintAppeal: { id: string; operationId: string; argument: string } | null;
  complaintAppealResolution: { outcome: "upheld" | "overturned"; reasoning: string } | null;
  preferredLocale: PreviewLocale | null;
  localeSaved: boolean;
  showOnline: boolean;
  googleLinked: boolean;
  registrationGoogleEnabled: boolean;
  registrationEmailEnabled: boolean;
  registrationVersion: number;
  revokedAccountSessionIds: Set<string>;
  ownerDeactivations: Map<string, PreviewOwnerDeactivation>;
  measureAppealBody: string | null;
  adminHistoryEvents: AdminHistoryEvent[];
  adminCreatedMeasures: Map<string, PreviewAdminMeasure>;
  authorization: PreviewAuthorizationState;
};

function readPreviewRegistrationPolicy() {
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_REGISTRATION_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const version = value.version;
    if (typeof value.googleRegistrationEnabled !== "boolean"
      || typeof value.emailRegistrationEnabled !== "boolean"
      || typeof version !== "number" || !Number.isInteger(version) || version < 1) return null;
    return {
      googleRegistrationEnabled: value.googleRegistrationEnabled,
      emailRegistrationEnabled: value.emailRegistrationEnabled,
      version,
    };
  } catch {
    return null;
  }
}

function writePreviewRegistrationPolicy(interactions: PreviewInteractionState) {
  try {
    window.sessionStorage.setItem(PREVIEW_REGISTRATION_STORAGE_KEY, JSON.stringify({
      googleRegistrationEnabled: interactions.registrationGoogleEnabled,
      emailRegistrationEnabled: interactions.registrationEmailEnabled,
      version: interactions.registrationVersion,
    }));
  } catch {
    // Preview persistence is best-effort; the current iframe keeps its in-memory policy.
  }
}

function createPreviewInteractionState(): PreviewInteractionState {
  const registration = typeof window === "undefined" ? null : readPreviewRegistrationPolicy();
  return {
    sequence: 0,
    createdTopics: new Map(),
    replies: new Map(),
    topicOverrides: new Map(),
    topicTitleEdits: new Map(),
    postEdits: new Map(),
    topicWatches: new Set(),
    topicBookmarks: new Set(),
    topicMutes: new Set(),
    userBlocks: new Set(),
    topicTitleSourceLocales: new Map(),
    postSourceLocales: new Map(),
    profileOverrides: new Map(),
    readNotifications: new Set(),
    resolvedAttentionCases: new Set(),
    complaintNotes: [],
    complaintDecision: null,
    complaintPriorityOverride: null,
    complaintVersion: 1,
    complaintPrioritySettings: { version: 1, weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY } },
    participantComplaintAppeal: null,
    complaintAppealResolution: null,
    preferredLocale: null,
    localeSaved: false,
    showOnline: true,
    googleLinked: false,
    registrationGoogleEnabled: registration?.googleRegistrationEnabled ?? true,
    registrationEmailEnabled: registration?.emailRegistrationEnabled ?? true,
    registrationVersion: registration?.version ?? 1,
    revokedAccountSessionIds: new Set(),
    ownerDeactivations: new Map(),
    measureAppealBody: null,
    adminHistoryEvents: [],
    adminCreatedMeasures: new Map(),
    authorization: createPreviewAuthorizationState(),
  };
}

function previewDirectionForLocale(locale: PreviewLocale): Direction {
  return localeRegistry.find(locale)?.locale.direction ?? "ltr";
}

function previewTagsFromInput(value: string): { key: string; name: string }[] {
  const names = value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const seen = new Set<string>();
  return names.flatMap((name) => {
    const key = name.toLocaleLowerCase("en")
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "tag";
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, name }];
  });
}

function previewMutationLocale(value: string | undefined, fallback: PreviewLocale): PreviewLocale {
  return value && isPreviewLocale(value) ? value : fallback;
}

function previewApplyTopicState(topic: PreviewTopicPage, interactions: PreviewInteractionState): PreviewTopicPage {
  const replies = (interactions.replies.get(topic.id) ?? []).map<PreviewTopicPost>((reply) => ({
    id: reply.id,
    topicId: reply.topicId,
    authorId: reply.authorId,
    authorName: reply.authorName,
    parentPostId: reply.parentPostId,
    solutionModerationStatus: null,
    solutionOutdatedReason: null,
    solutionOutdatedReasonKind: null,
    createdAt: reply.createdAt,
    body: {
      id: `${reply.id}-body-r1`,
      originalContent: reply.body,
      sourceLocale: reply.sourceLocale,
    },
  }));
  const override = interactions.topicOverrides.get(topic.id);
  const posts = [...topic.posts, ...replies].map((post) => {
    const edit = interactions.postEdits.get(post.id)?.at(-1);
    const sourceLocale = interactions.postSourceLocales.get(post.id)
      ?? edit?.sourceLocale
      ?? post.body.sourceLocale;
    const deactivatedAuthor = interactions.ownerDeactivations.has(post.authorId);
    return {
      ...post,
      ...(deactivatedAuthor ? { authorIdentityKind: "deleted" as const, authorImage: null } : {}),
      ...(edit ? { editedAt: edit.editedAt } : {}),
      body: {
        ...(edit ? { id: edit.id, originalContent: edit.originalContent } : post.body),
        sourceLocale,
      },
    };
  });
  const editedTitle = interactions.topicTitleEdits.get(topic.id) ?? topic.title;
  const titleSourceLocale = interactions.topicTitleSourceLocales.get(topic.id);
  return {
    ...topic,
    ...(interactions.ownerDeactivations.has(topic.authorId)
      ? { authorIdentityKind: "deleted" as const }
      : {}),
    title: titleSourceLocale ? { ...editedTitle, sourceLocale: titleSourceLocale } : editedTitle,
    isSolved: override?.isSolved ?? topic.isSolved,
    bestAnswerPostId: override?.bestAnswerPostId === undefined
      ? topic.bestAnswerPostId
      : override.bestAnswerPostId,
    isPinned: override?.isPinned ?? topic.isPinned,
    isClosed: override?.isClosed ?? topic.isClosed,
    closureVersion: override?.closureVersion ?? topic.closureVersion,
    posts,
  };
}

function previewEditablePostIds(scenario: Scenario, topic: PreviewTopicPage): string[] {
  const actor = previewUser(scenario);
  if (!actor) return [];
  return topic.posts.filter((post) => post.authorId === actor.id).map((post) => post.id);
}

function previewPostEditRenderKey(
  topic: PreviewTopicPage,
  interactions: PreviewInteractionState,
): string {
  const editRevisionIds = topic.posts.map(
    (post) => interactions.postEdits.get(post.id)?.at(-1)?.id ?? "",
  );
  return `${topic.id}:${editRevisionIds.join("|")}`;
}

function previewPresentationsForTopic(
  existing: readonly ContentTranslationPresentation[],
  topic: PreviewTopicPage,
): ContentTranslationPresentation[] {
  const byPost = new Map(existing.map((presentation) => [presentation.contentId, presentation]));
  return topic.posts.map((post) => {
    const presentation = byPost.get(post.id);
    if (presentation?.revisionId === post.body.id) return presentation;
    return originalPresentation(
      "post-body",
      post.id,
      post.body.id,
      post.body.originalContent,
      post.body.sourceLocale,
      previewDirectionForLocale(post.body.sourceLocale as PreviewLocale),
    );
  });
}

const previewBuildKey =
  document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? "dev";

const PREVIEW_LOCALE_STORAGE_KEY = "vico-ui-preview-locale";

function initialPreviewLocale(): PreviewLocale {
  try {
    const stored = window.sessionStorage.getItem(PREVIEW_LOCALE_STORAGE_KEY);
    if (stored && isPreviewLocale(stored)) return stored;
  } catch {
    // Preview storage is optional; fall back to English when unavailable.
  }
  return "en";
}

const previewLocaleOptions = localeRegistry.activeLocales()
  .filter((locale) => isPreviewLocale(locale.tag))
  .map(({ tag, nativeName, direction }) => ({ tag, nativeName, direction }))
  .sort((left, right) => left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0);

function scenarioForLocale(scenario: Scenario, locale: PreviewLocale): Scenario {
  const definition = localeRegistry.find(locale)?.locale;
  if (!definition) return scenario;

  return {
    ...scenario,
    locale,
    direction: definition.direction,
    path: scenario.path.replace(/^\/[^/?#]+/, `/${locale}`),
  };
}

const category = {
  id: categoryId,
  name: "Development",
  sections: [
    { id: sectionId, name: "TypeScript & architecture", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Cloud & deployment", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Databases", topicCount: 2, postCount: 12 },
  ],
};

const categoryRu = {
  id: categoryId,
  name: "Разработка",
  sections: [
    { id: sectionId, name: "TypeScript и архитектура", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "Облако и deploy", topicCount: 5, postCount: 41 },
    { id: "databases", name: "Базы данных", topicCount: 2, postCount: 12 },
  ],
};

const categoryRtl = {
  id: categoryId,
  name: "פיתוח",
  sections: [
    { id: sectionId, name: "TypeScript וארכיטקטורה", topicCount: 3, postCount: 23 },
    { id: "cloud", name: "ענן ופריסה", topicCount: 5, postCount: 41 },
    { id: "databases", name: "מסדי נתונים", topicCount: 2, postCount: 12 },
  ],
};

const section = {
  id: sectionId,
  name: "TypeScript & architecture",
  category: { id: categoryId, name: "Development" },
  topics: [
    {
      id: topicId,
      authorName: "Alex Rivera",
      postCount: 3,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      isPinned: true,
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
      title: {
        id: "title-r1",
        originalContent: "How should I structure a typed API client?",
        sourceLocale: "en",
      },
    },
    {
      id: "rtl-markdown",
      authorName: "Noa Levi",
      postCount: 4,
      createdAt: new Date("2026-09-27T12:00:00Z"),
      isPinned: false,
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
      title: {
        id: "title-r2",
        originalContent: "Mixed RTL content with code blocks",
        sourceLocale: "en",
      },
    },
    {
      id: "worker-auth",
      authorName: "Sam Chen",
      postCount: 12,
      createdAt: new Date("2026-09-28T08:00:00Z"),
      isPinned: true,
      tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      title: {
        id: "title-r3",
        originalContent: "Worker auth: session boundary vs permissions",
        sourceLocale: "en",
      },
    },
  ],
};

const sectionRu = {
  id: sectionId,
  name: "TypeScript и архитектура",
  category: { id: categoryId, name: "Разработка" },
  topics: section.topics,
};

const sectionRtl = {
  id: sectionId,
  name: "TypeScript וארכיטקטורה",
  category: { id: categoryId, name: "פיתוח" },
  topics: [
    {
      id: topicId,
      authorName: "אלכס ריברה",
      postCount: 3,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      isPinned: true,
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
      title: {
        id: "title-r1",
        originalContent: "איך כדאי לבנות לקוח API עם טיפוסים?",
        sourceLocale: "he",
      },
    },
    {
      id: "rtl-markdown",
      authorName: "נועה לוי",
      postCount: 4,
      createdAt: new Date("2026-09-27T12:00:00Z"),
      isPinned: false,
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
      title: {
        id: "title-r2",
        originalContent: "תוכן RTL מעורב עם בלוקי קוד",
        sourceLocale: "he",
      },
    },
    {
      id: "worker-auth",
      authorName: "סם צ'ן",
      postCount: 12,
      createdAt: new Date("2026-09-28T08:00:00Z"),
      isPinned: true,
      tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      title: {
        id: "title-r3",
        originalContent: "Worker auth: session boundary מול permissions",
        sourceLocale: "he",
      },
    },
  ],
};

const topic = {
  id: topicId,
  sectionId,
  authorId: "alex",
  authorName: "Alex Rivera",
  createdAt: new Date("2026-09-27T10:00:00Z"),
  isPinned: true,
  isSolved: true,
  isClosed: false,
  closureVersion: 0,
  bestAnswerPostId: "answer",
  needsDetails: false,
  duplicateOf: null,
  duplicateDisputed: false,
  title: section.topics[0]!.title,
  section: {
    id: sectionId,
    name: "TypeScript & architecture",
    category: { id: categoryId, name: "Development" },
  },
  tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
  posts: [
    {
      id: "question",
      topicId,
      authorId: "alex",
      authorName: "Alex Rivera",
      parentPostId: null,
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
      createdAt: new Date("2026-09-27T10:00:00Z"),
      body: {
        id: "post-r1",
        originalContent: "I want strong typing without coupling the whole app to one HTTP library.",
        sourceLocale: "en",
      },
    },
    {
      id: "followup",
      topicId,
      authorId: "maya",
      authorName: "Maya Cohen",
      parentPostId: "question",
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
      createdAt: new Date("2026-09-27T11:00:00Z"),
      body: {
        id: "post-r3",
        originalContent: "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
        sourceLocale: "en",
      },
    },
    {
      id: "answer",
      topicId,
      authorId: "sam",
      authorName: "Sam Chen",
      parentPostId: "followup",
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
      createdAt: new Date("2026-09-27T12:00:00Z"),
      body: {
        id: "post-r2",
        originalContent: "Separate the HTTP layer from domain types so each boundary can be tested independently.",
        sourceLocale: "en",
      },
    },
  ],
};


const previewReferenceTime = "2026-09-30T16:00:00.000Z";

function previewCategoryTopics(
  locale: PreviewLocale,
  sectionIdValue: string,
  sectionName: string,
) {
  const russian = locale === "ru";
  const rtl = locale === "he";
  const pinnedTitles = rtl
    ? ["כללי המדור ומשאבים שימושיים", "לפני שפותחים נושא חדש", "אוסף קישורים מומלץ"]
    : russian
      ? ["Правила раздела и полезные материалы", "Перед созданием новой темы", "Рекомендуемая подборка материалов"]
      : ["Section guide and useful resources", "Before you open a new topic", "Recommended reference collection"];
  const latestTitles = sectionIdValue === sectionId
    ? (rtl
        ? ["איך כדאי לבנות לקוח API עם טיפוסים?", "תוכן RTL מעורב עם בלוקי קוד", "Worker auth: session boundary מול permissions", "דוגמה מעשית מהמדור"]
        : russian
          ? ["Как лучше построить типизированный API-клиент?", "Смешанный RTL-контент с блоками кода", "Worker auth: граница сессии и permissions", "Практический пример из раздела"]
          : ["How should I structure a typed API client?", "Mixed RTL content with code blocks", "Worker auth: session boundary vs permissions", "A practical example from this section"])
    : (rtl
        ? [`השאלה האחרונה ב-${sectionName}`, "דוגמה מעשית", "דיון שימושי", "שאלה נוספת"]
        : russian
          ? [`Последний вопрос: ${sectionName}`, "Практический пример", "Полезное обсуждение", "Ещё один вопрос"]
          : [`Latest question in ${sectionName}`, "A practical example", "Useful discussion", "Another question"]);

  const latestIds = sectionIdValue === sectionId
    ? [topicId, "rtl-markdown", "worker-auth", `${sectionIdValue}-latest-4`]
    : latestTitles.map((_, index) => `${sectionIdValue}-latest-${index + 1}`);

  return {
    pinnedTopics: pinnedTitles.map((title, index) => ({
      id: `${sectionIdValue}-pinned-${index + 1}`,
      title,
      authorName: ["Vico Team", "Maya Cohen", "Sam Chen"][index]!,
      activityAt: new Date(Date.UTC(2026, 8, 29 - index, 9 + index, 30)).toISOString(),
    })),
    latestTopics: latestTitles.map((title, index) => ({
      id: latestIds[index]!,
      title,
      authorName: ["Alex Rivera", "Noa Levi", "Sam Chen", "Maya Cohen"][index]!,
      activityAt: new Date(Date.UTC(2026, 8, 30 - Math.min(index, 2), 15 - index * 2, 42)).toISOString(),
    })),
  };
}

function homepageCategories(locale: PreviewLocale): HomepageCategoryOverview[] {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const names = rtl
    ? [
        "עזרה ופתרונות",
        "Vibe Coding וכלי AI",
        "פיתוח",
        "Deploy ותשתיות",
        "פרויקטים וביקורות",
        "קהילה",
      ]
    : russian
      ? [
          "Помощь и решения",
          "Vibe Coding и AI-инструменты",
          "Разработка",
          "Deploy и инфраструктура",
          "Проекты и разборы",
          "Сообщество",
        ]
      : [
          "Help & solutions",
          "Vibe Coding & AI tools",
          "Development",
          "Deploy & infrastructure",
          "Projects & reviews",
          "Community",
        ];
  const descriptions = rtl
    ? [
        "שאלות, תקלות ופתרונות טכניים בדוקים.",
        "תהליכי עבודה, סוכנים, מודלים וכלי פיתוח עם AI.",
        "Frontend, backend, ארכיטקטורה, שפות ובדיקות.",
        "Hosting, מסדי נתונים, CI/CD, ענן ותפעול.",
        "הצגת פרויקטים, ביקורות ודיון בהחלטות מימוש.",
        "דיונים כלליים וחיי הקהילה.",
      ]
    : russian
      ? [
          "Вопросы, диагностика и проверенные технические решения.",
          "AI-процессы разработки, агенты, модели и инструменты.",
          "Frontend, backend, архитектура, языки и тестирование.",
          "Hosting, базы данных, CI/CD, облако и эксплуатация.",
          "Показывайте проекты, просите разбор и обсуждайте решения.",
          "Общие обсуждения и жизнь сообщества.",
        ]
      : [
          "Questions, troubleshooting, and verified technical solutions.",
          "AI coding workflows, agents, models, and tools.",
          "Frontend, backend, architecture, languages, and testing.",
          "Hosting, databases, CI/CD, cloud, and operations.",
          "Show projects, request reviews, and discuss implementation choices.",
          "General discussion and community topics.",
        ];
  const icons = ["help", "ai", "code", "deploy", "projects", "community"];
  const ids = ["help-solutions", "vibe-ai-tools", "development", "deploy-infrastructure", "projects-reviews", "community"];
  const topicTotals = [8, 64, 10, 43, 27, 31];
  const messageTotals = [27, 387, 76, 296, 148, 203];
  const genericSectionNames = rtl
    ? ["כללי", "שאלות", "פרקטיקה", "כלים", "דיונים"]
    : russian
      ? ["Основное", "Вопросы", "Практика", "Инструменты", "Обсуждения"]
      : ["General", "Questions", "Practice", "Tools", "Discussions"];

  function distribute(total: number, count: number, index: number) {
    return Math.floor(total / count) + (index < total % count ? 1 : 0);
  }

  return ids.map((id, index) => {
    const sections = id === "help-solutions"
      ? []
      : id === "development"
        ? (rtl ? categoryRtl : russian ? categoryRu : category).sections.map((section) => ({
            id: section.id,
            name: section.name,
            topicCount: section.topicCount,
            messageCount: section.postCount,
          }))
        : genericSectionNames.map((name, sectionIndex) => ({
            id: `${id}-preview-${sectionIndex + 1}`,
            name,
            topicCount: distribute(topicTotals[index]!, genericSectionNames.length, sectionIndex),
            messageCount: distribute(messageTotals[index]!, genericSectionNames.length, sectionIndex),
          }));

    return {
      id,
      name: names[index]!,
      description: descriptions[index]!,
      icon: icons[index]!,
      sectionCount: sections.length,
      topicCount: id === HELP_SOLUTIONS_CATEGORY_ID
        ? topicTotals[index]!
        : sections.reduce((sum, section) => sum + section.topicCount, 0),
      messageCount: id === HELP_SOLUTIONS_CATEGORY_ID
        ? messageTotals[index]!
        : sections.reduce((sum, section) => sum + section.messageCount, 0),
      sections,
    };
  });
}

function previewHelpSolutions(locale: PreviewLocale) {
  const russian = locale === "ru";
  const hebrew = locale === "he";
  const titles = hebrew
    ? [
        "למה ה-Worker מאבד את ה-session אחרי redirect?",
        "נבחרה תשובה מיטבית, אבל האימות עדיין לא יציב",
        "איך מתקנים statement timeout ב-PostgreSQL?",
        "איך מגדירים Cache-Control נכון ב-Cloudflare?",
        "האם צריך לבדוק מחדש את הגדרות החיבור של Neon?",
      ]
    : russian
      ? [
          "Почему Worker теряет сессию после redirect?",
          "Лучший ответ выбран, но авторизация всё ещё нестабильна",
          "Как исправить statement timeout в PostgreSQL?",
          "Как правильно настроить Cache-Control в Cloudflare?",
          "Нужно ли перепроверить настройки подключения Neon?",
        ]
      : [
          "Why does my Worker lose the session after redirect?",
          "Best answer selected, but auth is still intermittent",
          "How do I fix PostgreSQL statement timeouts?",
          "How should Cache-Control be configured on Cloudflare?",
          "Should the Neon connection settings be reviewed again?",
        ];

  return {
    id: HELP_SOLUTIONS_CATEGORY_ID,
    name: hebrew ? "עזרה ופתרונות" : russian ? "Помощь и решения" : "Help & solutions",
    questions: [
      {
        id: "help-worker-session", title: titles[0]!, authorName: "Alex Rivera", replyCount: 0,
        isSolved: false, hasBestAnswer: false, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
        needsDetails: false,
        duplicateOf: { id: "help-auth-best-answer", title: titles[1]! },
        duplicateDisputed: true,
        createdAt: "2026-09-30T11:30:00.000Z",
        activityAt: "2026-09-30T15:40:00.000Z",
        tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "auth", name: "Auth" }],
      },
      {
        id: "help-auth-best-answer", title: titles[1]!, authorName: "Noa Levi", replyCount: 3,
        isSolved: false, hasBestAnswer: true, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: true, duplicateOf: null, duplicateDisputed: false, createdAt: "2026-09-29T09:00:00.000Z",
        activityAt: "2026-09-30T14:20:00.000Z",
        tags: [{ key: "better-auth", name: "Better Auth" }, { key: "workers", name: "Workers" }],
      },
      {
        id: "help-postgres-timeout", title: titles[2]!, authorName: "Maya Cohen", replyCount: 5,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: "outdated" as const,
        solutionOutdatedReason: hebrew
          ? "גרסת PostgreSQL החדשה שינתה את ההתנהגות של ההגדרה הזו."
          : russian
            ? "В новой версии PostgreSQL поведение этой настройки изменилось."
            : "A newer PostgreSQL version changed the behavior of this setting.",
        solutionOutdatedReasonKind: null,
        needsDetails: false,
        duplicateOf: null,
        duplicateDisputed: false,
        createdAt: "2026-09-27T08:00:00.000Z",
        activityAt: "2026-09-29T18:10:00.000Z",
        tags: [{ key: "postgresql", name: "PostgreSQL" }, { key: "neon", name: "Neon" }],
      },
      {
        id: "help-cloudflare-cache", title: titles[3]!, authorName: "Sam Chen", replyCount: 4,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: false, duplicateOf: null, duplicateDisputed: false,
        createdAt: "2026-09-26T09:15:00.000Z",
        activityAt: "2026-09-29T15:30:00.000Z",
        tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "cache", name: "Cache" }],
      },
      {
        id: "help-neon-pooling", title: titles[4]!, authorName: "Alex Rivera", replyCount: 2,
        isSolved: true, hasBestAnswer: true, solutionModerationStatus: "needs-review" as const, solutionOutdatedReason: null, solutionOutdatedReasonKind: null, needsDetails: false, duplicateOf: null, duplicateDisputed: false,
        createdAt: "2026-09-25T12:20:00.000Z",
        activityAt: "2026-09-28T17:45:00.000Z",
        tags: [{ key: "neon", name: "Neon" }, { key: "postgresql", name: "PostgreSQL" }],
      },
    ],
  };
}
function popularPeriods(locale: PreviewLocale): ForumPopularPage {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const topics = [
    {
      id: "typed-api",
      title: rtl ? "איך כדאי לבנות לקוח API עם טיפוסים?" : russian ? "Как лучше построить типизированный API-клиент?" : "How should I structure a typed API client?",
      authorName: rtl ? "אלכס ריברה" : "Alex Rivera",
    },
    {
      id: "worker-auth",
      title: rtl ? "Worker auth: גבול session מול permissions" : russian ? "Worker auth: граница session и permissions" : "Worker auth: session boundary vs permissions",
      authorName: rtl ? "סם צ'ן" : "Sam Chen",
    },
    {
      id: "rtl-markdown",
      title: rtl ? "תוכן RTL מעורב עם בלוקי קוד" : russian ? "Смешанный RTL-контент с блоками кода" : "Mixed RTL content with code blocks",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
    },
    {
      id: "database-queues",
      title: rtl ? "איך לתכנן תור עבודות בלי להסתבך?" : russian ? "Как спроектировать очередь задач без лишней сложности?" : "How do I design a job queue without overcomplicating it?",
      authorName: "Maya Cohen",
    },
  ];

  const item = (index: number, activityCount: number, latestActivityAt: string) => ({
    ...topics[index]!,
    activityCount,
    latestActivityAt: new Date(latestActivityAt),
  });

  return {
    "24h": [
      item(0, 18, "2026-09-30T15:42:00.000Z"),
      item(1, 12, "2026-09-30T14:12:00.000Z"),
      item(2, 7, "2026-09-30T12:05:00.000Z"),
    ],
    "7d": [
      item(1, 49, "2026-09-30T14:12:00.000Z"),
      item(0, 41, "2026-09-30T15:42:00.000Z"),
      item(3, 28, "2026-09-29T18:20:00.000Z"),
      item(2, 22, "2026-09-30T12:05:00.000Z"),
    ],
    "30d": [
      item(3, 133, "2026-09-29T18:20:00.000Z"),
      item(1, 112, "2026-09-30T14:12:00.000Z"),
      item(0, 96, "2026-09-30T15:42:00.000Z"),
      item(2, 61, "2026-09-30T12:05:00.000Z"),
    ],
  };
}

function unansweredTopics(locale: PreviewLocale) {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const titleDirection = localeRegistry.find(locale)?.locale.direction ?? ("auto" as const);
  const categoryName = rtl ? "פיתוח" : russian ? "Разработка" : "Development";
  const aiCategoryName = rtl ? "Vibe Coding וכלי AI" : russian ? "Vibe Coding и AI-инструменты" : "Vibe Coding & AI tools";

  return [
    {
      id: "worker-auth",
      sourceLocale: locale,
      titleDirection,
      title: rtl ? "איך להפריד session מ-permissions ב-Worker?" : russian ? "Как разделить session и permissions в Worker?" : "How should session and permissions be separated in a Worker?",
      authorName: rtl ? "סם צ'ן" : "Sam Chen",
      category: { id: "development", name: categoryName },
      section: { id: "backend", name: rtl ? "Backend ו-API" : russian ? "Backend и API" : "Backend & API" },
    },
    {
      id: "agent-context",
      sourceLocale: locale,
      titleDirection,
      title: rtl ? "איך להעביר הקשר בין כמה סוכני AI?" : russian ? "Как передавать контекст между несколькими AI-агентами?" : "How should context be passed between several AI agents?",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
      category: { id: "vibe-ai", name: aiCategoryName },
      section: { id: "agents", name: rtl ? "סוכנים ואוטומציה" : russian ? "Агенты и автоматизация" : "Agents & automation" },
    },
    {
      id: "database-timeouts",
      sourceLocale: locale,
      titleDirection,
      title: rtl ? "איזה timeout לבחור לשאילתות PostgreSQL?" : russian ? "Какой timeout выбрать для запросов PostgreSQL?" : "What timeout should I use for PostgreSQL queries?",
      authorName: "Maya Cohen",
      category: { id: "development", name: categoryName },
      section: { id: "databases", name: rtl ? "מסדי נתונים" : russian ? "Базы данных" : "Databases" },
    },
  ];
}

function unreadTopics(locale: PreviewLocale) {
  const base = unansweredTopics(locale);
  return base.slice(0, 2).map((topic, index) => ({
    ...topic,
    state: index === 0 ? "new" as const : "unread" as const,
    firstUnreadPostId: `${topic.id}-post-${index + 1}`,
    latestPostId: `${topic.id}-post-3`,
    unreadCount: index === 0 ? 3 : 2,
    activityAt: new Date(index === 0 ? "2026-09-30T16:00:00.000Z" : "2026-09-30T14:00:00.000Z"),
  }));
}

function previewSearchResults(locale: PreviewLocale) {
  const rtl = locale === "he";
  const russian = locale === "ru";
  const titleDirection = localeRegistry.find(locale)?.locale.direction ?? ("auto" as const);
  return [
    {
      id: "typed-api",
      sourceLocale: locale,
      titleDirection,
      title: rtl ? "איך כדאי לבנות לקוח API עם טיפוסים?" : russian ? "Как лучше построить типизированный API-клиент?" : "How should I structure a typed API client?",
      authorName: rtl ? "אלכס ריברה" : "Alex Rivera",
      postCount: 3,
      activityAt: new Date("2026-09-30T15:42:00.000Z"),
      category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
      section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "api", name: "API" }],
    },
    {
      id: "rtl-markdown",
      sourceLocale: locale,
      titleDirection,
      title: rtl ? "תוכן RTL מעורב עם בלוקי קוד" : russian ? "Смешанный RTL-контент с блоками кода" : "Mixed RTL content with code blocks",
      authorName: rtl ? "נועה לוי" : "Noa Levi",
      postCount: 4,
      activityAt: new Date("2026-09-30T12:05:00.000Z"),
      category: { id: "development", name: rtl ? "פיתוח" : russian ? "Разработка" : "Development" },
      section: { id: "typescript", name: rtl ? "TypeScript וארכיטקטורה" : russian ? "TypeScript и архитектура" : "TypeScript & architecture" },
      tags: [{ key: "typescript", name: "TypeScript" }, { key: "rtl", name: "RTL" }],
    },
  ];
}

const previewTagDefinitions = [
  { key: "typescript", name: "TypeScript" },
  { key: "cloudflare", name: "Cloudflare" },
  { key: "postgresql", name: "PostgreSQL" },
  { key: "rtl", name: "RTL" },
] as const;

function previewTagTopics(locale: PreviewLocale) {
  const primarySection = previewSection(locale, sectionId);
  const regularTopics = primarySection.topics.map((topic) => ({
    id: topic.id,
    title: topic.title.originalContent,
    authorName: topic.authorName,
    postCount: topic.postCount,
    createdAt: topic.createdAt,
    category: primarySection.category,
    section: { id: primarySection.id, name: primarySection.name },
    tags: topic.tags,
  }));

  const help = previewHelpSolutions(locale);
  const helpTopics = help.questions.map((question) => ({
    id: question.id,
    title: question.title,
    authorName: question.authorName,
    postCount: question.replyCount + 1,
    createdAt: new Date(question.createdAt),
    category: { id: HELP_SOLUTIONS_CATEGORY_ID, name: help.name },
    section: { id: HELP_SOLUTIONS_SERVICE_SECTION_ID, name: "Questions" },
    tags: question.tags,
  }));

  return [...regularTopics, ...helpTopics];
}

function previewTags(locale: PreviewLocale) {
  const topics = previewTagTopics(locale);
  return previewTagDefinitions.map((tag) => ({
    ...tag,
    topicCount: topics.filter((topic) => topic.tags.some((candidate) => candidate.key === tag.key)).length,
  }));
}

function previewTagPage(locale: PreviewLocale, tagKey: string | undefined) {
  const tag = previewTagDefinitions.find((candidate) => candidate.key === tagKey);
  if (!tag) return null;
  return {
    tag,
    topics: previewTagTopics(locale).filter((topic) =>
      topic.tags.some((candidate) => candidate.key === tag.key)
    ),
  };
}

function previewTagData(locale: PreviewLocale, tagKey: string | undefined) {
  const page = previewTagPage(locale, tagKey);
  if (!page) throw new Response("Not Found", { status: 404 });
  return page;
}

function PreviewTagRoute({ scenario }: { scenario: Scenario }) {
  const page = useLoaderData() as NonNullable<ReturnType<typeof previewTagPage>>;
  return <TagView locale={scenario.locale} page={page} />;
}

function previewTopicWatchKey(actorId: string, routeTopicId: string) {
  return JSON.stringify([actorId, routeTopicId]);
}

function previewTopicWatchProps(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId: string,
) {
  const actor = previewUser(scenario);
  if (!actor) return { watchActorId: null, topicWatchState: null };
  return {
    watchActorId: actor.id,
    topicWatchState: interactions.topicWatches.has(previewTopicWatchKey(actor.id, routeTopicId))
      ? "on" as const
      : "off" as const,
  };
}

function previewTopicBookmarkKey(actorId: string, routeTopicId: string) {
  return JSON.stringify([actorId, routeTopicId]);
}

function previewTopicBookmarkProps(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId: string,
) {
  const actor = previewUser(scenario);
  if (!actor) return { bookmarkActorId: null, topicBookmarkState: null };
  return {
    bookmarkActorId: actor.id,
    topicBookmarkState: interactions.topicBookmarks.has(previewTopicBookmarkKey(actor.id, routeTopicId))
      ? "on" as const
      : "off" as const,
  };
}

function previewTopicMuteKey(actorId: string, routeTopicId: string) {
  return JSON.stringify([actorId, routeTopicId]);
}

function previewTopicMuteProps(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId: string,
) {
  const actor = previewUser(scenario);
  if (!actor) return { muteActorId: null, topicMuteState: null };
  return {
    muteActorId: actor.id,
    topicMuteState: interactions.topicMutes.has(previewTopicMuteKey(actor.id, routeTopicId))
      ? "on" as const
      : "off" as const,
  };
}

function previewUserBlockKey(actorId: string, targetId: string) {
  return JSON.stringify([actorId, targetId]);
}

function previewUserBlockProps(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  targetId: string,
) {
  const actor = previewUser(scenario);
  if (!actor || actor.id === targetId) return { blockActorId: actor?.id ?? null, blockState: null };
  return {
    blockActorId: actor.id,
    blockState: interactions.userBlocks.has(previewUserBlockKey(actor.id, targetId))
      ? "on" as const
      : "off" as const,
  };
}

function previewTopicBlockProps(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  return {
    blockedActorId: actor?.id ?? null,
    blockedAuthorIds: actor
      ? previewInteractionPairs(interactions.userBlocks, actor.id)
      : [],
  };
}

function previewUser(scenario: Scenario): HeaderAuthUser | null {
  if (scenario.identity === "guest") return null;
  const unreadNotificationCount = scenario.variant === "notifications-empty"
    ? 0
    : scenario.identity === "user"
      ? 3
      : 2;
  if (scenario.identity === "owner") {
    return { id: "owner", name: "Forum Owner", canManageAuthorization: true, canViewAdminPanel: true, unreadNotificationCount };
  }
  if (scenario.identity === "manager") {
    return { id: "maya", name: "Maya Cohen", canManageAuthorization: true, canViewModerationAttention: true, unreadNotificationCount };
  }
  return { id: "alex", name: "Alex Rivera", unreadNotificationCount };
}

function previewMentionResponse(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  input: RequestInfo | URL,
): Response | null {
  const rawUrl = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  const url = new URL(rawUrl, window.location.origin);
  if (url.pathname !== `/${encodeURIComponent(scenario.locale)}/mentions`) return null;

  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  };
  if (!previewUser(scenario)) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });
  }

  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length > 64) {
    return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers });
  }
  const foldedQuery = query.toLocaleLowerCase();
  const users = !query ? [] : Object.entries(previewProfileNames)
    .filter(([id, name]) =>
      !interactions.ownerDeactivations.has(id)
      && name.toLocaleLowerCase().includes(foldedQuery))
    .sort(([leftId, leftName], [rightId, rightName]) =>
      leftName.localeCompare(rightName) || leftId.localeCompare(rightId))
    .slice(0, 8)
    .map(([id, name]) => ({ id, name }));
  return new Response(JSON.stringify({ users }), { status: 200, headers });
}

function previewOwnerDeactivationResponse(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  input: RequestInfo | URL,
  init?: RequestInit,
): Response | null {
  const rawUrl = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  const url = new URL(rawUrl, window.location.origin);
  const prefix = `/${encodeURIComponent(scenario.locale)}/users/`;
  const suffix = "/owner/deactivate";
  if (!url.pathname.startsWith(prefix) || !url.pathname.endsWith(suffix)) return null;

  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  };
  const actor = previewUser(scenario);
  if (!actor) return new Response("Unauthenticated", { status: 401, headers });
  if (scenario.identity !== "owner") return new Response("Forbidden", { status: 403, headers });

  const encodedTargetId = url.pathname.slice(prefix.length, -suffix.length);
  let targetId: string;
  try {
    targetId = decodeURIComponent(encodedTargetId);
  } catch {
    return new Response("Invalid request", { status: 400, headers });
  }
  if (!targetId || !previewProfileNames[targetId]) {
    return new Response("Not Found", { status: 404, headers });
  }

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });
  const contentType = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    .get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
    return new Response("Invalid request", { status: 400, headers });
  }

  const body = init?.body;
  const form = body instanceof URLSearchParams
    ? body
    : typeof body === "string"
      ? new URLSearchParams(body)
      : null;
  if (!form) return new Response("Invalid request", { status: 400, headers });

  const operationId = form.get("operationId")?.trim() ?? "";
  const expectedActorId = form.get("expectedActorId")?.trim() ?? "";
  const submittedTargetId = form.get("targetUserId")?.trim() ?? "";
  if (form.get("intent") !== "deactivate" || !operationId || submittedTargetId !== targetId) {
    return new Response("Invalid request", { status: 400, headers });
  }
  if (expectedActorId !== actor.id) return new Response("Conflict", { status: 409, headers });
  if (targetId === actor.id) return new Response("Forbidden", { status: 403, headers });

  const existing = interactions.ownerDeactivations.get(targetId);
  const record = existing ?? {
    deactivatedAt: "2026-11-20T10:00:00.000Z",
    retainAtLeastUntil: "2027-11-20T10:00:00.000Z",
    eventId: `preview-account-deactivated-${targetId}`,
  };
  if (!existing) {
    interactions.ownerDeactivations.set(targetId, record);
    interactions.sequence += 1;
  }
  return Response.json({
    targetUserId: targetId,
    state: "deactivated",
    changed: !existing,
    deactivatedAt: record.deactivatedAt,
    retainAtLeastUntil: record.retainAtLeastUntil,
    eventId: record.eventId,
  }, { headers });
}

function previewNotifications(scenario: Scenario) {
  const { locale } = scenario;
  const russian = locale === "ru";
  const hebrew = locale === "he";
  const participant = previewUser(scenario)?.id === PREVIEW_COMPLAINT_RESULT_PARTICIPANT_ID;
  return [
    {
      id: "notification-1",
      kind: "mention" as const,
      actorName: hebrew ? "מאיה כהן" : "Maya Cohen",
      topicId: "typed-api",
      topicTitle: hebrew
        ? "איך כדאי לבנות לקוח API עם טיפוסים?"
        : russian
          ? "Как лучше построить типизированный API-клиент?"
          : "How should I structure a typed API client?",
      postId: "followup",
      createdAt: "2026-10-03T18:42:00.000Z",
      readAt: null,
    },
    {
      id: "notification-2",
      kind: "reply" as const,
      actorName: hebrew ? "סם צ'ן" : "Sam Chen",
      topicId: "worker-auth",
      topicTitle: hebrew
        ? "Worker auth: session boundary מול permissions"
        : russian
          ? "Worker auth: граница сессии и permissions"
          : "Worker auth: session boundary vs permissions",
      postId: "worker-auth-post-3",
      createdAt: "2026-10-03T16:15:00.000Z",
      readAt: null,
    },
    ...(participant ? [{
      id: "notification-complaint-decision",
      kind: "complaint-decision" as const,
      actorName: null,
      topicId: null,
      topicTitle: null,
      postId: null,
      caseId: PREVIEW_COMPLAINT_RESULT_CASE_ID,
      createdAt: "2026-11-18T20:31:00.000Z",
      readAt: null,
    }, {
      id: "notification-complaint-appeal-result",
      kind: "complaint-appeal-result" as const,
      actorName: null,
      topicId: null,
      topicTitle: null,
      postId: null,
      caseId: PREVIEW_COMPLAINT_RESULT_CASE_ID,
      appealId: PREVIEW_COMPLAINT_RESULT_RESOLVED_APPEAL_ID,
      createdAt: "2026-11-18T21:21:00.000Z",
      readAt: "2026-11-18T21:22:00.000Z",
    }] : []),
    {
      id: "notification-3",
      kind: "reply" as const,
      actorName: hebrew ? "נועה לוי" : "Noa Levi",
      topicId: "rtl-markdown",
      topicTitle: hebrew
        ? "תוכן RTL מעורב עם בלוקי קוד"
        : russian
          ? "Смешанный RTL-контент с блоками кода"
          : "Mixed RTL content with code blocks",
      postId: "rtl-markdown-post-2",
      createdAt: "2026-10-02T12:30:00.000Z",
      readAt: "2026-10-02T13:10:00.000Z",
    },
  ];
}

export function PreviewController() {
  const [identity, setIdentity] = useState<PreviewIdentity>("guest");
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const availableScenarios = scenarios.filter((scenario) => supportsPreviewIdentity(scenario, identity));
  const selected = availableScenarios.find((scenario) => scenario.id === scenarioId) ?? availableScenarios[0]!;

  const selectIdentity = (nextIdentity: PreviewIdentity) => {
    const nextScenarios = scenarios.filter((scenario) => supportsPreviewIdentity(scenario, nextIdentity));
    setIdentity(nextIdentity);
    if (!nextScenarios.some((scenario) => scenario.id === scenarioId)) {
      setScenarioId(nextScenarios[0]!.id);
    }
  };

  const src = `?embed=1&scenario=${encodeURIComponent(selected.id)}&identity=${encodeURIComponent(identity)}&build=${encodeURIComponent(previewBuildKey)}`;

  return (
    <main className="preview-controller">
      <header className="preview-toolbar">
        <div>
          <p className="preview-eyebrow">Vico Forum</p>
          <h1>Forum preview</h1>
          <p>Supported actions work locally with representative data. Preview data resets when the state or page is restarted.</p>
        </div>
        <div className="preview-controls">
          <div className="preview-state-controls">
            <fieldset className="preview-role-controls">
              <legend>Role</legend>
              {previewIdentities.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={identity === candidate}
                  onClick={() => selectIdentity(candidate)}
                >
                  {candidate === "guest" ? "Guest" : candidate === "user" ? "User" : candidate === "manager" ? "Manager" : "Owner"}
                </button>
              ))}
            </fieldset>
            <label>
              State
              <select value={selected.id} onChange={(event) => setScenarioId(event.target.value)}>
                {availableScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="preview-viewport-controls">
            <legend>Viewport</legend>
            <button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Desktop</button>
            <button type="button" aria-pressed={viewport === "tablet"} onClick={() => setViewport("tablet")}>Tablet</button>
            <button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Mobile</button>
          </fieldset>
        </div>
      </header>
      <section className="preview-frame-wrap" data-viewport={viewport}>
        <iframe
          key={`${selected.id}-${identity}-${viewport}`}
          className="preview-frame"
          title={`${selected.label} · ${identity}`}
          src={src}
        />
      </section>
    </main>
  );
}

export function EmbeddedPreview({ scenarioId, identity }: { scenarioId: string; identity?: PreviewIdentity }) {
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0]!;
  const activeIdentity = identity && supportsPreviewIdentity(scenario, identity) ? identity : scenario.identity;
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(initialPreviewLocale);
  const [previewPath, setPreviewPath] = useState(scenario.path);
  useEffect(() => {
    setPreviewPath(scenario.path);
  }, [scenario.id, scenario.path]);
  const activeScenario = useMemo(
    () => scenarioForLocale({ ...scenario, identity: activeIdentity, path: previewPath }, previewLocale),
    [scenario, activeIdentity, previewLocale, previewPath],
  );
  const runtime = useMemo(
    () => previewTranslationRuntime(activeScenario.locale, activeScenario.direction),
    [activeScenario.locale, activeScenario.direction],
  );
  const interactions = useMemo(
    () => createPreviewInteractionState(),
    [scenario.id, activeIdentity],
  );
  const changePreviewLocale = useCallback((locale: PreviewLocale, nextPath?: string) => {
    if (nextPath) setPreviewPath(nextPath);
    setPreviewLocale(locale);
    try {
      window.sessionStorage.setItem(PREVIEW_LOCALE_STORAGE_KEY, locale);
    } catch {
      // Preview storage is optional; the active iframe still switches immediately.
    }
  }, []);
  const router = useMemo(
    () => previewRouter(activeScenario, interactions, changePreviewLocale),
    [activeScenario, interactions, changePreviewLocale],
  );

  useEffect(() => {
    const originalFetch = globalThis.fetch;
    const previewFetch: typeof fetch = (input, init) => {
      const mentionResponse = previewMentionResponse(activeScenario, interactions, input);
      if (mentionResponse) return Promise.resolve(mentionResponse);
      const deactivationResponse = previewOwnerDeactivationResponse(
        activeScenario, interactions, input, init,
      );
      if (deactivationResponse) return Promise.resolve(deactivationResponse);
      return originalFetch(input, init);
    };
    globalThis.fetch = previewFetch;
    return () => {
      if (globalThis.fetch === previewFetch) globalThis.fetch = originalFetch;
    };
  }, [activeScenario, interactions]);

  useEffect(() => {
    document.documentElement.lang = activeScenario.locale;
    document.documentElement.dir = activeScenario.direction;

    const stopMutation = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = (form.getAttribute("method") ?? "get").toLowerCase();
      if (method === "get") return;
      const submitter = event instanceof SubmitEvent ? event.submitter : null;
      const submitterIntent = submitter instanceof HTMLButtonElement && submitter.name === "intent"
        ? submitter.value
        : null;
      const intent = submitterIntent ?? String(new FormData(form).get("intent") ?? "");
      const allowed =
        (intent === "editPost" && form.classList.contains("topic-post-edit-form"))
        || (intent === "createTopic" && form.classList.contains("section-create-form"))
        || (intent === "reply" && form.classList.contains("topic-reply-form"))
        || (intent === "editTopicTitle" && Boolean(form.closest(".topic-title-editor")))
        || (intent === "setTopicWatch" && Boolean(form.closest(".topic-watch-control")))
        || (intent === "setTopicBookmark"
          && (Boolean(form.closest(".topic-bookmark-control")) || Boolean(form.closest(".bookmarks-row-actions"))))
        || (intent === "setTopicMute"
          && (Boolean(form.closest(".personal-filter-control")) || Boolean(form.closest(".bookmarks-row-actions"))))
        || (intent === "setUserBlock"
          && (Boolean(form.closest(".personal-filter-control")) || Boolean(form.closest(".bookmarks-row-actions"))))
        || (intent === "selectBestAnswer"
          && (form.classList.contains("topic-best-answer-form") || form.classList.contains("topic-admin-form")))
        || (intent === "markSolved"
          && (Boolean(form.closest(".topic-shell")) || form.classList.contains("topic-admin-form")))
        || ((intent === "pinTopic"
          || intent === "unpinTopic"
          || intent === "closeTopic"
          || intent === "reopenTopic")
          && form.classList.contains("topic-admin-form"))
        || ((intent === "correctTitleSourceLocale" || intent === "correctPostSourceLocale")
          && form.classList.contains("source-locale-form"))
        || (["createRole", "renameRole", "roleGrants", "deleteRole"].includes(intent)
          && Boolean(form.closest(".admin-workspace")))
        || ((intent === "assignRole" || intent === "override")
          && (Boolean(form.closest(".admin-workspace")) || Boolean(form.closest("#authorization"))))
        || ((intent === "createHelpQuestion" || intent === "checkSimilarHelpQuestions")
          && form.id === "help-question-create-form")
        || (!intent && form.classList.contains("complaint-form"))
        || (intent === "save-profile" && form.classList.contains("profile-form"))
        || (intent === "deactivate" && form.classList.contains("owner-deactivation-form"))
        || (intent === "open" && form.classList.contains("notification-form"))
        || (intent === "save-locale" && form.classList.contains("settings-locale-form"))
        || (intent === "save-online-visibility" && form.classList.contains("settings-privacy-form"))
        || (!intent && form.classList.contains("settings-registration-form"))
        || (!intent && form.classList.contains("complaint-priority-form"))
        || (intent === "change-password" && form.classList.contains("settings-account-form"))
        || (intent === "revoke-one" && form.classList.contains("settings-account-revoke-form"))
        || (intent === "revoke-others" && form.classList.contains("settings-account-revoke-all"))
        || ((intent === "pinTopic"
          || intent === "unpinTopic"
          || intent === "closeTopic"
          || intent === "reopenTopic"
          || intent === "selectBestAnswer"
          || intent === "markSolved"
          || intent === "correctTitleSourceLocale")
          && form.classList.contains("topic-admin-form"))
        || (intent === "correctPostSourceLocale" && form.classList.contains("source-locale-form"))
        || ((intent === "acceptHelpSignal"
          || intent === "rejectHelpSignal"
          || intent === "acceptHelpDuplicateAppeal"
          || intent === "rejectHelpDuplicateAppeal")
          && form.classList.contains("attention-case-actions"))
        || ((intent === "note" || intent === "decision")
          && Boolean(form.closest(".complaint-review")))
        || (intent === "resolve" && Boolean(form.closest(".complaint-review")))
        || ((intent === "create" || intent === "change" || intent === "lift" || intent === "review")
          && form.classList.contains("profile-form")
          && Boolean(form.closest(".admin-forum")))
        || (intent === "appeal" && Boolean(form.closest(".complaint-review")))
        || (intent === "appeal"
          && form.classList.contains("profile-form")
          && Boolean(form.closest(".profile-card")));
      if (allowed) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const stopAuth = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const blockedAuth = target?.closest(".auth-controls button");
      const blockedGoogleLink = target?.closest(".auth-google-link")
        && !target.closest(".settings-account");
      if (blockedAuth || blockedGoogleLink) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("submit", stopMutation, true);
    document.addEventListener("click", stopAuth, true);
    return () => {
      document.removeEventListener("submit", stopMutation, true);
      document.removeEventListener("click", stopAuth, true);
    };
  }, [activeScenario.locale, activeScenario.direction]);

  return (
    <LocaleNavigationProvider
      locales={previewLocaleOptions}
      onLocaleChange={(locale) => {
        if (!isPreviewLocale(locale)) return;
        changePreviewLocale(locale);
      }}
    >
      <HeaderAuthProvider
        initialUser={previewUser(activeScenario)}
        initialPresentationState={activeScenario.authPresentationState}
      >
        <I18nextProvider i18n={runtime}>
          <RouterProvider router={router} />
        </I18nextProvider>
      </HeaderAuthProvider>
    </LocaleNavigationProvider>
  );
}

const previewEmailActions: EmailAuthActions = {
  signInWithEmail: async () => false,
  signUpWithEmail: async () => false,
};
const previewGoogleActions: AuthClientActions = {
  signInWithGoogle: async () => undefined,
  signOut: async () => undefined,
};

function PreviewCredentialRoute({ scenario, interactions, mode }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
  mode: "sign-in" | "sign-up";
}) {
  const { returnTo } = useLoaderData() as { returnTo: string };
  return <CredentialView locale={scenario.locale} mode={mode} returnTo={returnTo}
    registrationFlags={mode === "sign-up" ? {
      googleRegistrationEnabled: interactions.registrationGoogleEnabled,
      emailRegistrationEnabled: interactions.registrationEmailEnabled,
    } : undefined}
    emailActions={previewEmailActions} googleActions={previewGoogleActions} />;
}


type PreviewOwnerOverview = Parameters<typeof SuperAdminOverview>[0]["state"];

function previewSuperAdminAccessData(scenario: Scenario) {
  const actor = previewUser(scenario);
  if (!actor) throw new Response("Unauthenticated", { status: 401 });
  if (scenario.identity !== "owner") throw new Response("Forbidden", { status: 403 });
  return actor;
}

function previewSuperAdminOverviewState(): PreviewOwnerOverview {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const source = (id: string) => [{
    id,
    connection: "application" as const,
    status: "measured" as const,
    observedAt,
    code: "none" as const,
  }];

  return {
    terminalCoverage: { status: "measured", observedAt, values: {} },
    areas: [
      {
        area: "system",
        status: "measured",
        sources: source("preview-system"),
        figures: [{ monitorKey: "system.runtime", field: "state", value: "serving" }],
      },
      {
        area: "accounts",
        status: "measured",
        sources: source("preview-accounts"),
        figures: [{ monitorKey: "accounts.users", field: "total", value: "128" }],
      },
      {
        area: "security",
        status: "measured",
        sources: source("preview-security"),
        figures: [{ monitorKey: "security.auth", field: "attributedAttempts", value: "12" }],
      },
      {
        area: "forum",
        status: "measured",
        sources: source("preview-forum"),
        figures: [{ monitorKey: "forum.structure", field: "topics", value: "84" }],
      },
      { area: "administration", status: "measured", sources: source("preview-administration"), figures: [] },
      { area: "moderation", status: "measured", sources: source("preview-moderation"), figures: [] },
      { area: "notifications", status: "measured", sources: source("preview-notifications"), figures: [] },
      { area: "background", status: "measured", sources: source("preview-background"), figures: [] },
      { area: "files", status: "measured", sources: source("preview-files"), figures: [] },
      { area: "integrations", status: "partial", sources: source("preview-integrations"), figures: [] },
      { area: "localization", status: "measured", sources: source("preview-localization"), figures: [] },
      { area: "data", status: "measured", sources: source("preview-data"), figures: [] },
      { area: "infrastructure", status: "placeholder", sources: [], figures: [] },
    ],
    recent: { entries: [], next: null, coverage: [] },
    recentUnavailable: false,
    samples: [],
    sampleCoverageUnavailable: false,
    recording: "available",
    readStatements: 13,
  };
}

function PreviewSuperAdminOverviewRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewOwnerOverview;
    viewerId: string;
  };
  return <SuperAdminOverview locale={locale} state={state} viewerId={viewerId} />;
}

function PreviewSuperAdminMonitoringRoute() {
  const { locale } = useLoaderData() as { locale: string };
  return <SuperAdminMonitoringIndex locale={locale} />;
}

type PreviewSystemOverview = Parameters<typeof SystemMonitorCards>[0]["system"];
type PreviewSa02State = Parameters<typeof SuperAdminSa02Current>[0]["state"];

function previewSystemState(): PreviewSystemOverview {
  const observedAt = "2026-11-18T14:20:00.000Z";
  return {
    observedAt,
    recording: "available",
    monitors: [
      {
        key: "system.runtime",
        quality: "measured",
        source: "application",
        values: { component: "worker", state: "serving", build: "preview" },
        coverageFrom: "2026-11-01T09:00:00.000Z",
        lastObservedAt: observedAt,
      },
      {
        key: "system.dependencies",
        quality: "measured",
        source: "database",
        values: { component: "postgresql", state: "available", version: "17.6" },
        coverageFrom: "2026-11-01T09:00:00.000Z",
        lastObservedAt: observedAt,
      },
      {
        key: "system.requests",
        quality: "measured",
        source: "application",
        values: { component: "failed-responses-only", count: 2, state: "limited-coverage" },
        coverageFrom: "2026-11-10T12:00:00.000Z",
        lastObservedAt: observedAt,
      },
    ],
  };
}

function previewSa02State(area: "accounts" | "security"): PreviewSa02State {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const common = {
    source: "database" as const,
    quality: "measured" as const,
    coverageFrom: "2026-11-01T09:00:00.000Z",
    lastObservedAt: observedAt,
  };
  return {
    observedAt,
    recording: "available",
    monitors: area === "accounts" ? [
      {
        ...common,
        key: "accounts.users",
        values: { total: "128", created24h: "4", activeUsers: "125", deactivatedUsers: "3", retentionPendingUsers: "2" },
      },
      {
        ...common,
        key: "accounts.methods",
        values: { passwordUsers: "91", googleUsers: "64", bothUsers: "27" },
      },
      {
        ...common,
        key: "accounts.sessions",
        values: { active: "142", expiredRetained: "18" },
      },
      {
        ...common,
        key: "accounts.registration",
        values: {
          googleEnabled: true,
          emailEnabled: true,
          version: 3,
          updatedAt: "2026-11-17T16:30:00.000Z",
        },
      },
    ] : [
      {
        ...common,
        key: "security.auth",
        values: {
          attributedAttempts: "37",
          rateLimitedAttempts: "2",
          retainedPatterns: "14",
          unknownAttempts: "1",
          overflowAttempts: "0",
          gapAttempts: "0",
          lastSeenAt: "2026-11-18T14:18:00.000Z",
          currentHourAuthenticatedUsed: "8",
          currentHourAnonymousUsed: "11",
          hourlyCapacityPerPool: 500,
        },
      },
      {
        ...common,
        key: "security.access",
        values: {
          attributedAttempts: "21",
          rateLimitedAttempts: "1",
          retainedPatterns: "9",
          unknownAttempts: "0",
          overflowAttempts: "0",
          gapAttempts: "0",
          lastSeenAt: "2026-11-18T14:17:00.000Z",
          currentHourAuthenticatedUsed: "5",
          currentHourAnonymousUsed: "3",
          hourlyCapacityPerPool: 500,
        },
      },
      {
        ...common,
        key: "security.attachments",
        values: { total: "6", evidence24h: "1", lastEventAt: "2026-11-18T13:40:00.000Z" },
      },
    ],
  };
}

function PreviewSuperAdminSystemRoute() {
  const { locale, system } = useLoaderData() as { locale: string; system: PreviewSystemOverview };
  const { t } = useTranslation("common");
  return <SuperAdminShell locale={locale} current="monitoring">
    <section className="admin-overview" aria-labelledby="super-admin-system-heading">
      <h2 id="super-admin-system-heading">{t("superAdminSystem")}</h2>
      <p>{t("superAdminSystemCoverage")}</p>
      <SystemMonitorCards locale={locale} system={system} />
      <p><Link to={superAdminMonitoringPath(locale)}>{t("superAdminMonitoring")}</Link></p>
    </section>
  </SuperAdminShell>;
}

function PreviewSuperAdminSa02Route({ area }: { area: "accounts" | "security" }) {
  const { locale, state } = useLoaderData() as {
    locale: string;
    state: PreviewSa02State;
  };
  return <SuperAdminSa02Current locale={locale} area={area} state={state} />;
}

type PreviewTaskState = Parameters<typeof SuperAdminBackground>[0]["state"];
type PreviewLocalizationState = Parameters<typeof SuperAdminLocalization>[0]["state"];
type PreviewIntegrationsState = Parameters<typeof SuperAdminIntegrations>[0]["state"];

function previewTaskState(): PreviewTaskState {
  return {
    monitorKey: "background.translation",
    schemaVersion: 1,
    source: "database",
    quality: "measured",
    observedAt: "2026-11-18T14:20:00.000Z",
    values: {
      pending: "7",
      processing: "2",
      stale: "1",
      completed: "184",
      failed: "3",
      runtimeWired: false,
      runtimeEnabled: false,
      bestEffort: true,
    },
    recording: "available",
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  };
}

function previewLocalizationState(): PreviewLocalizationState {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const monitor = (
    key: PreviewLocalizationState["monitors"][number]["key"],
    source: PreviewLocalizationState["monitors"][number]["source"],
    values: PreviewLocalizationState["monitors"][number]["values"],
  ): PreviewLocalizationState["monitors"][number] => ({
    key,
    schemaVersion: 1,
    source,
    quality: "measured",
    observedAt,
    values,
    recording: "available",
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  });
  return {
    monitors: [
      monitor("localization.registry", "localization-database", {
        configuredLocales: "3",
        activeLocales: "3",
        registryHealthy: true,
        defaultEnglishValid: true,
        sourceStructuralValid: true,
      }),
      monitor("localization.ui", "localization-database", {
        shippedKeys: "412",
        targetLocales: "2",
        bundlesCurrent: "4",
        bundlesMissing: "0",
        machinePolicyConfigured: false,
      }),
      monitor("localization.content", "web-database", {
        titleRevisions: "84",
        bodyRevisions: "326",
        eligiblePairs: "601",
        currentManual: "7",
        currentMachine: "204",
        missingPairs: "390",
      }),
      monitor("localization.budget", "web-database", {
        budgetCounters: "4",
        usedUnits: "1260",
        activeUsedUnits: "1260",
        expiredUsedUnits: "0",
        limitsConfigured: false,
      }),
    ],
    locales: [
      { tag: "en", direction: "ltr", translationStatus: "source" },
      { tag: "ru", direction: "ltr", translationStatus: "active" },
      { tag: "he", direction: "rtl", translationStatus: "active" },
    ],
    bundles: [],
    budgetWindows: [],
  };
}

function previewIntegrationsState(): PreviewIntegrationsState {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const monitor = (
    key: PreviewIntegrationsState["monitors"][number]["key"],
    values: PreviewIntegrationsState["monitors"][number]["values"],
  ): PreviewIntegrationsState["monitors"][number] => ({
    key,
    schemaVersion: 1,
    source: "application",
    quality: "measured",
    observedAt,
    values,
    recording: "available",
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  });
  return {
    monitors: [
      monitor("integrations.database", {
        webBindingPresent: true,
        localizationBindingPresent: true,
        webRoutingRole: "vico_forum_web",
        localizationRoutingRole: "localization-runtime",
      }),
      monitor("integrations.authentication", {
        googleParametersPresent: false,
        googleCallbackCoverageMeasured: false,
        googleLinkedUsers: "64",
        googleRegistrationEnabled: true,
        emailRegistrationEnabled: true,
      }),
      monitor("integrations.storage", {
        bucketBound: false,
        fixedSampleSlots: "0",
        recordingBestEffort: true,
      }),
      monitor("integrations.translation", {
        generationEnabled: false,
        generationAdmissionWired: true,
        providerWired: false,
        enqueuerWired: false,
        consumerWired: false,
      }),
    ],
    database: {
      observedAt,
      source: "existing-system-dependency-reader",
      quality: "measured",
      values: { component: "postgresql", state: "available", version: "17.6" },
      recording: "available",
      retainedSample: null,
    },
    requiredLocalizationRead: null,
    authentication: {
      source: "database",
      observedAt,
      values: {
        googleLinkedUsers: "64",
        genericSessionProviderKnown: true,
        registrationVersion: 3,
      },
      googleMethodLink: null,
      genericSession: null,
    },
    storageSamples: [],
    translation: {
      taskOutcome: null,
      providerExecution: null,
    },
  };
}

function PreviewSuperAdminBackgroundRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewTaskState;
    viewerId: string;
  };
  return <SuperAdminBackground locale={locale} state={state} viewerId={viewerId} />;
}

function PreviewSuperAdminLocalizationRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewLocalizationState;
    viewerId: string;
  };
  return <SuperAdminLocalization locale={locale} state={state} viewerId={viewerId} />;
}

function PreviewSuperAdminIntegrationsRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewIntegrationsState;
    viewerId: string;
  };
  return <SuperAdminIntegrations locale={locale} state={state} viewerId={viewerId} />;
}

type PreviewDataState = Parameters<typeof SuperAdminData>[0]["state"];
type PreviewFilesState = Parameters<typeof SuperAdminFiles>[0]["state"];

function previewDataState(): PreviewDataState {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const check = (
    id: string,
    source: "web-database" | "localization-database",
    values: Record<string, string | number | boolean | null>,
  ) => ({
    id,
    source,
    observedAt,
    status: "compatible" as const,
    code: "none" as const,
    values,
  });
  const monitor = (
    key: PreviewDataState["monitors"][number]["key"],
    checks: PreviewDataState["monitors"][number]["checks"],
  ): PreviewDataState["monitors"][number] => ({
    key,
    schemaVersion: 1,
    source: "database",
    quality: "measured",
    observedAt,
    values: {
      checks: String(checks.length),
      successful: String(checks.length),
      incompatible: "0",
      unavailable: "0",
    },
    checks,
    recording: "available",
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  });
  return {
    monitors: [
      monitor("data.application", [
        check("counts.accounts", "web-database", { rows: "128" }),
        check("counts.forum", "web-database", { rows: "642" }),
        check("counts.localization", "localization-database", { rows: "37" }),
      ]),
      monitor("data.compatibility", [
        check("server", "web-database", {
          serverVersion: "17.6",
          requiredMajor: "17",
          supportedMajor: true,
        }),
        check("columnsChecked", "web-database", {
          columnsChecked: "42",
          mismatchedColumns: "0",
        }),
      ]),
      monitor("data.retention", [
        check("terminalCoverage", "web-database", {
          helpTerminalTime: true,
          mootTerminalTime: true,
          notificationReadTime: true,
          complaintTerminalTime: true,
        }),
        check("lifecycle", "web-database", {
          deactivated: "3",
          invalidTuple: "0",
        }),
      ]),
    ],
    compiledExpectedMigration: "0067_topic_title_edit_own",
    deployedMigration: "unchecked",
  };
}

function previewFilesState(): PreviewFilesState {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const common = {
    schemaVersion: 1 as const,
    source: "database" as const,
    quality: "measured" as const,
    observedAt,
    recording: "available" as const,
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  };
  return {
    monitors: [
      {
        ...common,
        key: "files.assets",
        values: {
          assets: "31",
          assetBytes: "8421376",
          activeAssets: "30",
          deletingAssets: "1",
          publishedAssets: "19",
          draftAssets: "7",
          evidenceAssets: "5",
          unreferencedAssets: "0",
        },
      },
      {
        ...common,
        key: "files.operations",
        values: {
          uploadJournal: "4",
          uploadPreparing: "1",
          uploadReady: "2",
          uploadClaimed: "1",
          oldestUploadAgeMs: "180000",
          draftOperationsActive: "3",
          draftOperationsStale: "1",
          draftRefsActive: "9",
          draftRefsStale: "2",
          retainedDraftContexts: "4",
          publicationReferences: "19",
          evidenceReferences: "5",
          recordingBestEffort: true,
        },
      },
      {
        ...common,
        key: "background.attachments",
        values: {
          cleanupClaims: "1",
          cleanupClaimsLive: "1",
          cleanupClaimsExpired: "0",
          eligibleUnreferenced: "0",
          deletingReferenced: "0",
          oldestCleanupClaimAgeMs: "42000",
          eligibleUploadJournal: "0",
          sweepCursorPresent: true,
          sweepClaimed: false,
          sweepClaimLive: false,
          sweepClaimExpired: false,
          sweepClaimAgeMs: null,
          codeAvailable: true,
          schedulerWired: false,
          schedulerEnabled: false,
          recordingBestEffort: true,
        },
      },
    ],
    storageSamples: [],
    bucketBound: false,
  };
}

function PreviewSuperAdminDataRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewDataState;
    viewerId: string;
  };
  return <SuperAdminData locale={locale} state={state} viewerId={viewerId} />;
}

function PreviewSuperAdminFilesRoute() {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewFilesState;
    viewerId: string;
  };
  return <SuperAdminFiles locale={locale} state={state} viewerId={viewerId} />;
}

type PreviewNativeState = Parameters<typeof SuperAdminNativeCurrent>[0]["state"];
type PreviewNativeArea = Parameters<typeof SuperAdminNativeCurrent>[0]["area"];

function previewNativeState(area: PreviewNativeArea): PreviewNativeState {
  const observedAt = "2026-11-18T14:20:00.000Z";
  const common = {
    schemaVersion: 1 as const,
    source: "database" as const,
    quality: "measured" as const,
    capability: "available" as const,
    enabled: true as const,
    recording: "available" as const,
    coverageFrom: "2026-11-02T08:00:00.000Z",
    lastObservedAt: "2026-11-18T14:15:00.000Z",
  };
  const monitors: Record<PreviewNativeArea, PreviewNativeState["monitors"]> = {
    forum: [
      {
        ...common,
        key: "forum.structure",
        values: { categories: "4", sections: "12", topics: "84", posts: "326", tags: "18", tagLinks: "147" },
      },
      {
        ...common,
        key: "forum.state",
        values: { openTopics: "76", closedTopics: "8", pins: "3", helpSolved: "11", helpBestAnswers: "9", activeDuplicates: "2" },
      },
      {
        ...common,
        key: "forum.content",
        values: {
          currentTitles: "84",
          currentBodies: "326",
          titleRevisions: "96",
          bodyRevisions: "391",
          titleRevisions24h: "5",
          bodyRevisions24h: "18",
          missingCurrentTitles: "0",
          missingCurrentBodies: "0",
        },
      },
      {
        ...common,
        key: "forum.presence",
        values: { visible: "12", staleRetained: "8", excludedRetained: "3" },
      },
    ],
    administration: [
      {
        ...common,
        key: "administration.authorization",
        values: {
          roles: "5",
          roleGrants: "42",
          assignments: "17",
          allowOverrides: "4",
          denyOverrides: "2",
          catalogPermissions: "31",
        },
      },
      {
        ...common,
        key: "administration.measures",
        values: {
          total: "14",
          active: "5",
          effective: "4",
          expired: "2",
          lifted: "7",
          appealsPending: "1",
          appealsAccepted: "2",
          appealsRejected: "1",
          appealsMoot: "0",
          mootTimeUnproven: "0",
        },
      },
      {
        ...common,
        key: "administration.registration",
        values: {
          googleEnabled: true,
          emailEnabled: true,
          version: 3,
          updatedAt: "2026-11-17T16:30:00.000Z",
        },
      },
    ],
    moderation: [
      {
        ...common,
        key: "moderation.help",
        values: {
          signals: "19",
          pending: "4",
          accepted: "8",
          rejected: "3",
          withdrawn: "2",
          superseded: "2",
          actionableSignals: "3",
          pendingDuplicateAppeals: "1",
          retainedDuplicateAppeals: "4",
          activeDuplicates: "2",
        },
      },
      {
        ...common,
        key: "moderation.complaints",
        values: {
          cases: "23",
          open: "6",
          resolved: "17",
          reports: "31",
          pendingAppeals: "2",
          liveReviewers: "2",
          expiredReviewers: "1",
          settingsVersion: 4,
          priority1: "1",
          priority2: "3",
          priority3: "2",
        },
      },
    ],
    notifications: [
      {
        ...common,
        key: "notifications.inbox",
        values: {
          total: "146",
          unread: "9",
          read: "137",
          notificationKind0: "88",
          notificationKind1: "31",
          notificationKind2: "18",
          notificationKind3: "9",
          oldestUnreadAt: "2026-11-17T09:40:00.000Z",
          oldestUnreadAgeSeconds: "103200",
          validTargets: "146",
          missingTargets: "0",
        },
      },
    ],
  };
  return { observedAt, recording: "available", monitors: monitors[area] };
}

function PreviewSuperAdminNativeRoute({ area }: { area: PreviewNativeArea }) {
  const { locale, state, viewerId } = useLoaderData() as {
    locale: string;
    state: PreviewNativeState;
    viewerId: string;
  };
  return <SuperAdminNativeCurrent locale={locale} area={area} state={state} viewerId={viewerId} />;
}

const previewEventAreas: HistoryFilterCatalog["areas"] = {
  system: ["system.runtime", "system.dependencies", "system.requests"],
  accounts: ["accounts.users", "accounts.methods", "accounts.sessions", "accounts.registration"],
  security: ["security.auth", "security.access", "security.attachments"],
  background: ["background.translation", "background.attachments"],
  localization: ["localization.registry", "localization.ui", "localization.content", "localization.budget"],
  integrations: ["integrations.database", "integrations.authentication", "integrations.translation", "integrations.storage"],
  data: ["data.application", "data.compatibility", "data.retention"],
  files: ["files.assets", "files.operations"],
  forum: ["forum.structure", "forum.state", "forum.content", "forum.presence"],
  administration: ["administration.authorization", "administration.measures", "administration.registration"],
  moderation: ["moderation.help", "moderation.complaints"],
  notifications: ["notifications.inbox"],
};

const previewEventChoices: HistoryFilterCatalog["scopes"]["*"] = [
  { origin: "system-event", kinds: ["system.requestFailed"] },
  { origin: "admin-history", kinds: ["settings.registrationChanged"] },
  { origin: "operational-event", kinds: ["task.reconciliationPass"] },
  { origin: "notification-created", kinds: ["notification.created"] },
];

function previewEventCatalog(): HistoryFilterCatalog {
  return {
    areas: previewEventAreas,
    scopes: {
      "*": previewEventChoices,
      "area:system": [{ origin: "system-event", kinds: ["system.requestFailed"] }],
      "monitor:system.requests": [{ origin: "system-event", kinds: ["system.requestFailed"] }],
      "area:administration": [{ origin: "admin-history", kinds: ["settings.registrationChanged"] }],
      "monitor:administration.registration": [{ origin: "admin-history", kinds: ["settings.registrationChanged"] }],
      "area:background": [{ origin: "operational-event", kinds: ["task.reconciliationPass"] }],
      "monitor:background.translation": [{ origin: "operational-event", kinds: ["task.reconciliationPass"] }],
      "area:notifications": [{ origin: "notification-created", kinds: ["notification.created"] }],
      "monitor:notifications.inbox": [{ origin: "notification-created", kinds: ["notification.created"] }],
    },
  };
}

const previewEventEntries: OwnerHistoryEntry[] = [
  {
    origin: "system-event",
    id: "preview-request-failure",
    occurredAt: "2026-11-18T14:18:00.000000Z",
    recordedAt: "2026-11-18T14:18:00.120000Z",
    monitorKeys: ["system.requests"],
    kind: "system.requestFailed",
    source: "system",
    quality: "best-effort",
    values: { operation: "GET /en/topics/typed-api", httpStatus: "503" },
  },
  {
    origin: "admin-history",
    id: "preview-registration-change",
    occurredAt: "2026-11-18T13:40:00.000000Z",
    recordedAt: "2026-11-18T13:40:00.090000Z",
    monitorKeys: ["accounts.registration", "administration.registration", "integrations.authentication"],
    kind: "settings.registrationChanged",
    source: "admin",
    quality: null,
    values: {
      actorUserId: "owner",
      beforeGoogleEnabled: true,
      afterGoogleEnabled: true,
      beforeEmailEnabled: false,
      afterEmailEnabled: true,
      beforeVersion: 2,
      afterVersion: 3,
    },
  },
  {
    origin: "operational-event",
    id: "preview-translation-reconciliation",
    occurredAt: "2026-11-18T12:10:00.000000Z",
    recordedAt: "2026-11-18T12:10:00.200000Z",
    monitorKeys: ["background.translation", "integrations.translation"],
    kind: "task.reconciliationPass",
    source: "operation",
    quality: "best-effort",
    values: { runId: "preview-reconciliation-01", count: "7" },
  },
  {
    origin: "notification-created",
    id: "preview-notification-created",
    occurredAt: "2026-11-18T11:25:00.000000Z",
    recordedAt: "2026-11-18T11:25:00.050000Z",
    monitorKeys: ["notifications.inbox"],
    kind: "notification.created",
    source: "forum_reply_notifications",
    quality: "measured",
    values: { notificationKind: "reply", topicId: "typed-api", postId: "typed-api-reply-2" },
  },
];

function previewEventFilters(request: Request): OwnerHistoryOptions {
  const params = new URL(request.url).searchParams;
  return {
    area: (params.get("area") ?? undefined) as OwnerHistoryOptions["area"],
    monitorKey: (params.get("monitor") ?? undefined) as OwnerHistoryOptions["monitorKey"],
    origin: (params.get("origin") ?? undefined) as OwnerHistoryOptions["origin"],
    kind: params.get("kind") ?? undefined,
    from: params.get("from") ?? undefined,
    until: params.get("until") ?? undefined,
  };
}

function previewSuperAdminEventsData(scenario: Scenario, request: Request) {
  const actor = previewSuperAdminAccessData(scenario);
  const filters = previewEventFilters(request);
  const entries = previewEventEntries.filter(entry => {
    if (filters.area && !entry.monitorKeys.some(key => key.startsWith(filters.area + "."))) return false;
    if (filters.monitorKey && !entry.monitorKeys.includes(filters.monitorKey)) return false;
    if (filters.origin && entry.origin !== filters.origin) return false;
    if (filters.kind && entry.kind !== filters.kind) return false;
    if (filters.from && entry.occurredAt < filters.from) return false;
    if (filters.until && entry.occurredAt >= filters.until) return false;
    return true;
  });
  return {
    locale: scenario.locale,
    viewerId: actor.id,
    filters,
    filterCatalog: previewEventCatalog(),
    page: { entries, next: null, coverage: [] },
  };
}

function PreviewSuperAdminEventsRoute() {
  const { locale, page, viewerId, filters, filterCatalog } = useLoaderData() as ReturnType<typeof previewSuperAdminEventsData>;
  const path = `/${locale}/super-admin/events`;
  return <SuperAdminShell locale={locale} current="events">
    <HistoryFilters key={JSON.stringify(filters)} path={path} filters={filters} catalog={filterCatalog} />
    <Timeline page={page} locale={locale} viewerId={viewerId} path={() => path} />
  </SuperAdminShell>;
}

function PreviewSuperAdminInfrastructureRoute() {
  const { locale } = useLoaderData() as { locale: string };
  const { t } = useTranslation("common");
  return <SuperAdminShell locale={locale} current="infrastructure">
    <section className="admin-overview" aria-labelledby="super-admin-infrastructure-heading">
      <h2 id="super-admin-infrastructure-heading">{t("superAdminInfrastructure")}</h2>
      <p className="super-admin-placeholder">{t("adminInDevelopment")} · {t("superAdminStage6")}</p>
      <p>{t("superAdminInfrastructureBoundary")}</p>
    </section>
  </SuperAdminShell>;
}

function previewMonitorHistoryData(
  scenario: Scenario,
  request: Request,
  area: string | undefined,
  monitorKey: string | undefined,
) {
  const actor = previewSuperAdminAccessData(scenario);
  const monitors = area ? previewEventAreas[area] : undefined;
  if (!area || !monitorKey || !monitors?.includes(monitorKey)) {
    throw new Response("Not Found", { status: 404 });
  }
  const monitor = monitorKey as NonNullable<OwnerHistoryOptions["monitorKey"]>;
  const filters = previewEventFilters(request);
  filters.area = area as NonNullable<OwnerHistoryOptions["area"]>;
  filters.monitorKey = monitor;
  const path = `/${scenario.locale}/super-admin/monitoring/${area}/${encodeURIComponent(monitorKey)}/history`;
  const observation: OwnerHistoryEntry = {
    origin: "system-observation",
    id: `preview-observation-${area}-${monitorKey}`,
    occurredAt: "2026-11-18T14:15:00.000000Z",
    recordedAt: "2026-11-18T14:15:00.080000Z",
    monitorKeys: [monitor],
    kind: "monitor.observed",
    source: "database",
    quality: "measured",
    values: { count: "1" },
  };
  const entries = [observation, ...previewEventEntries].filter(entry => {
    if (!entry.monitorKeys.includes(monitor)) return false;
    if (filters.origin && entry.origin !== filters.origin) return false;
    if (filters.kind && entry.kind !== filters.kind) return false;
    if (filters.from && entry.occurredAt < filters.from) return false;
    if (filters.until && entry.occurredAt >= filters.until) return false;
    return true;
  });
  const choices = [
    { origin: "system-observation" as const, kinds: ["monitor.observed"] },
    ...previewEventChoices.filter(choice =>
      previewEventEntries.some(entry =>
        entry.monitorKeys.includes(monitor) && entry.origin === choice.origin)),
  ];
  return {
    locale: scenario.locale,
    area: filters.area,
    monitorKey: monitor,
    viewerId: actor.id,
    filters,
    filterCatalog: {
      areas: previewEventAreas,
      scopes: { [`monitor:${monitorKey}`]: choices },
    } satisfies HistoryFilterCatalog,
    page: { entries, next: null, coverage: [] },
    path,
  };
}

function previewMonitorHistoryPath(
  path: string,
  filters: OwnerHistoryOptions,
  before?: string,
) {
  const params = new URLSearchParams();
  if (filters.origin) params.set("origin", filters.origin);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.from) params.set("from", filters.from);
  if (filters.until) params.set("until", filters.until);
  if (before) params.set("before", before);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function PreviewSuperAdminMonitorHistoryRoute() {
  const data = useLoaderData() as ReturnType<typeof previewMonitorHistoryData>;
  const { locale, area, monitorKey, page, viewerId, filters, filterCatalog, path } = data;
  const { t } = useTranslation("common");
  const routing = defaultAdministrativeRouting;
  const currentArea = ownerAreaPath(routing, locale, area);
  const currentAreaLabel = t(ownerAreaLabels[area]);
  return <SuperAdminShell locale={locale} current="monitoring">
    <p><Link to={currentArea}>{currentAreaLabel}</Link></p>
    <HistoryFilters
      key={JSON.stringify(filters)}
      path={path}
      filters={filters}
      catalog={filterCatalog}
      scoped
    />
    <Timeline
      page={page}
      locale={locale}
      viewerId={viewerId}
      path={before => previewMonitorHistoryPath(path, filters, before)}
    />
    <p data-monitor-history-key={monitorKey} hidden />
  </SuperAdminShell>;
}

function previewCredentialData(scenario: Scenario, request: Request) {
  const returnTo = credentialReturnPath(
    scenario.locale,
    new URL(request.url).searchParams.get("returnTo"),
  );
  if (previewUser(scenario)) throw redirect(returnTo);
  return { returnTo };
}

function previewRouter(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  onLocaleChange: (locale: PreviewLocale, nextPath?: string) => void,
) {
  if (scenario.view === "not-found") {
    return createMemoryRouter([{
      path: "*",
      loader: () => {
        if (scenario.variant === "route-401") {
          throw new Response("Unauthenticated", { status: 401 });
        }
        if (scenario.variant === "route-403") {
          throw new Response("Forbidden", { status: 403 });
        }
        if (scenario.variant === "route-503") {
          throw new Response("Unavailable", { status: 503 });
        }
        if (scenario.variant === "route-500") {
          throw new Error("Representative unexpected route failure");
        }
        throw new Response("Not Found", { status: 404 });
      },
      ErrorBoundary: ForumRouteError,
    }], { initialEntries: [scenario.path] });
  }

  return createMemoryRouter([
    {
      path: "/:locale",
      element: <PreviewHomeRoute scenario={scenario} interactions={interactions} />,
    },
    {
      path: "/:locale/sign-in",
      element: <PreviewCredentialRoute scenario={scenario} interactions={interactions} mode="sign-in" />,
      loader: ({ request }) => previewCredentialData(scenario, request),
    },
    {
      path: "/:locale/sign-up",
      element: <PreviewCredentialRoute scenario={scenario} interactions={interactions} mode="sign-up" />,
      loader: ({ request }) => previewCredentialData(scenario, request),
    },
    {
      path: "/:locale/attention",
      element: <PreviewAttentionRoute scenario={scenario} interactions={interactions} />,
      loader: () => previewAttentionAccessData(scenario),
      action: ({ request }) => previewAttentionAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/settings",
      element: <PreviewComplaintPrioritySettingsRoute />,
      loader: () => previewComplaintPrioritySettingsData(scenario, interactions),
      action: ({ request }) =>
        previewComplaintPrioritySettingsAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId",
      element: <PreviewComplaintTriageRoute />,
      loader: ({ params }) => {
        previewAttentionAccessData(scenario);
        if (params.caseId !== PREVIEW_COMPLAINT_CASE_ID || interactions.complaintDecision) {
          throw new Response("Not Found", { status: 404 });
        }
        return { locale: scenario.locale, item: previewComplaintTriage(interactions) };
      },
      action: ({ request, params }) =>
        previewComplaintTriageAction(scenario, interactions, request, params.caseId),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/complaints/:caseId/result",
      element: <PreviewComplaintResultRoute />,
      loader: ({ params }) =>
        previewComplaintParticipantResultData(scenario, interactions, params.caseId),
      action: ({ request, params }) =>
        previewComplaintParticipantResultAction(scenario, interactions, request, params.caseId),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId/appeals/:appealId/context/:postId",
      loader: ({ params }) =>
        previewComplaintAppealContextData(
          scenario,
          params.caseId,
          params.appealId,
          params.postId,
        ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId/appeals/:appealId",
      element: <PreviewComplaintAppealReviewRoute />,
      loader: ({ params }) => {
        previewAttentionAccessData(scenario);
        if (params.caseId !== PREVIEW_COMPLAINT_APPEAL_CASE_ID || params.appealId !== PREVIEW_COMPLAINT_APPEAL_ID) {
          throw new Response("Not Found", { status: 404 });
        }
        return { locale: scenario.locale, result: previewComplaintAppealReview(interactions, scenario.identity === "owner") };
      },
      action: ({ request, params }) =>
        previewComplaintAppealAction(scenario, interactions, request, params.caseId, params.appealId),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId/history",
      element: <PreviewComplaintHistoryRoute />,
      loader: ({ params }) => {
        previewAttentionAccessData(scenario);
        return {
          locale: scenario.locale,
          timeline: previewComplaintTimeline(interactions, params.caseId, scenario.identity === "owner"),
        };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId/context/:postId",
      loader: ({ params }) =>
        previewComplaintContextData(scenario, params.caseId, params.postId),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/attention/complaints/:caseId/review",
      element: <PreviewComplaintReviewRoute />,
      loader: ({ params }) => {
        previewAttentionAccessData(scenario);
        const item = params.caseId === PREVIEW_COMPLAINT_CASE_ID
          ? previewComplaintReview(interactions, scenario.identity === "owner")
          : params.caseId === PREVIEW_COMPLAINT_APPEAL_CASE_ID
            ? previewComplaintAppealReview(interactions, scenario.identity === "owner").caseReview
            : null;
        if (!item) throw new Response("Not Found", { status: 404 });
        return { locale: scenario.locale, item };
      },
      action: ({ request, params }) =>
        previewComplaintReviewAction(scenario, interactions, request, params.caseId),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/categories/:categoryId",
      element: <PreviewCategoryRoute scenario={scenario} interactions={interactions} />,
      loader: ({ request, params }) => previewCategoryAccessData(
        scenario, request, params.categoryId,
      ),
      action: ({ request, params }) => previewCategoryAction(
        scenario, interactions, request, params.locale, params.categoryId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/sections/:sectionId",
      element: <PreviewSectionRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => previewSectionAccessData(scenario, params.sectionId),
      action: ({ request, params }) => previewSectionAction(
        scenario, interactions, request, params.locale, params.sectionId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/topics/:topicId",
      element: <PreviewTopicRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => previewTopicAccessData(scenario, interactions, params.topicId),
      action: ({ request, params }) => previewTopicAction(
        scenario, interactions, request, params.locale, params.topicId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/topics/:topicId/complaints",
      element: <></>,
      action: ({ request, params }) => previewComplaintSubmissionAction(
        scenario, interactions, request, params.topicId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/posts/:postId/edit",
      element: <></>,
      loader: ({ params }) => previewPostEditRedirect(
        scenario, interactions, params.locale, params.postId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin",
      element: <PreviewSuperAdminOverviewRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewSuperAdminOverviewState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring",
      element: <PreviewSuperAdminMonitoringRoute />,
      loader: () => {
        previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/system",
      element: <PreviewSuperAdminSystemRoute />,
      loader: () => {
        previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, system: previewSystemState() };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/accounts",
      element: <PreviewSuperAdminSa02Route area="accounts" />,
      loader: () => {
        previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewSa02State("accounts") };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/security",
      element: <PreviewSuperAdminSa02Route area="security" />,
      loader: () => {
        previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewSa02State("security") };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/background",
      element: <PreviewSuperAdminBackgroundRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewTaskState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/localization",
      element: <PreviewSuperAdminLocalizationRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewLocalizationState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/integrations",
      element: <PreviewSuperAdminIntegrationsRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewIntegrationsState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/data",
      element: <PreviewSuperAdminDataRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewDataState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/files",
      element: <PreviewSuperAdminFilesRoute />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewFilesState(), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/forum",
      element: <PreviewSuperAdminNativeRoute area="forum" />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewNativeState("forum"), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/administration",
      element: <PreviewSuperAdminNativeRoute area="administration" />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewNativeState("administration"), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/moderation",
      element: <PreviewSuperAdminNativeRoute area="moderation" />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewNativeState("moderation"), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/notifications",
      element: <PreviewSuperAdminNativeRoute area="notifications" />,
      loader: () => {
        const actor = previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale, state: previewNativeState("notifications"), viewerId: actor.id };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/monitoring/:area/:monitorKey/history",
      element: <PreviewSuperAdminMonitorHistoryRoute />,
      loader: ({ request, params }) =>
        previewMonitorHistoryData(scenario, request, params.area, params.monitorKey),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/events",
      element: <PreviewSuperAdminEventsRoute />,
      loader: ({ request }) => previewSuperAdminEventsData(scenario, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/super-admin/infrastructure",
      element: <PreviewSuperAdminInfrastructureRoute />,
      loader: () => {
        previewSuperAdminAccessData(scenario);
        return { locale: scenario.locale };
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin",
      element: <PreviewAdminOverviewRoute />,
      loader: () => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminOverviewData(scenario);
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/measures",
      element: <PreviewAdminMeasuresRoute />,
      loader: ({ request }) => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminMeasuresData(scenario, interactions, request);
      },
      action: ({ request }) => previewAdminMeasuresAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/measures/:measureId",
      element: <PreviewAdminMeasureRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => {
        previewAdminSurfaceAccessData(scenario);
        if (!previewAdminMeasureById(interactions, params.measureId)) {
          throw new Response("Not Found", { status: 404 });
        }
        return null;
      },
      action: ({ request, params }) => previewAdminMeasureAction(
        scenario, interactions, request, params.measureId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/history",
      element: <PreviewAdminHistoryRoute scenario={scenario} interactions={interactions} />,
      loader: () => previewAdminSurfaceAccessData(scenario),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/users",
      element: <PreviewAdminUsersRoute />,
      loader: ({ request }) => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminUsersData(scenario, request);
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/forum",
      element: <PreviewAdminForumRoute />,
      loader: ({ request }) => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminForumData(scenario, request);
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/forum/categories/:categoryId",
      element: <PreviewAdminCategoryRoute />,
      loader: ({ request, params }) => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminCategoryData(scenario, request, params.categoryId);
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/forum/sections/:sectionId",
      element: <PreviewAdminSectionRoute />,
      loader: ({ request, params }) => {
        previewAdminSurfaceAccessData(scenario);
        return previewAdminSectionData(scenario, request, params.sectionId);
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/forum/topics/:topicId",
      element: <PreviewAdminTopicRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => {
        previewAdminSurfaceAccessData(scenario);
        previewTopicAccessData(scenario, interactions, params.topicId);
        return null;
      },
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/admin/authorization",
      element: <PreviewAuthorizationRoute scenario={scenario} />,
      loader: () => {
        previewAdminSurfaceAccessData(scenario);
        return previewAuthorizationData(scenario.locale, interactions.authorization);
      },
      action: ({ request }) => previewAuthorizationAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/under-development",
      element: <PreviewUnderDevelopment locale={scenario.locale} />,
    },
    {
      path: "/:locale/search",
      element: <PreviewSearchRoute scenario={scenario} interactions={interactions} />,
    },
    {
      path: "/:locale/popular",
      element: <PopularView locale={scenario.locale} periods={popularPeriods(scenario.locale)} />,
    },
    {
      path: "/:locale/unanswered",
      element: <UnansweredView locale={scenario.locale} topics={unansweredTopics(scenario.locale)} />,
    },
    {
      path: "/:locale/unread",
      element: <UnreadView locale={scenario.locale} topics={unreadTopics(scenario.locale)} />,
      loader: () => previewAuthenticatedRouteData(scenario),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/filters",
      element: <PreviewFiltersRoute />,
      loader: ({ request }) => previewFiltersData(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/bookmarks",
      element: <PreviewBookmarksRoute />,
      loader: () => previewBookmarksData(scenario, interactions),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/users/:userId",
      element: <PreviewProfileRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => previewProfileAccessData(scenario, interactions, params.userId),
      action: ({ request, params }) => previewProfileAction(
        scenario, interactions, request, params.locale, params.userId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/account/measures",
      element: <PreviewOwnMeasuresRoute scenario={scenario} interactions={interactions} />,
      loader: () => previewAuthenticatedRouteData(scenario),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/account/measures/:measureId",
      element: <PreviewOwnMeasureRoute scenario={scenario} interactions={interactions} />,
      loader: ({ params }) => {
        previewAuthenticatedRouteData(scenario);
        if (params.measureId !== PREVIEW_OWN_MEASURE_ID) {
          throw new Response("Not Found", { status: 404 });
        }
        return null;
      },
      action: ({ request, params }) => previewOwnMeasureAction(
        scenario, interactions, request, params.measureId,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/notifications",
      element: <PreviewNotificationsRoute scenario={scenario} interactions={interactions} />,
      loader: () => previewAuthenticatedRouteData(scenario),
      action: ({ request, params }) => previewNotificationsAction(
        scenario, interactions, request, params.locale,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings",
      element: <SettingsRoute />,
      loader: () => previewSettingsOverviewData(scenario),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings/user",
      element: <SettingsUserRoute />,
      loader: () => previewSettingsUserData(scenario, interactions),
      action: ({ request }) => previewSettingsUserAction(
        scenario, interactions, request, onLocaleChange,
      ),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings/administrator",
      element: <SettingsAdministratorRoute />,
      loader: () => previewSettingsAdministratorData(scenario),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings/forum",
      element: <SettingsForumRoute />,
      loader: () => previewSettingsForumData(scenario, interactions),
      action: ({ request }) => previewSettingsForumAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings/privacy",
      element: <SettingsPrivacyRoute />,
      loader: () => previewSettingsPrivacyData(scenario, interactions),
      action: ({ request }) => previewSettingsPrivacyAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/settings/account",
      element: <SettingsAccountRoute mutationMode="all"
        googleLink={async (_callbackURL, expectedUserId) => {
          const actor = previewUser(scenario);
          if (!actor || expectedUserId !== actor.id) return false;
          interactions.googleLinked = true;
          return true;
        }} />,
      loader: () => previewSettingsAccountData(scenario, interactions),
      action: ({ request }) => previewSettingsAccountAction(scenario, interactions, request),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "/:locale/tags",
      element: <TagsView locale={scenario.locale} tags={previewTags(scenario.locale)} />,
    },
    {
      path: "/:locale/tags/:tagKey",
      element: <PreviewTagRoute scenario={scenario} />,
      loader: ({ params }) => previewTagData(scenario.locale, params.tagKey),
      ErrorBoundary: ForumRouteError,
    },
    {
      path: "*",
      loader: () => {
        throw new Response("Not Found", { status: 404 });
      },
      ErrorBoundary: ForumRouteError,
    },
  ], { initialEntries: [scenario.path] });
}

function PreviewHomeRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  return (
    <HomeView
      locale={scenario.locale}
      categories={homepageCategories(scenario.locale)}
      onlinePresence={previewOnlinePresence(scenario, interactions)}
    />
  );
}

function previewOnlinePresence(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  const members = [
    { id: "alex", name: "Alex", image: null },
    { id: "maya", name: "Maya Cohen", image: null },
  ].filter((member) =>
    !interactions.ownerDeactivations.has(member.id)
    && (interactions.showOnline || member.id !== actor?.id));
  return { count: members.length, members };
}

function previewSettingsForumData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  if (!actor) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  if (scenario.identity !== "owner") {
    throw new Response("Forbidden", { status: 403 });
  }
  return {
    ...previewAuthorizationData(scenario.locale, interactions.authorization),
    canManageElevated: scenario.identity === "owner",
    canMutateAuthorization: scenario.identity === "owner",
    access: {
      actorId: actor?.id ?? "",
      canEnter: true,
      canManageAuthorization: true,
      canReadForum: true,
      canReadHistory: true,
    },
    registration: {
      googleRegistrationEnabled: interactions.registrationGoogleEnabled,
      emailRegistrationEnabled: interactions.registrationEmailEnabled,
      version: interactions.registrationVersion,
    },
  };
}

async function previewSettingsForumAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  if (scenario.identity !== "owner") return { ok: false as const, error: "forbidden" as const };
  const form = await request.formData();
  const allowed = new Set(["expectedVersion", "googleRegistrationEnabled", "emailRegistrationEnabled"]);
  if ([...form.keys()].some((key) => !allowed.has(key))) {
    return { ok: false as const, error: "invalid" as const };
  }
  const expectedVersion = Number(String(form.get("expectedVersion") ?? ""));
  if (scenario.variant === "settings-forum-registration-conflict"
    && interactions.registrationVersion === 1) {
    interactions.registrationGoogleEnabled = true;
    interactions.registrationEmailEnabled = false;
    interactions.registrationVersion = 2;
    writePreviewRegistrationPolicy(interactions);
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion !== interactions.registrationVersion) {
    return { ok: false as const, error: "conflict" as const };
  }
  if (scenario.variant === "settings-forum-registration-invalid") {
    return { ok: false as const, error: "invalid" as const };
  }
  if (scenario.variant === "settings-forum-registration-forbidden") {
    return { ok: false as const, error: "forbidden" as const };
  }
  if (scenario.variant === "settings-forum-registration-unavailable") {
    return { ok: false as const, error: "unavailable" as const };
  }
  const googleRegistrationEnabled = form.get("googleRegistrationEnabled") === "on";
  const emailRegistrationEnabled = form.get("emailRegistrationEnabled") === "on";
  if (googleRegistrationEnabled !== interactions.registrationGoogleEnabled
    || emailRegistrationEnabled !== interactions.registrationEmailEnabled) {
    const before = {
      googleRegistrationEnabled: interactions.registrationGoogleEnabled,
      emailRegistrationEnabled: interactions.registrationEmailEnabled,
      version: interactions.registrationVersion,
    };
    interactions.registrationGoogleEnabled = googleRegistrationEnabled;
    interactions.registrationEmailEnabled = emailRegistrationEnabled;
    interactions.registrationVersion += 1;
    writePreviewRegistrationPolicy(interactions);
    previewAppendAdminHistory(scenario, interactions, {
      action: "settings.registrationChanged",
      targetType: "forum-settings",
      targetId: "registration",
      targetLabel: "Registration settings",
      context: {
        before,
        after: {
          googleRegistrationEnabled: interactions.registrationGoogleEnabled,
          emailRegistrationEnabled: interactions.registrationEmailEnabled,
          version: interactions.registrationVersion,
        },
      },
    });
  }
  return { ok: true as const };
}

function previewSettingsAdministratorData(scenario: Scenario) {
  const actor = previewUser(scenario);
  if (!actor) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  if (scenario.identity !== "owner" && scenario.identity !== "manager") {
    throw new Response("Forbidden", { status: 403 });
  }
  return {
    locale: scenario.locale,
    accountId: actor?.id ?? "",
    canViewForum: scenario.identity === "owner",
    admin: scenario.identity === "owner"
      ? (["overview", "roles"] as const)
      : ([] as const),
    attention: {
      signals: ["needs-details", "needs-review"] as const,
      complaints: ["group1"] as const,
      security: [] as const,
    },
  };
}

function previewSettingsAccountData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  if (!actor) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  const sessionAccess = scenario.variant === "settings-account-not-fresh"
    ? "not-fresh" as const
    : "ready" as const;
  const sessions = sessionAccess === "not-fresh" ? [] : [
    {
      id: "preview-current-session",
      createdAt: "2026-11-18T07:15:00.000Z",
      expiresAt: "2026-12-18T07:15:00.000Z",
      current: true,
      deviceLabel: "Chrome on Windows",
    },
    {
      id: "preview-mobile-session",
      createdAt: "2026-11-14T19:40:00.000Z",
      expiresAt: "2026-12-14T19:40:00.000Z",
      current: false,
      deviceLabel: "Safari on iPhone",
    },
    {
      id: "preview-tablet-session",
      createdAt: "2026-11-10T16:25:00.000Z",
      expiresAt: "2026-12-10T16:25:00.000Z",
      current: false,
      deviceLabel: "Firefox on Android tablet",
    },
  ].filter((session) => !interactions.revokedAccountSessionIds.has(session.id));

  const googleOnly = scenario.variant === "settings-account-google-only";
  return {
    locale: scenario.locale,
    accountId: actor?.id ?? "",
    sessionId: scenario.variant === "settings-account-stale"
      ? "preview-stale-session"
      : "preview-current-session",
    canViewForum: scenario.identity === "owner",
    linkedMethods: googleOnly
      ? ["google"] as ("password" | "google")[]
      : [
        "password",
        ...(interactions.googleLinked ? ["google" as const] : []),
      ] as ("password" | "google")[],
    hasPassword: !googleOnly,
    sessionAccess,
    sessions,
  };
}

async function previewSettingsAccountAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  const actor = previewUser(scenario);
  if (!actor) return { error: "unauthenticated" as const };

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (!["change-password", "revoke-one", "revoke-others"].includes(intent)) {
    return { error: "invalid" as const };
  }

  const allowedFields = new Set(intent === "change-password"
    ? ["intent", "expectedUserId", "expectedSessionId", "currentPassword", "newPassword"]
    : intent === "revoke-one"
      ? ["intent", "expectedUserId", "expectedSessionId", "sessionId"]
      : ["intent", "expectedUserId", "expectedSessionId"]);
  if ([...form.keys()].some((key) => !allowedFields.has(key))) {
    return { error: "invalid" as const };
  }

  const expectedUserId = String(form.get("expectedUserId") ?? "");
  const expectedSessionId = String(form.get("expectedSessionId") ?? "");
  if (expectedUserId !== actor.id || expectedSessionId !== "preview-current-session") {
    return { error: "account-changed" as const };
  }

  if (intent === "change-password") {
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    if (!currentPassword || currentPassword.length > 128
      || newPassword.length < 8 || newPassword.length > 128) {
      return { error: "invalid" as const };
    }
    if (scenario.variant === "settings-account-invalid-password") {
      return { error: "invalid-password" as const };
    }
    if (scenario.variant === "settings-account-rate-limited") {
      return { error: "rate-limited" as const };
    }
    if (scenario.variant === "settings-account-unavailable") {
      return { error: "unavailable" as const };
    }
    return { saved: "change-password" as const };
  }

  if (intent === "revoke-others") {
    interactions.revokedAccountSessionIds.add("preview-mobile-session");
    interactions.revokedAccountSessionIds.add("preview-tablet-session");
    return { saved: "revoke-others" as const };
  }

  const sessionId = String(form.get("sessionId") ?? "");
  if (!["preview-mobile-session", "preview-tablet-session"].includes(sessionId)
    || interactions.revokedAccountSessionIds.has(sessionId)) {
    return { error: "session-not-found" as const };
  }
  if (scenario.variant === "settings-account-session-not-found"
    && sessionId === "preview-mobile-session") {
    interactions.revokedAccountSessionIds.add(sessionId);
    return { error: "session-not-found" as const };
  }

  interactions.revokedAccountSessionIds.add(sessionId);
  return { saved: "revoke-one" as const };
}

function previewSettingsPrivacyData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  if (!actor) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  return {
    locale: scenario.locale,
    accountId: actor?.id ?? "",
    showOnline: interactions.showOnline,
    canViewForum: scenario.identity === "owner",
  };
}

async function previewSettingsPrivacyAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  const actor = previewUser(scenario);
  if (!actor) return { error: "conflict" as const };
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "save-online-visibility") {
    return { error: "invalid" as const };
  }
  if (String(form.get("expectedUserId") ?? "") !== actor.id) {
    return { error: "conflict" as const };
  }
  const value = String(form.get("showOnline") ?? "");
  if (value !== "true" && value !== "false") return { error: "invalid" as const };

  interactions.showOnline = value === "true";
  return { saved: true as const };
}

function previewSettingsOverviewData(scenario: Scenario) {
  if (!previewUser(scenario)) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  return {
    locale: scenario.locale,
    canViewForum: scenario.identity === "owner",
  };
}

function previewSettingsUserData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  if (!actor) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  return {
    locale: scenario.locale,
    canViewForum: scenario.identity === "owner",
    accountId: actor?.id ?? "",
    preferredLocale: interactions.preferredLocale,
    availableLocales: previewLocaleOptions,
    localeAvailable: true,
    localeSaved: interactions.localeSaved,
  };
}

async function previewSettingsUserAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  onLocaleChange: (locale: PreviewLocale, nextPath?: string) => void,
) {
  const actor = previewUser(scenario);
  if (!actor) return { error: "conflict" as const };
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "save-locale") return { error: "invalid" as const };
  if (String(form.get("expectedUserId") ?? "") !== actor.id) return { error: "conflict" as const };
  const locale = String(form.get("locale") ?? "");
  if (!isPreviewLocale(locale)) return { error: "invalid" as const };

  interactions.preferredLocale = locale;
  interactions.localeSaved = true;
  onLocaleChange(locale, `${settingsUserPath(locale)}?localeSaved=1`);
  return null;
}

function previewSectionPresentation(locale: PreviewLocale, sectionIdValue: string) {
  if (sectionIdValue === HELP_SOLUTIONS_SERVICE_SECTION_ID) {
    return {
      id: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      name: "Questions",
      category: {
        id: HELP_SOLUTIONS_CATEGORY_ID,
        name: previewHelpSolutions(locale).name,
      },
      topics: [],
    };
  }
  return previewSection(locale, sectionIdValue);
}

function PreviewSearchRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const normalized = query.toLocaleLowerCase(scenario.locale);
  const createdResults = [...interactions.createdTopics.values()].map((created) => {
    const localizedSection = previewSectionPresentation(scenario.locale, created.sectionId);
    return {
      id: created.id,
      sourceLocale: created.sourceLocale,
      titleDirection: previewDirectionForLocale(created.sourceLocale),
      title: created.title,
      authorName: created.authorName,
      postCount: 1 + (interactions.replies.get(created.id)?.length ?? 0),
      activityAt: created.createdAt,
      category: localizedSection.category,
      section: { id: localizedSection.id, name: localizedSection.name },
      tags: created.tags,
    };
  });
  const results = query
    ? [...createdResults, ...previewSearchResults(scenario.locale)].filter((item) => [
        item.title,
        item.authorName,
        ...item.tags.map((tag) => tag.name),
      ].some((value) => value.toLocaleLowerCase(scenario.locale).includes(normalized)))
    : [];
  return <SearchView locale={scenario.locale} query={query} results={results} />;
}

async function previewCategoryAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeLocale?: string,
  routeCategoryId?: string,
) {
  const actor = previewUser(scenario);
  if (!actor || routeCategoryId !== HELP_SOLUTIONS_CATEGORY_ID) return null;
  const locale = previewMutationLocale(routeLocale, scenario.locale);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const draft = {
    title: String(form.get("title") ?? ""),
    body: String(form.get("body") ?? ""),
    tags: String(form.get("tags") ?? ""),
  };

  if (intent === "checkSimilarHelpQuestions") {
    const normalizedTitle = draft.title.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalizedTitle || normalizedTitle.length > 200) {
      return { operation: "helpSimilarQuestions" as const, outcome: "invalid" as const, draft, results: [] };
    }

    const terms = normalizedTitle.toLocaleLowerCase(locale)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 4);
    const tagKeys = new Set(previewTagsFromInput(draft.tags).map((tag) => tag.key));
    const base = previewHelpSolutions(locale).questions;
    const created = [...interactions.createdTopics.values()]
      .filter((topic) => topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID)
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        replyCount: interactions.replies.get(topic.id)?.length ?? 0,
        isSolved: interactions.topicOverrides.get(topic.id)?.isSolved ?? false,
        tags: topic.tags,
      }));

    const results = [...created, ...base].flatMap((question) => {
      const title = question.title.toLocaleLowerCase(locale);
      const titleMatch = terms.some((term) => title.includes(term));
      const tagMatch = question.tags.some((tag) => tagKeys.has(tag.key));
      if (!titleMatch && !tagMatch) return [];
      return [{
        id: question.id,
        title: question.title,
        replyCount: question.replyCount,
        isSolved: question.isSolved,
        tags: question.tags,
        matchSource: titleMatch ? "title" as const : "tags" as const,
      }];
    }).slice(0, 5);

    return {
      operation: "helpSimilarQuestions" as const,
      outcome: results.length > 0 ? "results" as const : "empty" as const,
      draft,
      results,
    };
  }

  if (intent !== "createHelpQuestion") return null;
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (!title || !body) return { error: "invalid" as const };

  const sequence = ++interactions.sequence;
  const id = `preview-help-${sequence}`;
  interactions.createdTopics.set(id, {
    id,
    sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
    authorId: actor.id,
    authorName: actor.name,
    title,
    body,
    tags: previewTagsFromInput(draft.tags),
    sourceLocale: locale,
    createdAt: new Date(Date.UTC(2026, 10, 11, 8, 0, sequence)),
  });
  return redirect(forumTopicPath(locale, id));
}

async function previewProfileAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeLocale?: string,
  routeUserId?: string,
) {
  const actor = previewUser(scenario);
  if (!actor || !routeUserId) return null;
  const effectiveUserId = scenario.id.startsWith("profile-") && scenario.allowedIdentities && routeUserId === "alex"
    ? actor.id
    : routeUserId;

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "setUserBlock") {
    const editorActorId = String(form.get("editorActorId") ?? "").trim();
    const requested = String(form.get("blocked") ?? "");
    if (!editorActorId || (requested !== "true" && requested !== "false")) {
      return { operation: "userBlock" as const, error: "invalid" as const };
    }
    if (editorActorId !== actor.id) {
      return { operation: "userBlock" as const, error: "conflict" as const };
    }
    if (effectiveUserId === actor.id) {
      return { operation: "userBlock" as const, error: "invalid" as const };
    }
    const key = previewUserBlockKey(actor.id, effectiveUserId);
    const blocked = requested === "true";
    if (blocked) interactions.userBlocks.add(key);
    else interactions.userBlocks.delete(key);
    return {
      operation: "userBlock" as const,
      ok: true as const,
      actorId: actor.id,
      targetId: effectiveUserId,
      blocked,
    };
  }

  if (effectiveUserId !== actor.id || intent !== "save-profile") return null;
  const bio = String(form.get("bio") ?? "");
  const githubUrl = String(form.get("githubUrl") ?? "");
  const websiteUrl = String(form.get("websiteUrl") ?? "");
  const draft = { bio, githubUrl, websiteUrl };

  try {
    const fields = validateProfileFields({ bio, githubUrl, websiteUrl });
    interactions.profileOverrides.set(effectiveUserId, fields);
    const locale = previewMutationLocale(routeLocale, scenario.locale);
    return redirect(`${forumProfilePath(locale, routeUserId)}?saved=1`);
  } catch (error) {
    if (error instanceof InvalidProfileError) {
      return { error: "invalid" as const, draft };
    }
    throw error;
  }
}

function previewInteractionPairs(values: Set<string>, actorId: string) {
  return [...values].flatMap((value) => {
    try {
      const pair = JSON.parse(value);
      return Array.isArray(pair) && pair.length === 2
        && pair[0] === actorId && typeof pair[1] === "string"
        ? [pair[1]]
        : [];
    } catch {
      return [];
    }
  });
}

function previewBookmarksData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  const actor = previewUser(scenario);
  if (!actor) throw new Response("Unauthorized", { status: 401 });
  const items: BookmarkItemPresentation[] = previewInteractionPairs(interactions.topicBookmarks, actor.id)
    .flatMap((id, index) => {
      const page = previewAdminTopicData(scenario, interactions, id);
      if (!page) return [];
      const topic = page.topic;
      return [{
        id,
        title: interactions.topicTitleEdits.get(id)?.originalContent ?? topic.title.originalContent,
        authorName: topic.authorName,
        category: { name: topic.section.category.name },
        section: { name: topic.section.name },
        savedAt: new Date(Date.UTC(2026, 10, 20, 6, 30, index)).toISOString(),
      }];
    });
  return { locale: scenario.locale, actorId: actor.id, items, next: null };
}

function PreviewBookmarksRoute() {
  return <BookmarksView {...useLoaderData<ReturnType<typeof previewBookmarksData>>()} />;
}

function previewFiltersData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  const actor = previewUser(scenario);
  if (!actor) throw new Response("Unauthorized", { status: 401 });
  const search = new URL(request.url).searchParams;
  const requestedTab = search.get("tab") ?? "topics";
  if (requestedTab !== "topics" && requestedTab !== "users") {
    throw new Response("Invalid filters query", { status: 400 });
  }
  const tab: "topics" | "users" = requestedTab;

  let items: FilterListItem[];
  if (tab === "topics") {
    items = previewInteractionPairs(interactions.topicMutes, actor.id).flatMap((id, index) => {
      const page = previewAdminTopicData(scenario, interactions, id);
      if (!page) return [];
      const topic = page.topic;
      return [{
        kind: "topic" as const,
        id,
        name: interactions.topicTitleEdits.get(id)?.originalContent ?? topic.title.originalContent,
        createdAt: new Date(Date.UTC(2026, 10, 20, 6, 0, index)).toISOString(),
        authorName: topic.authorName,
        category: { name: topic.section.category.name },
        section: { name: topic.section.name },
      }];
    });
  } else {
    items = previewInteractionPairs(interactions.userBlocks, actor.id).flatMap((id, index) => {
      const name = previewProfileNames[id];
      return name ? [{
        kind: "user" as const,
        id,
        name,
        createdAt: new Date(Date.UTC(2026, 10, 20, 6, 0, index)).toISOString(),
      }] : [];
    });
  }
  return { locale: scenario.locale, actorId: actor.id, tab, items, next: null };
}

function PreviewFiltersRoute() {
  return <FiltersView {...useLoaderData<ReturnType<typeof previewFiltersData>>()} />;
}

function PreviewNotificationsRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const notifications = scenario.variant === "notifications-empty"
    ? []
    : previewNotifications(scenario).map((notification) =>
        interactions.readNotifications.has(notification.id) && notification.readAt === null
          ? { ...notification, readAt: "2026-11-11T08:30:00.000Z" }
          : notification
      );
  return <NotificationsView locale={scenario.locale} notifications={notifications} />;
}

async function previewNotificationsAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeLocale?: string,
) {
  if (!previewUser(scenario)) return null;
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "open") return null;
  const notificationId = String(form.get("notificationId") ?? "");
  const notification = previewNotifications(scenario).find((item) => item.id === notificationId);
  if (!notification) return null;

  interactions.readNotifications.add(notificationId);
  const locale = previewMutationLocale(routeLocale, scenario.locale);
  if (notification.kind === "complaint-decision") {
    return redirect(`/${encodeURIComponent(locale)}/complaints/${encodeURIComponent(notification.caseId)}/result`);
  }
  if (notification.kind === "complaint-appeal-result") {
    return redirect(
      `/${encodeURIComponent(locale)}/complaints/${encodeURIComponent(notification.caseId)}/result#appeal-${encodeURIComponent(notification.appealId)}`,
    );
  }
  return redirect(
    `${forumTopicPath(locale, notification.topicId)}#post-${encodeURIComponent(notification.postId)}`,
  );
}

async function previewSectionAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeLocale?: string,
  routeSectionId?: string,
) {
  const actor = previewUser(scenario);
  if (!actor) return null;
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "createTopic") return null;
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!title || !body) return null;

  const sequence = ++interactions.sequence;
  const id = `preview-topic-${sequence}`;
  const locale = previewMutationLocale(routeLocale, scenario.locale);
  interactions.createdTopics.set(id, {
    id,
    sectionId: routeSectionId || sectionId,
    authorId: actor.id,
    authorName: actor.name,
    title,
    body,
    tags: previewTagsFromInput(String(form.get("tags") ?? "")),
    sourceLocale: locale,
    createdAt: new Date(Date.UTC(2026, 10, 11, 7, 0, sequence)),
  });
  return redirect(forumTopicPath(locale, id));
}

async function previewComplaintSubmissionAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeTopicId?: string,
): Promise<ComplaintSubmissionResponse> {
  if (!previewUser(scenario)) return { error: "unauthenticated" };
  if (!routeTopicId) return { error: "notFound" };

  const page = previewAdminTopicData(scenario, interactions, routeTopicId);
  if (!page) return { error: "notFound" };

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const revisionId = String(form.get("revisionId") ?? "").trim();
  const operationId = String(form.get("operationId") ?? "").trim();
  const reason = String(form.get("reason") ?? "");
  const explanation = String(form.get("explanation") ?? "").trim();

  if (
    (kind !== "post" && kind !== "topic-title")
    || !revisionId
    || !operationId
    || !COMPLAINT_REASONS.includes(reason as (typeof COMPLAINT_REASONS)[number])
    || (reason === "other" && !explanation)
  ) {
    return { error: "invalid" };
  }

  if (kind === "topic-title") {
    if (page.topic.title.id !== revisionId) return { error: "conflict" };
  } else {
    const postId = String(form.get("postId") ?? "").trim();
    const post = page.topic.posts.find((candidate) => candidate.id === postId);
    if (!post) return { error: "notFound" };
    if (post.body.id !== revisionId) return { error: "conflict" };
  }

  return { ok: true, operationId };
}

async function previewTopicAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeLocale?: string,
  routeTopicId?: string,
) {
  const actor = previewUser(scenario);
  if (!actor || !routeTopicId) return null;
  const locale = previewMutationLocale(routeLocale, scenario.locale);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "setTopicMute") {
    const editorActorId = String(form.get("editorActorId") ?? "").trim();
    const requested = String(form.get("muted") ?? "");
    if (!editorActorId || (requested !== "true" && requested !== "false")) {
      return { operation: "topicMute" as const, error: "invalid" as const };
    }
    if (editorActorId !== actor.id) {
      return { operation: "topicMute" as const, error: "conflict" as const };
    }
    const key = previewTopicMuteKey(actor.id, routeTopicId);
    const muted = requested === "true";
    if (muted) interactions.topicMutes.add(key);
    else interactions.topicMutes.delete(key);
    return {
      operation: "topicMute" as const,
      ok: true as const,
      topicId: routeTopicId,
      actorId: actor.id,
      muted,
    };
  }

  if (intent === "setTopicBookmark") {
    const editorActorId = String(form.get("editorActorId") ?? "").trim();
    const requested = String(form.get("bookmarked") ?? "");
    if (!editorActorId || (requested !== "true" && requested !== "false")) {
      return { operation: "topicBookmark" as const, error: "invalid" as const };
    }
    if (editorActorId !== actor.id) {
      return { operation: "topicBookmark" as const, error: "conflict" as const };
    }
    const key = previewTopicBookmarkKey(actor.id, routeTopicId);
    const bookmarked = requested === "true";
    if (bookmarked) interactions.topicBookmarks.add(key);
    else interactions.topicBookmarks.delete(key);
    return {
      operation: "topicBookmark" as const,
      ok: true as const,
      topicId: routeTopicId,
      actorId: actor.id,
      bookmarked,
    };
  }

  if (intent === "setTopicWatch") {
    const editorActorId = String(form.get("editorActorId") ?? "").trim();
    const requested = String(form.get("watching") ?? "");
    if (!editorActorId || (requested !== "true" && requested !== "false")) {
      return { operation: "topicWatch" as const, error: "invalid" as const };
    }
    if (editorActorId !== actor.id) {
      return { operation: "topicWatch" as const, error: "conflict" as const };
    }
    const key = previewTopicWatchKey(actor.id, routeTopicId);
    const watching = requested === "true";
    if (watching) interactions.topicWatches.add(key);
    else interactions.topicWatches.delete(key);
    return {
      operation: "topicWatch" as const,
      ok: true as const,
      topicId: routeTopicId,
      actorId: actor.id,
      watching,
    };
  }

  if (intent === "editPost") {
    const postId = String(form.get("postId") ?? "").trim();
    const expectedRevisionId = String(form.get("expectedRevisionId") ?? "").trim();
    const body = form.get("body");
    const currentTopic = previewEditableTopicForAction(scenario, interactions, routeTopicId);
    const currentPost = currentTopic?.posts.find((post) => post.id === postId);
    if (!postId || !expectedRevisionId || typeof body !== "string") {
      return { intent: "editPost" as const, error: "invalid" as const };
    }
    if (!currentPost) return { intent: "editPost" as const, error: "notFound" as const };
    if (currentPost.authorId !== actor.id) {
      return { intent: "editPost" as const, error: "forbidden" as const };
    }
    if (currentPost.body.id !== expectedRevisionId) {
      return { intent: "editPost" as const, error: "conflict" as const };
    }
    const editedAt = new Date(Date.UTC(2026, 10, 11, 8, 0, ++interactions.sequence));
    const revision: PreviewPostEditRevision = {
      id: `${postId}-preview-r${interactions.sequence}`,
      originalContent: body,
      sourceLocale: "und",
      editedAt,
    };
    const revisions = interactions.postEdits.get(postId) ?? [];
    interactions.postEdits.set(postId, [...revisions, revision]);
    interactions.postSourceLocales.delete(postId);
    return redirect(`${forumTopicPath(locale, routeTopicId)}#post-${encodeURIComponent(postId)}`);
  }

  if (intent === "reply") {
    const body = String(form.get("body") ?? "").trim();
    if (!body) return null;
    const sequence = ++interactions.sequence;
    const reply: PreviewReply = {
      id: `preview-post-${sequence}`,
      topicId: routeTopicId,
      authorId: actor.id,
      authorName: actor.name,
      body,
      parentPostId: String(form.get("parentPostId") ?? "").trim() || null,
      sourceLocale: locale,
      createdAt: new Date(Date.UTC(2026, 10, 11, 7, 5, sequence)),
    };
    const current = interactions.replies.get(routeTopicId) ?? [];
    interactions.replies.set(routeTopicId, [...current, reply]);
    return redirect(`${forumTopicPath(locale, routeTopicId)}#post-${encodeURIComponent(reply.id)}`);
  }

  const inline = form.get("inlineQuickAction") === "1";

  if (intent === "editTopicTitle") {
    const title = String(form.get("title") ?? "").trim();
    const expectedRevisionId = String(form.get("expectedRevisionId") ?? "").trim();
    const editorActorId = String(form.get("editorActorId") ?? "").trim();
    const created = interactions.createdTopics.get(routeTopicId);
    const baseTitle = created
      ? { id: `${created.id}-title-r1`, originalContent: created.title, sourceLocale: created.sourceLocale }
      : routeTopicId === topicId
        ? topic.title
        : null;
    const authorId = created?.authorId ?? (routeTopicId === topicId ? topic.authorId : null);
    if (!baseTitle || authorId !== actor.id || editorActorId !== actor.id) {
      return { operation: "topicTitleEdit" as const, error: "forbidden" as const };
    }
    const currentTitle = interactions.topicTitleEdits.get(routeTopicId) ?? baseTitle;
    if (!title || expectedRevisionId !== currentTitle.id) {
      return {
        operation: "topicTitleEdit" as const,
        error: "conflict" as const,
        currentTitle: { id: currentTitle.id, originalContent: currentTitle.originalContent },
      };
    }
    const revisionId = `${routeTopicId}-title-preview-${++interactions.sequence}`;
    interactions.topicTitleEdits.set(routeTopicId, {
      id: revisionId,
      originalContent: title,
      sourceLocale: "und",
    });
    interactions.topicTitleSourceLocales.delete(routeTopicId);
    return { operation: "topicTitleEdit" as const, ok: true as const, revisionId };
  }

  if (intent === "correctTitleSourceLocale") {
    if (scenario.identity !== "manager") return null;
    const sourceLocale = String(form.get("sourceLocale") ?? "").trim();
    if (!sourceLocale) return { error: "invalid" };
    interactions.topicTitleSourceLocales.set(routeTopicId, sourceLocale);
    return inline ? { ok: true } : redirect(forumTopicPath(locale, routeTopicId));
  }

  if (intent === "correctPostSourceLocale") {
    if (scenario.identity !== "manager") return null;
    const postId = String(form.get("postId") ?? "").trim();
    const sourceLocale = String(form.get("sourceLocale") ?? "").trim();
    if (!postId || !sourceLocale) return { error: "invalid" };
    interactions.postSourceLocales.set(postId, sourceLocale);
    return { ok: true };
  }

  if (intent === "readPostHistory") {
    if (scenario.identity !== "manager") return { error: "forbidden" };
    const postId = String(form.get("postId") ?? "").trim();
    const page = primaryTopicScenarioData(scenario).topic;
    const post = page.id === routeTopicId ? page.posts.find((candidate) => candidate.id === postId) : undefined;
    if (!post) return { error: "notFound" };
    return {
      operation: "postHistory" as const,
      postId,
      revisions: [{
        id: post.body.id,
        authorName: post.authorName,
        originalContent: post.body.originalContent,
        sourceLocale: interactions.postSourceLocales.get(post.id) ?? post.body.sourceLocale,
        createdAt: post.createdAt.toISOString(),
      }],
    };
  }

  if (intent === "selectBestAnswer") {
    const postId = String(form.get("postId") ?? "").trim();
    if (!postId) return null;
    const current = interactions.topicOverrides.get(routeTopicId) ?? {};
    interactions.topicOverrides.set(routeTopicId, { ...current, bestAnswerPostId: postId });
    return inline
      ? { ok: true }
      : redirect(
          `${forumTopicPath(locale, routeTopicId)}?solutionPrompt=${encodeURIComponent(postId)}#solution-confirmation`,
        );
  }

  if (intent === "markSolved") {
    const current = interactions.topicOverrides.get(routeTopicId) ?? {};
    interactions.topicOverrides.set(routeTopicId, { ...current, isSolved: true });
    return inline ? { ok: true } : redirect(forumTopicPath(locale, routeTopicId));
  }

  if (intent === "pinTopic" || intent === "unpinTopic") {
    if (scenario.identity !== "manager") return null;
    const current = interactions.topicOverrides.get(routeTopicId) ?? {};
    interactions.topicOverrides.set(routeTopicId, {
      ...current,
      isPinned: intent === "pinTopic",
    });
    return inline ? { ok: true } : redirect(forumTopicPath(locale, routeTopicId));
  }

  if (intent === "closeTopic" || intent === "reopenTopic") {
    if (scenario.identity !== "manager") return null;
    const current = interactions.topicOverrides.get(routeTopicId) ?? {};
    const baseVersion = current.closureVersion ?? (routeTopicId === topicId ? topic.closureVersion : 0);
    interactions.topicOverrides.set(routeTopicId, {
      ...current,
      isClosed: intent === "closeTopic",
      closureVersion: baseVersion + 1,
    });
    return inline ? { ok: true } : redirect(forumTopicPath(locale, routeTopicId));
  }

  return null;
}

function previewEditableTopicForAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId: string,
): PreviewTopicPage | null {
  if (routeTopicId === topicId) {
    return previewApplyTopicState(primaryTopicScenarioData(scenario).topic, interactions);
  }
  const created = interactions.createdTopics.get(routeTopicId);
  return created ? previewCreatedTopicData(scenario, created, interactions).topic : null;
}

function previewPostEditRedirect(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeLocale?: string,
  postId?: string,
) {
  const actor = previewUser(scenario);
  if (!actor) throw new Response("Unauthorized", { status: 401 });
  if (!postId) throw new Response("Not Found", { status: 404 });

  const primary = previewApplyTopicState(primaryTopicScenarioData(scenario).topic, interactions);
  const createdTopics = [...interactions.createdTopics.values()]
    .map((created) => previewCreatedTopicData(scenario, created, interactions).topic);
  const topicPage = [primary, ...createdTopics]
    .find((candidate) => candidate.posts.some((post) => post.id === postId));
  const post = topicPage?.posts.find((candidate) => candidate.id === postId);
  if (!topicPage || !post) throw new Response("Not Found", { status: 404 });
  if (post.authorId !== actor.id) throw new Response("Forbidden", { status: 403 });

  const locale = previewMutationLocale(routeLocale, scenario.locale);
  return redirect(
    `${forumTopicPath(locale, topicPage.id)}?editPost=${encodeURIComponent(postId)}#post-${encodeURIComponent(postId)}`,
  );
}

function previewSectionWithInteractions(
  locale: PreviewLocale,
  routeSectionId: string | undefined,
  interactions: PreviewInteractionState,
) {
  const base = previewSection(locale, routeSectionId);
  const created = [...interactions.createdTopics.values()]
    .filter((topic) => topic.sectionId === base.id)
    .map((topic) => ({
      id: topic.id,
      authorName: topic.authorName,
      postCount: 1 + (interactions.replies.get(topic.id)?.length ?? 0),
      createdAt: topic.createdAt,
      isPinned: false,
      tags: topic.tags,
      title: {
        id: `${topic.id}-title-r1`,
        originalContent: topic.title,
        sourceLocale: topic.sourceLocale,
      },
    }));
  return { ...base, topics: [...created, ...base.topics] };
}

function previewCreatedTopicData(
  scenario: Scenario,
  created: PreviewCreatedTopic,
  interactions: PreviewInteractionState,
): Parameters<typeof TopicView>[0] {
  const sectionPage = previewSectionPresentation(scenario.locale, created.sectionId);
  const baseTopic: PreviewTopicPage = {
    id: created.id,
    sectionId: created.sectionId,
    authorId: created.authorId,
    authorName: created.authorName,
    createdAt: created.createdAt,
    isPinned: false,
    isSolved: false,
    isClosed: false,
    closureVersion: 0,
    bestAnswerPostId: null,
    needsDetails: false,
    duplicateOf: null,
    duplicateDisputed: false,
    title: {
      id: `${created.id}-title-r1`,
      originalContent: created.title,
      sourceLocale: created.sourceLocale,
    },
    section: {
      id: sectionPage.id,
      name: sectionPage.name,
      category: sectionPage.category,
    },
    tags: created.tags,
    posts: [{
      id: `${created.id}-post-1`,
      topicId: created.id,
      authorId: created.authorId,
      authorName: created.authorName,
      parentPostId: null,
      solutionModerationStatus: null,
      solutionOutdatedReason: null,
      solutionOutdatedReasonKind: null,
      createdAt: created.createdAt,
      body: {
        id: `${created.id}-post-body-r1`,
        originalContent: created.body,
        sourceLocale: created.sourceLocale,
      },
    }],
  };
  const topic = previewApplyTopicState(baseTopic, interactions);
  return {
    locale: scenario.locale,
    topic,
    titlePresentation: originalPresentation(
      "topic-title",
      topic.id,
      topic.title.id,
      topic.title.originalContent,
      topic.title.sourceLocale,
      previewDirectionForLocale(topic.title.sourceLocale as PreviewLocale),
    ),
    postPresentations: previewPresentationsForTopic([], topic),
    generationUnits: [],
    canReply: scenario.identity !== "guest",
    canSubmitComplaint: scenario.identity !== "guest",
    editablePostIds: previewEditablePostIds(scenario, topic),
    canManageSolution: scenario.identity !== "guest",
    canConfirmOwnSolution: scenario.identity !== "guest",
    canEditOwnTitle: previewUser(scenario)?.id === topic.authorId,
    ...previewTopicWatchProps(scenario, interactions, topic.id),
    ...previewTopicBookmarkProps(scenario, interactions, topic.id),
    ...previewTopicMuteProps(scenario, interactions, topic.id),
    canManageAnySolution: false,
    canModerateHelpSolution: false,
    isTopicAuthor: scenario.identity !== "guest",
    canCorrectTitleSourceLocale: false,
    canCorrectAnySourceLocale: false,
    canManagePin: false,
    canUseAdminPanel: false,
    topicReadState: null,
  };
}

function previewCategory(locale: PreviewLocale, routeCategoryId: string | undefined) {
  const localizedCategory = locale === "ru"
    ? categoryRu
    : locale === "he"
      ? categoryRtl
      : category;

  const source = !routeCategoryId || routeCategoryId === categoryId
    ? localizedCategory
    : (() => {
        const overview = homepageCategories(locale).find((item) => item.id === routeCategoryId);
        if (!overview) return localizedCategory;
        return {
          id: overview.id,
          name: overview.name,
          sections: overview.sections.map((section) => ({
            id: section.id,
            name: section.name,
            topicCount: section.topicCount,
            postCount: section.messageCount,
          })),
        };
      })();

  return {
    ...source,
    sections: source.sections.map((section) => ({
      ...section,
      ...previewCategoryTopics(locale, section.id, section.name),
    })),
  };
}


function previewAttentionSamples() {
  return [
    {
      type: "signal" as const, id: "signal-142", kind: "needs-details" as const,
      topicId: "help-question", topicTitle: "Why does my Worker lose the session after redirect?",
      submittedByUserId: "reporter", submittedByName: "Alex Rivera",
      explanation: "Cookie settings and the redirect handler are missing. Without them, the issue cannot be reproduced.",
      createdAt: "2026-10-10T09:25:00.000Z", targetPostId: null, original: null,
    },
    {
      type: "signal" as const, id: "signal-143", kind: "duplicate" as const,
      topicId: "help-question", topicTitle: "Why does my Worker lose the session after redirect?",
      submittedByUserId: "reviewer", submittedByName: "Sam Lee",
      explanation: "I think this might already be answered in the linked topic.",
      createdAt: "2026-10-10T10:25:00.000Z", targetPostId: null,
      original: { id: "canonical-help", title: "Configuring sessions in Cloudflare Workers" },
    },
    {
      type: "signal" as const, id: "signal-144", kind: "needs-review" as const,
      topicId: "solved-help", topicTitle: "How to deploy a React Router app?",
      submittedByUserId: "reporter", submittedByName: "Alex Rivera",
      explanation: "The current best answer no longer works with the latest build.",
      createdAt: "2026-10-10T11:05:00.000Z", targetPostId: "best-answer", original: null,
    },
    {
      type: "signal" as const, id: "signal-145", kind: "solution-outdated" as const,
      topicId: "solved-help", topicTitle: "How to deploy a React Router app?",
      submittedByUserId: "reviewer", submittedByName: "Sam Lee",
      explanation: "The configuration keys changed in the current release.",
      createdAt: "2026-10-10T12:05:00.000Z", targetPostId: "best-answer", original: null,
    },
    {
      type: "appeal" as const, id: "appeal-146", kind: "appeal" as const,
      topicId: "disputed-question", topicTitle: "Why doesn't my database reconnect?",
      submittedByUserId: "author", submittedByName: "Jordan Chen",
      explanation: "My issue occurs after a network timeout, not after credential expiry.",
      createdAt: "2026-10-10T13:05:00.000Z", targetPostId: null,
      original: { id: "canonical-help", title: "Configuring sessions in Cloudflare Workers" },
    },
    {
      type: "review-status" as const, id: "best-answer", kind: "review-status" as const,
      topicId: "solved-help", topicTitle: "How to deploy a React Router app?",
      submittedByUserId: null, submittedByName: null,
      explanation: null, createdAt: "2026-10-10T14:05:00.000Z",
      targetPostId: "best-answer", original: null,
    },
  ];
}

function previewAttentionState(interactions: PreviewInteractionState) {
  const unresolved = previewAttentionSamples().filter(
    (item) => !interactions.resolvedAttentionCases.has(item.id),
  );
  const pending = (id: string) => !interactions.resolvedAttentionCases.has(id);
  const mixedPending = pending("signal-142") && pending("signal-143");
  return {
    unresolved,
    mixedPending,
    counts: {
      "needs-details": pending("signal-142") ? 1 : 0,
      "needs-review": (pending("signal-144") ? 1 : 0) + 1,
      "solution-outdated": pending("signal-145") ? 1 : 0,
      duplicate: pending("signal-143") ? 1 : 0,
      appeals: pending("appeal-146") ? 1 : 0,
      mixed: mixedPending ? 1 : 0,
    },
  };
}

function previewSecurityAttachmentQueue() {
  return {
    events: [{
      id: "security-attachment-1",
      uploadId: "upload-security-1",
      uploadedByUserId: "alex",
      contextKey: "reply:typed-api",
      draftId: "operation-security-1",
      fileName: "diagnostics.zip",
      declaredMime: "application/zip",
      detectedType: "application/x-dosexec",
      reason: "executable-signature",
      declaredByteSize: 4096,
      createdAt: "2026-11-18T11:20:00.000Z",
    }],
    hasMore: false,
    page: 0,
  };
}

async function previewAttentionAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  if (scenario.identity !== "manager") return null;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const caseId = String(form.get("caseId") ?? "");
  const topicId = String(form.get("topicId") ?? "");
  const item = previewAttentionSamples().find((candidate) =>
    candidate.id === caseId && candidate.topicId === topicId
  );
  if (!item || interactions.resolvedAttentionCases.has(caseId)) return null;

  const validIntent = item.type === "appeal"
    ? intent === "acceptHelpDuplicateAppeal" || intent === "rejectHelpDuplicateAppeal"
    : item.type === "signal"
      ? intent === "acceptHelpSignal" || intent === "rejectHelpSignal"
      : false;
  if (!validIntent) return null;

  interactions.resolvedAttentionCases.add(caseId);
  if (item.type === "signal") {
    previewAppendAdminHistory(scenario, interactions, {
      action: "help.signalReviewed",
      targetType: "topic",
      targetId: item.topicId,
      targetLabel: item.topicTitle,
      context: {
        signalId: item.id,
        kind: item.kind,
        resolution: intent === "acceptHelpSignal" ? "accepted" : "rejected",
      },
    });
  }
  const url = new URL(request.url);
  return redirect(url.pathname + url.search);
}

function previewAuthenticatedRouteData(scenario: Scenario) {
  if (!previewUser(scenario)) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  return null;
}

function previewAttentionAccessData(scenario: Scenario) {
  previewAuthenticatedRouteData(scenario);
  if (scenario.identity !== "manager" && scenario.identity !== "owner") {
    throw new Response("Forbidden", { status: 403 });
  }
  return null;
}

const PREVIEW_COMPLAINT_CASE_ID = "22222222-2222-4222-8222-222222222222";
const PREVIEW_COMPLAINT_APPEAL_CASE_ID = "33333333-3333-4333-8333-333333333333";
const PREVIEW_COMPLAINT_APPEAL_ID = "44444444-4444-4444-8444-444444444444";
const PREVIEW_COMPLAINT_RESULT_CASE_ID = "55555555-5555-4555-8555-555555555555";
const PREVIEW_COMPLAINT_RESULT_PARTICIPANT_ID = "alex";
const PREVIEW_COMPLAINT_RESULT_DECISION_ID = "66666666-6666-4666-8666-666666666666";
const PREVIEW_COMPLAINT_RESULT_RESOLVED_APPEAL_ID = "77777777-7777-4777-8777-777777777777";
const PREVIEW_COMPLAINT_RESULT_PENDING_APPEAL_ID = "88888888-8888-4888-8888-888888888888";
const PREVIEW_COMPLAINT_CONTEXT_POST_ID = "followup";

function previewComplaintParticipantResultAccessData(scenario: Scenario, caseId?: string) {
  previewAuthenticatedRouteData(scenario);
  const actor = previewUser(scenario);
  if (caseId !== PREVIEW_COMPLAINT_RESULT_CASE_ID || actor?.id !== PREVIEW_COMPLAINT_RESULT_PARTICIPANT_ID) {
    throw new Response("Not Found", { status: 404 });
  }
}

function previewComplaintParticipantResultData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  caseId?: string,
): { locale: string; result: ComplaintParticipantResultPresentation } {
  previewComplaintParticipantResultAccessData(scenario, caseId);
  const appeal = interactions.participantComplaintAppeal;
  return {
    locale: scenario.locale,
    result: {
      caseId: PREVIEW_COMPLAINT_RESULT_CASE_ID,
      decisionId: PREVIEW_COMPLAINT_RESULT_DECISION_ID,
      outcome: "confirmed",
      reasoning: "The reported message crossed the forum conduct boundary.",
      decidedAt: "2026-11-18T20:30:00.000Z",
      affectedAuthor: true,
      reporter: false,
      initialOutcome: "confirmed",
      effectiveOutcome: "confirmed",
      eligibleSide: "author",
      used: appeal ? 2 : 1,
      remaining: appeal ? 1 : 2,
      pending: Boolean(appeal),
      canAppeal: !appeal,
      appeals: [
        {
          id: PREVIEW_COMPLAINT_RESULT_RESOLVED_APPEAL_ID,
          ordinal: 1,
          side: "author",
          status: "resolved",
          outcome: "upheld",
          reasoning: "The original decision remains in effect after appeal review.",
          resolvedAt: "2026-11-18T21:20:00.000Z",
          ownArgument: "The answer was technical criticism, not a personal attack.",
        },
        ...(appeal ? [{
          id: appeal.id,
          ordinal: 2,
          side: "author" as const,
          status: "pending" as const,
          outcome: null,
          reasoning: null,
          resolvedAt: null,
          ownArgument: appeal.argument,
        }] : []),
      ],
    },
  };
}

async function previewComplaintParticipantResultAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  caseId?: string,
) {
  try {
    previewComplaintParticipantResultAccessData(scenario, caseId);
  } catch (error) {
    if (error instanceof Response && error.status === 404) return { error: "notFound" as const };
    throw error;
  }
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const decisionId = String(form.get("decisionId") ?? "");
  const operationId = String(form.get("operationId") ?? "").trim();
  const argument = String(form.get("argument") ?? "").trim();
  if (
    intent !== "appeal"
    || decisionId !== PREVIEW_COMPLAINT_RESULT_DECISION_ID
    || !operationId
    || !argument
    || [...argument].length > 2000
  ) {
    return { error: "invalid" as const };
  }

  const existing = interactions.participantComplaintAppeal;
  if (existing) {
    return existing.operationId === operationId && existing.argument === argument
      ? { ok: true as const, appealId: existing.id, operationId }
      : { error: "conflict" as const };
  }
  interactions.participantComplaintAppeal = {
    id: PREVIEW_COMPLAINT_RESULT_PENDING_APPEAL_ID,
    operationId,
    argument,
  };
  return { ok: true as const, appealId: PREVIEW_COMPLAINT_RESULT_PENDING_APPEAL_ID, operationId };
}

function PreviewComplaintResultRoute() {
  return <ComplaintResultView
    {...useLoaderData() as ReturnType<typeof previewComplaintParticipantResultData>}
  />;
}

function previewComplaintPrioritySettingsAccessData(scenario: Scenario) {
  previewAuthenticatedRouteData(scenario);
  if (scenario.identity !== "manager" && scenario.identity !== "owner") {
    throw new Response("Forbidden", { status: 403 });
  }
}

function previewComplaintPrioritySettingsData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
) {
  previewComplaintPrioritySettingsAccessData(scenario);
  return {
    locale: scenario.locale,
    settings: interactions.complaintPrioritySettings,
    canReview: scenario.identity === "manager" || scenario.identity === "owner",
  };
}

async function previewComplaintPrioritySettingsAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  previewComplaintPrioritySettingsAccessData(scenario);
  const form = await request.formData();
  const allowed = new Set(["expectedVersion", ...COMPLAINT_REASONS]);
  if ([...form.keys()].some((key) => !allowed.has(key))) {
    return { error: "invalid" as const };
  }

  const expectedVersion = String(form.get("expectedVersion") ?? "");
  if (!/^[1-9]\d{0,9}$/.test(expectedVersion) || Number(expectedVersion) > 2147483647) {
    return { error: "invalid" as const };
  }

  const weights = {} as ComplaintPrioritySettings["weights"];
  for (const reason of COMPLAINT_REASONS) {
    const value = String(form.get(reason) ?? "");
    if (value !== "1" && value !== "2" && value !== "3") {
      return { error: "invalid" as const };
    }
    weights[reason] = Number(value) as ComplaintPriority;
  }

  if (Number(expectedVersion) !== interactions.complaintPrioritySettings.version) {
    return { error: "conflict" as const };
  }
  interactions.complaintPrioritySettings = {
    version: interactions.complaintPrioritySettings.version + 1,
    weights,
  };
  return { ok: true as const };
}

function PreviewComplaintPrioritySettingsRoute() {
  return <ComplaintPrioritySettingsView
    {...useLoaderData() as ReturnType<typeof previewComplaintPrioritySettingsData>}
  />;
}

function previewComplaintAutomaticPriority(
  interactions: PreviewInteractionState,
  reasons: Partial<Record<(typeof COMPLAINT_REASONS)[number], number>>,
): ComplaintPriority {
  const priorities = COMPLAINT_REASONS
    .filter((reason) => Boolean(reasons[reason]))
    .map((reason) => interactions.complaintPrioritySettings.weights[reason]);
  return (priorities.length ? Math.max(...priorities) : 1) as ComplaintPriority;
}

function previewComplaintQueue(interactions: PreviewInteractionState): ComplaintQueuePage {
  if (interactions.complaintDecision) return { cases: [], total: 0, page: 0, hasMore: false };
  const reasons = { spam: 1, harassment: 1 } as const;
  const automaticPriority = previewComplaintAutomaticPriority(interactions, reasons);
  return {
    cases: [{
      id: PREVIEW_COMPLAINT_CASE_ID,
      version: interactions.complaintVersion,
      state: "open",
      kind: "post",
      topicId: "typed-api",
      postId: "answer",
      revisionId: "post-r2",
      topicTitle: "How should I structure a typed API client?",
      topicLocale: "en",
      excerpt: "Use a typed boundary at the HTTP edge, then keep domain code independent.",
      sourceLocale: "en",
      topicDirection: "ltr",
      excerptDirection: "ltr",
      reasons,
      reportCount: 2,
      firstReportedAt: "2026-11-18T09:10:00.000Z",
      lastReportedAt: "2026-11-18T09:42:00.000Z",
      automaticPriority,
      priorityOverride: interactions.complaintPriorityOverride,
      priority: interactions.complaintPriorityOverride ?? automaticPriority,
      activeElsewhere: false,
    }],
    total: 1,
    page: 0,
    hasMore: false,
  };
}

function previewComplaintFullContextPost(): ReviewFullPost {
  return {
    id: PREVIEW_COMPLAINT_CONTEXT_POST_ID,
    topicId: "typed-api",
    number: 2,
    source: {
      revisionId: "post-r3",
      originalContent: "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
      sourceLocale: "en",
      createdAt: "2026-09-27T11:00:00.000Z",
      direction: "ltr",
    },
    author: { id: "maya", name: "Maya Cohen" },
  };
}

function previewComplaintContextData(
  scenario: Scenario,
  caseId?: string,
  postId?: string,
): ReviewFullPost {
  previewAttentionAccessData(scenario);
  if (
    (caseId !== PREVIEW_COMPLAINT_CASE_ID && caseId !== PREVIEW_COMPLAINT_APPEAL_CASE_ID)
    || postId !== PREVIEW_COMPLAINT_CONTEXT_POST_ID
  ) {
    throw new Response("Not Found", { status: 404 });
  }
  return previewComplaintFullContextPost();
}

function previewComplaintAppealContextData(
  scenario: Scenario,
  caseId?: string,
  appealId?: string,
  postId?: string,
): ReviewFullPost {
  previewAttentionAccessData(scenario);
  if (
    caseId !== PREVIEW_COMPLAINT_APPEAL_CASE_ID
    || appealId !== PREVIEW_COMPLAINT_APPEAL_ID
    || postId !== PREVIEW_COMPLAINT_CONTEXT_POST_ID
  ) {
    throw new Response("Not Found", { status: 404 });
  }
  return previewComplaintFullContextPost();
}

function previewComplaintReview(interactions: PreviewInteractionState, includeIdentity = false): ReviewCase {
  const automaticPriority = previewComplaintAutomaticPriority(
    interactions,
    { spam: 1, harassment: 1 },
  );
  const topicTitle = {
    revisionId: "title-r1",
    originalContent: "How should I structure a typed API client?",
    sourceLocale: "en",
    createdAt: "2026-09-27T10:00:00.000Z",
    direction: "ltr" as const,
  };
  const reported = {
    revisionId: "post-r2",
    originalContent: "Use a typed boundary at the HTTP edge, then keep domain code independent.",
    sourceLocale: "en",
    createdAt: "2026-09-27T10:15:00.000Z",
    direction: "ltr" as const,
  };
  return {
    id: PREVIEW_COMPLAINT_CASE_ID,
    previousCaseId: null,
    state: interactions.complaintDecision ? "resolved" : "open",
    version: interactions.complaintVersion,
    kind: "post",
    targetId: "answer",
    topicId: "typed-api",
    postId: "answer",
    activeElsewhere: false,
    reported,
    current: reported,
    currentTopicTitle: topicTitle,
    targetPresent: true,
    automaticPriority,
    priorityOverride: interactions.complaintPriorityOverride,
    priority: interactions.complaintPriorityOverride ?? automaticPriority,
    reports: {
      items: [{
        id: "preview-report-1",
        reason: "harassment",
        explanation: "Representative complaint report for Pages preview.",
        createdAt: "2026-11-18T09:42:00.000Z",
        ...(includeIdentity ? { reporter: { id: "sam", name: "Sam Chen" } } : {}),
      }],
      total: 1,
      page: 0,
      hasMore: false,
    },
    independentReporterCount: 2,
    notes: {
      items: interactions.complaintNotes,
      total: interactions.complaintNotes.length,
      page: 0,
      hasMore: false,
    },
    evidence: { items: [], total: 0, page: 0, hasMore: false },
    context: {
      items: [{
        id: PREVIEW_COMPLAINT_CONTEXT_POST_ID,
        number: 2,
        author: { id: "maya", name: "Maya Cohen" },
        createdAt: "2026-09-27T11:00:00.000Z",
        excerpt: "Also test overflow with a long identifier",
        truncated: true,
        sourceLocale: "en",
        direction: "ltr",
      }],
      total: 1,
      page: 0,
      hasMore: false,
    },
    topic: {
      id: "typed-api",
      title: topicTitle,
      authorId: "alex",
      sectionId: "typescript",
      isPinned: true,
      isSolved: true,
      bestAnswerPostId: "answer",
      duplicateRelationshipId: null,
      duplicateOf: null,
      bestAnswer: {
        id: "answer",
        solutionModerationStatus: null,
        solutionOutdatedReason: null,
      },
      pendingHelpDuplicateAppeal: null,
    },
    decision: interactions.complaintDecision,
    permissions: {
      pin: false,
      solution: false,
      duplicate: false,
      sourceLocale: false,
      solutionModeration: false,
      identity: includeIdentity,
    },
  };
}

function previewComplaintTriage(interactions: PreviewInteractionState): ComplaintQueueCase {
  const item = previewComplaintQueue(interactions).cases[0];
  if (!item) throw new Response("Not Found", { status: 404 });
  return item;
}

async function previewComplaintTriageAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  caseId?: string,
) {
  previewAttentionAccessData(scenario);
  if (caseId !== PREVIEW_COMPLAINT_CASE_ID || interactions.complaintDecision) {
    return { error: "notFound" as const };
  }
  const form = await request.formData();
  const operationId = String(form.get("operationId") ?? "");
  const expectedVersion = Number(form.get("expectedVersion"));
  const rawPriority = String(form.get("priority") ?? "");
  if (!operationId || !Number.isInteger(expectedVersion)) return { error: "invalid" as const };
  if (expectedVersion !== interactions.complaintVersion) return { error: "conflict" as const };
  if (rawPriority !== "auto" && rawPriority !== "1" && rawPriority !== "2" && rawPriority !== "3") {
    return { error: "invalid" as const };
  }
  interactions.complaintPriorityOverride = rawPriority === "auto"
    ? null
    : Number(rawPriority) as ComplaintPriority;
  interactions.complaintVersion += 1;
  return { ok: true as const };
}

function PreviewComplaintTriageRoute() {
  const { locale, item } = useLoaderData() as { locale: string; item: ComplaintQueueCase };
  return <ComplaintTriageView locale={locale} item={item} />;
}

function previewComplaintAppeals(interactions: PreviewInteractionState): PendingAppealsPage {
  if (interactions.complaintAppealResolution) return { appeals: [], total: 0, page: 0, hasMore: false };
  return {
    appeals: [{
      id: PREVIEW_COMPLAINT_APPEAL_ID,
      caseId: PREVIEW_COMPLAINT_APPEAL_CASE_ID,
      ordinal: 1,
      createdAt: new Date("2026-11-18T21:00:00.000Z"),
      kind: "post",
      excerpt: "Use a typed boundary at the HTTP edge, then keep domain code independent.",
      sourceLocale: "en",
      sourceDirection: "ltr",
      initialOutcome: "confirmed",
      effectiveOutcome: "confirmed",
      ownInitialDecision: false,
    }],
    total: 1,
    page: 0,
    hasMore: false,
  };
}

function previewComplaintAppealReview(interactions: PreviewInteractionState, includeIdentity = false): AppealReviewPage {
  const resolution = interactions.complaintAppealResolution;
  const base = previewComplaintReview(interactions, includeIdentity);
  const caseReview: ReviewCase = {
    ...base,
    id: PREVIEW_COMPLAINT_APPEAL_CASE_ID,
    state: "resolved",
    version: 2,
    decision: {
      id: "preview-initial-decision",
      outcome: "confirmed",
      reasoning: "The reported message crossed the forum conduct boundary.",
      reviewerName: "Maya Cohen",
      createdAt: "2026-11-18T20:30:00.000Z",
    },
  };
  const appeal = {
    id: PREVIEW_COMPLAINT_APPEAL_ID,
    caseId: PREVIEW_COMPLAINT_APPEAL_CASE_ID,
    decisionId: "preview-initial-decision",
    ordinal: 1,
    side: "author" as const,
    argument: "The answer was technical criticism, not a personal attack.",
    status: resolution ? "resolved" as const : "pending" as const,
    outcome: resolution?.outcome ?? null,
    reasoning: resolution?.reasoning ?? null,
    createdAt: new Date("2026-11-18T21:00:00.000Z"),
    resolvedAt: resolution ? new Date("2026-11-18T21:20:00.000Z") : null,
    initialOutcome: "confirmed" as const,
    effectiveOutcome: resolution?.outcome === "overturned" ? "not-confirmed" as const : "confirmed" as const,
    ownInitialDecision: false,
    ...(includeIdentity ? { appellant: { id: "alex", name: "Alex Rivera" } } : {}),
  };
  return { appeal, caseReview, appeals: [appeal] };
}

async function previewComplaintAppealAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  caseId?: string,
  appealId?: string,
) {
  previewAttentionAccessData(scenario);
  if (caseId !== PREVIEW_COMPLAINT_APPEAL_CASE_ID || appealId !== PREVIEW_COMPLAINT_APPEAL_ID) {
    return { error: "notFound" as const };
  }
  if (interactions.complaintAppealResolution) return { error: "conflict" as const };
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "resolve") return { error: "invalid" as const };
  const operationId = String(form.get("operationId") ?? "");
  const outcome = String(form.get("outcome") ?? "");
  const reasoning = String(form.get("reasoning") ?? "").trim();
  if (!operationId || (outcome !== "upheld" && outcome !== "overturned") || !reasoning) {
    return { error: "invalid" as const };
  }
  interactions.complaintAppealResolution = { outcome, reasoning };
  return { ok: true as const, operationId };
}

function PreviewComplaintAppealReviewRoute() {
  const { locale, result } = useLoaderData() as { locale: string; result: AppealReviewPage };
  return <ComplaintAppealReviewView locale={locale} result={result} />;
}

function previewComplaintHistory(interactions: PreviewInteractionState): ComplaintResolvedHistoryPage {
  const cases: ComplaintResolvedHistoryPage["cases"] = [{
    id: PREVIEW_COMPLAINT_APPEAL_CASE_ID,
    kind: "post",
    text: "Use a typed boundary at the HTTP edge, then keep domain code independent.",
    sourceLocale: "en",
    resolvedAt: new Date("2026-11-18T20:30:00.000Z"),
    outcome: "confirmed",
    independentReporterCount: 1,
  }];
  if (interactions.complaintDecision) {
    cases.push({
      id: PREVIEW_COMPLAINT_CASE_ID,
      kind: "post",
      text: "Use a typed boundary at the HTTP edge, then keep domain code independent.",
      sourceLocale: "en",
      resolvedAt: new Date(interactions.complaintDecision.createdAt),
      outcome: interactions.complaintDecision.outcome,
      independentReporterCount: 2,
    });
  }
  return { cases, total: cases.length, page: 0, hasMore: false };
}

function previewComplaintTimelineEvent(
  event: Pick<ComplaintTimelineEvent, "id" | "kind" | "createdAt">
    & Partial<Omit<ComplaintTimelineEvent, "id" | "kind" | "createdAt">>,
): ComplaintTimelineEvent {
  return {
    moderatorName: null,
    reason: null,
    explanation: null,
    noteBody: null,
    decisionOutcome: null,
    reasoning: null,
    priorityOverride: null,
    appealArgument: null,
    appealSide: null,
    appealOrdinal: null,
    appealOutcome: null,
    appealReasoning: null,
    reporterName: null,
    reporterId: null,
    appellantName: null,
    appellantId: null,
    ...event,
  };
}

function previewComplaintTimeline(
  interactions: PreviewInteractionState,
  caseId?: string,
  includeIdentity = false,
): ComplaintTimelinePage {
  if (caseId === PREVIEW_COMPLAINT_CASE_ID && interactions.complaintDecision) {
    const events: ComplaintTimelineEvent[] = [
      previewComplaintTimelineEvent({
        id: "preview-history-submitted",
        kind: "submitted",
        createdAt: new Date("2026-11-18T09:42:00.000Z"),
        reason: "harassment",
        explanation: "Representative complaint report for Pages preview.",
        ...(includeIdentity ? { reporterName: "Sam Chen", reporterId: "sam" } : {}),
      }),
      ...interactions.complaintNotes.map((note) => previewComplaintTimelineEvent({
        id: `preview-history-${note.id}`,
        kind: "noted",
        createdAt: new Date(note.createdAt),
        moderatorName: note.author.name,
        noteBody: note.body,
      })),
      previewComplaintTimelineEvent({
        id: "preview-history-decision",
        kind: "decided",
        createdAt: new Date(interactions.complaintDecision.createdAt),
        moderatorName: interactions.complaintDecision.reviewerName,
        decisionOutcome: interactions.complaintDecision.outcome,
        reasoning: interactions.complaintDecision.reasoning,
      }),
    ];
    return {
      caseId,
      outcome: interactions.complaintDecision.outcome,
      resolvedAt: new Date(interactions.complaintDecision.createdAt),
      events,
      page: 0,
      total: events.length,
      hasMore: false,
    };
  }

  if (caseId === PREVIEW_COMPLAINT_APPEAL_CASE_ID) {
    const events: ComplaintTimelineEvent[] = [
      previewComplaintTimelineEvent({
        id: "preview-appeal-history-submitted",
        kind: "submitted",
        createdAt: new Date("2026-11-18T19:45:00.000Z"),
        reason: "harassment",
        explanation: "The answer targeted the author instead of the technical issue.",
        ...(includeIdentity ? { reporterName: "Sam Chen", reporterId: "sam" } : {}),
      }),
      previewComplaintTimelineEvent({
        id: "preview-appeal-history-decision",
        kind: "decided",
        createdAt: new Date("2026-11-18T20:30:00.000Z"),
        moderatorName: "Maya Cohen",
        decisionOutcome: "confirmed",
        reasoning: "The reported message crossed the forum conduct boundary.",
      }),
      previewComplaintTimelineEvent({
        id: "preview-appeal-history-submitted-appeal",
        kind: "appealed",
        createdAt: new Date("2026-11-18T21:00:00.000Z"),
        appealArgument: "The answer was technical criticism, not a personal attack.",
        appealSide: "author",
        appealOrdinal: 1,
        ...(includeIdentity ? { appellantName: "Alex Rivera", appellantId: "alex" } : {}),
      }),
    ];
    if (interactions.complaintAppealResolution) {
      events.push(previewComplaintTimelineEvent({
        id: "preview-appeal-history-resolution",
        kind: "appeal-resolved",
        createdAt: new Date("2026-11-18T21:15:00.000Z"),
        moderatorName: "Maya Cohen",
        appealArgument: "The answer was technical criticism, not a personal attack.",
        appealSide: "author",
        appealOrdinal: 1,
        ...(includeIdentity ? { appellantName: "Alex Rivera", appellantId: "alex" } : {}),
        appealOutcome: interactions.complaintAppealResolution.outcome,
        appealReasoning: interactions.complaintAppealResolution.reasoning,
      }));
    }
    return {
      caseId,
      outcome: "confirmed",
      resolvedAt: new Date("2026-11-18T20:30:00.000Z"),
      events,
      page: 0,
      total: events.length,
      hasMore: false,
    };
  }

  throw new Response("Not Found", { status: 404 });
}

function PreviewComplaintHistoryRoute() {
  const { locale, timeline } = useLoaderData() as { locale: string; timeline: ComplaintTimelinePage };
  return <ComplaintTimelineView locale={locale} timeline={timeline} />;
}

async function previewComplaintReviewAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  caseId?: string,
) {
  previewAttentionAccessData(scenario);
  if (caseId !== PREVIEW_COMPLAINT_CASE_ID && caseId !== PREVIEW_COMPLAINT_APPEAL_CASE_ID) {
    return { error: "notFound" as const };
  }
  const actor = previewUser(scenario)!;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const operationId = String(form.get("operationId") ?? "");
  if (!operationId) return { error: "invalid" as const };

  if (intent === "note") {
    const body = String(form.get("body") ?? "").trim();
    if (!body) return { error: "invalid" as const };
    interactions.complaintNotes.push({
      id: `preview-note-${++interactions.sequence}`,
      body,
      author: { id: actor.id, name: actor.name },
      createdAt: "2026-11-18T20:10:00.000Z",
    });
    return { ok: true as const, intent, operationId };
  }

  if (intent === "decision") {
    if (caseId !== PREVIEW_COMPLAINT_CASE_ID || interactions.complaintDecision) {
      return { error: "conflict" as const };
    }
    const expectedVersion = Number(form.get("expectedVersion"));
    const outcome = String(form.get("outcome") ?? "");
    const reasoning = String(form.get("reasoning") ?? "").trim();
    if (expectedVersion !== interactions.complaintVersion
      || (outcome !== "confirmed" && outcome !== "not-confirmed")
      || !reasoning) return { error: "invalid" as const };
    interactions.complaintDecision = {
      id: `preview-decision-${++interactions.sequence}`,
      outcome,
      reasoning,
      createdAt: "2026-11-18T20:20:00.000Z",
      reviewerName: actor.name,
    };
    interactions.complaintVersion += 1;
    return { ok: true as const, intent, operationId };
  }
  return { error: "invalid" as const };
}

function PreviewComplaintReviewRoute() {
  const { locale, item } = useLoaderData() as { locale: string; item: ReviewCase };
  return <ComplaintReviewView locale={locale} item={item} />;
}

function PreviewAttentionRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const [params] = useSearchParams();
  const requestedMode = params.get("mode");
  const mode = requestedMode === "complaints" || requestedMode === "security" ? requestedMode : "signals";
  const selected = params.get("group");
  const group = mode === "signals"
    ? selected === "needs-review" || selected === "solution-outdated" || selected === "duplicate" || selected === "appeals" || selected === "mixed"
      ? selected : "needs-details"
    : mode === "security"
      ? selected === "group2" || selected === "group3" ? selected : "attachments"
      : selected === "group2" || selected === "group3" ? selected : "group1";

  const { unresolved, mixedPending, counts } = previewAttentionState(interactions);
  const samples = scenario.variant === "attention-empty" ? [] : unresolved;
  const selectedCases = group === "mixed"
    ? (mixedPending ? samples.filter((item) => item.id === "signal-142" || item.id === "signal-143") : [])
    : samples.filter((item) => item.kind === group ||
      (group === "appeals" && item.type === "appeal") ||
      (group === "needs-review" && item.type === "review-status"));
  return <AttentionCenterView
    locale={scenario.locale} accountId={previewUser(scenario)?.id ?? null} mode={mode} group={group}
    queue={mode === "signals"
      ? { cases: selectedCases, hasMore: false, page: 0 }
      : null}
    counts={mode === "signals" ? counts : null}
    securityQueue={mode === "security" && group === "attachments"
      ? previewSecurityAttachmentQueue()
      : null}
    complaintQueue={mode === "complaints" && group === "group1"
      ? previewComplaintQueue(interactions)
      : null}
    complaintAppeals={mode === "complaints" && group === "group2"
      ? previewComplaintAppeals(interactions)
      : null}
    complaintHistory={mode === "complaints" && group === "group3"
      ? previewComplaintHistory(interactions)
      : null}
    canReadSecurityAttachments={scenario.identity === "manager" || scenario.identity === "owner"}
    canReviewComplaints={scenario.identity === "manager" || scenario.identity === "owner"}
    canReviewAppeals={scenario.identity === "manager" || scenario.identity === "owner"}
    canManageComplaintPriorities={scenario.identity === "manager" || scenario.identity === "owner"}
    referenceTime={previewReferenceTime}
  />;
}

function previewCategoryAccessData(
  scenario: Scenario,
  request: Request,
  routeCategoryId?: string,
) {
  if (!routeCategoryId || !homepageCategories(scenario.locale).some((category) => category.id === routeCategoryId)) {
    throw new Response("Not Found", { status: 404 });
  }
  if (routeCategoryId !== HELP_SOLUTIONS_CATEGORY_ID) return null;
  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("mode");
  const needsReview = searchParams.get("solution") === "needs-review";
  if ((mode === "mine" || mode === "help" || mode === "for-me" || needsReview) && !previewUser(scenario)) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  if (needsReview && scenario.identity !== "manager" && scenario.identity !== "owner") {
    throw new Response("Forbidden", { status: 403 });
  }
  return null;
}

function PreviewCategoryRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const { categoryId: routeCategoryId } = useParams();
  const [searchParams] = useSearchParams();
  const routeActionData = useActionData() as Parameters<typeof HelpSolutionsView>[0]["actionData"];
  if (routeCategoryId === HELP_SOLUTIONS_CATEGORY_ID) {
    const requestedMode = searchParams.get("mode");
    const mode = requestedMode === "open"
      ? "open"
      : requestedMode === "help"
        ? "help"
        : requestedMode === "for-me"
          ? "for-me"
          : requestedMode === "active"
            ? "active"
          : requestedMode === "solutions"
            ? "solutions"
            : requestedMode === "mine"
              ? "mine"
              : "all";
    const filters: ForumHelpSolutionsFilters = {
      ...(searchParams.get("solution") === "open"
        || searchParams.get("solution") === "solved"
        || searchParams.get("solution") === "needs-review"
        || searchParams.get("solution") === "outdated"
        ? { solution: searchParams.get("solution") as NonNullable<ForumHelpSolutionsFilters["solution"]> }
        : {}),
      ...(searchParams.get("answers") === "none" || searchParams.get("answers") === "has"
        ? { answers: searchParams.get("answers") as NonNullable<ForumHelpSolutionsFilters["answers"]> }
        : {}),
      ...(searchParams.get("quality") === "normal" || searchParams.get("quality") === "needs-details"
        ? { quality: searchParams.get("quality") as NonNullable<ForumHelpSolutionsFilters["quality"]> }
        : {}),
      ...(searchParams.get("relation") === "standalone" || searchParams.get("relation") === "duplicate"
        ? { relation: searchParams.get("relation") as NonNullable<ForumHelpSolutionsFilters["relation"]> }
        : {}),
    };
    const basePage = previewHelpSolutions(scenario.locale);
    const createdQuestions = [...interactions.createdTopics.values()]
      .filter((topic) => topic.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID)
      .map((topic) => {
        const replies = interactions.replies.get(topic.id) ?? [];
        const override = interactions.topicOverrides.get(topic.id);
        return {
          id: topic.id,
          title: topic.title,
          authorName: topic.authorName,
          replyCount: replies.length,
          isSolved: override?.isSolved ?? false,
          hasBestAnswer: Boolean(override?.bestAnswerPostId),
          solutionModerationStatus: null,
          solutionOutdatedReason: null,
          solutionOutdatedReasonKind: null,
          needsDetails: false,
          duplicateOf: null,
          duplicateDisputed: false,
          createdAt: topic.createdAt.toISOString(),
          activityAt: (replies.at(-1)?.createdAt ?? topic.createdAt).toISOString(),
          tags: topic.tags,
        };
      });
    const page = { ...basePage, questions: [...createdQuestions, ...basePage.questions] };
    const previewIdentity = previewUser(scenario);
    const filteredPage = scenario.variant === "help-solutions-open-empty" && mode === "open"
      ? { ...page, questions: [] }
      : scenario.variant === "help-solutions-want-empty" && mode === "help"
        ? { ...page, questions: [] }
        : scenario.variant === "help-solutions-for-me-empty" && mode === "for-me"
          ? { ...page, questions: [] }
          : scenario.variant === "help-solutions-active-empty" && mode === "active"
            ? { ...page, questions: [] }
          : scenario.variant === "help-solutions-mine-empty" && mode === "mine"
            ? { ...page, questions: [] }
            : mode === "open"
              ? { ...page, questions: page.questions.filter((question) => !question.isSolved) }
              : mode === "help"
                ? { ...page, questions: page.questions.filter((question) => !question.isSolved && question.authorName !== previewIdentity?.name) }
                : mode === "for-me"
                  ? {
                      ...page,
                      questions: page.questions.filter((question) =>
                        !question.isSolved
                        && question.authorName !== previewIdentity?.name
                        && question.tags.some(({ key }) => key === "better-auth" || key === "workers")
                      ),
                    }
                  : mode === "active"
                    ? { ...page, questions: page.questions.filter((question) => question.replyCount > 0) }
                : mode === "solutions"
                  ? { ...page, questions: page.questions.filter((question) => question.isSolved) }
                  : mode === "mine"
                    ? { ...page, questions: page.questions.filter((question) => question.authorName === previewIdentity?.name) }
                    : page;
    const filterQuestion = (question: typeof page.questions[number]) =>
      (!filters.solution
        || (filters.solution === "open" && !question.isSolved)
        || (filters.solution === "solved" && question.isSolved)
        || (filters.solution === "needs-review" && question.solutionModerationStatus === "needs-review")
        || (filters.solution === "outdated" && question.solutionModerationStatus === "outdated"))
      && (!filters.answers
        || (filters.answers === "none" && question.replyCount === 0)
        || (filters.answers === "has" && question.replyCount > 0))
      && (!filters.quality
        || (filters.quality === "normal" && !question.needsDetails)
        || (filters.quality === "needs-details" && question.needsDetails))
      && (!filters.relation
        || (filters.relation === "standalone" && !question.duplicateOf)
        || (filters.relation === "duplicate" && Boolean(question.duplicateOf)));
    const combinedFilteredPage = {
      ...filteredPage,
      questions: filteredPage.questions.filter(filterQuestion),
    };

    const similarVariant = scenario.variant?.startsWith("help-solutions-similar-")
      ? scenario.variant
      : undefined;
    const similarDraft = {
      title: similarVariant === "help-solutions-similar-invalid" ? "" : page.questions[0]?.title ?? "Worker authentication issue",
      body: scenario.locale === "ru"
        ? "Сессия пропадает после redirect. Проверяю, обсуждалась ли уже такая проблема.\n\n```ts\nconst session = await getSession(request);\n```"
        : scenario.locale === "he"
          ? "ה-session נעלם אחרי redirect. בודק אם הבעיה כבר נדונה.\n\n```ts\nconst session = await getSession(request);\n```"
          : "The session disappears after redirect. Checking whether this issue already exists.\n\n```ts\nconst session = await getSession(request);\n```",
      tags: "Cloudflare, Auth",
    };
    const fixtureActionData = similarVariant
      ? {
          operation: "helpSimilarQuestions" as const,
          outcome: similarVariant === "help-solutions-similar-results"
            ? "results" as const
            : similarVariant === "help-solutions-similar-empty"
              ? "empty" as const
              : similarVariant === "help-solutions-similar-invalid"
                ? "invalid" as const
                : "unavailable" as const,
          draft: similarDraft,
          results: similarVariant === "help-solutions-similar-results"
            ? page.questions.slice(0, 2).map((question, index) => ({
                id: question.id,
                title: question.title,
                replyCount: question.replyCount,
                isSolved: question.isSolved,
                tags: question.tags,
                matchSource: index === 0 ? "title" as const : "tags" as const,
              }))
            : [],
        }
      : undefined;
    return (
      <HelpSolutionsView
        locale={scenario.locale}
        canUploadAttachments={false}
        mode={mode}
        filters={filters}
        page={combinedFilteredPage}
        referenceTime={previewReferenceTime}
        isAuthenticated={scenario.identity !== "guest"}
        canAskQuestion={scenario.identity !== "guest"}
        canViewSolutionModeration={scenario.identity === "manager"}
        canViewDuplicateDispute={scenario.identity === "manager"}
        actionData={routeActionData ?? fixtureActionData}
      />
    );
  }

  const baseCategoryPage = previewCategory(scenario.locale, routeCategoryId);
  const categoryPage = scenario.variant === "category-no-pins"
    ? {
        ...baseCategoryPage,
        sections: baseCategoryPage.sections.map((section) => ({ ...section, pinnedTopics: [] })),
      }
    : baseCategoryPage;

  return (
    <CategoryView
      locale={scenario.locale}
      category={categoryPage}
      referenceTime={previewReferenceTime}
    />
  );
}

function previewSection(locale: PreviewLocale, routeSectionId: string | undefined) {
  const localizedSection = locale === "ru" ? sectionRu : locale === "he" ? sectionRtl : section;
  if (!routeSectionId || routeSectionId === sectionId) return localizedSection;

  if (routeSectionId === "empty") {
    return {
      id: "empty",
      name: locale === "ru"
        ? "Новый раздел сообщества"
        : locale === "he"
          ? "מדור קהילה חדש"
          : "New community section",
      category: {
        id: categoryId,
        name: locale === "ru"
          ? "Разработка"
          : locale === "he"
            ? "פיתוח"
            : "Development",
      },
      topics: [],
    };
  }

  const matched = homepageCategories(locale)
    .map((overview) => previewCategory(locale, overview.id))
    .flatMap((candidateCategory) =>
      candidateCategory.sections.map((candidateSection) => ({
        category: candidateCategory,
        section: candidateSection,
      }))
    )
    .find(({ section: candidateSection }) => candidateSection.id === routeSectionId);

  if (!matched) return localizedSection;

  const topicTitles = locale === "ru"
    ? ["Первый вопрос раздела", "Практический пример", "Полезное обсуждение"]
    : locale === "he"
      ? ["השאלה הראשונה במדור", "דוגמה מעשית", "דיון שימושי"]
      : ["First section question", "Practical example", "Useful discussion"];

  return {
    id: matched.section.id,
    name: matched.section.name,
    category: { id: matched.category.id, name: matched.category.name },
    topics: topicTitles.map((title, index) => ({
      id: `${matched.section.id}-topic-${index + 1}`,
      authorName: ["Alex Rivera", "Maya Cohen", "Sam Chen"][index]!,
      postCount: [3, 5, 8][index]!,
      createdAt: new Date(`2026-09-${27 + index}T10:00:00Z`),
      isPinned: index === 0,
      tags: [],
      title: {
        id: `${matched.section.id}-title-${index + 1}`,
        originalContent: title,
        sourceLocale: locale,
      },
    })),
  };
}

function previewSectionAccessData(scenario: Scenario, routeSectionId?: string) {
  if (routeSectionId === "empty") return null;
  const exists = homepageCategories(scenario.locale).some((category) =>
    category.sections.some((section) => section.id === routeSectionId)
  );
  if (!routeSectionId || !exists) {
    throw new Response("Not Found", { status: 404 });
  }
  return null;
}

function PreviewSectionRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const { sectionId: routeSectionId } = useParams();
  const page = previewSectionWithInteractions(scenario.locale, routeSectionId, interactions);
  return (
    <SectionView
      locale={scenario.locale}
      canUploadAttachments={false}
      section={page}
      canCreateTopic={scenario.identity !== "guest"}
      topicReadStates={scenario.identity === "guest" ? null : Object.fromEntries(
        page.topics.map((topic, index) => [
          topic.id,
          (["new", "unread", "read"] as const)[index % 3],
        ]),
      )}
      actionData={scenario.view === "section" && scenario.variant === "section-form-error"
        ? { error: "rateLimited" }
        : undefined}
    />
  );
}

const previewAdminAccess = {
  actorId: "maya",
  canEnter: true,
  canManageAuthorization: true,
  canReadForum: true,
  canReadUsers: true,
  canReadHistory: true,
  canManageMeasures: true,
} as const;

function previewAdminBrowseQuery(request: Request) {
  return { search: new URL(request.url).searchParams.get("q")?.trim() ?? "" };
}

function previewAdminCategories(locale: PreviewLocale) {
  return homepageCategories(locale).map((category) => ({
    id: category.id,
    name: category.name,
    sectionCount: category.sectionCount,
    topicCount: category.topicCount,
    postCount: category.messageCount,
    reserved: category.id === HELP_SOLUTIONS_CATEGORY_ID,
  }));
}

function previewAdminSections(locale: PreviewLocale, categoryId: string) {
  const category = previewCategory(locale, categoryId);
  return category.sections.map((section) => ({
    id: section.id,
    name: section.name,
    category: { id: category.id, name: category.name },
    topicCount: section.topicCount,
    postCount: section.postCount,
    service: section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID,
  }));
}

function previewAdminFilter<T extends { id: string; name?: string; title?: string }>(
  items: readonly T[],
  search: string,
) {
  if (!search) return [...items];
  const needle = search.toLocaleLowerCase("en");
  return items.filter((item) =>
    item.id.toLocaleLowerCase("en").includes(needle)
    || item.name?.toLocaleLowerCase("en").includes(needle)
    || item.title?.toLocaleLowerCase("en").includes(needle)
  );
}

const PREVIEW_ADMIN_CREATE_ID = "33333333-3333-4333-8333-333333333333";

function previewAdminMeasureById(
  interactions: PreviewInteractionState,
  measureId?: string,
): PreviewAdminMeasure | null {
  if (!measureId) return null;
  const created = interactions.adminCreatedMeasures.get(measureId);
  if (created) return created;
  if (measureId !== PREVIEW_OWN_MEASURE_ID) return null;
  const own = previewOwnMeasureDetail(interactions);
  const adminAppeals = own.appeals.length ? own.appeals : [{
    id: "66666666-6666-4666-8666-666666666666",
    ordinal: 1,
    body: "Please review this restriction; the original context has changed.",
    status: "pending" as const,
    createdAt: "2026-11-17T18:00:00.000Z",
    resolvedAt: null,
    explanation: null,
    remedy: null,
  }];
  return {
    ...own,
    usedAppeals: Math.max(1, own.usedAppeals),
    pendingAppeal: adminAppeals.some((appeal) => appeal.status === "pending"),
    appeals: adminAppeals,
    targetUserId: "alex",
    targetName: "Alex Rivera",
    canMutate: true,
  };
}

function previewAdminMeasuresForTarget(
  interactions: PreviewInteractionState,
  targetId: string,
) {
  const base = targetId === "alex" && !interactions.adminCreatedMeasures.has(PREVIEW_OWN_MEASURE_ID)
    ? [previewAdminMeasureById(interactions, PREVIEW_OWN_MEASURE_ID)!]
    : [];
  return [
    ...interactions.adminCreatedMeasures.values(),
    ...base,
  ].filter((measure) => measure.targetUserId === targetId);
}

function previewAdminMeasuresData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => key !== "target") || query.getAll("target").length > 1) {
    throw new Response("Invalid query", { status: 400 });
  }
  const targetId = query.get("target")?.trim() ?? "";
  if (!targetId) {
    return {
      locale: scenario.locale,
      target: null,
      pendingAppeals: {
        appeals: (() => {
          const measure = previewAdminMeasureById(interactions, PREVIEW_OWN_MEASURE_ID);
          const appeal = measure?.appeals.find((candidate) => candidate.status === "pending");
          return appeal ? [{
            id: appeal.id,
            measureId: PREVIEW_OWN_MEASURE_ID,
            targetUserId: "alex",
            targetName: "Alex Rivera",
            ordinal: appeal.ordinal,
            submittedAt: appeal.createdAt,
          }] : [];
        })(),
        nextPage: null,
      },
      requestedTarget: "",
      createId: PREVIEW_ADMIN_CREATE_ID,
      access: previewAdminAccess,
      maySelectAdministrativeRestrictions: scenario.identity === "owner",
    };
  }
  const targetName = previewProfileNames[targetId];
  if (!targetName) throw new Response("Not Found", { status: 404 });
  return {
    locale: scenario.locale,
    target: {
      id: targetId,
      name: targetName,
      measures: previewAdminMeasuresForTarget(interactions, targetId),
    },
    pendingAppeals: null,
    requestedTarget: targetId,
    createId: PREVIEW_ADMIN_CREATE_ID,
    access: previewAdminAccess,
    maySelectAdministrativeRestrictions: scenario.identity === "owner",
  };
}

function PreviewAdminMeasuresRoute() {
  const data = useLoaderData() as ReturnType<typeof previewAdminMeasuresData>;
  const feedback = useActionData() as { error?: "invalid" | "notFound" } | undefined;
  return <AdminMeasuresIndex {...data} feedback={feedback} />;
}

function PreviewAdminMeasureRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const { measureId } = useParams();
  const measure = previewAdminMeasureById(interactions, measureId);
  const feedback = useActionData() as { ok?: boolean; error?: "invalid" | "conflict" } | undefined;
  if (!measure) throw new Response("Not Found", { status: 404 });
  return <AdminMeasureDetail
    locale={scenario.locale}
    measure={measure}
    changeId="44444444-4444-4444-8444-444444444444"
    liftId="55555555-5555-4555-8555-555555555555"
    reviewIds={measure.appeals.map((appeal) => ({
      appealId: appeal.id,
      operationId: `review-${appeal.id}`,
    }))}
    access={previewAdminAccess}
    maySelectAdministrativeRestrictions={scenario.identity === "owner"}
    feedback={feedback}
  />;
}

async function previewAdminMeasuresAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "create") return { error: "invalid" as const };
  const measureId = String(form.get("measureId") ?? "");
  const targetUserId = String(form.get("targetId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const targetName = previewProfileNames[targetUserId];
  if (measureId !== PREVIEW_ADMIN_CREATE_ID || !targetName || !reason
    || interactions.adminCreatedMeasures.has(measureId)) {
    return { error: "invalid" as const };
  }
  const restrictions = form.getAll("restriction").map(String).filter((value) =>
    ["topics.create","replies.create","attachments.upload","posts.edit","profile.edit",
      "complaints.submit","helpSignals.submit","translations.generate","admin.forum",
      "admin.complaints","admin.security","admin.usersAccess"].includes(value)
  ) as PreviewAdminMeasure["restrictions"];
  const expiresAtRaw = String(form.get("expiresAt") ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
  const measure: PreviewAdminMeasure = {
    id: measureId,
    targetUserId,
    targetName,
    canMutate: true,
    createdAt: "2026-11-18T20:30:00.000Z",
    expiresAt,
    liftedAt: null,
    version: 1,
    initialReason: reason,
    latestChangeReason: null,
    status: "active",
    restrictions,
    usedAppeals: 0,
    pendingAppeal: false,
    appeals: [],
    timeline: [{
      action: "measure.created",
      occurredAt: "2026-11-18T20:30:00.000Z",
      reason,
      before: null,
      after: { version: 1, restrictions, expiresAt, lifted: false },
      outcome: null,
      remedy: null,
    }],
  };
  interactions.adminCreatedMeasures.set(measure.id, measure);
  previewAppendAdminHistory(scenario, interactions, {
    action: "measure.created",
    targetType: "user-measure",
    targetId: measure.id,
    targetLabel: targetName,
    reason,
    context: {
      targetUserId,
      before: null,
      after: { version: 1, restrictions, expiresAt, lifted: false },
    },
  }, reason);
  return redirect(`/${encodeURIComponent(scenario.locale)}/admin/measures/${encodeURIComponent(measure.id)}`);
}

async function previewAdminMeasureAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeMeasureId?: string,
) {
  const measure = previewAdminMeasureById(interactions, routeMeasureId);
  if (!measure || !routeMeasureId || !measure.canMutate) {
    return { error: "invalid" as const };
  }
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const expectedVersion = Number(String(form.get("expectedVersion") ?? ""));
  if (!Number.isInteger(expectedVersion) || expectedVersion !== measure.version) {
    return { error: "conflict" as const };
  }

  const before = {
    version: measure.version,
    restrictions: [...measure.restrictions],
    expiresAt: measure.expiresAt,
    lifted: measure.status === "lifted",
  };

  if (intent === "change") {
    const reason = String(form.get("reason") ?? "").trim();
    if (!reason) return { error: "invalid" as const };
    const restrictions = form.getAll("restriction").map(String).filter((value) =>
      ["topics.create","replies.create","attachments.upload","posts.edit","profile.edit",
        "complaints.submit","helpSignals.submit","translations.generate","admin.forum",
        "admin.complaints","admin.security","admin.usersAccess"].includes(value)
    ) as PreviewAdminMeasure["restrictions"];
    const expiresAtRaw = String(form.get("expiresAt") ?? "").trim();
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
    if (restrictions.length === measure.restrictions.length
      && restrictions.every((value, index) => value === measure.restrictions[index])
      && expiresAt === measure.expiresAt) {
      return { ok: true as const };
    }
    const next: PreviewAdminMeasure = {
      ...measure,
      version: measure.version + 1,
      latestChangeReason: reason,
      restrictions,
      expiresAt,
      timeline: [...measure.timeline, {
        action: "measure.changed",
        occurredAt: "2026-11-18T20:40:00.000Z",
        reason,
        before,
        after: {
          version: measure.version + 1,
          restrictions,
          expiresAt,
          lifted: false,
        },
        outcome: null,
        remedy: null,
      }],
    };
    interactions.adminCreatedMeasures.set(routeMeasureId, next);
    previewAppendAdminHistory(scenario, interactions, {
      action: "measure.changed",
      targetType: "user-measure",
      targetId: routeMeasureId,
      targetLabel: measure.targetName,
      reason,
      context: {
        targetUserId: measure.targetUserId,
        before,
        after: {
          version: next.version,
          restrictions,
          expiresAt,
          lifted: false,
        },
      },
    }, reason);
    return { ok: true as const };
  }

  if (intent === "lift") {
    const reason = String(form.get("reason") ?? "").trim();
    if (!reason) return { error: "invalid" as const };
    const next: PreviewAdminMeasure = {
      ...measure,
      version: measure.version + 1,
      liftedAt: "2026-11-18T20:45:00.000Z",
      status: "lifted",
      latestChangeReason: reason,
      pendingAppeal: false,
      appeals: measure.appeals.map((appeal) =>
        appeal.status === "pending" ? { ...appeal, status: "moot" as const } : appeal
      ),
      timeline: [...measure.timeline, {
        action: "measure.lifted",
        occurredAt: "2026-11-18T20:45:00.000Z",
        reason,
        before,
        after: {
          version: measure.version + 1,
          restrictions: [...measure.restrictions],
          expiresAt: measure.expiresAt,
          lifted: true,
        },
        outcome: null,
        remedy: null,
      }],
    };
    interactions.adminCreatedMeasures.set(routeMeasureId, next);
    previewAppendAdminHistory(scenario, interactions, {
      action: "measure.lifted",
      targetType: "user-measure",
      targetId: routeMeasureId,
      targetLabel: measure.targetName,
      reason,
      context: {
        targetUserId: measure.targetUserId,
        before,
        after: {
          version: next.version,
          restrictions: [...measure.restrictions],
          expiresAt: measure.expiresAt,
          lifted: true,
        },
      },
    }, reason);
    return { ok: true as const };
  }

  if (intent === "review") {
    const appealId = String(form.get("appealId") ?? "");
    const appeal = measure.appeals.find((candidate) =>
      candidate.id === appealId && candidate.status === "pending"
    );
    const outcome = String(form.get("outcome") ?? "");
    const explanation = String(form.get("explanation") ?? "").trim();
    const remedy = String(form.get("remedy") ?? "");
    if (!appeal || !explanation || (outcome !== "accepted" && outcome !== "rejected")
      || (outcome === "accepted" && remedy !== "change" && remedy !== "lift")) {
      return { error: "invalid" as const };
    }

    const accepting = outcome === "accepted";
    const lifting = accepting && remedy === "lift";
    const changing = accepting && remedy === "change";
    const restrictions = changing
      ? form.getAll("restriction").map(String).filter((value) =>
          ["topics.create","replies.create","attachments.upload","posts.edit","profile.edit",
            "complaints.submit","helpSignals.submit","translations.generate","admin.forum",
            "admin.complaints","admin.security","admin.usersAccess"].includes(value)
        ) as PreviewAdminMeasure["restrictions"]
      : [...measure.restrictions];
    const expiresAtRaw = changing ? String(form.get("expiresAt") ?? "").trim() : "";
    const expiresAt = changing
      ? (expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null)
      : measure.expiresAt;
    if (changing
      && restrictions.length === measure.restrictions.length
      && restrictions.every((value, index) => value === measure.restrictions[index])
      && expiresAt === measure.expiresAt) {
      return { error: "conflict" as const };
    }
    const nextVersion = accepting ? measure.version + 1 : measure.version;
    const next: PreviewAdminMeasure = {
      ...measure,
      version: nextVersion,
      restrictions,
      expiresAt,
      liftedAt: lifting ? "2026-11-18T20:50:00.000Z" : measure.liftedAt,
      status: lifting ? "lifted" : measure.status,
      latestChangeReason: accepting ? explanation : measure.latestChangeReason,
      pendingAppeal: false,
      appeals: measure.appeals.map((candidate) => candidate.id === appealId ? {
        ...candidate,
        status: outcome as "accepted" | "rejected",
        resolvedAt: "2026-11-18T20:50:00.000Z",
        explanation,
        remedy: accepting ? remedy as "change" | "lift" : null,
      } : candidate),
      timeline: [...measure.timeline, {
        action: "measure.appealResolved",
        occurredAt: "2026-11-18T20:50:00.000Z",
        reason: explanation,
        before,
        after: {
          version: nextVersion,
          restrictions,
          expiresAt,
          lifted: lifting,
        },
        outcome: outcome as "accepted" | "rejected",
        remedy: accepting ? remedy as "change" | "lift" : null,
      }],
    };
    interactions.adminCreatedMeasures.set(routeMeasureId, next);
    previewAppendAdminHistory(scenario, interactions, {
      action: "measure.appealResolved",
      targetType: "user-measure",
      targetId: routeMeasureId,
      targetLabel: measure.targetName,
      reason: explanation,
      context: {
        targetUserId: measure.targetUserId,
        before,
        after: {
          version: next.version,
          restrictions,
          expiresAt,
          lifted: lifting,
        },
        appealId,
        outcome: outcome as "accepted" | "rejected",
        remedy: accepting ? remedy as "change" | "lift" : undefined,
      },
    }, explanation);
    return { ok: true as const };
  }

  return { error: "invalid" as const };
}

function previewAppendAdminHistory(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  change: AdminHistoryChange,
  reason?: string | null,
) {
  const actor = previewUser(scenario);
  if (!actor) return;
  const sequence = ++interactions.sequence;
  interactions.adminHistoryEvents.unshift({
    id: `preview-history-${sequence}`,
    at: new Date(Date.UTC(2026, 10, 18, 20, 0, Math.min(sequence, 59))).toISOString(),
    actorId: actor.id,
    actorLabel: actor.name,
    change,
    ...(reason ? { reason } : {}),
  });
}

function PreviewAdminHistoryRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const { t } = useTranslation("common");
  return <AdminShell locale={scenario.locale} access={previewAdminAccess} current="history">
    <section aria-labelledby="admin-history-heading">
      <h2 id="admin-history-heading">{t("adminHistory")}</h2>
      <p>{t("historyCoverage")}</p>
      <HistoryEvents events={interactions.adminHistoryEvents} locale={scenario.locale} />
    </section>
  </AdminShell>;
}

function previewAdminOverviewData(scenario: Scenario) {
  const categories = homepageCategories(scenario.locale);
  return {
    locale: scenario.locale,
    access: previewAdminAccess,
    counts: {
      categories: categories.length,
      sections: categories.reduce((sum, category) => sum + category.sectionCount, 0),
      topics: categories.reduce((sum, category) => sum + category.topicCount, 0),
      posts: categories.reduce((sum, category) => sum + category.messageCount, 0),
    },
    recent: null,
  };
}

function previewAdminUsersData(scenario: Scenario, request: Request) {
  const query = previewAdminBrowseQuery(request);
  const users = [
    { id: "owner", name: "Forum Owner", image: null, joinedAt: "2026-08-15T00:00:00.000Z" },
    { id: "maya", name: "Maya Cohen", image: null, joinedAt: "2026-08-20T00:00:00.000Z" },
    { id: "alex", name: "Alex Rivera", image: null, joinedAt: "2026-09-01T00:00:00.000Z" },
    { id: "sam", name: "Sam Chen", image: null, joinedAt: "2026-09-04T00:00:00.000Z" },
    { id: "noa", name: "Noa Levi", image: null, joinedAt: "2026-09-07T00:00:00.000Z" },
  ];
  const items = previewAdminFilter(users, query.search);
  return {
    locale: scenario.locale,
    access: previewAdminAccess,
    query,
    page: { items, total: items.length, next: null },
  };
}

function PreviewAdminOverviewRoute() {
  return <AdminOverview {...useLoaderData() as ReturnType<typeof previewAdminOverviewData>} />;
}

function PreviewAdminUsersRoute() {
  return <AdminUsersIndex {...useLoaderData() as ReturnType<typeof previewAdminUsersData>} />;
}

function previewAdminForumData(scenario: Scenario, request: Request) {
  const query = previewAdminBrowseQuery(request);
  const items = previewAdminFilter(previewAdminCategories(scenario.locale), query.search);
  return {
    locale: scenario.locale,
    access: previewAdminAccess,
    page: { items, total: items.length, next: null },
    query,
  };
}

function previewAdminCategoryData(
  scenario: Scenario,
  request: Request,
  routeCategoryId?: string,
) {
  const category = previewAdminCategories(scenario.locale)
    .find((candidate) => candidate.id === routeCategoryId);
  if (!category) throw new Response("Not Found", { status: 404 });
  const query = previewAdminBrowseQuery(request);
  const items = previewAdminFilter(
    previewAdminSections(scenario.locale, category.id),
    query.search,
  );
  return {
    locale: scenario.locale,
    access: previewAdminAccess,
    category,
    sections: { items, total: items.length, next: null },
    query,
  };
}

function previewAdminSectionData(
  scenario: Scenario,
  request: Request,
  routeSectionId?: string,
) {
  const category = homepageCategories(scenario.locale)
    .find((candidate) => candidate.sections.some((section) => section.id === routeSectionId));
  if (!category || !routeSectionId) throw new Response("Not Found", { status: 404 });
  const section = previewAdminSections(scenario.locale, category.id)
    .find((candidate) => candidate.id === routeSectionId);
  if (!section) throw new Response("Not Found", { status: 404 });
  const query = previewAdminBrowseQuery(request);
  const topics = previewSection(scenario.locale, section.id).topics.map((topic) => ({
    id: topic.id,
    title: topic.title.originalContent,
    sourceLocale: topic.title.sourceLocale,
    postCount: topic.postCount,
    isSolved: false,
  }));
  const items = previewAdminFilter(topics, query.search);
  return {
    locale: scenario.locale,
    access: previewAdminAccess,
    section,
    topics: { items, total: items.length, next: null },
    query,
  };
}

function PreviewAdminForumRoute() {
  return <AdminForumView {...useLoaderData() as ReturnType<typeof previewAdminForumData>} />;
}

function PreviewAdminCategoryRoute() {
  return <AdminCategoryView {...useLoaderData() as ReturnType<typeof previewAdminCategoryData>} />;
}

function PreviewAdminSectionRoute() {
  return <AdminSectionView {...useLoaderData() as ReturnType<typeof previewAdminSectionData>} />;
}

function previewAdminSurfaceAccessData(scenario: Scenario) {
  if (!previewUser(scenario)) {
    throw new Response("Unauthenticated", { status: 401 });
  }
  if (scenario.identity !== "manager" && scenario.identity !== "owner") {
    throw new Response("Forbidden", { status: 403 });
  }
  return null;
}

function PreviewAuthorizationRoute({ scenario }: {
  scenario: Scenario;
}) {
  const actionData = useActionData() as { ok?: boolean; error?: "invalid" | "forbidden" | "notFound" | "conflict" | "unavailable" } | undefined;
  const data = useLoaderData() as ReturnType<typeof previewAuthorizationData>;
  const fixtureResult = scenario.variant === "admin-success"
    ? { ok: true as const }
    : scenario.variant === "admin-conflict"
      ? { error: "conflict" as const }
      : undefined;
  const canMutate = scenario.identity === "owner";
  return <AuthorizationAdminView
    {...data}
    access={{
      actorId: scenario.identity === "owner" ? "owner" : "maya",
      canEnter: true,
      canManageAuthorization: true,
      canReadForum: true,
      canReadHistory: true,
    }}
    canManageElevated={canMutate}
    canMutateAuthorization={canMutate}
    result={actionData ?? fixtureResult}
  />;
}

async function previewAuthorizationAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
) {
  if (scenario.identity !== "owner") return { error: "forbidden" as const };
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const state = interactions.authorization;
  const roleById = (id: string) => state.roles.find((role) => role.id === id);
  const userById = (id: string) => state.users.find((user) => user.id === id);

  if (intent === "createRole") {
    const slug = String(form.get("slug") ?? "").trim();
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!/^[a-z][a-z0-9-]{0,62}$/u.test(slug) || !displayName) return { error: "invalid" as const };
    if (state.roles.some((role) => role.slug === slug)) return { error: "invalid" as const };
    const roleId = `preview-role-${++state.sequence}`;
    state.roles.push({
      id: roleId,
      slug,
      displayName,
      isSystem: false,
      grants: [],
    });
    previewAppendAdminHistory(scenario, interactions, {
      action: "role.created",
      targetType: "role",
      targetId: roleId,
      targetLabel: displayName,
      context: { slug },
    });
    return { ok: true as const };
  }

  if (intent === "renameRole") {
    const role = roleById(String(form.get("roleId") ?? ""));
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!role || role.isSystem) return { error: "notFound" as const };
    if (!displayName) return { error: "invalid" as const };
    role.displayName = displayName;
    return { ok: true as const };
  }

  if (intent === "roleGrants") {
    const role = roleById(String(form.get("roleId") ?? ""));
    if (!role) return { error: "notFound" as const };
    const requested = form.getAll("permission").map(String);
    role.grants = PERMISSION_CATALOG.filter((permission) => requested.includes(permission));
    return { ok: true as const };
  }

  if (intent === "deleteRole") {
    const roleId = String(form.get("roleId") ?? "");
    const role = roleById(roleId);
    if (!role || role.isSystem) return { error: "notFound" as const };
    if (state.users.some((user) => user.roleId === roleId)) return { error: "conflict" as const };
    state.roles = state.roles.filter((candidate) => candidate.id !== roleId);
    return { ok: true as const };
  }

  if (intent === "assignRole") {
    const user = userById(String(form.get("userId") ?? ""));
    const role = roleById(String(form.get("roleId") ?? ""));
    if (!user || !role) return { error: "notFound" as const };
    user.roleId = role.id;
    user.explicitAssignment = true;
    return { ok: true as const };
  }

  if (intent === "override") {
    const user = userById(String(form.get("userId") ?? ""));
    const permission = String(form.get("permission") ?? "") as PermissionKey;
    const effect = String(form.get("effect") ?? "");
    if (!user || !PERMISSION_CATALOG.includes(permission)) return { error: "notFound" as const };
    if (effect === "inherit") delete user.overrides[permission];
    else if (effect === "allow" || effect === "deny") user.overrides[permission] = effect;
    else return { error: "invalid" as const };
    return { ok: true as const };
  }

  return { error: "invalid" as const };
}

function previewAdminTopicData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId: string | undefined,
) {
  if (!routeTopicId) return null;

  const created = interactions.createdTopics.get(routeTopicId);
  if (created) {
    const data = previewCreatedTopicData(scenario, created, interactions);
    return {
      topic: data.topic,
      titlePresentation: data.titlePresentation,
      postPresentations: data.postPresentations,
      canManageHelpDuplicate: created.sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID,
      pendingDuplicateAppeal: null,
    };
  }

  if (routeTopicId === topicId) {
    const data = primaryTopicScenarioData(scenario);
    const topic = previewApplyTopicState(data.topic, interactions);
    return {
      topic,
      titlePresentation: data.titlePresentation,
      postPresentations: previewPresentationsForTopic(data.postPresentations, topic),
      canManageHelpDuplicate: false,
      pendingDuplicateAppeal: null,
    };
  }

  const helpQuestion = previewHelpSolutions(scenario.locale).questions
    .find((question) => question.id === routeTopicId);
  if (helpQuestion) {
    const postCount = Math.max(1, helpQuestion.replyCount + 1);
    const bestAnswerPostId = helpQuestion.hasBestAnswer && postCount > 1
      ? `${helpQuestion.id}-post-${Math.min(5, postCount)}`
      : null;
    const posts = Array.from({ length: postCount }, (_, index) => {
      const id = `${helpQuestion.id}-post-${index + 1}`;
      const authorName = index === 0
        ? helpQuestion.authorName
        : ["Sam Chen", "Maya Cohen", "Noa Levi"][index % 3]!;
      return {
        id,
        topicId: helpQuestion.id,
        authorId: previewProfileIdForName(authorName),
        authorName,
        parentPostId: index === 0 ? null : `${helpQuestion.id}-post-1`,
        solutionModerationStatus: id === bestAnswerPostId ? helpQuestion.solutionModerationStatus : null,
        solutionOutdatedReason: id === bestAnswerPostId ? helpQuestion.solutionOutdatedReason : null,
        solutionOutdatedReasonKind: id === bestAnswerPostId ? helpQuestion.solutionOutdatedReasonKind : null,
        createdAt: new Date(`2026-09-${28 + Math.min(index, 2)}T${10 + index}:00:00Z`),
        body: {
          id: `${helpQuestion.id}-body-${index + 1}`,
          originalContent: index === 0
            ? "Representative technical question from Help & solutions."
            : `Representative answer #${index}.`,
          sourceLocale: scenario.locale,
        },
      };
    });
    const baseTopic: PreviewTopicPage = {
      id: helpQuestion.id,
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId: previewProfileIdForName(helpQuestion.authorName),
      authorName: helpQuestion.authorName,
      createdAt: new Date(helpQuestion.createdAt),
      isPinned: false,
      isSolved: helpQuestion.isSolved,
      isClosed: false,
      closureVersion: 0,
      bestAnswerPostId,
      needsDetails: helpQuestion.needsDetails,
      duplicateOf: helpQuestion.duplicateOf,
      duplicateDisputed: helpQuestion.duplicateDisputed,
      title: {
        id: `${helpQuestion.id}-title`,
        originalContent: helpQuestion.title,
        sourceLocale: scenario.locale,
      },
      section: {
        id: HELP_SOLUTIONS_SERVICE_SECTION_ID,
        name: "Questions",
        category: {
          id: HELP_SOLUTIONS_CATEGORY_ID,
          name: previewHelpSolutions(scenario.locale).name,
        },
      },
      tags: helpQuestion.tags,
      posts,
    };
    const topic = previewApplyTopicState(baseTopic, interactions);
    return {
      topic,
      titlePresentation: originalPresentation(
        "topic-title", topic.id, topic.title.id, topic.title.originalContent,
        scenario.locale, scenario.direction,
      ),
      postPresentations: previewPresentationsForTopic(
        posts.map((post) => originalPresentation(
          "post-body", post.id, post.body.id, post.body.originalContent,
          scenario.locale, scenario.direction,
        )),
        topic,
      ),
      canManageHelpDuplicate: true,
      pendingDuplicateAppeal: helpQuestion.duplicateDisputed
        ? { id: `${helpQuestion.id}-appeal` }
        : null,
    };
  }

  const candidateSections = homepageCategories(scenario.locale)
    .flatMap((overview) =>
      previewCategory(scenario.locale, overview.id).sections.map((candidateSection) =>
        previewSection(scenario.locale, candidateSection.id)
      )
    );
  const matched = candidateSections
    .flatMap((candidateSection) =>
      candidateSection.topics.map((candidateTopic) => ({
        section: candidateSection,
        topic: candidateTopic,
      }))
    )
    .find(({ topic: candidateTopic }) => candidateTopic.id === routeTopicId)
    ?? previewDiscoveryTopic(scenario.locale, routeTopicId);
  if (!matched) return null;

  const matchedTopic = matched.topic as typeof matched.topic & {
    isSolved?: boolean;
    bestAnswerPostId?: string | null;
    targetPostId?: string | null;
  };
  const replyAuthors = ["Maya Cohen", "Sam Chen", "Noa Levi"];
  const messageCount = Math.max(1, matchedTopic.postCount);
  const posts = Array.from({ length: messageCount }, (_, index) => ({
    id: matchedTopic.targetPostId && index === messageCount - 1
      ? matchedTopic.targetPostId
      : `${matchedTopic.id}-post-${index + 1}`,
    topicId: matchedTopic.id,
    authorId: index === 0
      ? previewProfileIdForName(matchedTopic.authorName)
      : previewProfileIdForName(replyAuthors[(index - 1) % replyAuthors.length]!),
    authorName: index === 0
      ? matchedTopic.authorName
      : replyAuthors[(index - 1) % replyAuthors.length]!,
    parentPostId: index === 0 ? null : `${matchedTopic.id}-post-1`,
    solutionModerationStatus: null,
    solutionOutdatedReason: null,
    solutionOutdatedReasonKind: null,
    createdAt: new Date(`2026-09-${27 + Math.min(index, 3)}T${10 + (index % 8)}:00:00Z`),
    body: {
      id: `${matchedTopic.id}-body-${index + 1}`,
      originalContent: index === 0
        ? "Representative question for checking the topic page in Pages preview."
        : `Representative reply #${index}.`,
      sourceLocale: scenario.locale,
    },
  }));
  const baseTopic: PreviewTopicPage = {
    id: matchedTopic.id,
    sectionId: matched.section.id,
    authorId: previewProfileIdForName(matchedTopic.authorName),
    authorName: matchedTopic.authorName,
    createdAt: matchedTopic.createdAt,
    isPinned: matchedTopic.isPinned,
    isSolved: matchedTopic.isSolved ?? false,
    isClosed: false,
    closureVersion: 0,
    bestAnswerPostId: matchedTopic.bestAnswerPostId ?? null,
    needsDetails: false,
    duplicateOf: null,
    duplicateDisputed: false,
    title: matchedTopic.title,
    section: {
      id: matched.section.id,
      name: matched.section.name,
      category: matched.section.category,
    },
    tags: matchedTopic.tags,
    posts,
  };
  const topic = previewApplyTopicState(baseTopic, interactions);
  return {
    topic,
    titlePresentation: originalPresentation(
      "topic-title", topic.id, topic.title.id, topic.title.originalContent,
      scenario.locale, scenario.direction,
    ),
    postPresentations: previewPresentationsForTopic(
      posts.map((post) => originalPresentation(
        "post-body", post.id, post.body.id, post.body.originalContent,
        scenario.locale, scenario.direction,
      )),
      topic,
    ),
    canManageHelpDuplicate: matched.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID,
    pendingDuplicateAppeal: null,
  };
}

function PreviewAdminTopicRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const { topicId: routeTopicId } = useParams();
  const data = previewAdminTopicData(scenario, interactions, routeTopicId);
  if (!data) throw new Response("Not Found", { status: 404 });
  return <AdminTopicView
    locale={scenario.locale}
    access={previewAdminAccess}
    topic={projectAdminTopic(data.topic, data.canManageHelpDuplicate)}
    titlePresentation={data.titlePresentation}
    postPresentations={data.postPresentations}
    actorId={previewUser(scenario)?.id ?? "maya"}
    canManagePin
    canManageClosure
    canManageAnySolution
    canCorrectAnySourceLocale
    canReadPostHistory
    canManageHelpDuplicate={data.canManageHelpDuplicate}
    canModerateHelpSolution={data.canManageHelpDuplicate}
    pendingDuplicateAppeal={data.pendingDuplicateAppeal}
  />;
}

function previewCategoryCardTopic(
  locale: PreviewLocale,
  routeTopicId: string,
) {
  for (const category of homepageCategories(locale)) {
    for (const sectionSummary of category.sections) {
      const cards = previewCategoryTopics(locale, sectionSummary.id, sectionSummary.name);
      const pinned = cards.pinnedTopics.find((topic) => topic.id === routeTopicId);
      const latest = cards.latestTopics.find((topic) => topic.id === routeTopicId);
      const matched = pinned ?? latest;
      if (!matched) continue;

      return {
        section: previewSection(locale, sectionSummary.id),
        topic: {
          id: matched.id,
          authorName: matched.authorName,
          postCount: 1,
          createdAt: new Date(matched.activityAt),
          isPinned: Boolean(pinned),
          tags: [],
          title: {
            id: `${matched.id}-title-preview`,
            originalContent: matched.title,
            sourceLocale: locale,
          },
        },
      };
    }
  }
  return null;
}

function previewAttentionTopic(
  locale: PreviewLocale,
  routeTopicId: string,
) {
  const samples = previewAttentionSamples();
  const topicSample = samples.find((item) => item.topicId === routeTopicId);
  const original = samples
    .map((item) => item.original)
    .find((candidate) => candidate?.id === routeTopicId);
  const title = topicSample?.topicTitle ?? original?.title;
  if (!title) return null;

  const targetPostId = topicSample?.targetPostId ?? null;
  const solved = routeTopicId === "solved-help";
  return {
    section: previewSectionPresentation(locale, HELP_SOLUTIONS_SERVICE_SECTION_ID),
    topic: {
      id: routeTopicId,
      authorName: topicSample?.submittedByName ?? "Vico Forum member",
      postCount: targetPostId ? 2 : 1,
      createdAt: new Date(topicSample?.createdAt ?? "2026-10-10T09:00:00.000Z"),
      isPinned: false,
      tags: [],
      isSolved: solved,
      bestAnswerPostId: solved ? targetPostId : null,
      targetPostId,
      title: {
        id: `${routeTopicId}-title-preview`,
        originalContent: title,
        sourceLocale: locale,
      },
    },
  };
}

function previewDiscoveryTopic(
  locale: PreviewLocale,
  routeTopicId: string,
) {
  const unanswered = unansweredTopics(locale).find((topic) => topic.id === routeTopicId);
  if (unanswered && routeTopicId !== "worker-auth") {
    const sectionRouteId = routeTopicId === "agent-context"
      ? "vibe-ai-tools-preview-4"
      : unanswered.section?.id ?? sectionId;
    const resolvedSection = previewSection(locale, sectionRouteId);
    const unread = unreadTopics(locale).find((topic) => topic.id === routeTopicId);
    return {
      section: resolvedSection,
      topic: {
        id: unanswered.id,
        authorName: unanswered.authorName,
        postCount: unread ? 3 : 1,
        createdAt: new Date("2026-09-29T10:00:00Z"),
        isPinned: false,
        tags: [],
        title: {
          id: `${unanswered.id}-title-preview`,
          originalContent: unanswered.title,
          sourceLocale: locale,
        },
      },
    };
  }

  const popular = Object.values(popularPeriods(locale))
    .flat()
    .find((topic) => topic.id === routeTopicId);
  if (popular && routeTopicId === "database-queues") {
    return {
      section: previewSection(locale, sectionId),
      topic: {
        id: popular.id,
        authorName: popular.authorName,
        postCount: 1,
        createdAt: popular.latestActivityAt,
        isPinned: false,
        tags: [],
        title: {
          id: `${popular.id}-title-preview`,
          originalContent: popular.title,
          sourceLocale: locale,
        },
      },
    };
  }

  return previewAttentionTopic(locale, routeTopicId)
    ?? previewCategoryCardTopic(locale, routeTopicId);
}

function previewTopicAccessData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeTopicId?: string,
) {
  if (!routeTopicId) {
    throw new Response("Not Found", { status: 404 });
  }
  const snapshot = { revision: interactions.sequence };
  if (interactions.createdTopics.has(routeTopicId)) return snapshot;
  if (routeTopicId === topicId) return snapshot;
  if (previewHelpSolutions(scenario.locale).questions.some((question) => question.id === routeTopicId)) {
    return snapshot;
  }

  const knownSectionTopic = homepageCategories(scenario.locale)
    .flatMap((overview) =>
      previewCategory(scenario.locale, overview.id).sections.flatMap((candidateSection) =>
        previewSection(scenario.locale, candidateSection.id).topics
      )
    )
    .some((candidateTopic) => candidateTopic.id === routeTopicId);
  if (knownSectionTopic || previewDiscoveryTopic(scenario.locale, routeTopicId)) return snapshot;

  throw new Response("Not Found", { status: 404 });
}

function PreviewTopicRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  useLoaderData<{ revision: number }>();
  const { topicId: routeTopicId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedEditPostId = searchParams.get("editPost") ?? "";

  const createdTopic = routeTopicId ? interactions.createdTopics.get(routeTopicId) : undefined;
  if (createdTopic) {
    const data = previewCreatedTopicData(scenario, createdTopic, interactions);
    return (
      <TopicView
        key={`${previewPostEditRenderKey(data.topic, interactions)}:${requestedEditPostId}`}
        {...data}
        {...previewTopicBlockProps(scenario, interactions)}
        canUploadAttachments={false}
      />
    );
  }

  const helpQuestion = previewHelpSolutions(scenario.locale).questions
    .find((question) => question.id === routeTopicId);
  if (helpQuestion) {
    const postCount = helpQuestion.replyCount + 1;
    const bestAnswerPostId = helpQuestion.hasBestAnswer && postCount > 1
      ? `${helpQuestion.id}-post-${Math.min(5, postCount)}`
      : null;
    const posts = Array.from({ length: postCount }, (_, index) => {
      const id = `${helpQuestion.id}-post-${index + 1}`;
      const isBestAnswer = id === bestAnswerPostId;
      return {
        id,
        topicId: helpQuestion.id,
        authorId: previewProfileIdForName(
          index === 0 ? helpQuestion.authorName : ["Sam Chen", "Maya Cohen", "Noa Levi"][index % 3]!,
        ),
        authorName: index === 0 ? helpQuestion.authorName : ["Sam Chen", "Maya Cohen", "Noa Levi"][index % 3]!,
        parentPostId: index === 0 ? null : `${helpQuestion.id}-post-1`,
        solutionModerationStatus: isBestAnswer ? helpQuestion.solutionModerationStatus : null,
        solutionOutdatedReason: isBestAnswer ? helpQuestion.solutionOutdatedReason : null,
        solutionOutdatedReasonKind: isBestAnswer ? helpQuestion.solutionOutdatedReasonKind : null,
        createdAt: new Date(`2026-09-${28 + Math.min(index, 2)}T${10 + index}:00:00Z`),
        body: {
          id: `${helpQuestion.id}-body-${index + 1}`,
          originalContent: index === 0
            ? scenario.locale === "ru"
              ? "Представительный технический вопрос из категории «Помощь и решения»."
              : scenario.locale === "he"
                ? "שאלה טכנית מייצגת מקטגוריית עזרה ופתרונות."
                : "Representative technical question from Help & solutions."
            : scenario.locale === "ru"
              ? `Представительный ответ №${index}.`
              : scenario.locale === "he"
                ? `תשובה מייצגת מספר ${index}.`
                : `Representative answer #${index}.`,
          sourceLocale: scenario.locale,
        },
      };
    });
    const helpTopic = {
      id: helpQuestion.id,
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId: previewProfileIdForName(
        scenario.identity === "user" ? "Alex Rivera" : helpQuestion.authorName,
      ),
      authorName: scenario.identity === "user" ? "Alex Rivera" : helpQuestion.authorName,
      createdAt: new Date(helpQuestion.createdAt),
      isPinned: false,
      isSolved: helpQuestion.isSolved,
      isClosed: false,
      closureVersion: 0,
      bestAnswerPostId,
      needsDetails: helpQuestion.needsDetails,
      duplicateOf: helpQuestion.duplicateOf,
      duplicateDisputed: helpQuestion.duplicateDisputed,
      title: {
        id: `${helpQuestion.id}-title`,
        originalContent: helpQuestion.title,
        sourceLocale: scenario.locale,
      },
      section: {
        id: HELP_SOLUTIONS_SERVICE_SECTION_ID,
        name: "Questions",
        category: { id: HELP_SOLUTIONS_CATEGORY_ID, name: previewHelpSolutions(scenario.locale).name },
      },
      tags: helpQuestion.tags,
      posts,
    };
    const interactiveHelpTopic = previewApplyTopicState(helpTopic, interactions);
    return (
      <TopicView
        locale={scenario.locale}
        canUploadAttachments={false}
        {...previewTopicWatchProps(scenario, interactions, interactiveHelpTopic.id)}
        {...previewTopicBookmarkProps(scenario, interactions, interactiveHelpTopic.id)}
        {...previewTopicMuteProps(scenario, interactions, interactiveHelpTopic.id)}
        {...previewTopicBlockProps(scenario, interactions)}
        topic={interactiveHelpTopic}
        titlePresentation={originalPresentation(
          "topic-title", interactiveHelpTopic.id, interactiveHelpTopic.title.id, interactiveHelpTopic.title.originalContent,
          scenario.locale, scenario.direction,
        )}
        postPresentations={previewPresentationsForTopic(
          posts.map((post) => originalPresentation(
            "post-body", post.id, post.body.id, post.body.originalContent, scenario.locale, scenario.direction,
          )),
          interactiveHelpTopic,
        )}
        generationUnits={[]}
        canReply={scenario.identity !== "guest"}
        canSubmitComplaint={scenario.identity !== "guest"}
        canManageSolution={scenario.identity !== "guest"}
        canConfirmOwnSolution={scenario.identity === "user"}
        canManageAnySolution={scenario.identity === "manager"}
        canModerateHelpSolution={scenario.identity === "manager"}
        canManageHelpDuplicate={scenario.identity === "manager"}
        pendingDuplicateAppeal={helpQuestion.duplicateDisputed && scenario.identity !== "guest"
          ? {
              id: `${helpQuestion.id}-appeal`,
              relationshipId: `${helpQuestion.id}-duplicate`,
              explanation: scenario.locale === "ru"
                ? "Проблема похожа, но причина и решение отличаются."
                : scenario.locale === "he"
                  ? "הבעיה דומה, אבל הסיבה והפתרון שונים."
                  : "The problem is similar, but the cause and solution are different.",
              createdAt: "2026-10-08T18:00:00.000Z",
            }
          : null}
        isTopicAuthor={scenario.identity === "user"}
        canCorrectTitleSourceLocale={scenario.identity === "manager"}
        canCorrectAnySourceLocale={scenario.identity === "manager"}
        canManagePin={scenario.identity === "manager"}
        canUseAdminPanel={scenario.identity === "manager"}
        topicReadState={null}
      />
    );
  }
  if (!routeTopicId || routeTopicId === topicId) {
    const data = primaryTopicScenarioData(scenario);
    const interactiveTopic = previewApplyTopicState(data.topic, interactions);
    return <TopicView
      key={`${previewPostEditRenderKey(interactiveTopic, interactions)}:${requestedEditPostId}`}
      {...data}
      canUploadAttachments={false}
      {...previewTopicWatchProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicBookmarkProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicMuteProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicBlockProps(scenario, interactions)}
      topic={interactiveTopic}
      titlePresentation={interactions.topicTitleEdits.has(interactiveTopic.id)
        ? originalPresentation(
            "topic-title",
            interactiveTopic.id,
            interactiveTopic.title.id,
            interactiveTopic.title.originalContent,
            interactiveTopic.title.sourceLocale,
            scenario.direction,
          )
        : data.titlePresentation}
      postPresentations={previewPresentationsForTopic(data.postPresentations, interactiveTopic)}
    />;
  }

  const candidateSections = homepageCategories(scenario.locale)
    .flatMap((overview) =>
      previewCategory(scenario.locale, overview.id).sections.map((candidateSection) =>
        previewSection(scenario.locale, candidateSection.id)
      )
    );
  const matched = candidateSections
    .flatMap((candidateSection) =>
      candidateSection.topics.map((candidateTopic) => ({
        section: candidateSection,
        topic: candidateTopic,
      }))
    )
    .find(({ topic: candidateTopic }) => candidateTopic.id === routeTopicId)
    ?? previewDiscoveryTopic(scenario.locale, routeTopicId);

  if (!matched) {
    throw new Response("Not Found", { status: 404 });
  }

  const replyAuthors = ["Maya Cohen", "Sam Chen", "Noa Levi"];
  const matchedTopic = matched.topic as typeof matched.topic & {
    isSolved?: boolean;
    bestAnswerPostId?: string | null;
    targetPostId?: string | null;
  };
  const messageCount = Math.max(1, matchedTopic.postCount);
  const posts = Array.from({ length: messageCount }, (_, index) => ({
    id: matchedTopic.targetPostId && index === messageCount - 1
      ? matchedTopic.targetPostId
      : `${matchedTopic.id}-post-${index + 1}`,
    topicId: matched.topic.id,
    authorId: index === 0
      ? previewProfileIdForName(matched.topic.authorName)
      : previewProfileIdForName(replyAuthors[(index - 1) % replyAuthors.length]!),
    authorName: index === 0
      ? matched.topic.authorName
      : replyAuthors[(index - 1) % replyAuthors.length]!,
    parentPostId: index === 0 ? null : `${matched.topic.id}-post-1`,
    solutionModerationStatus: null,
    solutionOutdatedReason: null,
    solutionOutdatedReasonKind: null,
    createdAt: new Date(`2026-09-${27 + Math.min(index, 3)}T${10 + (index % 8)}:00:00Z`),
    body: {
      id: `${matched.topic.id}-body-${index + 1}`,
      originalContent: index === 0
        ? scenario.locale === "ru"
          ? "Представительный вопрос для проверки страницы темы в Pages-preview."
          : scenario.locale === "he"
            ? "שאלה מייצגת לבדיקת עמוד הנושא בתצוגה המקדימה."
            : "Representative question for checking the topic page in Pages preview."
        : scenario.locale === "ru"
          ? `Представительный ответ №${index}.`
          : scenario.locale === "he"
            ? `תגובה מייצגת מספר ${index}.`
            : `Representative reply #${index}.`,
      sourceLocale: scenario.locale,
    },
  }));

  const previewTopic = {
    id: matchedTopic.id,
    sectionId: matched.section.id,
    authorId: "alex",
    authorName: matchedTopic.authorName,
    createdAt: matchedTopic.createdAt,
    isPinned: matchedTopic.isPinned,
    isSolved: matchedTopic.isSolved ?? false,
    isClosed: false,
    closureVersion: 0,
    bestAnswerPostId: matchedTopic.bestAnswerPostId ?? null,
    needsDetails: false,
    duplicateOf: null,
    duplicateDisputed: false,
    title: matchedTopic.title,
    section: {
      id: matched.section.id,
      name: matched.section.name,
      category: matched.section.category,
    },
    tags: matchedTopic.tags,
    posts,
  };

  const interactiveTopic = previewApplyTopicState(previewTopic, interactions);
  return (
    <TopicView
      locale={scenario.locale}
      canUploadAttachments={false}
      {...previewTopicWatchProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicBookmarkProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicMuteProps(scenario, interactions, interactiveTopic.id)}
      {...previewTopicBlockProps(scenario, interactions)}
      topic={interactiveTopic}
      titlePresentation={originalPresentation(
        "topic-title",
        interactiveTopic.id,
        interactiveTopic.title.id,
        interactiveTopic.title.originalContent,
        scenario.locale,
        scenario.direction,
      )}
      postPresentations={previewPresentationsForTopic(
        posts.map((post) =>
          originalPresentation(
            "post-body",
            post.id,
            post.body.id,
            post.body.originalContent,
            scenario.locale,
            scenario.direction,
          )
        ),
        interactiveTopic,
      )}
      generationUnits={[]}
      canReply={scenario.identity !== "guest"}
      canSubmitComplaint={scenario.identity !== "guest"}
      canManageSolution={scenario.identity === "manager"}
      canManageAnySolution={scenario.identity === "manager"}
      canModerateHelpSolution={false}
      canCorrectTitleSourceLocale={scenario.identity === "manager"}
      canCorrectAnySourceLocale={scenario.identity === "manager"}
      canManagePin={scenario.identity === "manager"}
      canUseAdminPanel={scenario.identity === "manager"}
      topicReadState={null}
    />
  );
}

const PREVIEW_OWN_MEASURE_ID = "11111111-1111-4111-8111-111111111111";

function previewOwnMeasureDetail(interactions: PreviewInteractionState): UserMeasureDetail {
  const appealBody = interactions.measureAppealBody;
  return {
    id: PREVIEW_OWN_MEASURE_ID,
    createdAt: "2026-11-10T08:00:00.000Z",
    expiresAt: "2026-12-10T08:00:00.000Z",
    liftedAt: null,
    version: 1,
    initialReason: "Repeated off-topic promotional posts after a moderator warning.",
    latestChangeReason: null,
    status: "active",
    restrictions: ["replies.create", "attachments.upload"],
    usedAppeals: appealBody ? 1 : 0,
    pendingAppeal: Boolean(appealBody),
    appeals: appealBody ? [{
      id: "22222222-2222-4222-8222-222222222222",
      ordinal: 1,
      body: appealBody,
      status: "pending",
      createdAt: "2026-11-18T20:00:00.000Z",
      resolvedAt: null,
      explanation: null,
      remedy: null,
    }] : [],
    timeline: [{
      action: "measure.created",
      occurredAt: "2026-11-10T08:00:00.000Z",
      reason: "Repeated off-topic promotional posts after a moderator warning.",
      before: null,
      after: {
        version: 1,
        restrictions: ["replies.create", "attachments.upload"],
        expiresAt: "2026-12-10T08:00:00.000Z",
        lifted: false,
      },
      outcome: null,
      remedy: null,
    }],
  };
}

function PreviewOwnMeasuresRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const measure = previewOwnMeasureDetail(interactions);
  return <OwnMeasuresIndex locale={scenario.locale} measures={[measure]} />;
}

function PreviewOwnMeasureRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  const feedback = useActionData() as { ok?: boolean; error?: "invalid"; ordinal?: number } | undefined;
  return <OwnMeasureDetail
    locale={scenario.locale}
    measure={previewOwnMeasureDetail(interactions)}
    appealId="22222222-2222-4222-8222-222222222222"
    feedback={feedback}
  />;
}

async function previewOwnMeasureAction(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  request: Request,
  routeMeasureId?: string,
) {
  if (!previewUser(scenario)) return { error: "unauthenticated" as const };
  if (routeMeasureId !== PREVIEW_OWN_MEASURE_ID) return { error: "notFound" as const };
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "appeal") return { error: "invalid" as const };
  const appealId = String(form.get("appealId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (appealId !== "22222222-2222-4222-8222-222222222222"
    || !body || body.length > 2000 || interactions.measureAppealBody) {
    return { error: "invalid" as const };
  }
  interactions.measureAppealBody = body;
  return { ok: true as const, ordinal: 1 };
}

const previewProfileNames: Readonly<Record<string, string>> = {
  alex: "Alex Rivera",
  maya: "Maya Cohen",
  sam: "Sam Chen",
  noa: "Noa Levi",
  owner: "Forum Owner",
  "vico-team": "Vico Team",
  reporter: "Alex Rivera",
  reviewer: "Sam Lee",
  author: "Jordan Chen",
  "preview-member": "Forum member",
};

function previewProfileIdForName(name: string): string {
  if (name === "Alex Rivera" || name === "אלכס ריברה") return "alex";
  if (name === "Maya Cohen") return "maya";
  if (name === "Sam Chen" || name === "סם צ'ן") return "sam";
  if (name === "Noa Levi" || name === "נועה לוי") return "noa";
  if (name === "Vico Team") return "vico-team";
  return "preview-member";
}

function previewProfileAccessData(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  routeUserId?: string,
) {
  const actor = previewUser(scenario);
  const effectiveUserId = scenario.id.startsWith("profile-")
    && scenario.allowedIdentities
    && routeUserId === "alex"
    ? actor?.id ?? routeUserId
    : routeUserId;
  if (!effectiveUserId || !previewProfileNames[effectiveUserId]) {
    throw new Response("Not Found", { status: 404 });
  }
  return { revision: interactions.sequence };
}

function previewOwnerAccountSnapshot(
  targetId: string,
  interactions: PreviewInteractionState,
): OwnerUserProfileSnapshot {
  const deactivation = interactions.ownerDeactivations.get(targetId);
  return {
    targetUserId: targetId,
    lifecycle: deactivation
      ? {
          status: "deactivated",
          deactivatedAt: deactivation.deactivatedAt,
          deactivatedByUserId: "owner",
          retainAtLeastUntil: deactivation.retainAtLeastUntil,
        }
      : { status: "active" },
    email: targetId === "owner" ? "owner@example.test" : `${targetId}@example.test`,
    emailVerified: true,
    createdAt: "2026-08-15T09:00:00.000Z",
    updatedAt: "2026-11-18T19:30:00.000Z",
    linkedMethods: ["password", "google"],
    hasPassword: true,
    observedAt: "2026-11-18T20:00:00.000Z",
    sessionCounts: { active: "1", expiredRetained: "1" },
    sessions: [
      {
        id: "preview-owner-current-session",
        createdAt: "2026-11-18T18:30:00.000000Z",
        expiresAt: "2026-11-25T18:30:00.000000Z",
        status: "active",
        current: true,
        deviceLabel: "Chrome on Windows",
        recordedIp: "203.0.113.10",
      },
      {
        id: "preview-owner-expired-session",
        createdAt: "2026-10-15T08:00:00.000000Z",
        expiresAt: "2026-10-22T08:00:00.000000Z",
        status: "expired-retained",
        current: false,
        deviceLabel: "Firefox on Linux",
        recordedIp: null,
      },
    ],
    nextSessionsCursor: null,
  };
}

function previewOwnerHistory(
  targetId: string,
  interactions: PreviewInteractionState,
): readonly OwnerHistoryEntry[] {
  const entries: OwnerHistoryEntry[] = [{
    origin: "auth-event",
    id: `preview-account-created-${targetId}`,
    occurredAt: "2026-08-15T09:00:00.000Z",
    recordedAt: "2026-08-15T09:00:00.000Z",
    monitorKeys: ["accounts.users", "integrations.authentication"],
    kind: "account.created",
    source: "auth",
    quality: null,
    values: {
      actorUserId: targetId,
      targetUserId: targetId,
      entityType: "user",
      entityId: targetId,
    },
  }];
  const deactivation = interactions.ownerDeactivations.get(targetId);
  if (deactivation) {
    entries.unshift({
      origin: "account-event",
      id: deactivation.eventId,
      occurredAt: deactivation.deactivatedAt,
      recordedAt: deactivation.deactivatedAt,
      monitorKeys: ["accounts.users"],
      kind: "account.deactivated",
      source: "account",
      quality: null,
      values: {
        actorUserId: "owner",
        targetUserId: targetId,
        retainAtLeastUntil: deactivation.retainAtLeastUntil,
      },
    });
  }
  return entries;
}

function previewProfilePrivilegedSections(
  scenario: Scenario,
  interactions: PreviewInteractionState,
  targetId: string,
): ProfilePrivilegedSections {
  const actor = previewUser(scenario);
  if (!actor || (scenario.identity !== "manager" && scenario.identity !== "owner")) return {};

  const authorization = previewAuthorizationData(scenario.locale, interactions.authorization);
  const target = authorization.users.find((user) => user.id === targetId);
  const elevatedRoleIds = authorization.roles
    .filter((role) => role.grants.includes(BLOCK_MANAGE_PRIVILEGED_PERMISSION))
    .map((role) => role.id);

  const sections: ProfilePrivilegedSections = {
    viewerId: actor.id,
    measures: {
      status: "ready",
      value: previewAdminMeasuresForTarget(interactions, targetId),
    },
  };
  if (target) {
    sections.authorization = {
      status: "ready",
      value: {
        actorId: actor.id,
        management: {
          userId: target.id,
          roles: authorization.roles,
          authorization: target.authorization,
          elevatedRoleIds,
        },
        permissions: PERMISSION_CATALOG,
        canManageElevated: scenario.identity === "owner",
        canMutateAuthorization: scenario.identity === "owner",
      },
    };
  }
  if (scenario.identity === "owner") {
    sections.owner = {
      viewerId: actor.id,
      account: { status: "ready", value: previewOwnerAccountSnapshot(targetId, interactions) },
      history: {
        status: "ready",
        value: { entries: previewOwnerHistory(targetId, interactions), next: null },
      },
    };
  }
  return sections;
}

function PreviewProfileRoute({ scenario, interactions }: {
  scenario: Scenario;
  interactions: PreviewInteractionState;
}) {
  useLoaderData<{ revision: number }>();
  const { userId = "alex" } = useParams();
  const [query] = useSearchParams();
  const actionData = useActionData() as { error: "invalid"; draft: { bio: string; githubUrl: string; websiteUrl: string } } | undefined;
  const identity = previewUser(scenario);
  // The own-profile fixture follows the separately selected preview identity.
  const id = scenario.id.startsWith("profile-") && scenario.allowedIdentities && userId === "alex"
    ? identity?.id ?? userId : userId;
  const empty = scenario.variant === "profile-empty" || id === "sam";
  const name = scenario.variant === "profile-long"
    ? "Maya Cohen · מפתחת קהילה · DeveloperWithALongUnbrokenDisplayNameForReflowVerification"
    : previewProfileNames[id] ?? "Forum member";
  const bio = scenario.locale === "ru" ? "Создаю веб-приложения с AI-инструментами. Помогаю разбирать TypeScript и API.\nУчусь вместе с форумом." : scenario.locale === "he" ? "בונה יישומי אינטרנט בעזרת כלי AI. משתף ידע על TypeScript ו־API.\nלומד יחד עם חברי הפורום." : "Building web apps with AI tools. Sharing practical TypeScript and API answers.\nLearning with the forum.";
  const stored = interactions.profileOverrides.get(id);
  const authorizationUser = previewAuthorizationData(scenario.locale, interactions.authorization)
    .users.find((user) => user.id === id);
  const profileRole = authorizationUser?.role ?? {
    slug: id === "maya" ? "admin" : "user",
    displayName: id === "maya" ? "Administrator" : "User",
    isSystem: true,
  };
  const fields = stored ?? {
    bio: empty ? "" : scenario.variant === "profile-long" ? `${bio}\n${"TypeScript_שלום_".repeat(16)}` : bio,
    githubUrl: empty ? null : "https://github.com/octocat",
    websiteUrl: empty ? null : "https://example.com/",
  };
  return <ProfileView locale={scenario.locale} isSelf={identity?.id === id}
    editing={query.get("edit") === "1"} saved={query.get("saved") === "1"}
    {...previewUserBlockProps(scenario, interactions, id)}
    privileged={previewProfilePrivilegedSections(scenario, interactions, id)}
    profile={{ id, name, image: null,
      ...(interactions.ownerDeactivations.has(id) ? { identityKind: "deleted" as const } : {}),
      joinedAt: "2026-09-01T00:00:00.000Z", ...fields,
      role: { slug: profileRole.slug, displayName: profileRole.displayName, isSystem: profileRole.isSystem },
      messageCount: empty ? 0 : 128, bestAnswerCount: empty ? 0 : 17 }}
    feedback={actionData ?? (scenario.variant === "profile-error" ? { error: "invalid", draft: { bio, githubUrl: "https://github.com/octocat/repo", websiteUrl: "https://example.com/" } } : undefined)} />;
}

function PreviewUnderDevelopment({ locale }: { locale: PreviewLocale }) {
  const [searchParams] = useSearchParams();
  return (
    <UnderDevelopmentView
      locale={locale}
      requestedFeature={searchParams.get("feature")}
    />
  );
}

// Matched routes and the fallback must describe the same primary-topic fixture.
function primaryTopicScenarioData(scenario: Scenario) {
  const isTopicScenario = scenario.view === "topic";
  const confirmation = isTopicScenario && scenario.variant === "topic-best-answer-unsolved";
  const solved = !isTopicScenario || (scenario.variant !== "topic-unsolved"
    && scenario.variant !== "topic-reply-error" && !confirmation);
  const data = topicData(
    scenario.locale,
    scenario.direction,
    scenario.identity,
    solved,
    isTopicScenario && scenario.identity === "manager",
    confirmation,
  );
  return {
    ...data,
    topic: confirmation ? { ...data.topic, bestAnswerPostId: "answer" } : data.topic,
    actionData: isTopicScenario && scenario.variant === "topic-reply-error"
      ? { error: "rateLimited" as const } : undefined,
  };
}

function topicData(
  locale: PreviewLocale,
  direction: Direction,
  identity: PreviewIdentity,
  solved: boolean,
  showSecondaryControls: boolean,
  solutionAuthor = false,
) {
  const rtl = direction === "rtl";
  const russian = locale === "ru";
  const baseTopic = {
    ...topic,
    isSolved: solved,
    bestAnswerPostId: solved ? topic.bestAnswerPostId : null,
  };
  const translatedTopic = rtl ? {
    ...baseTopic,
    section: {
      ...baseTopic.section,
      name: "TypeScript וארכיטקטורה",
      category: { id: categoryId, name: "פיתוח" },
    },
  } : russian ? {
    ...baseTopic,
    section: {
      ...baseTopic.section,
      name: "TypeScript и архитектура",
      category: { id: categoryId, name: "Разработка" },
    },
  } : baseTopic;

  return {
    locale,
    topic: translatedTopic,
    titlePresentation: topicTitlePresentation(rtl),
    postPresentations: postPresentations(rtl),
    generationUnits: showSecondaryControls && locale !== "en"
      ? topicToolsGenerationUnits(locale)
      : [],
    canReply: identity !== "guest",
    canSubmitComplaint: identity !== "guest",
    editablePostIds: identity === "guest"
      ? []
      : translatedTopic.posts
          .filter((post) => post.authorId === (identity === "user" ? "alex" : identity === "manager" ? "maya" : "owner"))
          .map((post) => post.id),
    canEditOwnTitle: identity === "user" && translatedTopic.authorId === "alex",
    canManageSolution: showSecondaryControls || solutionAuthor,
    canManageAnySolution: identity === "manager",
    canModerateHelpSolution: false,
    isTopicAuthor: solutionAuthor,
    canConfirmOwnSolution: solutionAuthor,
    canCorrectTitleSourceLocale: showSecondaryControls,
    canCorrectAnySourceLocale: identity === "manager",
    canManagePin: identity === "manager",
    canUseAdminPanel: identity === "manager",
    correctablePostIds: showSecondaryControls
      ? translatedTopic.posts.map((post) => post.id)
      : [],
    topicReadState: null,
  };
}

function topicToolsGenerationUnits(
  targetLocale: PreviewLocale,
): ContentGenerationUnitView[] {
  return [
    {
      key: JSON.stringify(["topic-title", topicId, "title-r1", targetLocale]),
      contentType: "topic-title",
      contentId: topicId,
      revisionId: "title-r1",
      targetLocale,
      state: "current",
      automatic: false,
      explicitRequired: false,
    },
    {
      key: JSON.stringify(["post-body", "answer", "post-r2", targetLocale]),
      contentType: "post-body",
      contentId: "answer",
      revisionId: "post-r2",
      targetLocale,
      state: "current",
      automatic: false,
      explicitRequired: false,
    },
    {
      key: JSON.stringify(["post-body", "followup", "post-r3", targetLocale]),
      contentType: "post-body",
      contentId: "followup",
      revisionId: "post-r3",
      targetLocale,
      state: "failed",
      automatic: false,
      explicitRequired: false,
    },
  ];
}

function createPreviewAuthorizationState(): PreviewAuthorizationState {
  const userGrants: PermissionKey[] = ["forum.topic.create", "forum.reply.create"];
  const moderatorGrants: PermissionKey[] = [
    ...userGrants,
    "forum.topic.pin",
    "forum.solution.manageAny",
    "forum.sourceLocale.correctAny",
  ];
  const adminGrants: PermissionKey[] = [...PERMISSION_CATALOG];
  const reviewerGrants: PermissionKey[] = [
    "forum.reply.create",
    "forum.translation.generate",
  ];
  return {
    sequence: 0,
    roles: [
      { id: "role-user", slug: "user", displayName: "User", isSystem: true, grants: userGrants },
      { id: "role-moderator", slug: "moderator", displayName: "Moderator", isSystem: true, grants: moderatorGrants },
      { id: "role-admin", slug: "admin", displayName: "Admin", isSystem: true, grants: adminGrants },
      { id: "role-reviewer", slug: "reviewer", displayName: "Reviewer", isSystem: false, grants: reviewerGrants },
    ],
    users: [
      { id: "owner", name: "Forum Owner", email: "owner@example.test", roleId: "role-admin", explicitAssignment: true, overrides: {}, owner: true },
      { id: "maya", name: "Maya Cohen", email: "maya@example.test", roleId: "role-admin", explicitAssignment: true, overrides: {} },
      { id: "alex", name: "Alex Rivera", email: "alex@example.test", roleId: "role-user", explicitAssignment: false,
        overrides: { "forum.translation.generate": "allow" } },
      { id: "sam", name: "Sam Chen", email: "sam@example.test", roleId: "role-user", explicitAssignment: false, overrides: {} },
      { id: "noa", name: "Noa Levi", email: "noa@example.test", roleId: "role-reviewer", explicitAssignment: true,
        overrides: { "forum.reply.create": "deny" } },
    ],
  };
}

function previewAuthorizationData(locale: string, state: PreviewAuthorizationState) {
  const roles = state.roles.map((role) => ({ ...role, grants: [...role.grants] }));
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const users = state.users.flatMap((user) => {
    const role = rolesById.get(user.roleId);
    if (!role) return [];
    const effectivePermissions = user.owner
      ? [...PERMISSION_CATALOG]
      : PERMISSION_CATALOG.filter((permission) => {
          const override = user.overrides[permission];
          if (override === "deny") return false;
          if (override === "allow") return true;
          return role.grants.includes(permission);
        });
    return [{
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      explicitAssignment: user.explicitAssignment,
      authorization: {
        role,
        explicitAssignment: user.explicitAssignment,
        grants: [...role.grants],
        overrides: { ...user.overrides },
        effectivePermissions,
        ...(user.owner ? { authoritySource: "owner" as const } : {}),
      },
    }];
  });
  return { locale, permissions: PERMISSION_CATALOG, roles, users };
}

function topicTitlePresentation(rtl: boolean): ContentTranslationPresentation {
  if (rtl) {
    return {
      contentType: "topic-title",
      contentId: topicId,
      revisionId: "title-r1",
      selected: "translation",
      content: "איך כדאי לבנות לקוח API עם טיפוסים?",
      contentLocale: "he",
      contentDirection: "rtl",
      originalContent: "How should I structure a typed API client?",
      originalLocale: "en",
      originalDirection: "ltr",
      provenance: {
        origin: "machine",
        provider: "preview",
        model: "representative",
      },
    };
  }
  return originalPresentation(
    "topic-title",
    topicId,
    "title-r1",
    "How should I structure a typed API client?",
    "en",
    "ltr",
  );
}

function postPresentations(rtl: boolean): ContentTranslationPresentation[] {
  return [
    originalPresentation(
      "post-body",
      "question",
      "post-r1",
      rtl
        ? "אני רוצה טיפוסים חזקים בלי לקשור את כל האפליקציה לספריית HTTP אחת."
        : "I want strong typing without coupling the whole app to one HTTP library.",
      rtl ? "he" : "en",
      rtl ? "rtl" : "ltr",
    ),
    rtl
      ? translatedPresentation(
          "answer",
          "post-r2",
          "הפרד בין שכבת ה-HTTP לבין הטיפוסים של הדומיין. כך אפשר לבדוק כל גבול בנפרד.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
          "he",
          "rtl",
          "Separate the HTTP layer from domain types so each boundary can be tested independently.",
          "en",
          "ltr",
        )
      : translatedPresentation(
          "answer",
          "post-r2",
          "Separate the HTTP layer from domain types so each boundary can be tested independently.\n\n```ts\ntype ApiResult<T> = { data: T; status: number };\n```",
          "en",
          "ltr",
          "הפרידו בין שכבת ה-HTTP לבין הטיפוסים של הדומיין.",
          "he",
          "rtl",
        ),
    originalPresentation(
      "post-body",
      "followup",
      "post-r3",
      rtl
        ? "כדאי גם לבדוק overflow עם מזהה ארוך מאוד: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout"
        : "Also test overflow with a long identifier: this-is-a-very-long-unbroken-technical-identifier-that-must-not-break-the-layout",
      rtl ? "he" : "en",
      rtl ? "rtl" : "ltr",
    ),
  ];
}

function originalPresentation(
  contentType: "topic-title" | "post-body",
  contentId: string,
  revisionId: string,
  content: string,
  locale: string,
  direction: Direction,
): ContentTranslationPresentation {
  return {
    contentType,
    contentId,
    revisionId,
    selected: "original",
    content,
    contentLocale: locale,
    contentDirection: direction,
    originalContent: content,
    originalLocale: locale,
    originalDirection: direction,
    fallbackReason: "same-locale",
  };
}

function translatedPresentation(
  contentId: string,
  revisionId: string,
  content: string,
  contentLocale: string,
  contentDirection: Direction,
  originalContent: string,
  originalLocale: string,
  originalDirection: Direction,
): ContentTranslationPresentation {
  return {
    contentType: "post-body",
    contentId,
    revisionId,
    selected: "translation",
    content,
    contentLocale,
    contentDirection,
    originalContent,
    originalLocale,
    originalDirection,
    provenance: {
      origin: "machine",
      provider: "preview",
      model: "representative",
    },
  };
}
