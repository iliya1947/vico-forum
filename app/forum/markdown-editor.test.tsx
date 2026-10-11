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

async function chooseView(view: "write" | "preview" | "split") {
  const toggle = document.querySelector<HTMLDetailsElement>(".markdown-editor-preview-menu");
  if (!toggle) throw new Error("Missing Advanced preview menu");
  const optionLabels = { write: "Markdown", preview: "Preview", split: "Split" };
  if (!toggle.open) await userEvent.click(toggle.querySelector("summary")!);
  const option = [...toggle.querySelectorAll("button")]
    .find((button) => button.textContent === optionLabels[view]);
  if (!option) throw new Error("Missing " + view + " view option");
  await userEvent.click(option);
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
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="alpha beta" />
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
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue={"alpha\nbeta"} />
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
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="request(value)" />
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

  it("preserves language identifiers with hashes in fenced code", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="var example = 1;" />
      </>,
    );
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    await userEvent.type(screen.getByRole("textbox", { name: "Code language" }), "c#");
    await userEvent.click(screen.getByRole("button", { name: "Code block" }));
    expect(textarea).toHaveValue("```c#\nvar example = 1;\n```");
    await chooseView("preview");
    expect(screen.getByText("c#")).toBeInTheDocument();
  });

  it("isolates the code language input direction in RTL authoring", () => {
    renderEditor(
      <div dir="rtl"><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" /></div>,
    );
    expect(screen.getByRole("textbox", { name: "Code language" })).toHaveAttribute("dir", "ltr");
  });

  it("preserves selected backticks when inserting inline code", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="`hello`" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Inline code" }));

    expect(textarea).toHaveValue("`` `hello` ``");
    expect(textarea.selectionStart).toBe(3);
    expect(textarea.selectionEnd).toBe(10);

    await chooseView("preview");
    const renderedCode = screen.getByText("`hello`");
    expect(renderedCode.tagName).toBe("CODE");
  });

  it("keeps fenced-code language optional by default", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="plain()" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    expect(screen.getByRole("textbox", { name: "Code language" })).toHaveValue("");

    await userEvent.click(screen.getByRole("button", { name: "Code block" }));

    expect(textarea).toHaveValue("```\nplain()\n```");
  });

  it("uses an outer fenced-code delimiter longer than selected backtick runs", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue={"```\ninner\n```"} />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Code block" }));

    expect(textarea).toHaveValue("````\n```\ninner\n```\n````");

    await chooseView("preview");
    const codeBlocks = document.querySelectorAll(".forum-code-block");
    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0]?.querySelector("pre")?.textContent).toBe("```\ninner\n```");
  });

  it("inserts imperative quote text at the current selection and keeps the field focused", () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" ref={editorRef} id="body" name="body" defaultValue="before after" />
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
        <MarkdownEditor defaultAuthoringMode="advanced" ref={editorRef} id="body" name="body" defaultValue="before" />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await chooseView("preview");
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    act(() => editorRef.current?.insertText("> quoted\n\n"));

    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveFocus();
    expect(textarea).toHaveValue("before> quoted\n\n");
  });

  it("reveals the required textarea when native validation fires in preview mode", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" required />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    await chooseView("preview");
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    fireEvent.invalid(textarea);

    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveFocus();
  });

  it("keeps preview textarea out of sequential keyboard focus", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="text" /></>);
    const textarea = screen.getByLabelText("Body");
    await chooseView("preview");
    expect(textarea).toHaveAttribute("tabindex", "-1");
    await chooseView("write");
    expect(textarea).not.toHaveAttribute("tabindex", "-1");
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
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" required />
        <button type="submit">Submit</button>
      </form>,
    );

    const textarea = screen.getByLabelText("Body");
    await userEvent.type(textarea, "Text with **Markdown** and `code()`.");
    await chooseView("preview");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(submitted).toHaveBeenCalledWith("Text with **Markdown** and `code()`.");
  });

  it("formats the leading empty line when caret starts at offset zero", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue={"\nbeta"} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 0);
    await userEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(textarea).toHaveValue("- \nbeta");
  });

  it("does not format the next line when selection ends at a newline", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue={"alpha\nbeta"} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 6);
    await userEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(textarea).toHaveValue("- alpha\nbeta");
  });

  it("previews through the safe ForumMarkdown renderer", () => {
    renderEditor(
      <label>
        Body
        <MarkdownEditor defaultAuthoringMode="advanced"
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

  it("undoes and redoes exact Markdown across view switches", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body"
      defaultValue={"**bold**\n\n```tsx\nconst a = 1;\n```"} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const original = textarea.value;
    textarea.focus();
    textarea.setSelectionRange(original.length, original.length);
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    const formatted = textarea.value;
    expect(formatted).not.toBe(original);
    await chooseView("split");
    expect(textarea).toHaveValue(formatted);
    fireEvent.keyDown(textarea, { key: "z", ctrlKey: true });
    expect(textarea).toHaveValue(original);
    await chooseView("write");
    fireEvent.keyDown(textarea, { key: "z", ctrlKey: true, shiftKey: true });
    expect(textarea).toHaveValue(formatted);
    fireEvent.keyDown(textarea, { key: "z", ctrlKey: true });
    expect(textarea).toHaveValue(original);
    fireEvent.keyDown(textarea, { key: "y", ctrlKey: true });
    expect(textarea).toHaveValue(formatted);
  });

  it("undoes imperative quote insertion without changing the form field contract", () => {
    const ref = createRef<MarkdownEditorHandle>();
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor defaultAuthoringMode="advanced" ref={ref}
      id="body" name="body" defaultValue="before" /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 6);
    act(() => ref.current?.insertText("\n> quote"));
    expect(textarea).toHaveValue("before\n> quote");
    fireEvent.keyDown(textarea, { key: "z", ctrlKey: true });
    expect(textarea).toHaveValue("before");
    fireEvent.keyDown(textarea, { key: "y", ctrlKey: true });
    expect(textarea).toHaveValue("before\n> quote");
  });

  it("defaults to source-preserving visual mode and switches to Markdown without rewriting", async () => {
    const source = "Hello **world**\n\n```ts\nconst a = 1;\n```\n\nAfter";
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></>);
    const editor = document.querySelector(".markdown-editor")!;
    const textarea = screen.getByLabelText("Body");
    expect(editor).toHaveAttribute("data-authoring", "simple");
    expect(textarea).toHaveValue(source);
    expect(document.querySelector('[data-visual-text="true"]')).not.toBeNull();
    expect(document.querySelector('[data-visual-protected="code"]')).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(editor).toHaveAttribute("data-authoring", "advanced");
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(textarea).toHaveValue(source);
  });

  it("edits a visual prose leaf while keeping code untouched and exact form data", () => {
    const source = "Before\n\n```ts\nconst x = 1;\n```\n\nAfter";
    renderEditor(<form><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></form>);
    const original = document.querySelectorAll<HTMLElement>('[data-visual-text="true"]');
    const last = original[original.length - 1]!;
    last.textContent = "Changed";
    fireEvent.input(last);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(textarea.value).toBe(source.replace("After", "Changed"));
    expect(new FormData(textarea.form!).get("body")).toBe(textarea.value);
  });

  it("does not turn visual source switching into a destructive Markdown round-trip", async () => {
    const source = "  text  \r\n\r\n**bold**\r\n\r\n```tsx\nhello();\n```";
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></>);
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    await chooseView("split");
    await chooseView("write");
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toBe(source.replace(/\r\n/gu, "\n"));
  });

  it("switches between write, preview, and split views without changing the textarea value", async () => {
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor defaultAuthoringMode="advanced" id="body" name="body" defaultValue="**preview me**" />
      </>,
    );

    const textarea = screen.getByLabelText("Body");
    const editor = textarea.closest(".markdown-editor")!;
    const writePane = textarea.closest(".markdown-editor-write-pane")!;
    await chooseView("preview");
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
    expect(screen.getByText("preview me").tagName).toBe("STRONG");
    expect(editor).toHaveAttribute("data-mode", "preview");
    expect(writePane).toHaveClass("is-preview-hidden");

    await chooseView("split");
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
    expect(editor).toHaveAttribute("data-mode", "split");
    expect(writePane).not.toHaveClass("is-preview-hidden");

    await chooseView("write");
    expect(screen.queryByRole("region", { name: "Markdown preview" })).not.toBeInTheDocument();
    expect(editor).toHaveAttribute("data-mode", "write");
    expect(writePane).not.toHaveClass("is-preview-hidden");
    expect(textarea).toHaveValue("**preview me**");
  });
});
