import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { assemblePersistentRegistry } from "./persistent-registry";
import {
  RegistryLoaderConfigurationError,
  UiTranslationStoreConfigurationError,
  registryForRequest,
  registryLoaderContext,
  uiTranslationStoreContext,
  uiTranslationStoreForRequest,
} from "./request-context";

describe("request localization context", () => {
  it("fails explicitly when the registry loader was not injected", async () => {
    const context = new RouterContextProvider();

    await expect(registryForRequest(context)).rejects.toBeInstanceOf(RegistryLoaderConfigurationError);
  });

  it("does not mask failures raised by an injected registry loader", async () => {
    const context = new RouterContextProvider();
    const failure = new TypeError("loader failure");
    context.set(registryLoaderContext, async () => { throw failure; });

    await expect(registryForRequest(context)).rejects.toBe(failure);
  });

  it("returns the explicitly injected registry snapshot", async () => {
    const context = new RouterContextProvider();
    const bootstrap = await assemblePersistentRegistry([]);
    const expected = { ...bootstrap, health: { status: "healthy" as const } };
    context.set(registryLoaderContext, async () => expected);

    await expect(registryForRequest(context)).resolves.toBe(expected);
  });

  it("fails explicitly when the UI translation store was not injected", () => {
    const context = new RouterContextProvider();

    expect(() => uiTranslationStoreForRequest(context)).toThrow(UiTranslationStoreConfigurationError);
  });

  it("returns the explicitly injected UI translation store", () => {
    const context = new RouterContextProvider();
    const store = { readApproved: async () => [] };
    context.set(uiTranslationStoreContext, store);

    expect(uiTranslationStoreForRequest(context)).toBe(store);
  });
});
