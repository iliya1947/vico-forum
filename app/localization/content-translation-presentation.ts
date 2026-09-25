import { canonicalizeTranslationLocale, type TextDirection } from "./locale";
import {
  ContentTranslationInvalidRecordError,
  ContentTranslationService,
  ContentTranslationStorageUnavailableError,
  type ContentTranslationFallbackReason,
  type ContentTranslationIdentity,
  type ContentTranslationProvenance,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";

export type ContentBlockDirection = TextDirection | "auto";

export interface ContentPresentationVariant {
  readonly content: string;
  readonly locale: string;
  readonly direction: ContentBlockDirection;
}

export interface ContentTranslationPresentation {
  readonly selected: "original" | "translation";
  readonly displayed: ContentPresentationVariant;
  readonly original: ContentPresentationVariant;
  readonly translation:
    | (ContentPresentationVariant & {
        readonly provenance: ContentTranslationProvenance;
      })
    | null;
  readonly fallbackReason?: ContentTranslationFallbackReason;
}

export type ContentTranslationBatchEntry =
  | {
      readonly identity: ContentTranslationIdentity;
      readonly status: "translation";
      readonly translation: StoredContentTranslation;
    }
  | {
      readonly identity: ContentTranslationIdentity;
      readonly status: "invalid";
    };

export interface ContentTranslationBatchReadInput {
  readonly title: ContentTranslationIdentity;
  readonly posts: readonly ContentTranslationIdentity[];
}

export interface ContentTranslationBatchReadResult {
  readonly title?: ContentTranslationBatchEntry;
  readonly posts: readonly ContentTranslationBatchEntry[];
}

export interface ContentTranslationBatchReader {
  readTopic(input: ContentTranslationBatchReadInput): Promise<ContentTranslationBatchReadResult>;
}

export interface ContentTranslationTopicPresentationInput {
  readonly title: ContentTranslationRevision;
  readonly posts: readonly ContentTranslationRevision[];
  readonly targetLocale: string;
  readonly targetDirection: TextDirection;
  readonly sourceDirection: (sourceLocale: string) => ContentBlockDirection;
}

export interface ContentTranslationTopicPresentation {
  readonly title: ContentTranslationPresentation;
  readonly posts: readonly ContentTranslationPresentation[];
}

export interface ContentTranslationPresentationCapability {
  presentTopic(input: ContentTranslationTopicPresentationInput): Promise<ContentTranslationTopicPresentation>;
}

export class ContentTranslationPresentationIntegrityError extends Error {}

export class ContentTranslationPresentationService implements ContentTranslationPresentationCapability {
  constructor(private readonly batchReader: ContentTranslationBatchReader) {}

  async presentTopic(
    input: ContentTranslationTopicPresentationInput,
  ): Promise<ContentTranslationTopicPresentation> {
    if (input.title.contentType !== "topic-title") {
      throw new ContentTranslationPresentationIntegrityError("topic presentation title must use topic-title content type");
    }
    if (input.posts.some((post) => post.contentType !== "post-body")) {
      throw new ContentTranslationPresentationIntegrityError("topic presentation posts must use post-body content type");
    }

    const targetLocale = canonicalizeTranslationLocale(input.targetLocale);
    if (!targetLocale || targetLocale === "und" || targetLocale !== input.targetLocale) {
      throw new ContentTranslationPresentationIntegrityError("topic presentation target locale must be canonical");
    }

    const titleIdentity = identityFor(input.title, targetLocale);
    const postIdentities = input.posts.map((post) => identityFor(post, targetLocale));
    const requested = new Set([titleIdentity, ...postIdentities].map(identityKey));
    if (requested.size !== postIdentities.length + 1) {
      throw new ContentTranslationPresentationIntegrityError("topic presentation contains duplicate content identities");
    }

    let snapshot: SnapshotTranslationStore;
    try {
      const batch = await this.batchReader.readTopic({
        title: titleIdentity,
        posts: postIdentities,
      });
      snapshot = SnapshotTranslationStore.fromBatch(batch, requested);
    } catch (error) {
      if (!(error instanceof ContentTranslationStorageUnavailableError)) throw error;
      snapshot = SnapshotTranslationStore.unavailable();
    }

    const service = new ContentTranslationService(snapshot);
    const [title, ...posts] = await Promise.all([
      service.readCurrent(input.title, targetLocale),
      ...input.posts.map((post) => service.readCurrent(post, targetLocale)),
    ]);

    return {
      title: toPresentation(title, input.title, input.targetDirection, input.sourceDirection),
      posts: posts.map((result, index) =>
        toPresentation(result, input.posts[index]!, input.targetDirection, input.sourceDirection)
      ),
    };
  }
}

class SnapshotTranslationStore implements ContentTranslationStore {
  private constructor(
    private readonly entries: ReadonlyMap<string, ContentTranslationBatchEntry>,
    private readonly storageUnavailable: boolean,
  ) {}

  static fromBatch(
    batch: ContentTranslationBatchReadResult,
    requested: ReadonlySet<string>,
  ): SnapshotTranslationStore {
    const entries = new Map<string, ContentTranslationBatchEntry>();
    const supplied = [
      ...(batch.title ? [batch.title] : []),
      ...batch.posts,
    ];

    for (const entry of supplied) {
      const key = identityKey(entry.identity);
      if (!requested.has(key)) {
        throw new ContentTranslationPresentationIntegrityError(
          "batch reader returned a translation outside the requested topic identities",
        );
      }
      if (entries.has(key)) {
        throw new ContentTranslationPresentationIntegrityError(
          "batch reader returned a duplicate translation identity",
        );
      }
      entries.set(key, entry);
    }

    return new SnapshotTranslationStore(entries, false);
  }

  static unavailable(): SnapshotTranslationStore {
    return new SnapshotTranslationStore(new Map(), true);
  }

  async read(identity: ContentTranslationIdentity): Promise<StoredContentTranslation | undefined> {
    if (this.storageUnavailable) {
      throw new ContentTranslationStorageUnavailableError("content translation storage is unavailable");
    }

    const entry = this.entries.get(identityKey(identity));
    if (!entry) return undefined;
    if (entry.status === "invalid") {
      throw new ContentTranslationInvalidRecordError("persisted content translation is invalid");
    }
    return entry.translation;
  }

  async write(): Promise<StoredContentTranslation> {
    throw new ContentTranslationPresentationIntegrityError("read-only presentation snapshot cannot write translations");
  }
}

function identityFor(
  revision: ContentTranslationRevision,
  targetLocale: string,
): ContentTranslationIdentity {
  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
  };
}

function identityKey(identity: ContentTranslationIdentity): string {
  return JSON.stringify([
    identity.contentType,
    identity.contentId,
    identity.revisionId,
    identity.targetLocale,
  ]);
}

function toPresentation(
  result: Awaited<ReturnType<ContentTranslationService["readCurrent"]>>,
  revision: ContentTranslationRevision,
  targetDirection: TextDirection,
  sourceDirection: (sourceLocale: string) => ContentBlockDirection,
): ContentTranslationPresentation {
  if (result.selected === "translation") {
    const originalLocale = result.translation.sourceLocale;
    const original: ContentPresentationVariant = {
      content: revision.originalContent,
      locale: originalLocale,
      direction: sourceDirection(originalLocale),
    };
    const translation = {
      content: result.content,
      locale: result.contentLocale,
      direction: targetDirection,
      provenance: result.translation.provenance,
    } as const;
    return {
      selected: "translation",
      displayed: translation,
      original,
      translation,
    };
  }

  const original: ContentPresentationVariant = {
    content: result.content,
    locale: result.contentLocale,
    direction: sourceDirection(result.contentLocale),
  };
  return {
    selected: "original",
    displayed: original,
    original,
    translation: null,
    fallbackReason: result.reason,
  };
}
