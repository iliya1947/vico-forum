import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";
import { DrizzleContentTranslationBatchReader } from "./content-translation-presentation-store";

describe("DrizzleContentTranslationBatchReader", () => {
  it("uses one title query and one set-based post query regardless of post count", async () => {
    let selects = 0;
    const rows = [
      [{
        topicId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
        sourceLocale: "en",
        translatedContent: "כותרת",
        origin: "machine",
        provider: "provider-a",
        providerModel: "model-a",
        attribution: null,
      }],
      [
        {
          postId: "post-1",
          revisionId: "post-r1",
          targetLocale: "he",
          sourceLocale: "en",
          translatedContent: "אחד",
          origin: "persistent_manual",
          provider: null,
          providerModel: null,
          attribution: null,
        },
        {
          postId: "post-3",
          revisionId: "post-r3",
          targetLocale: "he",
          sourceLocale: "en",
          translatedContent: "שלוש",
          origin: "machine",
          provider: "provider-a",
          providerModel: "model-a",
          attribution: "Provider attribution",
        },
      ],
    ];

    const database = {
      select: () => {
        const index = selects++;
        return {
          from: () => ({
            where: async () => rows[index] ?? [],
          }),
        };
      },
    } as unknown as NodePgDatabase;

    const result = await new DrizzleContentTranslationBatchReader(database).readTopic({
      title: {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
      },
      posts: [1, 2, 3, 4].map((number) => ({
        contentType: "post-body" as const,
        contentId: `post-${number}`,
        revisionId: `post-r${number}`,
        targetLocale: "he",
      })),
    });

    expect(selects).toBe(2);
    expect(result.title).toMatchObject({ status: "translation" });
    expect(result.posts).toHaveLength(2);
  });

  it("skips the post query when a topic has no posts", async () => {
    let selects = 0;
    const database = {
      select: () => {
        selects += 1;
        return {
          from: () => ({
            where: async () => [],
          }),
        };
      },
    } as unknown as NodePgDatabase;

    await new DrizzleContentTranslationBatchReader(database).readTopic({
      title: {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
      },
      posts: [],
    });

    expect(selects).toBe(1);
  });
});
