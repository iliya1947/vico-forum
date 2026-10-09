import "@testing-library/jest-dom/vitest";
import { createRef, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor";

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[key + "_" + branch] = value;
    }
  }
  return resources;
}

function runtime() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: canonicalCommonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function renderEditor(element: ReactNode) {
  return render(<I18nextProvider i18n={runtime()}>{element}</I18nextProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MarkdownEditor", () => {
  it("wraps the selected text and restores selection/focus", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue="alpha beta" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(textarea).toHaveValue("**alpha** beta");
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(7);
  });

  it("formats block-level Markdown and link destinations from the current selection", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue={"alpha\nbeta"} />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(textarea).toHaveValue("- alpha\n- beta");
    expect(textarea).toHaveFocus();

    textarea.setSelectionRange(2, 7);
    await userEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(textarea).toHaveValue("- [alpha](https://)\n- beta");
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("https://");
  });

  it("inserts inline and fenced code with the selected language at the caret", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue="request(value)" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    await userEvent.click(screen.getByRole("button", { name: "Inline code" }));
    expect(textarea).toHaveValue("`request(value)`");

    textarea.setSelectionRange(0, textarea.value.length);
    const language = screen.getByRole("textbox", { name: "Code language" });
    await userEvent.clear(language);
    await userEvent.type(language, "tsx");
    await userEvent.click(screen.getByRole("button", { name: "Code block" }));

    expect(textarea.value).toBe("```tsx\n`request(value)`\n```");
    expect(textarea).toHaveFocus();
  });

  it("preserves selected backticks when inserting inline code", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue="`hello`" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Inline code" }));

    expect(textarea).toHaveValue("`` `hello` ``");
    expect(textarea.selectionStart).toBe(3);
    expect(textarea.selectionEnd).toBe(10);

    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    const renderedCode = screen.getByText("`hello`");
    expect(renderedCode.tagName).toBe("CODE");
  });

  it("uses an outer fenced-code delimiter longer than selected backtick runs", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue={"```\ninner\n```"} />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Code block" }));

    expect(textarea).toHaveValue("````ts\n```\ninner\n```\n````");

    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    const codeBlocks = document.querySelectorAll(".forum-code-block");
    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0]?.querySelector("pre")?.textContent).toBe("```\ninner\n```");
  });

  it("inserts imperative quote text at the current selection and keeps the field focused", () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor ref={editorRef} id="body" name="body" defaultValue="before after" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(7, 7);

    act(() => editorRef.current?.insertText("> selected\n\n"));

    expect(textarea).toHaveValue("before > selected\n\nafter");
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe("before > selected\n\n".length);
  });


  it("returns from preview to an editable focused field for imperative Reply/Quote insertion", async () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor ref={editorRef} id="body" name="body" defaultValue="before" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    act(() => editorRef.current?.insertText("> quoted\n\n"));

    expect(screen.getByRole("button", { name: "Write" })).toHaveAttribute("aria-pressed", "true");
    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveFocus();
    expect(textarea).toHaveValue("before> quoted\n\n");
  });

  it("reveals the required textarea when native validation fires in preview mode", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" required />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    fireEvent.invalid(textarea);

    expect(screen.getByRole("button", { name: "Write" })).toHaveAttribute("aria-pressed", "true");
    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveFocus();
  });

  it("submits the exact edited Markdown body through the native form contract", async () => {
    const submitted = vi.fn();
    renderEditor(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted(new FormData(event.currentTarget).get("body"));
        }}
      >
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" required />
        <button type="submit">Submit</button>
      </form>,
    );

    const textarea = screen.getByLabelText("Body");
    await userEvent.type(textarea, "Text with **Markdown** and `code()`.");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(submitted).toHaveBeenCalledWith("Text with **Markdown** and `code()`.");
  });

  it("previews through the safe ForumMarkdown renderer", () => {
    renderEditor(
      <label>
        Body
        <MarkdownEditor
          id="body"
          name="body"
          defaultPreviewOpen
          defaultValue={"<script>window.pwned=true</script>\n\n![pixel](https://evil.example/pixel.png)\n\n```ts\nconst answer = true;\n```"}
        />
      </label>,
    );

    expect(document.querySelector("script, img")).toBeNull();
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wrap lines" })).toBeInTheDocument();
  });

  it("switches between write, preview, and split views without changing the textarea value", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue="**preview me**" />
      </>,
    );

    const textarea = screen.getByLabelText("Body");
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
    expect(screen.getByText("preview me").tagName).toBe("STRONG");
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    await userEvent.click(screen.getByRole("button", { name: "Split" }));
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
    expect(editor).toHaveAttribute("data-mode", "split");
    expect(writePane).not.toHaveClass("is-preview-hidden");

    await userEvent.click(screen.getByRole("button", { name: "Write" }));
    expect(screen.queryByRole("region", { name: "Markdown preview" })).not.toBeInTheDocument();
    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveValue("**preview me**");
  });
});
