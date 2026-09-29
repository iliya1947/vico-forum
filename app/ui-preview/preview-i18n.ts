import type { Resource } from "i18next";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

const english = canonicalCommonResources();

const hebrew: Record<string, string> = {
  ...english,
  productName: "Vico Forum",
  forumTagline: "שאלות, דיונים ותשובות מעשיות",
  forumIndex: "ראשי",
  categoriesHeading: "קטגוריות",
  categoriesIntro: "עיון בפורום לפי קטגוריה ומדור.",
  breadcrumbsLabel: "פירורי לחם",
  categoryLabel: "קטגוריה",
  sectionLabel: "מדור",
  topicLabel: "נושא",
  topicsHeading: "נושאים",
  topicColumn: "נושא",
  postsColumn: "הודעות",
  sectionCount_one: "{{count}} מדור",
  sectionCount_two: "{{count}} מדורים",
  sectionCount_many: "{{count}} מדורים",
  sectionCount_other: "{{count}} מדורים",
  topicCount_one: "{{count}} נושא",
  topicCount_two: "{{count}} נושאים",
  topicCount_many: "{{count}} נושאים",
  topicCount_other: "{{count}} נושאים",
  messageCount_one: "{{count}} הודעה",
  messageCount_two: "{{count}} הודעות",
  messageCount_many: "{{count}} הודעות",
  messageCount_other: "{{count}} הודעות",
  startedBy: "נפתח על ידי {{author}}",
  postNumber: "הודעה #{{number}}",
  createTopicHeading: "יצירת נושא חדש",
  topicTitleLabel: "כותרת הנושא",
  initialPostLabel: "הודעה ראשונה",
  createTopicSubmit: "יצירת נושא",
  replyHeading: "הוספת תגובה",
  replyBodyLabel: "תגובה",
  replySubmit: "פרסום תגובה",
  solved: "נפתר",
  markSolved: "סימון כנפתר",
  bestAnswer: "התשובה הטובה ביותר",
  selectBestAnswer: "בחירה כתשובה הטובה ביותר",
  goToSolution: "מעבר לפתרון",
  automaticTranslation: "תרגום אוטומטי",
  manualTranslation: "תרגום ידני",
  showOriginal: "הצגת המקור",
  showTranslation: "הצגת התרגום",
  authorizationNav: "הרשאות",
  authorizationHeading: "ניהול הרשאות",
  rolesHeading: "תפקידים",
  usersHeading: "משתמשים",
  roleSlug: "מזהה תפקיד",
  displayName: "שם תצוגה",
  createRole: "יצירת תפקיד",
  save: "שמירה",
  deleteRole: "מחיקת תפקיד",
  builtInRole: "מובנה",
  permissionsHeading: "הרשאות",
  effectivePermissions: "הרשאות בפועל",
  assignedRole: "תפקיד משויך",
  defaultRole: "תפקיד ברירת מחדל",
  overrideInherit: "ירושה",
  overrideAllow: "אפשר",
  overrideDeny: "חסום",
  signInGoogle: "כניסה עם Google",
  signOut: "יציאה",
  forumNotFoundHeading: "עמוד הפורום לא נמצא",
  forumNotFoundBody: "הקטגוריה, המדור או הנושא אינם קיימים.",
};

export function previewTranslationRuntime(locale: "en" | "he", direction: "ltr" | "rtl") {
  const resourcesByLocale: Resource = locale === "he"
    ? { en: { common: english }, he: { common: hebrew } }
    : { en: { common: english } };

  return createTranslationRuntime({
    locale: {
      translationLocale: locale,
      fallbackLocales: locale === "en" ? [] : ["en"],
      direction,
      formatting: { locale, timeZone: "UTC" },
      nativeName: locale === "he" ? "עברית" : "English",
      presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale,
    bundleVersions: locale === "he"
      ? { en: { common: "preview-en" }, he: { common: "preview-he" } }
      : { en: { common: "preview-en" } },
    staleKeys: {},
  });
}
