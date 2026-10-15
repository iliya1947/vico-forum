import type {
  ContentMachineTranslationRequest,
  ContentTranslationCapability,
  TranslationProviderRouter,
} from "./translation-provider";

export const PUBLIC_FORUM_TOPIC_TITLE_CLASSIFICATION = "public-forum-topic-title" as const;
export const PUBLIC_FORUM_POST_BODY_CLASSIFICATION = "public-forum-post-body" as const;

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


export interface PublicForumPostBodyProviderCapabilityInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly segmentCharacterCounts: readonly number[];
}

export function publicForumPostBodyProviderCapabilities(
  input: PublicForumPostBodyProviderCapabilityInput,
): readonly ContentTranslationCapability[] {
  return input.segmentCharacterCounts.map((sourceCharacterCount) => ({
    domain: "content" as const,
    contentClassification: PUBLIC_FORUM_POST_BODY_CLASSIFICATION,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    messageKind: "plain" as const,
    operation: "plain" as const,
    sourceCharacterCount,
  }));
}

export interface PublicForumPostBodyProviderRequestInput {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly source: string;
}

export function publicForumPostBodyProviderRequest(
  input: PublicForumPostBodyProviderRequestInput,
): ContentMachineTranslationRequest {
  return {
    domain: "content",
    contentClassification: PUBLIC_FORUM_POST_BODY_CLASSIFICATION,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    messageKind: "plain",
    operation: "plain",
    source: input.source,
  };
}

export interface ContentPostBodyProviderCapability {
  supports(input: PublicForumPostBodyProviderCapabilityInput): boolean;
}

export class RoutedContentPostBodyProviderCapability
implements ContentPostBodyProviderCapability {
  constructor(
    private readonly providerRouter: Pick<TranslationProviderRouter, "supports">,
  ) {}

  supports(input: PublicForumPostBodyProviderCapabilityInput): boolean {
    const capabilities = publicForumPostBodyProviderCapabilities(input);
    return capabilities.length > 0
      && capabilities.every((capability) => this.providerRouter.supports(capability));
  }
}
