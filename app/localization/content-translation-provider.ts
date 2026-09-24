import type {
  ContentMachineTranslationRequest,
  ContentTranslationCapability,
  TranslationProviderRouter,
} from "./translation-provider";

export const PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION = "public-forum-topic-title" as const;

export interface PublicForumTopicTitleProviderCapabilityInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly sourceCharacterCount: number;
}

export interface PublicForumTopicTitleProviderRequestInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly source: string;
}

export function publicForumTopicTitleProviderCapability(
  input: PublicForumTopicTitleProviderCapabilityInput,
): ContentTranslationCapability {
  return {
    domain: "content",
    contentClassification: PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    messageKind: "plain",
    operation: "plain",
    sourceCharacterCount: input.sourceCharacterCount,
  };
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
  supports(input: PublicForumTopicTitleProviderCapabilityInput): boolean;
}

export class RoutedContentTopicTitleProviderCapability
implements ContentTopicTitleProviderCapability {
  constructor(
    private readonly providerRouter: Pick<TranslationProviderRouter, "supports">,
  ) {}

  supports(input: PublicForumTopicTitleProviderCapabilityInput): boolean {
    return this.providerRouter.supports(publicForumTopicTitleProviderCapability(input));
  }
}
