import { describe, expect, it } from "vitest";
import routes from "../routes";
import { loader } from "./not-found";

describe("localized route shape", () => {
  it("uses Home only as the locale index and wires a separate catch-all", () => {
    const localeRoute = routes.find((candidate) => candidate.path === ":locale");
    expect(localeRoute?.children).toEqual([
      expect.objectContaining({ index: true, file: "routes/home.tsx" }),
      expect.objectContaining({ path: "categories/:categoryId", file: "routes/category.tsx" }),
      expect.objectContaining({ path: "sections/:sectionId", file: "routes/section.tsx" }),
      expect.objectContaining({ path: "topics/:topicId", file: "routes/topic.tsx" }),
      expect.objectContaining({ path: "topics/:topicId/complaints", file: "routes/complaint-submit.ts" }),
      expect.objectContaining({ path: "attention/complaints/settings", file: "routes/complaint-priority-settings.tsx" }),
      expect.objectContaining({ path: "attention/complaints/:caseId", file: "routes/complaint-triage.tsx" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/activity", file: "routes/complaint-activity.ts" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/review", file: "routes/complaint-review.tsx" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/history", file: "routes/complaint-history.tsx" }),
      expect.objectContaining({ path: "complaints/:caseId/result", file: "routes/complaint-result.tsx" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/appeals/:appealId", file: "routes/complaint-appeal-review.tsx" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/appeals/:appealId/context/:postId", file: "routes/complaint-appeal-context.ts" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/appeals/:appealId/evidence/:attachmentId", file: "routes/complaint-appeal-evidence.ts" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/context/:postId", file: "routes/complaint-review-context.ts" }),
      expect.objectContaining({ path: "attention/complaints/:caseId/evidence/:attachmentId", file: "routes/complaint-review-evidence.ts" }),
      expect.objectContaining({ path: "posts/:postId/edit", file: "routes/post-edit.ts" }),
      expect.objectContaining({ path: "search", file: "routes/search.tsx" }),
      expect.objectContaining({ path: "popular", file: "routes/popular.tsx" }),
      expect.objectContaining({ path: "unanswered", file: "routes/unanswered.tsx" }),
      expect.objectContaining({ path: "unread", file: "routes/unread.tsx" }),
      expect.objectContaining({ path: "users/:userId", file: "routes/profile.tsx" }),
      expect.objectContaining({ path: "account/measures", file: "routes/account-measures.tsx" }),
      expect.objectContaining({ path: "account/measures/:measureId", file: "routes/account-measure.tsx" }),
      expect.objectContaining({ path: "sign-in", file: "routes/credential-sign-in.tsx" }),
      expect.objectContaining({ path: "sign-up", file: "routes/credential-sign-up.tsx" }),
      expect.objectContaining({ path: "settings", file: "routes/settings.tsx" }),
      expect.objectContaining({ path: "settings/forum", file: "routes/settings-forum.tsx" }),
      expect.objectContaining({ path: "settings/user", file: "routes/settings-user.tsx" }),
      expect.objectContaining({ path: "settings/account", file: "routes/settings-account.tsx" }),
      expect.objectContaining({ path: "settings/privacy", file: "routes/settings-privacy.tsx" }),
      expect.objectContaining({ path: "settings/administrator", file: "routes/settings-administrator.tsx" }),
      expect.objectContaining({ path: "presence", file: "routes/presence.ts" }),
      expect.objectContaining({ path: "notifications", file: "routes/notifications.tsx" }),
      expect.objectContaining({ path: "mentions", file: "routes/mentions.ts" }),
      expect.objectContaining({ path: "attention", file: "routes/attention.tsx" }),
      expect.objectContaining({ path: "tags", file: "routes/tags.tsx" }),
      expect.objectContaining({ path: "tags/:tagKey", file: "routes/tag.tsx" }),
      expect.objectContaining({ path: "admin/users", file: "routes/admin-users.tsx" }),
      expect.objectContaining({ path: "admin/measures", file: "routes/admin-measures.tsx" }),
      expect.objectContaining({ path: "admin/measures/:measureId", file: "routes/admin-measure.tsx" }),
      expect.objectContaining({ path: "admin/users/:userId", file: "routes/admin-user.tsx" }),
      expect.objectContaining({ path: "admin/forum", file: "routes/admin-forum.tsx" }),
      expect.objectContaining({ path: "admin/forum/categories/:categoryId", file: "routes/admin-category.tsx" }),
      expect.objectContaining({ path: "admin/forum/sections/:sectionId", file: "routes/admin-section.tsx" }),
      expect.objectContaining({ path: "admin/forum/topics/:topicId", file: "routes/admin-topic.tsx" }),
      expect.objectContaining({ path: "admin/history", file: "routes/admin-history.tsx" }),
      expect.objectContaining({ path: "admin", file: "routes/admin.tsx" }),
      expect.objectContaining({ path: "super-admin", file: "routes/super-admin.tsx" }),
      expect.objectContaining({ path: "super-admin/monitoring", file: "routes/super-admin-monitoring.tsx" }),
      expect.objectContaining({ path: "super-admin/monitoring/system", file: "routes/super-admin-system.tsx" }),
      expect.objectContaining({ path: "super-admin/monitoring/accounts", file: "routes/super-admin-accounts.tsx" }),
      expect.objectContaining({ path: "super-admin/monitoring/security", file: "routes/super-admin-security.tsx" }),
      expect.objectContaining({ path: "super-admin/monitoring/:area/:monitorKey/history", file: "routes/super-admin-monitor-history.tsx" }),
      expect.objectContaining({ path: "super-admin/events", file: "routes/super-admin-events.tsx" }),
      expect.objectContaining({ path: "super-admin/infrastructure", file: "routes/super-admin-infrastructure.tsx" }),
      expect.objectContaining({ path: "admin/authorization", file: "routes/authorization-admin.tsx" }),
      expect.objectContaining({ path: "under-development", file: "routes/under-development.tsx" }),
      expect.objectContaining({ path: "*", file: "routes/not-found.ts" }),
    ]);
  });

  it("returns a real HTTP 404 for an unknown localized child path", () => {
    expect(loader).toThrowError(expect.objectContaining({ status: 404 }));
  });
});
