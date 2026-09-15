import type { UiMessageDescriptor } from "./catalog";
import type { LocaleRulesProvider } from "./locale-rules";

export type StructuredTranslationValue = Readonly<Record<string, string>>;
export type ProviderTranslationValue = string | StructuredTranslationValue;

export class TranslationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationValidationError";
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
  if (!sameStrings(controlledTokens(value), controlledTokens(descriptor.source))) {
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
  if (descriptor.messageKind !== "plural") {
    if (typeof output !== "string") {
      throw new TranslationValidationError(`Expected plain translation: ${descriptor.namespace}:${descriptor.key}`);
    }
    validateTranslation(descriptor, output);
    return;
  }

  if (!isRecord(output)) {
    throw new TranslationValidationError(`Expected structured translation: ${descriptor.namespace}:${descriptor.key}`);
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
      throw new TranslationValidationError(`Invalid structured branch ${branch}: ${descriptor.namespace}:${descriptor.key}`);
    }
    validateTranslation(descriptor, value);
  }
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)]
    .map((match) => match[1]!)
    .sort(deterministicCompare);
}

function controlledTokens(value: string): string[] {
  return [
    ...value.matchAll(/\$t\(\s*([\w.:-]+)\s*\)/g),
    ...value.matchAll(/<\/?\d+>/g),
  ].map((match) => match[0]).sort(deterministicCompare);
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
