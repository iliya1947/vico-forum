import { describe, expect, it, vi } from "vitest";
import type { MessageKind } from "./catalog";
import {
  TranslationProviderRouter,
  UnsupportedTranslationProviderError,
  type MachineTranslationProviderAdapter,
  type MachineTranslationRequest,
} from "./translation-provider";

function request(
  messageKind: MessageKind = "plain",
  operation: MachineTranslationRequest["operation"] = messageKind === "plain" || messageKind === "interpolation"
    ? "plain"
    : "structured",
): MachineTranslationRequest {
  return {
    domain: "ui",
    sourceLocale: "en",
    targetLocale: "fr-CA",
    messageKind,
    operation,
    source: "Hello",
  };
}

function adapter(
  supports: (candidate: MachineTranslationRequest) => boolean,
  value = "Bonjour",
): MachineTranslationProviderAdapter {
  return {
    supports: vi.fn(supports),
    translate: vi.fn(async () => ({
      value,
      provenance: { provider: "fake-provider", model: "fake-model-v2", origin: "machine" as const },
    })),
  };
}

describe("TranslationProviderRouter", () => {
  it("selects a plain-capable adapter and preserves provider provenance", async () => {
    const incompatible = adapter(() => false);
    const plain = adapter((candidate) => candidate.domain === "ui" && candidate.operation === "plain");

    await expect(new TranslationProviderRouter([incompatible, plain]).translate(request())).resolves.toEqual({
      value: "Bonjour",
      provenance: { provider: "fake-provider", model: "fake-model-v2", origin: "machine" },
    });
    expect(incompatible.translate).not.toHaveBeenCalled();
    expect(plain.translate).toHaveBeenCalledOnce();
  });

  it("does not select an adapter without the requested locale pair", async () => {
    const wrongPair = adapter((candidate) => candidate.sourceLocale === "de" && candidate.targetLocale === "fr");
    await expect(new TranslationProviderRouter([wrongPair]).translate(request()))
      .rejects.toBeInstanceOf(UnsupportedTranslationProviderError);
    expect(wrongPair.translate).not.toHaveBeenCalled();
  });

  it("does not route a structured request to a plain-only adapter", async () => {
    const plainOnly = adapter((candidate) => candidate.operation === "plain");
    await expect(new TranslationProviderRouter([plainOnly]).translate(request("plural")))
      .rejects.toBeInstanceOf(UnsupportedTranslationProviderError);
    expect(plainOnly.translate).not.toHaveBeenCalled();
  });

  it("keeps provider locale mapping inside the adapter boundary", async () => {
    const providerCall = vi.fn();
    const mapped: MachineTranslationProviderAdapter = {
      supports: (candidate) => candidate.sourceLocale === "en" && candidate.targetLocale === "fr-CA",
      async translate(candidate) {
        providerCall({ sourceLanguage: "ENGLISH", targetLanguage: "FRENCH_CANADA" });
        expect(candidate.targetLocale).toBe("fr-CA");
        return { value: "Bonjour", provenance: { provider: "mapped-fake", model: "m1", origin: "machine" } };
      },
    };

    await new TranslationProviderRouter([mapped]).translate(request());
    expect(providerCall).toHaveBeenCalledWith({ sourceLanguage: "ENGLISH", targetLanguage: "FRENCH_CANADA" });
  });

  it("rejects a request whose declared operation contradicts its message kind", async () => {
    const any = adapter(() => true);
    await expect(new TranslationProviderRouter([any]).translate(request("plural", "plain"))).rejects.toBeInstanceOf(TypeError);
    expect(any.supports).not.toHaveBeenCalled();
  });
});
