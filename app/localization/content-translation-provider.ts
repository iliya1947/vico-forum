import type {
  ContentMachineTranslationRequest,
  TranslationProviderRouter,
} from "./translation-provider";

export const PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION = "public-forum-topic-title" as const;

export interface PublicForumTopicTitleProviderRequestInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly source: string;
}

export function publicForumTopicTitleProviderRequest(
  input: PublicForumTopicTitleProviderRequestInput,
): ContentMachineTranslationRequest {
  return {
    domain: "content",
    contentClassification: PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    messageKind: "plain",
    operation: "plain",
    source: input.source,
  };
}

export interface ContentTopicTitleProviderCapability {
  supports(input: PublicForumTopicTitleProviderRequestInput): boolean;
}

export class RoutedContentTopicTitleProviderCapability
implements ContentTopicTitleProviderCapability {
  constructor(
    private readonly providerRouter: Pick<TranslationProviderRouter, "supports">,
  ) {}

  supports(input: PublicForumTopicTitleProviderRequestInput): boolean {
    return this.providerRouter.supports(publicForumTopicTitleProviderRequest(input));
  }
}
