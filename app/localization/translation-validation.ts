import type { UiMessageDescriptor } from "./catalog";
import type { LocaleRulesProvider } from "./locale-rules";
import type { MachineTranslationProvenance } from "./translation-provider";

export type StructuredTranslationValue = Readonly<Record<string, string>>;
export type ProviderTranslationValue = string | StructuredTranslationValue;

export class TranslationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationValidationError";
  }
}

export function validateMachineTranslationProvenance(
  provenance: unknown,
): asserts provenance is MachineTranslationProvenance {
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    throw new TranslationValidationError("translation provenance must be an object");
  }

  const candidate = provenance as Record<string, unknown>;
  if (candidate.origin !== "machine") {
    throw new TranslationValidationError("translation publication origin must be machine");
  }
  if (typeof candidate.provider !== "string" || !candidate.provider.trim()) {
    throw new TranslationValidationError("translation provider must be a non-blank string");
  }
  if (typeof candidate.model !== "string" || !candidate.model.trim()) {
    throw new TranslationValidationError("translation provider model must be a non-blank string");
  }
  if (candidate.attribution !== undefined && typeof candidate.attribution !== "string") {
    throw new TranslationValidationError("translation provider attribution must be a string");
  }
}

export function validateTranslation(descriptor: UiMessageDescriptor, value: string): void {
  const identity = `${descriptor.namespace}:${descriptor.key}`;
  if (!value.trim()) throw new TranslationValidationError(`Empty translation: ${identity}`);
  if (value.length > 10_000) throw new TranslationValidationError(`Translation is too long: ${identity}`);
  if (/<\/?[a-z][^>]*>/i.test(value)) {
    throw new TranslationValidationError(`Markup is forbidden: ${identity}`);
  }
  const expected = [...descriptor.placeholders].sort(deterministicCompare);
  if (!sameStrings(placeholders(value), expected)) {
    throw new TranslationValidationError(`Placeholder mismatch: ${identity}`);
  }
  if (!sameStrings(controlledTokens(value), descriptorControlledTokens(descriptor))) {
    throw new TranslationValidationError(`Controlled token mismatch: ${identity}`);
  }
  for (const protectedTerm of descriptor.protectedTerms) {
    if (!value.includes(protectedTerm)) {
      throw new TranslationValidationError(`Protected term mismatch: ${identity}`);
    }
  }
  if (descriptor.messageKind === "plural" && !descriptor.placeholders.includes("count")) {
    throw new TranslationValidationError(`Plural message requires count: ${identity}`);
  }
}

export function validateProviderOutput(
  descriptor: UiMessageDescriptor,
  targetLocale: string,
  output: unknown,
  localeRules: LocaleRulesProvider,
): asserts output is ProviderTranslationValue {
  const identity = `${descriptor.namespace}:${descriptor.key}`;
  if (descriptor.messageKind !== "plural") {
    if (typeof descriptor.source !== "string") {
      throw new TranslationValidationError(`Non-plural source must be plain: ${identity}`);
    }
    if (typeof output !== "string") {
      throw new TranslationValidationError(`Expected plain translation: ${identity}`);
    }
    validateTranslation(descriptor, output);
    return;
  }

  if (!isRecord(descriptor.source)) {
    throw new TranslationValidationError(`Plural source must be structured: ${identity}`);
  }
  if (!isRecord(output)) {
    throw new TranslationValidationError(`Expected structured translation: ${identity}`);
  }
  const required: string[] = [...localeRules.pluralBranches(targetLocale)].sort(deterministicCompare);
  const actual = Object.keys(output).sort(deterministicCompare);
  const missing = required.filter((branch) => !Object.hasOwn(output, branch));
  if (missing.length > 0) {
    throw new TranslationValidationError(`Missing structured branches: ${missing.join(", ")}`);
  }
  const unexpected = actual.filter((branch) => !required.includes(branch));
  if (unexpected.length > 0) {
    throw new TranslationValidationError(`Unexpected structured branches: ${unexpected.join(", ")}`);
  }
  for (const branch of required) {
    const value = output[branch];
    if (typeof value !== "string") {
      throw new TranslationValidationError(`Invalid structured branch ${branch}: ${identity}`);
    }
    validateTranslation(descriptor, value);
  }
}

function descriptorControlledTokens(descriptor: UiMessageDescriptor): string[] {
  const values = typeof descriptor.source === "string" ? [descriptor.source] : Object.values(descriptor.source);
  return [...new Set(values.flatMap(controlledTokens))].sort(deterministicCompare);
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)]
    .map((match) => match[1]!)
    .sort(deterministicCompare);
}

// Match the default i18next nesting syntax, including JSON options and
// parentheses within quoted option values. Token equality includes all options:
// changing `lng` or another option can change the resolved UI text.
const nestingPattern = /\$t\(((?:[^()"']+|"[^"]*"|'[^']*'|\((?:[^()]|"[^"]*"|'[^']*')*\))*?)\)/gy;

function nestingTokens(value: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;
  while (true) {
    const start = value.indexOf("$t(", cursor);
    if (start < 0) return tokens;
    nestingPattern.lastIndex = start;
    const match = nestingPattern.exec(value);
    const parts = match?.[1]?.trim().match(/^([\w.:-]+)(?:\s*,\s*(\{[\s\S]*\}))?$/u);
    if (!match || !parts) throw new TranslationValidationError("Malformed i18next nesting");
    if (parts[2]) {
      // i18next interpolates {{variables}} before parsing nesting options as
      // JSON. A numeric sentinel lets us verify JSON shape without resolving them.
      const json = parts[2].replace(/\{\{\s*[\w.-]+\s*\}\}/gu, "0");
      try {
        const options: unknown = JSON.parse(json);
        if (!isRecord(options)) throw new Error("nesting options must be a JSON object");
      } catch {
        throw new TranslationValidationError("Malformed i18next nesting options");
      }
    }
    tokens.push(match[0]);
    cursor = start + match[0].length;
  }
}

function controlledTokens(value: string): string[] {
  return [
    ...nestingTokens(value),
    ...[...value.matchAll(/<\/?\d+>/g)].map((match) => match[0]),
  ].sort(deterministicCompare);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deterministicCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
