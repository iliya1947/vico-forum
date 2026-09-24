import type { MessageKind } from "./catalog";

export type TranslationDomain = "ui" | "content";
export type TranslationOperation = "plain" | "structured";

export type ContentDataClassification =
  | "public-forum-topic-title"
  | "public-forum-post-body"
  | "non-public-content";

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
 * Provider locale codes, limits and mapping stay behind this interface. `supports` and
 * `translate` receive only Vico canonical locales and domain capabilities.
 */
export interface MachineTranslationProviderAdapter {
  supports(request: MachineTranslationRequest): boolean;
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

  supports(request: MachineTranslationRequest): boolean {
    assertOperationMatchesMessageKind(request);
    return this.adapters.some((candidate) => candidate.supports(request));
  }

  async translate(request: MachineTranslationRequest): Promise<MachineTranslationResult> {
    assertOperationMatchesMessageKind(request);
    const adapter = this.adapters.find((candidate) => candidate.supports(request));
    if (!adapter) throw new UnsupportedTranslationProviderError(request);
    return adapter.translate(request);
  }
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

function assertOperationMatchesMessageKind(request: MachineTranslationRequest): void {
  if (request.operation !== translationOperation(request.messageKind)) {
    throw new TypeError(`Translation operation does not match message kind: ${request.messageKind}`);
  }
}
