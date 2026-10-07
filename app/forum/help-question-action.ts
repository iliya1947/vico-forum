import type { ForumMutationError } from "./mutations.server";

export interface HelpQuestionDraft {
  title: string;
  body: string;
  tags: string;
}

export interface HelpSimilarQuestionResult {
  id: string;
  title: string;
  replyCount: number;
  isSolved: boolean;
  tags: readonly { key: string; name: string }[];
}

export type HelpSimilarQuestionsActionData = {
  operation: "helpSimilarQuestions";
  outcome: "results" | "empty" | "invalid" | "unavailable";
  draft: HelpQuestionDraft;
  results: readonly HelpSimilarQuestionResult[];
};

export type HelpQuestionActionData = ForumMutationError | HelpSimilarQuestionsActionData;

export function isHelpSimilarQuestionsActionData(
  value: HelpQuestionActionData | undefined,
): value is HelpSimilarQuestionsActionData {
  return value?.operation === "helpSimilarQuestions";
}
