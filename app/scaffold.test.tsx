import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createTranslationRuntime } from "./localization/runtime";
import Home from "./routes/home";

describe("Stage 1A scaffold", () => {
  it("renders the development scaffold", () => {
    const i18n = createTranslationRuntime({
      locale: {
        translationLocale: "en",
        fallbackLocales: [],
        direction: "ltr",
        formatting: { locale: "en", timeZone: "UTC" },
        nativeName: "English",
        presentationMetadata: {},
      },
      fallbackLocales: [],
      resourcesByLocale: {
        en: { common: { productName: "Vico Forum", heading: "Translation foundation", stageSummary: "Summary" } },
      },
      bundleVersions: { en: ["test"] },
      staleKeys: {},
    });
    render(
      <I18nextProvider i18n={i18n}>
        <Home />
      </I18nextProvider>,
    );
    expect(screen.getByRole("heading", { name: "Translation foundation" })).toBeInTheDocument();
  });
});
