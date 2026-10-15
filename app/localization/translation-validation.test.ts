import { describe, expect, it } from "vitest";
import type { UiMessageDescriptor } from "./catalog";
import { IntlLocaleRulesProvider } from "./locale-rules";
import { TranslationValidationError, validateProviderOutput } from "./translation-validation";

const pluralDescriptor: UiMessageDescriptor = {
  namespace: "synthetic",
  key: "itemCount",
  source: {
    one: "{{count}} Vico item",
    other: "{{count}} Vico items",
  },
  description: "Synthetic plural validation fixture.",
  placeholders: ["count"],
  messageKind: "plural",
  protectedTerms: ["Vico"],
};
const plainDescriptor: UiMessageDescriptor = {
  ...pluralDescriptor,
  key: "plain",
  source: "Vico item",
  placeholders: [],
  messageKind: "plain",
};
const rules = new IntlLocaleRulesProvider();

describe("provider output validation", () => {
  it("accepts a complete one/other target structure", () => {
    expect(() => validateProviderOutput(pluralDescriptor, "en", {
      one: "{{count}} Vico item",
      other: "{{count}} Vico items",
    }, rules)).not.toThrow();
  });

  it("rejects a missing structured branch", () => {
    expect(() => validateProviderOutput(pluralDescriptor, "en", {
      other: "{{count}} Vico items",
    }, rules)).toThrow(/Missing structured branches: one/);
  });

  it("rejects an unexpected structured branch", () => {
    expect(() => validateProviderOutput(pluralDescriptor, "en", {
      one: "{{count}} Vico item",
      other: "{{count}} Vico items",
      few: "{{count}} Vico items",
    }, rules)).toThrow(/Unexpected structured branches: few/);
  });

  it("validates every branch placeholder and protected token", () => {
    expect(() => validateProviderOutput(pluralDescriptor, "en", {
      one: "{{count}} Vico item",
      other: "{{wrong}} Vico items",
    }, rules)).toThrow(/Placeholder mismatch/);
    expect(() => validateProviderOutput(pluralDescriptor, "en", {
      one: "{{count}} item",
      other: "{{count}} Vico items",
    }, rules)).toThrow(/Protected term mismatch/);
  });

  it("preserves controlled nesting tokens", () => {
    const nested = { ...plainDescriptor, source: "Read $t(common.rules)" };
    expect(() => validateProviderOutput(nested, "fr", "Lire les règles", rules))
      .toThrow(/Controlled token mismatch/);
  });

  it.each(["", "   ", "<strong>Bonjour</strong>", 42, null])("rejects untrusted plain output %j", (output) => {
    expect(() => validateProviderOutput(plainDescriptor, "fr", output, rules))
      .toThrow(TranslationValidationError);
  });
});
