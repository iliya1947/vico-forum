import type { UiKey } from "../localization/catalog";

export const CONSULTANT_CATALOG_VERSION = 1;
export const CONSULTANT_MAX_BODY_BYTES = 8192;
export const CONSULTANT_MAX_QUESTION_LENGTH = 1000;

import type { ConsultantFeature } from "./features.server";
export type { ConsultantFeature } from "./features.server";

export type ConsultantPage =
  | { kind: "none" }
  | { kind: "search"; term: string }
  | { kind: "topic"; topicId: string; postId?: string }
  | { kind: "category"; categoryId: string }
  | { kind: "section"; sectionId: string }
  | { kind: "editor"; destination: "help"; tagIds?: readonly string[] }
  | { kind: "editor"; destination: "section"; sectionId: string; tagIds?: readonly string[] };

export interface ConsultantRequest {
  consultationId: string;
  turnId: string;
  question: string;
  page: ConsultantPage;
  continuation?: { selectedFeature?: ConsultantFeature; selectedTopicId?: string };
}
export interface ConsultantCard {
  feature: ConsultantFeature;
  labelKey: UiKey<"common">;
  instructionKey: UiKey<"common">;
  href: string;
  resourceLabel?: string;
}
export interface ConsultantResult {
  catalogVersion: typeof CONSULTANT_CATALOG_VERSION;
  consultationId: string;
  turnId: string;
  kind: "navigation" | "fallback";
  cards: readonly ConsultantCard[];
}
export function consultantPath(locale: string): string {
  return "/" + encodeURIComponent(locale) + "/consultant";
}
