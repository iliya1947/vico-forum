import { generatePath } from "react-router";
import type { UnderDevelopmentFeatureId } from "./under-development";

export function forumPresencePath(locale: string) {
  return `/${encodeURIComponent(locale)}/presence`;
}

export function forumProfilePath(locale: string, userId: string) {
  return `/${encodeURIComponent(locale)}/users/${encodeURIComponent(userId)}`;
}

export function forumIndexPath(locale: string) {
  return generatePath("/:locale", { locale });
}

export function forumCategoryPath(locale: string, categoryId: string) {
  return generatePath("/:locale/categories/:categoryId", { locale, categoryId });
}

export function forumSectionPath(locale: string, sectionId: string) {
  return generatePath("/:locale/sections/:sectionId", { locale, sectionId });
}

export function forumTopicPath(locale: string, topicId: string) {
  return generatePath("/:locale/topics/:topicId", { locale, topicId });
}

export function forumSearchPath(locale: string) {
  return generatePath("/:locale/search", { locale });
}

export function forumPopularPath(locale: string) {
  return generatePath("/:locale/popular", { locale });
}

export function forumUnansweredPath(locale: string) {
  return generatePath("/:locale/unanswered", { locale });
}

export function forumUnreadPath(locale: string) {
  return generatePath("/:locale/unread", { locale });
}

export function forumNotificationsPath(locale: string) {
  return generatePath("/:locale/notifications", { locale });
}

export function forumTagsPath(locale: string) {
  return generatePath("/:locale/tags", { locale });
}

export function forumTagPath(locale: string, tagKey: string) {
  return `/${encodeURIComponent(locale)}/tags/${encodeURIComponent(tagKey)}`;
}


export function underDevelopmentPath(locale: string, feature?: UnderDevelopmentFeatureId) {
  const path = generatePath("/:locale/under-development", { locale });
  return feature ? `${path}?feature=${encodeURIComponent(feature)}` : path;
}
