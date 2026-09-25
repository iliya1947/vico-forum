import { and, eq, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  ContentTranslationInvalidRecordError,
  type ContentTranslationIdentity,
} from "../app/localization/content-translation";
import type {
  ContentTranslationBatchEntry,
  ContentTranslationBatchReadInput,
  ContentTranslationBatchReadResult,
  ContentTranslationBatchReader,
} from "../app/localization/content-translation-presentation";
import {
  classifyStorageFailure,
  postRow,
  topicRow,
  type TranslationRow,
} from "./content-translation-store";
import {
  forumPostBodyTranslations,
  forumTopicTitleTranslations,
} from "./schema";

type TopicTranslationRow = TranslationRow & { topicId: string };
type PostTranslationRow = TranslationRow & { postId: string };

export class DrizzleContentTranslationBatchReader implements ContentTranslationBatchReader {
  constructor(private readonly database: NodePgDatabase) {}

  async readTopic(
    input: ContentTranslationBatchReadInput,
  ): Promise<ContentTranslationBatchReadResult> {
    try {
      const [titleRow] = await this.database
        .select({
          topicId: forumTopicTitleTranslations.topicId,
          revisionId: forumTopicTitleTranslations.revisionId,
          targetLocale: forumTopicTitleTranslations.targetLocale,
          sourceLocale: forumTopicTitleTranslations.sourceLocale,
          translatedContent: forumTopicTitleTranslations.translatedContent,
          origin: forumTopicTitleTranslations.origin,
          provider: forumTopicTitleTranslations.provider,
          providerModel: forumTopicTitleTranslations.providerModel,
          attribution: forumTopicTitleTranslations.attribution,
        })
        .from(forumTopicTitleTranslations)
        .where(and(
          eq(forumTopicTitleTranslations.topicId, input.title.contentId),
          eq(forumTopicTitleTranslations.revisionId, input.title.revisionId),
          eq(forumTopicTitleTranslations.targetLocale, input.title.targetLocale),
        ));

      let postRows: PostTranslationRow[] = [];
      if (input.posts.length > 0) {
        const targetLocales = [...new Set(input.posts.map((identity) => identity.targetLocale))];
        if (targetLocales.length !== 1 || targetLocales[0] !== input.title.targetLocale) {
          throw new Error("topic presentation batch must use one target locale");
        }

        postRows = await this.database
          .select({
            postId: forumPostBodyTranslations.postId,
            revisionId: forumPostBodyTranslations.revisionId,
            targetLocale: forumPostBodyTranslations.targetLocale,
            sourceLocale: forumPostBodyTranslations.sourceLocale,
            translatedContent: forumPostBodyTranslations.translatedContent,
            origin: forumPostBodyTranslations.origin,
            provider: forumPostBodyTranslations.provider,
            providerModel: forumPostBodyTranslations.providerModel,
            attribution: forumPostBodyTranslations.attribution,
          })
          .from(forumPostBodyTranslations)
          .where(and(
            eq(forumPostBodyTranslations.targetLocale, input.title.targetLocale),
            or(...input.posts.map((identity) => and(
              eq(forumPostBodyTranslations.postId, identity.contentId),
              eq(forumPostBodyTranslations.revisionId, identity.revisionId),
            ))),
          ));
      }

      return {
        ...(titleRow ? { title: topicEntry(titleRow) } : {}),
        posts: postRows.map(postEntry),
      };
    } catch (error) {
      throw classifyStorageFailure(error);
    }
  }
}

function topicEntry(row: TopicTranslationRow): ContentTranslationBatchEntry {
  const identity: ContentTranslationIdentity = {
    contentType: "topic-title",
    contentId: row.topicId,
    revisionId: row.revisionId,
    targetLocale: row.targetLocale,
  };
  try {
    return {
      identity,
      status: "translation",
      translation: topicRow(row),
    };
  } catch (error) {
    if (error instanceof ContentTranslationInvalidRecordError) {
      return { identity, status: "invalid" };
    }
    throw error;
  }
}

function postEntry(row: PostTranslationRow): ContentTranslationBatchEntry {
  const identity: ContentTranslationIdentity = {
    contentType: "post-body",
    contentId: row.postId,
    revisionId: row.revisionId,
    targetLocale: row.targetLocale,
  };
  try {
    return {
      identity,
      status: "translation",
      translation: postRow(row),
    };
  } catch (error) {
    if (error instanceof ContentTranslationInvalidRecordError) {
      return { identity, status: "invalid" };
    }
    throw error;
  }
}
