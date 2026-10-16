import "@testing-library/jest-dom/vitest";
import { createRef, StrictMode, useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { MarkdownEditor, type MarkdownEditorHandle } from "./markdown-editor";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { readLocalEditorDraft, writeLocalEditorDraft, clearLocalEditorDraft } from "./draft-client";

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

function stubEmptyDraftMetadata() {
  vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
    if (uri === "/api/attachments" && options?.method === "GET") {
      return new Response(JSON.stringify({ attachments: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!options?.method && uri.includes("mode=metadata")) {
      return new Response(JSON.stringify({ drafts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error("Unexpected fetch");
  }));
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MarkdownEditor", () => {
  it("does not capture untouched published source as a local edit during StrictMode cleanup before metadata", async () => {
    const owner = "strict-edit-owner", key = "post:strict-edit:edit";
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => uri === "/api/attachments"
      ? Response.json({ attachments: [] })
      : Response.json({ drafts: [{ contextKey: key, draftId: crypto.randomUUID(), version: 3,
        status: "published", editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), title: "", snippet: "" }] })));
    renderEditor(<StrictMode><HeaderAuthProvider initialUser={{ id: owner, name: "Author" }}>
      <form><MarkdownEditor id="strict-edit" name="body" defaultValue="Published source"
        draftContextKey={key} draftLocale="en" /></form>
    </HeaderAuthProvider></StrictMode>);
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    expect(readLocalEditorDraft(owner, key)).toBeNull();
    expect(document.querySelector('input[name="editorDraftVersion"]')).toHaveValue("3");
    expect(screen.queryByText("Draft changed on another device. Choose which version to keep.")).not.toBeInTheDocument();
  });

  it.each([
    ["b", "**alpha** beta"], ["i", "_alpha_ beta"], ["k", "[alpha](https://) beta"],
  ])("supports the %s formatting shortcut in Advanced without changing the rest of the source", (key, expected) => {
    renderEditor(<form><label htmlFor="shortcut-body">Body</label>
      <MarkdownEditor id="shortcut-body" name="body" defaultAuthoringMode="advanced" defaultValue="alpha beta" />
    </form>);
    const field = screen.getByLabelText("Body") as HTMLTextAreaElement;
    field.focus(); field.setSelectionRange(0, 5);
    fireEvent.keyDown(field, { key, ctrlKey: true });
    expect(new FormData(field.form!).get("body")).toBe(expected);
    fireEvent.keyDown(field, { key: "z", ctrlKey: true });
    expect(new FormData(field.form!).get("body")).toBe("alpha beta");
  });

  it("uses durable draft references for published files and does not re-adopt a removed file on reopen", async () => {
    const owner = "published-file-edit-owner";
    const id = "23b93562-0550-4eef-88af-f951d6ea6138";
    const contextKey = "post:attachment-only:edit";
    let files = [{ id, fileName: "published.txt", byteSize: 4, detectedType: "text",
      responseMime: "text/plain", verificationStatus: "type-checked" }];
    const fetchMock = vi.fn(async (uri: string, options?: RequestInit) => {
      if (uri === "/api/attachments") {
        if (options?.method === "DELETE") files = [];
        return Response.json({ attachments: files });
      }
      return Response.json({ drafts: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const editor = () => <HeaderAuthProvider initialUser={{ id: owner, name: "Author" }}>
      <form><MarkdownEditor id="file-edit" name="body" draftContextKey={contextKey} draftLocale="en"
        initialPublishedRevisionId="r1" existingInlineAttachments={[{
          id, fileName: "published.txt", byteSize: 4, detectedType: "text", url: "/file?post=attachment-only",
        }]} /></form>
    </HeaderAuthProvider>;
    const view = renderEditor(editor());
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    expect(new FormData(document.querySelector("form")!).get("editorAttachmentIds")).toBe(JSON.stringify([id]));
    expect(fetchMock).toHaveBeenCalledWith("/api/attachments", expect.objectContaining({ method: "PUT" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(new FormData(document.querySelector("form")!).get("editorRetainedAttachmentIds")).toBe("[]");
    await waitFor(() => expect(screen.queryByText("published.txt")).not.toBeInTheDocument());
    expect(readLocalEditorDraft(owner, contextKey)?.attachmentDraftId).toBeTruthy();
    view.unmount();
    renderEditor(editor());
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    expect(new FormData(document.querySelector("form")!).get("editorAttachmentIds")).toBe("[]");
    expect(screen.queryByText("published.txt")).not.toBeInTheDocument();
    clearLocalEditorDraft(owner, contextKey);
  });

  it("replays publication after the native submission task, retaining validation and the submitter", async () => {
    stubEmptyDraftMetadata();
    const submitted = vi.fn();
    let firingSubmissionEvents = false;
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: "native-submit-owner", name: "Author" }}>
        <form onSubmitCapture={() => {
          // Model HTML's reentrancy guard, absent from jsdom's event loop:
          // a microtask replay during native submit is ignored by browsers.
          firingSubmissionEvents = true;
          window.setTimeout(() => { firingSubmissionEvents = false; }, 0);
        }} onSubmit={(event) => {
          if (event.defaultPrevented) return;
          event.preventDefault();
          submitted(new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter));
        }}>
          <input name="title" required defaultValue="Title" />
          <MarkdownEditor id="native-submit" name="body" draftContextKey="help:new" draftLocale="en"
            draftPublicationIntent="createHelpQuestion" defaultValue="Body" />
          <button type="submit" name="intent" value="createHelpQuestion">Publish</button>
        </form>
      </HeaderAuthProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    const requestSubmit = HTMLFormElement.prototype.requestSubmit;
    vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(function (this: HTMLFormElement, submitter) {
      if (!firingSubmissionEvents) requestSubmit.call(this, submitter);
    });
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(submitted).toHaveBeenCalledTimes(1));
    expect(submitted.mock.calls[0]![0].get("intent")).toBe("createHelpQuestion");
    expect(submitted.mock.calls[0]![0].get("body")).toBe("Body");
    expect(submitted.mock.calls[0]![0].get("editorDraftVersion")).toBe("0");
  });

  it("applies account preference removal in an already open editor without changing its source", async () => {
    const owner = "clear-preferences-owner";
    localStorage.setItem("vico:editor:mode:" + owner, "advanced");
    localStorage.setItem("vico:editor:spellcheck:" + owner, "true");
    renderEditor(<HeaderAuthProvider initialUser={{ id: owner, name: "Author" }}>
      <form><MarkdownEditor id="clear-prefs" name="body" defaultValue="Exact **source**" /></form>
    </HeaderAuthProvider>);
    expect(document.querySelector(".markdown-editor")).toHaveAttribute("data-authoring", "advanced");
    act(() => {
      localStorage.removeItem("vico:editor:spellcheck:" + owner);
      window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:spellcheck:" + owner }));
    });
    expect(document.querySelector("textarea")).toHaveAttribute("spellcheck", "false");
    act(() => {
      localStorage.removeItem("vico:editor:mode:" + owner);
      window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:mode:" + owner }));
    });
    expect(document.querySelector(".markdown-editor")).toHaveAttribute("data-authoring", "simple");
    expect(new FormData(document.querySelector("form")!).get("body")).toBe("Exact **source**");
  });

  it.each(["advanced", "simple"] as const)("suggests and inserts a stable profile link in %s mode", async (mode) => {
    const lookup = vi.fn(async (url: string) => {
      if (!url.startsWith("/en/mentions?q=")) throw new Error("Unexpected request: " + url);
      return new Response(JSON.stringify({ users: [{ id: "member-42", name: "Ada Lovelace" }] }), {
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", lookup);
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: "mention-author-" + mode, name: "Author" }}>
        <form>
          <label htmlFor="mention-body">Body</label>
          <MarkdownEditor id="mention-body" name="body" draftLocale="en"
            defaultAuthoringMode={mode} defaultValue="Hello " />
        </form>
      </HeaderAuthProvider>,
    );
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    if (mode === "advanced") {
      fireEvent.change(textarea, {
        target: { value: "Hello @Ada", selectionStart: 10, selectionEnd: 10 },
      });
    } else {
      const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
      leaf.textContent = "Hello @Ada";
      fireEvent.input(leaf);
    }
    const group = await screen.findByRole("group", { name: "Mention a member" });
    const candidate = await screen.findByRole("button", { name: "Ada Lovelace" });
    expect(group).toContainElement(candidate);
    const enteredSource = textarea.value;
    expect(enteredSource).toMatch(/^Hello @Ada\s*$/u);
    await userEvent.click(candidate);
    await waitFor(() => expect(textarea).toHaveValue(
      enteredSource.replace("@Ada", "[Ada Lovelace](/en/users/member-42)"),
    ));
    expect(new FormData(textarea.form!).get("body")).toBe(textarea.value);
    expect(lookup).toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Mention a member" })).not.toBeInTheDocument();
  });

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

  it("imperatively focuses an already-open Advanced write surface without requiring a mode change", () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(
      <>
        <button type="button">Outside</button>
        <label htmlFor="body">Body</label>
        <MarkdownEditor
          defaultAuthoringMode="advanced"
          ref={editorRef}
          id="body"
          name="body"
          defaultValue="before after"
        />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(7, 7);
    screen.getByRole("button", { name: "Outside" }).focus();
    expect(textarea).not.toHaveFocus();

    act(() => editorRef.current?.focus());

    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(7);
  });

  it("imperatively focuses an already-open Simple write surface without requiring a mode change", () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(
      <>
        <button type="button">Outside</button>
        <label htmlFor="body">Body</label>
        <MarkdownEditor ref={editorRef} id="body" name="body" defaultValue="before after" />
      </>,
    );

    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 7);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    screen.getByRole("button", { name: "Outside" }).focus();
    expect(document.activeElement).not.toBe(leaf);

    act(() => editorRef.current?.focus());

    expect(document.activeElement).toBe(leaf);
    expect(window.getSelection()?.anchorOffset).toBe(7);
    expect(window.getSelection()?.focusOffset).toBe(7);
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


  it("keeps imperative Reply focus and Quote insertion in Simple mode", () => {
    const editorRef = createRef<MarkdownEditorHandle>();
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      ref={editorRef} id="body" name="body" defaultValue="before after" /></>);
    const editor = document.querySelector(".markdown-editor")!;
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 7);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    act(() => editorRef.current?.insertText("> selected\n\n"));

    expect(editor).toHaveAttribute("data-authoring", "simple");
    expect(screen.getByLabelText("Body")).toHaveValue("before > selected\n\nafter");
    expect(document.activeElement).toHaveAttribute("data-visual-text", "true");
  });

  it("restores the Simple visual selection through Undo and Redo", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Alpha" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 2);
    range.setEnd(leaf.firstChild!, 4);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(screen.getByLabelText("Body")).toHaveValue("Al**ph**a");
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Body")).toHaveValue("Alpha");
    expect(window.getSelection()?.toString()).toBe("ph");
    await userEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Body")).toHaveValue("Al**ph**a");
    expect(window.getSelection()?.toString()).toBe("ph");
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

  it("keeps each prose paragraph auto-directed through Simple, Preview, Split and mode changes", async () => {
    const source = [
      "English **first** with `cmd --flag`.",
      "",
      "עברית **שנייה**.",
      "",
      "## العربية عنوان",
      "",
      "- רשימה אחת",
      "- English item",
      "",
      "```ts",
      "const value = 1;",
      "```",
    ].join("\n");
    renderEditor(<form><div dir="rtl"><label htmlFor="body">Body</label>
      <MarkdownEditor id="body" name="body" defaultValue={source} /></div></form>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const visual = () => document.querySelector(".markdown-editor-visual")!;
    expect([...visual().querySelectorAll("p")].slice(0, 2)
      .map((p) => p.getAttribute("dir"))).toEqual(["auto", "auto"]);
    expect(visual().querySelector("h2")).toHaveAttribute("dir", "auto");
    expect([...visual().querySelectorAll("li")].map((li) => li.getAttribute("dir")))
      .toEqual(["auto", "auto"]);
    expect(visual().querySelector("code")).toHaveAttribute("dir", "ltr");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(document.querySelector(".markdown-editor-preview .post-body p")).toHaveAttribute("dir", "auto");
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    await chooseView("split");
    expect(document.querySelector(".markdown-editor-preview .post-body p")).toHaveAttribute("dir", "auto");
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(visual().querySelector("p")).toHaveAttribute("dir", "auto");
    expect(textarea).toHaveValue(source);
    expect(new FormData(textarea.form!).get("body")).toBe(source);
  });

  it("applies and removes a paragraph direction override through Advanced tools and preview", async () => {
    const source = "English first.\n\nעברית second.\n\n```ts\nconst x = 1;\n```";
    renderEditor(<form><div dir="rtl"><label htmlFor="body">Body</label>
      <MarkdownEditor id="body" name="body" defaultAuthoringMode="advanced" defaultValue={source} />
    </div></form>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(3, 3);
    await userEvent.click(screen.getByText("•••"));
    await userEvent.click(screen.getByRole("button", { name: "Right to left" }));
    expect(new FormData(textarea.form!).get("body")).toBe(
      source.replace("English first.", "English first. {:vico-dir=rtl}"));
    await chooseView("preview");
    const preview = document.querySelector(".markdown-editor-preview")!;
    expect(preview.querySelector(".post-body p")).toHaveAttribute("dir", "rtl");
    expect(preview.querySelector(".post-body p")).not.toHaveTextContent("vico-dir");
    await chooseView("write");
    textarea.setSelectionRange(3, 3);
    await userEvent.click(screen.getByRole("button", { name: "Automatic" }));
    expect(new FormData(textarea.form!).get("body")).toBe(source);
  });

  it("keeps manual direction through Simple/Advanced and Undo/Redo without editing technical blocks", async () => {
    const source = "עברית אבג\n\n```js\nlet x = 1;\n```";
    renderEditor(<form><label htmlFor="body">Body</label>
      <MarkdownEditor id="body" name="body" defaultValue={source} />
    </form>);
    await userEvent.click(screen.getByText("•••"));
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const domSelection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(leaf);
    range.collapse(true);
    domSelection.removeAllRanges();
    domSelection.addRange(range);
    fireEvent.mouseUp(leaf);
    await userEvent.click(screen.getByRole("button", { name: "Left to right" }));
    const withDirection = source.replace("עברית אבג", "עברית אבג {:vico-dir=ltr}");
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(new FormData(textarea.form!).get("body")).toBe(withDirection);
    expect(document.querySelector(".markdown-editor-visual p")).toHaveAttribute("dir", "ltr");
    expect(document.querySelector(".markdown-editor-visual p")).not.toHaveTextContent("vico-dir");
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(textarea.value).toBe(withDirection);
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(new FormData(textarea.form!).get("body")).toBe(withDirection);
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(new FormData(textarea.form!).get("body")).toBe(source);
    await userEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(new FormData(textarea.form!).get("body")).toBe(withDirection);
  });

  it("fails closed when an Advanced selection restored into Simple crosses protected content", async () => {
    const source = "Before\n\n```ts\nconst x = 1;\n```\n\nAfter";
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor
          defaultAuthoringMode="advanced"
          id="body"
          name="body"
          defaultValue={source}
        />
      </>,
    );

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(1, source.indexOf("After") + 2);

    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(document.querySelector('[data-visual-protected="code"]')).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));

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

  it("keeps Markdown block markers as literal text during visual typing", () => {
    renderEditor(<><label htmlFor="body">Body</label>
      <MarkdownEditor id="body" name="body" defaultValue="Plain" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.textContent = "# Not a heading";
    fireEvent.input(leaf);
    expect(screen.getByLabelText("Body")).toHaveValue("\\# Not a heading");
    expect(document.querySelector(".markdown-editor-visual h1, .markdown-editor-visual h2")).toBeNull();
  });

  it("does not turn visual source switching into a destructive Markdown round-trip", async () => {
    const source = "  text  \r\n\r\n**bold**\r\n\r\n```tsx\nhello();\n```";
    renderEditor(<form><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></form>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    await chooseView("split");
    await chooseView("write");
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(textarea.value).toBe(source.replace(/\r\n/gu, "\n"));
    expect(new FormData(textarea.form!).get("body")).toBe(source);
  });

  it("preserves untouched CRLF bytes when Advanced edits only one source span", () => {
    const source = "first\r\nsecond\r\nthird";
    renderEditor(<form><label htmlFor="body">Body</label><MarkdownEditor
      defaultAuthoringMode="advanced" id="body" name="body" defaultValue={source} /></form>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(textarea.value).toBe("first\nsecond\nthird");
    fireEvent.change(textarea, {
      target: { value: "first\nSECOND\nthird", selectionStart: 12, selectionEnd: 12 },
    });
    expect(textarea.value).toBe("first\nSECOND\nthird");
    expect(new FormData(textarea.form!).get("body")).toBe("first\r\nSECOND\r\nthird");
  });

  it("isolates preferred editor mode by account on the same device", async () => {
    const firstId = "editor-mode-uid-a";
    const secondId = "editor-mode-uid-b";
    window.localStorage.removeItem("vico:editor:mode:" + firstId);
    window.localStorage.removeItem("vico:editor:mode:" + secondId);
    const first = renderEditor(
      <HeaderAuthProvider initialUser={{ id: firstId, name: "First" }}>
        <MarkdownEditor id="body" name="body" />
      </HeaderAuthProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(window.localStorage.getItem("vico:editor:mode:" + firstId)).toBe("advanced");
    first.unmount();
    const second = renderEditor(
      <HeaderAuthProvider initialUser={{ id: secondId, name: "Second" }}>
        <MarkdownEditor id="body2" name="body" />
      </HeaderAuthProvider>,
    );
    expect(document.querySelector(".markdown-editor")).toHaveAttribute("data-authoring", "simple");
    expect(window.localStorage.getItem("vico:editor:mode:" + secondId)).toBeNull();
    second.unmount();
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: firstId, name: "First" }}>
        <MarkdownEditor id="body3" name="body" />
      </HeaderAuthProvider>,
    );
    expect(document.querySelector(".markdown-editor")).toHaveAttribute("data-authoring", "advanced");
    window.localStorage.removeItem("vico:editor:mode:" + firstId);
  });

  it("uses browser spelling defaults per mode and remembers explicit choice by account", async () => {
    const owner = "spell-owner-a";
    const other = "spell-owner-b";
    const key = (id: string) => "vico:editor:spellcheck:" + id;
    window.localStorage.removeItem(key(owner));
    window.localStorage.removeItem(key(other));
    const first = renderEditor(
      <HeaderAuthProvider initialUser={{ id: owner, name: "First" }}>
        <MarkdownEditor id="spell-a" name="body" defaultValue="Typoo" />
      </HeaderAuthProvider>,
    );
    await waitFor(() => expect(document.querySelector('[data-visual-text="true"]')).toHaveAttribute("spellcheck", "true"));
    await userEvent.click(screen.getByText("•••"));
    const control = screen.getByRole("checkbox", { name: "Check spelling" });
    expect(control).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(document.querySelector("textarea")!).toHaveAttribute("spellcheck", "false");
    expect(control).not.toBeChecked();
    await userEvent.click(control);
    expect(document.querySelector("textarea")!).toHaveAttribute("spellcheck", "true");
    expect(window.localStorage.getItem(key(owner))).toBe("true");
    first.unmount();

    const second = renderEditor(
      <HeaderAuthProvider initialUser={{ id: other, name: "Second" }}>
        <MarkdownEditor id="spell-b" name="body" defaultAuthoringMode="advanced" />
      </HeaderAuthProvider>,
    );
    await userEvent.click(screen.getByText("•••"));
    expect(screen.getByRole("checkbox", { name: "Check spelling" })).not.toBeChecked();
    expect(window.localStorage.getItem(key(other))).toBeNull();
    second.unmount();

    renderEditor(
      <HeaderAuthProvider initialUser={{ id: owner, name: "First" }}>
        <MarkdownEditor id="spell-c" name="body" defaultAuthoringMode="advanced" />
      </HeaderAuthProvider>,
    );
    await userEvent.click(screen.getByText("•••"));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Check spelling" })).toBeChecked());
    expect(document.querySelector("textarea")!).toHaveAttribute("spellcheck", "true");
    window.localStorage.removeItem(key(owner));
  });

  it("inserts text in a new visual paragraph without losing native submission", () => {
    renderEditor(<form><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="First" /></form>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    fireEvent.keyDown(leaf, { key: "Enter" });
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(textarea).toHaveValue("First\n\n");
    const newLeaf = document.querySelectorAll<HTMLElement>('[data-visual-text="true"]')[1]!;
    newLeaf.textContent = "Second";
    fireEvent.input(newLeaf);
    expect(new FormData(textarea.form!).get("body")).toBe("First\n\nSecond");
  });

  it("opens the selected protected code block at its exact source span in Advanced mode", async () => {
    const first = "```js\nfirst();\n```";
    const second = "```ts\nsecond();\n```";
    const source = `Before\n\n${first}\n\nMiddle\n\n${second}\n\nAfter`;
    renderEditor(
      <>
        <label htmlFor="body">Body</label>
        <MarkdownEditor id="body" name="body" defaultValue={source} />
      </>,
    );

    const editButtons = screen.getAllByRole("button", { name: "Edit in Markdown" });
    expect(editButtons).toHaveLength(2);
    await userEvent.click(editButtons[1]!);

    const editor = document.querySelector(".markdown-editor")!;
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(editor).toHaveAttribute("data-authoring", "advanced");
    expect(textarea).toHaveFocus();
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(second);
  });

  it("edits ordinary table cells and adds rows while preserving the body source", async () => {
    const source = "| A | B |\n| --- | --- |\n| one | two |";
    renderEditor(<form><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></form>);
    const input = screen.getAllByRole("textbox", { name: "Table cell" })[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: "changed" } });
    expect(screen.getByLabelText("Body")).toHaveValue(source.replace("one", "changed"));
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getAllByRole("textbox", { name: "Table cell" })).toHaveLength(4);
    expect(new FormData((screen.getByLabelText("Body") as HTMLTextAreaElement).form!).get("body")).toContain("| changed | two |");
  });

  it("renders toolbar strikethrough as editable Simple content", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="old" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 0);
    range.setEnd(leaf.firstChild!, 3);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    await userEvent.click(screen.getByRole("button", { name: "Strikethrough" }));

    expect(screen.getByLabelText("Body")).toHaveValue("~~old~~");
    expect(document.querySelector("del")).toHaveTextContent("old");
  });

  it("inserts Spoiler and Table after a selection without deleting selected text", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      defaultAuthoringMode="advanced" id="body" name="body" defaultValue="Keep tail" /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const more = document.querySelector<HTMLDetailsElement>(".markdown-editor-extra-menu:last-of-type")!;
    await userEvent.click(more.querySelector("summary")!);

    textarea.focus();
    textarea.setSelectionRange(0, 4);
    await userEvent.click(screen.getByRole("button", { name: "Spoiler" }));
    expect(textarea.value).toContain("Keep");
    expect(textarea.value).toContain(":::spoiler");

    textarea.focus();
    textarea.setSelectionRange(0, 4);
    await userEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(textarea.value.startsWith("Keep")).toBe(true);
    expect(textarea.value).toContain("| --- | --- |");
  });

  it("places the caret after a horizontal divider block instead of inside its marker", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      defaultAuthoringMode="advanced" id="body" name="body" defaultValue="before" /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const more = document.querySelector<HTMLDetailsElement>(".markdown-editor-extra-menu:last-of-type")!;
    await userEvent.click(more.querySelector("summary")!);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "—" }));

    expect(textarea).toHaveValue("before\n\n---\n\n");
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(textarea.value.length);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
  });

  it("inserts a spoiler block and keeps its source on switching authoring modes", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" /></>);
    await userEvent.click(document.querySelector<HTMLDetailsElement>(".markdown-editor-extra-menu:last-of-type summary")!);
    await userEvent.click(screen.getByRole("button", { name: "Spoiler" }));
    const source = (screen.getByLabelText("Body") as HTMLTextAreaElement).value;
    expect(source).toContain(":::spoiler");
    expect(document.querySelector(".forum-markdown-spoiler")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Advanced" }));
    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toBe(source);
  });

  it("keeps common formatting accessible directly on a compact Simple toolbar", async () => {
    vi.stubGlobal("matchMedia", (media: string) => ({ matches: media === "(max-width: 44rem)", media,
      addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Hello" /></>);
    const bar = screen.getByRole("toolbar", { name: "Markdown formatting" });
    const groups = bar.querySelectorAll(".markdown-editor-formatting > .markdown-editor-tool-group");
    expect([...groups].flatMap((group) => [...group.querySelectorAll("button")]
      .map((button) => button.getAttribute("aria-label")))).toEqual(["Undo", "Redo", "Bold", "Italic"]);
    expect(bar.querySelector('.markdown-editor-extra-options [aria-label="Strikethrough"]')).not.toBeNull();
    expect(bar.querySelector('.markdown-editor-extra-options [aria-label="Link"]')).not.toBeNull();
    await userEvent.click(groups[1]!.querySelector('[aria-label="Bold"]') as HTMLElement);
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toContain("**");
  });

  it("offers compact Advanced touch code indentation without changing prose", async () => {
    vi.stubGlobal("matchMedia", (media: string) => ({ matches: media === "(max-width: 44rem)", media,
      addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const source = "prose\n\n```ts\nabc\n```";
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body"
      defaultAuthoringMode="advanced" defaultValue={source} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const bar = screen.getByRole("toolbar", { name: "Markdown formatting" });
    const groups = bar.querySelectorAll(".markdown-editor-formatting > .markdown-editor-tool-group");
    expect([...groups].flatMap((group) => [...group.querySelectorAll("button")]
      .map((button) => button.getAttribute("aria-label")))).toEqual(["Undo", "Redo", "Indent code", "Outdent code"]);
    expect(bar.querySelector('.markdown-editor-extra-options [aria-label="Bold"]')).not.toBeNull();
    textarea.focus();
    const point = source.indexOf("abc") + 1;
    textarea.setSelectionRange(point, point);
    await userEvent.click(screen.getByRole("button", { name: "Indent code" }));
    expect(textarea.value).toContain("\n  abc\n");
    const indent = textarea.value.indexOf("abc") + 1;
    textarea.setSelectionRange(indent, indent);
    await userEvent.click(screen.getByRole("button", { name: "Outdent code" }));
    expect(textarea.value).toBe(source);
    textarea.setSelectionRange(2, 2);
    await userEvent.click(screen.getByRole("button", { name: "Indent code" }));
    expect(textarea.value).toBe(source);
  });

  it("indents and outdents only inside code fences in Advanced mode", () => {
    const fence = String.fromCharCode(96).repeat(3);
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultAuthoringMode="advanced"
      defaultValue={fence + "ts\nabc\n" + fence} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const point = textarea.value.indexOf("abc") + 1;
    textarea.focus();
    textarea.setSelectionRange(point, point);
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toContain("\n  abc\n");
    const indent = textarea.value.indexOf("abc") + 1;
    textarea.setSelectionRange(indent, indent);
    fireEvent.keyDown(textarea, { key: "Tab", shiftKey: true });
    expect(textarea.value).toContain("\nabc\n");
  });

  it("does not apply code-only pairing on fenced info or closing fence lines", () => {
    const source = "```tsx\nabc\n```";
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultAuthoringMode="advanced" defaultValue={source} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(source.indexOf("tsx") + 1, source.indexOf("tsx") + 1);
    fireEvent.keyDown(textarea, { key: "(" });
    expect(textarea).toHaveValue(source);

    const codePoint = textarea.value.indexOf("abc") + 1;
    textarea.setSelectionRange(codePoint, codePoint);
    fireEvent.keyDown(textarea, { key: "(" });
    expect(textarea).toHaveValue("```tsx\na()bc\n```");

    const closingPoint = textarea.value.lastIndexOf("```") + 1;
    textarea.setSelectionRange(closingPoint, closingPoint);
    fireEvent.keyDown(textarea, { key: "[" });
    expect(textarea).toHaveValue("```tsx\na()bc\n```");
  });

  it("clears formatting from the selected Simple content and keeps surrounding formatting", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultValue="**alpha beta**" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 2);
    range.setEnd(leaf.firstChild!, 7);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    const menus = [...document.querySelectorAll<HTMLDetailsElement>(".markdown-editor-extra-menu")];
    await userEvent.click(menus[menus.length - 1]!.querySelector("summary")!);
    await userEvent.click(screen.getByRole("button", { name: "Clear formatting" }));

    expect(screen.getByLabelText("Body")).toHaveValue("**al**pha b**eta**");
  });

  it("clears formatting across the whole document when there is no selection", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultAuthoringMode="advanced"
      defaultValue={"## **Bold** and [link](https://example.com) with `code`"} /></>);
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const menus = [...document.querySelectorAll<HTMLDetailsElement>(".markdown-editor-extra-menu")];
    await userEvent.click(menus[menus.length - 1]!.querySelector("summary")!);
    await userEvent.click(screen.getByRole("button", { name: "Clear formatting" }));

    expect(textarea).toHaveValue("## Bold and link with `code`");
  });

  it("finds and replaces literal source text without changing unrelated Markdown", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body"
      defaultAuthoringMode="advanced" defaultValue="one **one**" /></>);
    const summaries = [...document.querySelectorAll<HTMLDetailsElement>(".markdown-editor-extra-menu")];
    await userEvent.click(summaries[summaries.length - 1]!.querySelector("summary")!);
    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Find" }), "one");
    await userEvent.type(screen.getByRole("textbox", { name: "Replace with" }), "two");
    await userEvent.click(screen.getByRole("button", { name: "Replace all" }));
    expect(screen.getByLabelText("Body")).toHaveValue("two **two**");
  });

  it("converts spreadsheet text pasted into Simple mode to a Markdown table", () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Before" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, leaf.textContent!.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    expect(selection.anchorNode).toBe(leaf.firstChild);
    fireEvent.paste(leaf, { clipboardData: { getData: (format: string) =>
      format === "text/plain" ? "A\tB\n1\t2" : "" } });
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toContain("| 1 | 2 |");
    expect(document.querySelector(".markdown-editor-visual-table")).not.toBeNull();
  });

  it("maps multiline paste across split DOM text nodes to exact Markdown positions", () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Alpha" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.textContent = "";
    const first = document.createTextNode("Al");
    const second = document.createTextNode("pha");
    leaf.appendChild(first);
    leaf.appendChild(second);
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(first, 1);
    range.setEnd(second, 2);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.paste(leaf, { clipboardData: { getData: (format: string) =>
      format === "text/plain" ? "New\nParagraph" : "" } });
    expect(screen.getByLabelText("Body")).toHaveValue("ANew\nParagrapha");
  });

  it("formats an escaped Simple selection at its exact source position", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultValue={"\\# literal"} /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    expect(leaf.textContent).toBe("# literal");
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 2);
    range.setEnd(leaf.firstChild!, 9);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(screen.getByLabelText("Body")).toHaveValue("\\# **literal**");
  });

  it("maps a safe Simple selection across multiple Markdown leaves", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor
      id="body" name="body" defaultValue="Alpha **Beta** Gamma" /></>);
    const leaves = document.querySelectorAll<HTMLElement>('[data-visual-text="true"]');
    expect(leaves.length).toBeGreaterThanOrEqual(3);
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaves[0]!.firstChild!, 0);
    range.setEnd(leaves[1]!.firstChild!, 4);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(document.querySelector<HTMLElement>(".markdown-editor-visual")!);
    await userEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.getByLabelText("Body")).toHaveValue("[Alpha **Beta**](https://) Gamma");
  });

  it("does not mutate the end of the message when a Simple selection crosses protected content", async () => {
    const source = "Before\n\n```ts\nconst x = 1;\n```\n\nAfter";
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue={source} /></>);
    const leaves = document.querySelectorAll<HTMLElement>('[data-visual-text="true"]');
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaves[0]!.firstChild!, 1);
    range.setEnd(leaves[leaves.length - 1]!.firstChild!, 2);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(document.querySelector<HTMLElement>(".markdown-editor-visual")!);
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(screen.getByLabelText("Body")).toHaveValue(source);
  });

  it("maps a toolbar selection across split DOM text nodes to the full visual offset", async () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Alpha" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.textContent = "";
    const first = document.createTextNode("Al");
    const second = document.createTextNode("pha");
    leaf.appendChild(first);
    leaf.appendChild(second);
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(first, 1);
    range.setEnd(second, 2);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(screen.getByLabelText("Body")).toHaveValue("A**lph**a");
  });

  it("keeps existing content when unsupported HTML clipboard has no text fallback", () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Keep" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 0);
    range.setEnd(leaf.firstChild!, 4);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.paste(leaf, { clipboardData: { getData: (format: string) =>
      format === "text/html" ? "<img src=x>" : "" } });
    expect(screen.getByLabelText("Body")).toHaveValue("Keep");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("uses literal plain text for Ctrl+Shift+V even if HTML is available", () => {
    renderEditor(<><label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Plain" /></>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 5);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.keyDown(leaf, { key: "v", ctrlKey: true, shiftKey: true });
    fireEvent.paste(leaf, { clipboardData: { getData: (format: string) =>
      format === "text/plain" ? "\n# Header" : format === "text/html" ? "<h1>Header</h1>" : "" } });
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toContain("\\# Header");
  });

  it("captures a Simple-mode space in the middle of the document immediately", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-trigger-space-user";
    const contextKey = "topic:space:reply";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-space-body">Body</label>
          <MarkdownEditor id="draft-space-body" name="body" defaultValue="AlphaBeta"
            draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.textContent = "Alpha Beta";
    fireEvent.input(leaf, { data: " ", inputType: "insertText" });

    expect(readLocalEditorDraft(userId, contextKey)?.payload.body).toBe("Alpha Beta");
    clearLocalEditorDraft(userId, contextKey);
  });

  it("captures Simple-mode Enter before later document content immediately", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-trigger-enter-user";
    const contextKey = "topic:enter:reply";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-enter-body">Body</label>
          <MarkdownEditor id="draft-enter-body" name="body" defaultValue={"First\n\nSecond"}
            draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    const firstLeaf = document.querySelectorAll<HTMLElement>('[data-visual-text="true"]')[0]!;
    fireEvent.keyDown(firstLeaf, { key: "Enter" });
    const body = (screen.getByLabelText("Body") as HTMLTextAreaElement).value;

    expect(body.endsWith("Second")).toBe(true);
    expect(readLocalEditorDraft(userId, contextKey)?.payload.body).toBe(body);
    clearLocalEditorDraft(userId, contextKey);
  });

  it("captures a one-line Simple paste immediately", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-trigger-paste-user";
    const contextKey = "topic:paste:reply";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-paste-body">Body</label>
          <MarkdownEditor id="draft-paste-body" name="body" defaultValue="BeforeAfter"
            draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, "Before".length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.paste(leaf, { clipboardData: { getData: (format: string) =>
      format === "text/plain" ? " pasted " : "" } });

    const body = (screen.getByLabelText("Body") as HTMLTextAreaElement).value;
    expect(readLocalEditorDraft(userId, contextKey)?.payload.body).toBe(body);
    clearLocalEditorDraft(userId, contextKey);
  });

  it("keeps non-body draft fields authoritative across a context cleanup", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-payload-context-user";
    const firstContext = "section:first:new";
    const secondContext = "section:second:new";
    const form = (contextKey: string) => (
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-payload-title">Title</label>
          <input id="draft-payload-title" name="title" />
          <label htmlFor="draft-payload-body">Body</label>
          <MarkdownEditor id="draft-payload-body" name="body" defaultValue="Body"
            defaultAuthoringMode="advanced" draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>
    );
    const rendered = renderEditor(form(firstContext));

    fireEvent.input(screen.getByLabelText("Title"), {
      target: { value: "First title" }, inputType: "insertText", data: "e",
    });
    rendered.rerender(form(secondContext));

    expect(readLocalEditorDraft(userId, firstContext)?.payload).toMatchObject({
      title: "First title", body: "Body",
    });
    clearLocalEditorDraft(userId, firstContext);
    clearLocalEditorDraft(userId, secondContext);
  });

  it("does not save ordinary title typing merely because body is empty", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-title-trigger-user";
    const contextKey = "section:title-trigger:new";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-title-trigger">Title</label>
          <input id="draft-title-trigger" name="title" />
          <label htmlFor="draft-title-trigger-body">Body</label>
          <MarkdownEditor id="draft-title-trigger-body" name="body"
            defaultAuthoringMode="advanced" draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    fireEvent.input(screen.getByLabelText("Title"), {
      target: { value: "Ordinary" }, inputType: "insertText", data: "y",
    });

    expect(readLocalEditorDraft(userId, contextKey)).toBeNull();
  });

  it("saves title and tags immediately from their own space and paste events", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-field-trigger-user";
    const contextKey = "section:field-trigger:new";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-field-title">Title</label>
          <input id="draft-field-title" name="title" />
          <label htmlFor="draft-field-tags">Tags</label>
          <input id="draft-field-tags" name="tags" />
          <label htmlFor="draft-field-body">Body</label>
          <MarkdownEditor id="draft-field-body" name="body" defaultValue="Body"
            defaultAuthoringMode="advanced" draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    fireEvent.input(screen.getByLabelText("Title"), {
      target: { value: "New " }, inputType: "insertText", data: " ",
    });
    expect(readLocalEditorDraft(userId, contextKey)?.payload).toMatchObject({
      title: "New ", tags: "", body: "Body",
    });

    fireEvent.input(screen.getByLabelText("Tags"), {
      target: { value: "typescript" }, inputType: "insertFromPaste", data: "typescript",
    });
    expect(readLocalEditorDraft(userId, contextKey)?.payload).toMatchObject({
      title: "New ", tags: "typescript", body: "Body",
    });

    clearLocalEditorDraft(userId, contextKey);
  });

  it("records the Reply parent before same-event text insertion", () => {
    stubEmptyDraftMetadata();
    const userId = "draft-parent-authoritative-user";
    const contextKey = "topic:parent:reply";
    const parentPostId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d50";
    const ref = createRef<MarkdownEditorHandle>();
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-parent-body">Body</label>
          <MarkdownEditor ref={ref} id="draft-parent-body" name="body"
            defaultAuthoringMode="advanced" draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    act(() => {
      ref.current?.setDraftParentPostId(parentPostId);
      ref.current?.insertText("> quoted\n\n");
    });
    expect(readLocalEditorDraft(userId, contextKey)?.payload).toMatchObject({
      body: "> quoted\n\n", parentPostId,
    });
    clearLocalEditorDraft(userId, contextKey);
  });

  it("captures toolbar formatting after focusout instead of saving only the pre-command body", async () => {
    stubEmptyDraftMetadata();
    const userId = "draft-trigger-format-user";
    const contextKey = "topic:format:reply";
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-format-body">Body</label>
          <MarkdownEditor id="draft-format-body" name="body" defaultValue="alpha beta"
            draftContextKey={contextKey} draftLocale="en" />
        </form>
      </HeaderAuthProvider>,
    );

    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    leaf.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(leaf.firstChild!, 0);
    range.setEnd(leaf.firstChild!, 5);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(leaf);

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(screen.getByLabelText("Body")).toHaveValue("**alpha** beta");
    expect(readLocalEditorDraft(userId, contextKey)?.payload.body).toBe("**alpha** beta");
    clearLocalEditorDraft(userId, contextKey);
  });

  it("serializes publication behind its own in-flight autosave and submits the fresh CAS fence", async () => {
    vi.useFakeTimers();
    const userId = "draft-publication-race-user";
    const draftContextKey = "topic:publication-race:reply";
    type DraftPayload = { title: string; body: string; tags: string; parentPostId?: string | null };
    type ServerDraft = {
      contextKey: string;
      draftId: string;
      version: number;
      status: "active";
      title: string;
      snippet: string;
      editedAt: string;
      updatedAt: string;
      payload: DraftPayload;
    };
    const saveRequests: Array<Record<string, unknown>> = [];
    let resolveFirstSave!: (response: Response) => void;
    const firstSave = new Promise<Response>((resolve) => { resolveFirstSave = resolve; });
    let serverDraft: ServerDraft | null = null;
    let postCalls = 0;

    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (uri === "/api/attachments" && options?.method === "GET") {
        return json({ attachments: [] });
      }
      if (options?.method === "POST") {
        postCalls++;
        const sent = JSON.parse(options.body as string) as Record<string, unknown>;
        saveRequests.push(sent);
        if (postCalls === 1) return firstSave;
        const now = new Date().toISOString();
        serverDraft = {
          contextKey: draftContextKey,
          draftId: sent.draftId as string,
          version: 2,
          status: "active",
          title: "",
          snippet: "Reply changed ",
          editedAt: now,
          updatedAt: now,
          payload: sent.payload as DraftPayload,
        };
        return json({ outcome: "saved", draft: serverDraft });
      }
      if (uri.includes("mode=metadata")) {
        return json({ drafts: serverDraft ? [serverDraft] : [] });
      }
      throw new Error("Unexpected fetch");
    }));

    const submitted = vi.fn();
    let setPublicationPending!: (value: boolean) => void;
    function PublicationHarness() {
      const [publicationPending, setPending] = useState(false);
      setPublicationPending = setPending;
      return (
        <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
          <form onSubmit={(event) => {
            if (event.defaultPrevented) return;
            event.preventDefault();
            setPending(true);
            const data = new FormData(event.currentTarget);
            submitted({
              draftId: data.get("editorDraftId"),
              version: data.get("editorDraftVersion"),
            });
          }}>
            <input type="hidden" name="intent" value="reply" />
            <label htmlFor="draft-publication-body">Body</label>
            <MarkdownEditor
              id="draft-publication-body"
              name="body"
              defaultAuthoringMode="advanced"
              draftContextKey={draftContextKey}
              draftLocale="en"
              draftPublicationIntent="reply"
              draftPublicationPending={publicationPending}
            />
            <button type="submit">Publish</button>
          </form>
        </HeaderAuthProvider>
      );
    }

    renderEditor(<PublicationHarness />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "Reply " } });

    act(() => { vi.advanceTimersByTime(60_000); });
    await act(async () => { await Promise.resolve(); });
    expect(postCalls).toBe(1);
    expect(saveRequests[0]?.expectedVersion).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(submitted).not.toHaveBeenCalled();

    const sent = saveRequests[0]!;
    const now = new Date().toISOString();
    serverDraft = {
      contextKey: draftContextKey,
      draftId: sent.draftId as string,
      version: 1,
      status: "active",
      title: "",
      snippet: "Reply ",
      editedAt: now,
      updatedAt: now,
      payload: sent.payload as DraftPayload,
    };
    await act(async () => {
      resolveFirstSave(json({ outcome: "saved", draft: serverDraft }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(submitted).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveBeenCalledWith({
      draftId: sent.draftId,
      version: "1",
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(postCalls).toBe(1);

    act(() => { setPublicationPending(false); });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "Reply changed " } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(postCalls).toBe(2);
  });

  it("submits only selected stored attachments with the text CAS fence", async () => {
    const storedId = "23b93562-0550-4eef-88af-f951d6ea6138";
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (uri === "/api/attachments" && options?.method === "GET") {
        return new Response(JSON.stringify({ attachments: [{
          id: storedId,
          fileName: "kept.txt",
          detectedType: "text",
          responseMime: "text/plain; charset=utf-8",
          byteSize: 4,
          verificationStatus: "type-checked",
        }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!options?.method && uri.includes("mode=metadata")) {
        return new Response(JSON.stringify({ drafts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error("Unexpected fetch");
    }));

    const submitted = vi.fn();
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: "attachment-publication-user", name: "Author" }}>
        <form onSubmit={(event) => {
          if (event.defaultPrevented) return;
          event.preventDefault();
          submitted(new FormData(event.currentTarget).get("editorAttachmentIds"));
        }}>
          <label htmlFor="attachment-publication-body">Body</label>
          <MarkdownEditor
            id="attachment-publication-body"
            name="body"
            defaultValue="Text"
            defaultAuthoringMode="advanced"
            draftContextKey="topic:attachment-publication:reply"
            draftLocale="en"
            draftPublicationIntent="reply"
          />
          <button type="submit" name="intent" value="reply">Publish</button>
        </form>
      </HeaderAuthProvider>,
    );

    expect(await screen.findByText("kept.txt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(submitted).toHaveBeenCalledWith(JSON.stringify([storedId])));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets body and history when the draft context changes for the same account", async () => {
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (uri === "/api/attachments" && options?.method === "GET") {
        return new Response(JSON.stringify({ attachments: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (uri.includes("mode=metadata")) {
        return new Response(JSON.stringify({ drafts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error("Unexpected fetch");
    }));
    const user = { id: "draft-context-switch-user", name: "Author" };
    const editor = (contextKey: string) => (
      <I18nextProvider i18n={runtime()}>
        <HeaderAuthProvider initialUser={user}>
          <form>
            <label htmlFor="draft-context-body">Body</label>
            <MarkdownEditor
              id="draft-context-body"
              name="body"
              defaultAuthoringMode="advanced"
              draftContextKey={contextKey}
              draftLocale="en"
            />
          </form>
        </HeaderAuthProvider>
      </I18nextProvider>
    );
    const rendered = render(editor("topic:first:reply"));
    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "First topic reply " } });
    const firstDraftId = (document.querySelector('input[name="editorDraftId"]') as HTMLInputElement).value;
    expect(document.querySelector('input[name="editorDraftVersion"]')).toHaveValue("0");

    rendered.rerender(editor("topic:second:reply"));
    expect(screen.getByLabelText("Body")).toHaveValue("");
    const secondDraftId = (document.querySelector('input[name="editorDraftId"]') as HTMLInputElement).value;
    expect(secondDraftId).not.toBe(firstDraftId);
    fireEvent.keyDown(screen.getByLabelText("Body"), { key: "z", ctrlKey: true });
    expect(screen.getByLabelText("Body")).toHaveValue("");
  });

  it("restores a saved reply's parent relation alongside the Markdown body", () => {
    const userId = "draft-reply-restoration-user";
    const contextKey = "topic:abc:reply";
    const parentId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d50";
    writeLocalEditorDraft({
      ownerId: userId, contextKey, draftId: "e7bdbd73-61d4-4b06-bc03-b24b1c217d55",
      payload: { title: "", body: "Quoted reply", tags: "", parentPostId: parentId },
      editedAt: new Date().toISOString(), baseVersion: 0, syncedEditedAt: null,
    });
    const onRestoreParent = vi.fn();
    renderEditor(
      <HeaderAuthProvider initialUser={{ id: userId, name: "Author" }}>
        <form>
          <label htmlFor="draft-reply-body">Body</label>
          <MarkdownEditor id="draft-reply-body" name="body" defaultAuthoringMode="advanced"
            draftContextKey={contextKey} draftLocale="en" onDraftRestoreParent={onRestoreParent} />
        </form>
      </HeaderAuthProvider>,
    );
    expect(onRestoreParent).toHaveBeenCalledWith(parentId);
    expect(screen.getByLabelText("Body")).toHaveValue("Quoted reply");
    clearLocalEditorDraft(userId, contextKey);
  });

  it("submits the Simple visual authoring form on Ctrl+Enter", () => {
    const submitted = vi.fn();
    renderEditor(<form onSubmit={(event) => { event.preventDefault(); submitted(); }}>
      <label htmlFor="body">Body</label><MarkdownEditor id="body" name="body" defaultValue="Hello" />
    </form>);
    const leaf = document.querySelector<HTMLElement>('[data-visual-text="true"]')!;
    fireEvent.keyDown(leaf, { key: "Enter", ctrlKey: true });
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("submits Advanced Markdown exactly once on Ctrl+Enter", () => {
    const submitted = vi.fn();
    renderEditor(<form onSubmit={(event) => { event.preventDefault(); submitted(); }}>
      <label htmlFor="body">Body</label>
      <MarkdownEditor id="body" name="body" defaultAuthoringMode="advanced" defaultValue="Reply" />
    </form>);
    fireEvent.keyDown(screen.getByLabelText("Body"), { key: "Enter", ctrlKey: true });
    expect(submitted).toHaveBeenCalledTimes(1);
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

  it("exposes fullscreen dialog semantics, traps edge focus, and exits with Escape", async () => {
    renderEditor(
      <>
        <label htmlFor="fullscreen-body">Body</label>
        <MarkdownEditor id="fullscreen-body" name="body" defaultAuthoringMode="advanced" defaultValue="Body" />
      </>,
    );

    const fullScreenButton = screen.getByRole("button", { name: "Full screen" });
    await userEvent.click(fullScreenButton);

    const dialog = screen.getByRole("dialog", { name: "Full screen" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(fullScreenButton).toHaveAttribute("aria-pressed", "true");

    const textarea = screen.getByLabelText("Body");
    const visibleControls = new Set<Element>([fullScreenButton, textarea]);
    vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
      return (visibleControls.has(this) ? [{}] : []) as unknown as DOMRectList;
    });
    const controls = [...dialog.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, summary, a[href], [contenteditable="true"]',
    )].filter((node) => node.tabIndex >= 0 && !node.matches(":disabled") && node.getClientRects().length > 0);
    expect(controls.length).toBeGreaterThan(1);

    const first = controls[0]!;
    const last = controls.at(-1)!;
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(last, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Full screen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full screen" })).toHaveAttribute("aria-pressed", "false");
  });

  it("synchronizes Split scrolling both ways with ratio, zero-extent, and write guards", async () => {
    renderEditor(
      <>
        <label htmlFor="split-scroll-body">Body</label>
        <MarkdownEditor id="split-scroll-body" name="body" defaultAuthoringMode="advanced"
          defaultValue={"Line 1\n\nLine 2"} />
      </>,
    );
    await chooseView("split");

    const textarea = screen.getByLabelText("Body") as HTMLTextAreaElement;
    const preview = screen.getByRole("region", { name: "Markdown preview" }) as HTMLElement;

    function scrollBox(element: HTMLElement, initial: {
      scrollHeight: number;
      clientHeight: number;
      scrollTop: number;
    }) {
      let state = { ...initial };
      const writes = vi.fn((value: number) => { state.scrollTop = value; });
      Object.defineProperties(element, {
        scrollHeight: { configurable: true, get: () => state.scrollHeight },
        clientHeight: { configurable: true, get: () => state.clientHeight },
        scrollTop: {
          configurable: true,
          get: () => state.scrollTop,
          set: (value: number) => { writes(value); },
        },
      });
      return {
        writes,
        set(next: Partial<typeof state>) { state = { ...state, ...next }; },
        top() { return state.scrollTop; },
      };
    }

    const source = scrollBox(textarea, { scrollHeight: 1000, clientHeight: 200, scrollTop: 400 });
    const target = scrollBox(preview, { scrollHeight: 900, clientHeight: 300, scrollTop: 0 });

    fireEvent.scroll(textarea);
    expect(target.writes).toHaveBeenLastCalledWith(300);
    expect(target.top()).toBe(300);

    target.set({ scrollTop: 150 });
    source.writes.mockClear();
    fireEvent.scroll(preview);
    expect(source.writes).toHaveBeenLastCalledWith(200);
    expect(source.top()).toBe(200);

    source.set({ scrollHeight: 1000, clientHeight: 200, scrollTop: 400 });
    target.set({ scrollTop: 300.5 });
    target.writes.mockClear();
    fireEvent.scroll(textarea);
    expect(target.writes).not.toHaveBeenCalled();
    expect(target.top()).toBe(300.5);

    source.set({ scrollHeight: 200, clientHeight: 200, scrollTop: 50 });
    target.set({ scrollTop: 90 });
    target.writes.mockClear();
    fireEvent.scroll(textarea);
    expect(target.writes).toHaveBeenLastCalledWith(0);
    expect(target.top()).toBe(0);

    source.set({ scrollHeight: 1000, clientHeight: 200, scrollTop: 400 });
    target.set({ scrollHeight: 300, clientHeight: 300, scrollTop: 40 });
    target.writes.mockClear();
    fireEvent.scroll(textarea);
    expect(target.writes).toHaveBeenLastCalledWith(0);
    expect(target.top()).toBe(0);
  });

});
