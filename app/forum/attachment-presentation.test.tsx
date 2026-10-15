import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ForumAttachmentDisplay } from "./attachment-presentation";

const resources = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
  .filter(([, descriptor]) => typeof descriptor.source === "string")
  .map(([key, descriptor]) => [key, descriptor.source as string]));
const i18n = createTranslationRuntime({
  locale: { translationLocale: "en", fallbackLocales: [], direction: "ltr",
    formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
  fallbackLocales: [], resourcesByLocale: { en: { common: resources } },
  bundleVersions: { en: { common: "test" } }, staleKeys: {},
});
function renderAttachment(element: ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

afterEach(() => cleanup());

describe("attachment presentation shared between the editor and posts", () => {
  const path = "/api/attachments/file/id?post=post";
  const file = { id: "id", fileName: "Photo עברית.png", byteSize: 1234, detectedType: "png" };
  it("renders a verified raster in a published post without changing Markdown", () => {
    renderAttachment(<ForumAttachmentDisplay attachment={file} url={path} />);
    expect(screen.getByAltText(file.fileName)).toHaveAttribute("src", path + "&view=inline");
    expect(screen.getByRole("link", { name: `Open original ${file.fileName}` })).toHaveAttribute("href", path + "&view=inline");
    expect(screen.getByRole("link", { name: `Open original ${file.fileName}` })).not.toHaveAttribute("download");
    expect(screen.getByRole("link", { name: file.fileName })).toHaveAttribute("download", file.fileName);
    expect(screen.getByText(/1,234 B/u)).toBeInTheDocument();
  });
  it("does not automatically request preview bytes while a draft list is restored", () => {
    renderAttachment(<section dir="rtl"><ForumAttachmentDisplay attachment={file} url={path} deferImage /></section>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByAltText(file.fileName)).toHaveAttribute("src", path + "&view=inline");
  });
  it("offers only explicit inert previews for source and keeps unknown types downloadable", () => {
    const view = renderAttachment(<ForumAttachmentDisplay
      attachment={{ ...file, fileName: "source.html", detectedType: "text" }} url={path} />);
    expect(screen.getByRole("link", { name: "Preview" })).toHaveAttribute(
      "href", path + "&view=text",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    view.rerender(<ForumAttachmentDisplay attachment={{ ...file, detectedType: "zip" }} url={path} />);
    expect(screen.queryByRole("link", { name: "Preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: file.fileName })).toHaveAttribute("download");
  });
});
