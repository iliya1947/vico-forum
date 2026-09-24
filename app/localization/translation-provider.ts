import type { MessageKind } from "./catalog";

export type TranslationDomain = "ui" | "content";
export type TranslationOperation = "plain" | "structured";

export type ContentDataClassification =
  | "public-forum-topic-title"
  | "public-forum-post-body"
  | "non-public-content";

interface TranslationCapabilityBase {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly messageKind: MessageKind;
  readonly operation: TranslationOperation;
  readonly sourceCharacterCount: number | null;
}

export interface UiTranslationCapability extends TranslationCapabilityBase {
  readonly domain: "ui";
  readonly contentClassification?: never;
}

export interface ContentTranslationCapability extends TranslationCapabilityBase {
  readonly domain: "content";
  readonly contentClassification: ContentDataClassification;
}

export type MachineTranslationCapability =
  | UiTranslationCapability
  | ContentTranslationCapability;

interface MachineTranslationRequestBase {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly messageKind: MessageKind;
  readonly operation: TranslationOperation;
  readonly source: string | Readonly<Record<string, string>>;
  readonly requiredBranches?: readonly string[];
}

export interface UiMachineTranslationRequest extends MachineTranslationRequestBase {
  readonly domain: "ui";
  readonly contentClassification?: never;
}

export interface ContentMachineTranslationRequest extends MachineTranslationRequestBase {
  readonly domain: "content";
  readonly contentClassification: ContentDataClassification;
}

export type MachineTranslationRequest =
  | UiMachineTranslationRequest
  | ContentMachineTranslationRequest;

export interface MachineTranslationProvenance {
  readonly provider: string;
  readonly model: string;
  readonly origin: "machine";
  readonly attribution?: string;
}

export interface MachineTranslationResult {
  readonly value: unknown;
  readonly provenance: MachineTranslationProvenance;
}

/**
 * Capability selection receives metadata only. Raw source content is passed only to the
 * adapter selected by the router, after capability/data-policy approval.
 */
export interface MachineTranslationProviderAdapter {
  supports(capability: MachineTranslationCapability): boolean;
  translate(request: MachineTranslationRequest): Promise<MachineTranslationResult>;
}

export class UnsupportedTranslationProviderError extends Error {
  constructor(readonly request: MachineTranslationRequest) {
    super(`No machine translation provider supports ${request.sourceLocale} -> ${request.targetLocale} (${request.operation})`);
    this.name = "UnsupportedTranslationProviderError";
  }
}

export class UnsupportedTranslationMessageKindError extends Error {
  constructor(readonly messageKind: MessageKind) {
    super(`Machine translation is not implemented for message kind: ${messageKind}`);
    this.name = "UnsupportedTranslationMessageKindError";
  }
}

export class TranslationProviderRouter {
  constructor(private readonly adapters: readonly MachineTranslationProviderAdapter[]) {}

  supports(capability: MachineTranslationCapability): boolean {
    assertOperationMatchesMessageKind(capability);
    return this.adapters.some((candidate) => candidate.supports(capability));
  }

  async translate(request: MachineTranslationRequest): Promise<MachineTranslationResult> {
    assertOperationMatchesMessageKind(request);
    const capability = machineTranslationCapability(request);
    const adapter = this.adapters.find((candidate) => candidate.supports(capability));
    if (!adapter) throw new UnsupportedTranslationProviderError(request);
    return adapter.translate(request);
  }
}

export function machineTranslationCapability(
  request: MachineTranslationRequest,
): MachineTranslationCapability {
  const sourceCharacterCount = typeof request.source === "string"
    ? request.source.length
    : null;
  return request.domain === "content"
    ? {
        domain: "content",
        contentClassification: request.contentClassification,
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        messageKind: request.messageKind,
        operation: request.operation,
        sourceCharacterCount,
      }
    : {
        domain: "ui",
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        messageKind: request.messageKind,
        operation: request.operation,
        sourceCharacterCount,
      };
}

export function translationOperation(messageKind: MessageKind): TranslationOperation {
  switch (messageKind) {
    case "plain":
    case "interpolation":
      return "plain";
    case "plural":
    case "rich":
      return "structured";
    case "contextual/select":
      throw new UnsupportedTranslationMessageKindError(messageKind);
  }
}

function assertOperationMatchesMessageKind(
  request: Pick<MachineTranslationCapability, "messageKind" | "operation">,
): void {
  if (request.operation !== translationOperation(request.messageKind)) {
    throw new TypeError(`Translation operation does not match message kind: ${request.messageKind}`);
  }
}
