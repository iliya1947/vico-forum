import { generatePath } from "react-router";
import type { UnderDevelopmentFeatureId } from "./under-development";

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

export function forumPopularPath(locale: string) {
  return generatePath("/:locale/popular", { locale });
}


export function underDevelopmentPath(locale: string, feature?: UnderDevelopmentFeatureId) {
  const path = generatePath("/:locale/under-development", { locale });
  return feature ? `${path}?feature=${encodeURIComponent(feature)}` : path;
}
