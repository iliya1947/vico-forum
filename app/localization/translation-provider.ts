import type { MessageKind } from "./catalog";
import type { ProviderTranslationValue } from "./translation-validation";

export type TranslationDomain = "ui" | "content";
export type TranslationOperation = "plain" | "structured";

export interface MachineTranslationRequest {
  readonly domain: TranslationDomain;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly messageKind: MessageKind;
  readonly operation: TranslationOperation;
  readonly source: string | Readonly<Record<string, string>>;
  readonly requiredBranches?: readonly string[];
}

export interface MachineTranslationProvenance {
  readonly provider: string;
  readonly model: string;
  readonly origin: "machine";
  readonly attribution?: string;
}

export interface MachineTranslationResult {
  readonly value: ProviderTranslationValue;
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

export class TranslationProviderRouter {
  constructor(private readonly adapters: readonly MachineTranslationProviderAdapter[]) {}

  async translate(request: MachineTranslationRequest): Promise<MachineTranslationResult> {
    if (request.operation !== translationOperation(request.messageKind)) {
      throw new TypeError(`Translation operation does not match message kind: ${request.messageKind}`);
    }
    const adapter = this.adapters.find((candidate) => candidate.supports(request));
    if (!adapter) throw new UnsupportedTranslationProviderError(request);
    return adapter.translate(request);
  }
}

export function translationOperation(messageKind: MessageKind): TranslationOperation {
  return messageKind === "plain" || messageKind === "interpolation" ? "plain" : "structured";
}
