import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { ForumMarkdown } from "./markdown";
import {
  applyTextareaEdit,
  createEditorHistory,
  editVisualText,
  recordEditorEdit,
  redoEditorEdit,
  rememberEditorSelection,
  sourceOffsetToTextareaOffset,
  textareaMarkdown,
  textareaOffsetToSourceOffset,
  undoEditorEdit,
  type EditorSelection,
} from "./editor-document";
import {
  VisualMarkdownEditor,
  escapeVisualMarkdownText,
  restoreVisualDomSelection,
} from "./visual-markdown-editor";
import { addTableDimension, spreadsheetToMarkdown, type MarkdownTable } from "./technical-markdown";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useEditorDraft } from "./use-editor-draft";
import type { ForumEditorDraftPayload } from "../../db/schema";
import { clipboardPlainToMarkdown } from "./clipboard-markdown";
import { fromMarkdown } from "mdast-util-from-markdown";

export interface MarkdownEditorHandle {
  focus: () => void;
  insertText: (text: string) => void;
  acknowledgePublished: (draftId: string, publishedVersion: number) => void;
}

export interface MarkdownEditorProps {
  id: string;
  name: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
  describedBy?: string;
  defaultValue?: string;
  defaultPreviewOpen?: boolean;
  defaultAuthoringMode?: "simple" | "advanced";
  draftContextKey?: string;
  draftLocale?: string;
  onDraftRestoreParent?: (parentPostId: string | null) => void;
}

interface PendingSelection {
  start: number;
  end: number;
}

type EditorMode = "write" | "preview" | "split";

function normalizedCodeLanguage(value: string): string {
  return value.trim().replace(/[^a-z0-9_+.#-]/giu, "").slice(0, 32);
}

function longestBacktickRun(value: string): number {
  let longest = 0;
  for (const match of value.matchAll(/`+/gu)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}

function inlineCodeAffixes(value: string): { prefix: string; suffix: string } {
  const delimiter = "`".repeat(longestBacktickRun(value) + 1);
  const isOnlySpaces = /^ +$/u.test(value);
  const needsPadding = value.length > 0 && (
    value.startsWith("`")
    || value.endsWith("`")
    || (!isOnlySpaces && value.startsWith(" ") && value.endsWith(" "))
  );
  const padding = needsPadding ? " " : "";
  return {
    prefix: delimiter + padding,
    suffix: padding + delimiter,
  };
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      id,
      name,
      required = false,
      rows = 8,
      disabled = false,
      describedBy,
      defaultValue = "",
      defaultPreviewOpen = false,
      defaultAuthoringMode = "simple",
      draftContextKey,
      draftLocale,
      onDraftRestoreParent,
    },
    forwardedRef,
  ) {
    const { t } = useTranslation("common");
    const authUser = useHeaderAuthUser();
    const visualSelectionRef = useRef<EditorSelection | null>(null);
    const visualSelectionKnownRef = useRef(false);
    const [authoringMode, setAuthoringMode] = useState<"simple" | "advanced">(defaultAuthoringMode);
    const [fullScreen, setFullScreen] = useState(false);
    const [pasteWarning, setPasteWarning] = useState(false);
    const [findOpen, setFindOpen] = useState(false);
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");
    const accountId = authUser?.id ?? null;

    useEffect(() => {
      if (!accountId) {
        setAuthoringMode(defaultAuthoringMode);
        return;
      }
      try {
        const stored = window.localStorage.getItem("vico:editor:mode:" + accountId);
        setAuthoringMode(stored === "advanced" || stored === "simple" ? stored : defaultAuthoringMode);
      } catch {
        setAuthoringMode(defaultAuthoringMode);
      }
    }, [accountId, defaultAuthoringMode]);

    function switchAuthoring(next: "simple" | "advanced") {
      const selection = sourceSelection() ?? historyRef.current.current.selection;
      if (next === "advanced") {
        pendingSelectionRef.current = selection;
        pendingVisualSelectionRef.current = null;
      } else {
        pendingVisualSelectionRef.current = selection;
        pendingSelectionRef.current = null;
      }
      setAuthoringMode(next);
      setMode("write");
      visualSelectionRef.current = null;
      visualSelectionKnownRef.current = false;
      if (accountId) {
        try { window.localStorage.setItem("vico:editor:mode:" + accountId, next); } catch { /* private mode */ }
      }
    }

    const editorRef = useRef<HTMLDivElement>(null);
    const pendingVisualSelectionRef = useRef<EditorSelection | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLElement>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const historyRef = useRef(createEditorHistory(defaultValue));
    const [value, setValue] = useState(defaultValue);
    const editorScope = JSON.stringify([accountId, draftContextKey ?? null, draftLocale ?? null]);
    const previousScopeRef = useRef(editorScope);
    useEffect(() => {
      if (previousScopeRef.current === editorScope) return;
      previousScopeRef.current = editorScope;
      visualSelectionRef.current = null;
      visualSelectionKnownRef.current = false;
      pendingVisualSelectionRef.current = null;
      pendingSelectionRef.current = null;
      historyRef.current = createEditorHistory(defaultValue);
      setValue(defaultValue);
      setPasteWarning(false);
      setFindOpen(false);
    }, [editorScope, defaultValue]);

    const draft = useEditorDraft({
      ownerId: accountId, contextKey: draftContextKey, locale: draftLocale,
      readPayload: (body): ForumEditorDraftPayload => {
        const form = textareaRef.current?.form;
        const field = (name: string) => {
          const element = form?.elements.namedItem(name);
          return element instanceof HTMLInputElement ? element.value : "";
        };
        return { body, title: field("title"), tags: field("tags"),
          parentPostId: field("parentPostId") || null };
      },
      restore: (payload) => {
        historyRef.current = createEditorHistory(payload.body);
        onDraftRestoreParent?.(payload.parentPostId ?? null);
        setValue(payload.body);
        const form = textareaRef.current?.form;
        for (const key of ["title", "tags"] as const) {
          const field = form?.elements.namedItem(key);
          if (field instanceof HTMLInputElement) field.value = payload[key];
        }
      },
    });

    useEffect(() => {
      if (!accountId || !draftContextKey) return;
      const form = textareaRef.current?.form;
      if (!form) return;
      const onInput = (event: Event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement) || !["title", "tags"].includes(field.name)) return;
        draft.noteEdit(value, (event as InputEvent).data === " ");
      };
      const flush = () => draft.saveLocal();
      form.addEventListener("input", onInput);
      form.addEventListener("focusout", flush);
      return () => {
        form.removeEventListener("input", onInput);
        form.removeEventListener("focusout", flush);
      };
    });


    function textareaSourceSelection(source = value): EditorSelection {
      const textarea = textareaRef.current;
      const displayedLength = textareaMarkdown(source).length;
      const start = textarea?.selectionStart ?? displayedLength;
      const end = textarea?.selectionEnd ?? start;
      return {
        start: textareaOffsetToSourceOffset(source, start),
        end: textareaOffsetToSourceOffset(source, end),
      };
    }

    function sourceSelection(): EditorSelection | null {
      if (authoringMode === "simple") {
        if (visualSelectionKnownRef.current) return visualSelectionRef.current;
        return { start: value.length, end: value.length };
      }
      return textareaSourceSelection();
    }

    function rememberSelection(selection: EditorSelection | null) {
      if (!selection) return;
      historyRef.current = rememberEditorSelection(historyRef.current, selection);
    }

    function commitSource(
      nextValue: string,
      beforeOverride?: EditorSelection | null,
      afterOverride?: EditorSelection,
    ) {
      const before = beforeOverride ?? sourceSelection() ?? historyRef.current.current.selection;
      const after = afterOverride ?? pendingSelectionRef.current ?? before;
      historyRef.current = recordEditorEdit(historyRef.current, nextValue, before, after);
      if (authoringMode === "simple") {
        pendingVisualSelectionRef.current = after;
        pendingSelectionRef.current = null;
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
      }
      setValue(nextValue);
      draft.noteEdit(nextValue);
    }

    function commitTextareaValue(nextDisplayedValue: string, selectionStart: number, selectionEnd: number) {
      const before = historyRef.current.current.selection;
      const nextValue = applyTextareaEdit(value, nextDisplayedValue);
      const after = {
        start: textareaOffsetToSourceOffset(nextValue, selectionStart),
        end: textareaOffsetToSourceOffset(nextValue, selectionEnd),
      };
      historyRef.current = recordEditorEdit(historyRef.current, nextValue, before, after);
      setValue(nextValue);
      draft.noteEdit(nextValue);
    }

    function travelHistory(direction: "undo" | "redo") {
      const next = direction === "undo"
        ? undoEditorEdit(historyRef.current)
        : redoEditorEdit(historyRef.current);
      if (next === historyRef.current) return;
      historyRef.current = next;
      if (authoringMode === "simple") {
        if (document.activeElement instanceof HTMLElement
          && document.activeElement.matches('[data-visual-text="true"]')) {
          document.activeElement.blur();
        }
        pendingVisualSelectionRef.current = next.current.selection;
        pendingSelectionRef.current = null;
        visualSelectionRef.current = next.current.selection;
        visualSelectionKnownRef.current = true;
      } else {
        pendingSelectionRef.current = next.current.selection;
        pendingVisualSelectionRef.current = null;
      }
      if (mode === "preview") setMode("write");
      setValue(next.current.markdown);
      draft.noteEdit(next.current.markdown, true);
    }
    const [codeLanguage, setCodeLanguage] = useState("");
    const [mode, setMode] = useState<EditorMode>(defaultPreviewOpen ? "preview" : "write");

    function syncSplitScroll(source: HTMLElement, target: HTMLElement | null) {
      if (mode !== "split" || !target) return;
      const possible = source.scrollHeight - source.clientHeight;
      const destination = target.scrollHeight - target.clientHeight;
      const next = possible > 0 ? (source.scrollTop / possible) * destination : 0;
      if (Math.abs(target.scrollTop - next) > 1) target.scrollTop = next;
    }

    function updateVisualText(range: EditorSelection, text: string, selectionAfter?: EditorSelection) {
      const next = editVisualText(
        historyRef.current,
        range,
        escapeVisualMarkdownText(text),
        selectionAfter,
      );
      if (!next) { switchAuthoring("advanced"); return; }
      historyRef.current = next;
      visualSelectionRef.current = next.current.selection;
      visualSelectionKnownRef.current = true;
      setValue(next.current.markdown);
      draft.noteEdit(next.current.markdown);
    }

    function replaceSourceRange(range: EditorSelection, replacement: string) {
      if (range.start < 0 || range.end > value.length || range.end < range.start) return;
      const next = value.slice(0, range.start) + replacement + value.slice(range.end);
      const after = { start: range.start + replacement.length, end: range.start + replacement.length };
      historyRef.current = recordEditorEdit(historyRef.current, next, range, after);
      if (authoringMode === "simple") {
        pendingVisualSelectionRef.current = after;
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
      } else {
        pendingSelectionRef.current = after;
      }
      setValue(next);
      draft.noteEdit(next, true);
      setPasteWarning(false);
    }

    function extendTable(table: MarkdownTable, dimension: "row" | "column") {
      const next = addTableDimension(value, table, dimension);
      historyRef.current = recordEditorEdit(historyRef.current, next, table.span, table.span);
      setValue(next);
      draft.noteEdit(next, true);
    }

    function pasteSpreadsheet(range: EditorSelection, text: string) {
      const converted = spreadsheetToMarkdown(text);
      if (!converted) {
        setPasteWarning(true);
        return;
      }
      replaceSourceRange(range, "\n\n" + converted + "\n\n");
    }

    function insertTechnicalBlock(text: string) {
      const selection = sourceSelection();
      if (!selection) return;
      const leading = selection.start > 0 && value[selection.start - 1] !== "\n" ? "\n\n" : "";
      const trailing = selection.end < value.length && value[selection.end] !== "\n" ? "\n\n" : "";
      replaceSourceRange(selection, leading + text + trailing);
    }

    function codeRegion(caret: number): boolean {
      const root = fromMarkdown(value) as {
        children?: Array<{ type: string; position?: { start: { offset?: number }; end: { offset?: number } } }>;
      };
      return root.children?.some((node) => node.type === "code"
        && caret > (node.position?.start.offset ?? Number.POSITIVE_INFINITY)
        && caret <= (node.position?.end.offset ?? Number.NEGATIVE_INFINITY)) ?? false;
    }

    function codeKey(key: string, shift: boolean) {
      const textarea = textareaRef.current;
      if (!textarea) return false;
      const selection = sourceSelection();
      if (!selection) return false;
      const { start, end } = selection;
      if (!codeRegion(start) || !codeRegion(end)) return false;
      if (key === "Tab") {
        const first = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const last = value.indexOf("\n", end);
        const right = last < 0 ? value.length : last;
        const block = value.slice(first, right);
        const lines = block.split("\n");
        const edit = shift
          ? lines.map((line) => line.startsWith("  ") ? line.slice(2) : line.startsWith(" ") ? line.slice(1) : line).join("\n")
          : lines.map((line) => "  " + line).join("\n");
        replaceSourceRange({ start: first, end: right }, edit);
        return true;
      }
      if (key === "Enter") {
        const startOfLine = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const indent = /^ */u.exec(value.slice(startOfLine, start))?.[0] ?? "";
        replaceSourceRange({ start, end }, "\n" + indent);
        return true;
      }
      const matches: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
      if (Object.prototype.hasOwnProperty.call(matches, key) && start === end) {
        replaceSourceRange({ start, end }, key + matches[key]);
        pendingSelectionRef.current = { start: start + 1, end: start + 1 };
        textarea.focus();
        const caret = sourceOffsetToTextareaOffset(value, start + 1);
        textarea.setSelectionRange(caret, caret);
        return true;
      }
      return false;
    }

    async function pasteFromClipboard(format: "plain" | "code") {
      try {
        if (!navigator.clipboard?.readText) throw new Error("Clipboard unsupported");
        const text = await navigator.clipboard.readText();
        if (format === "plain") {
          const selection = sourceSelection();
          if (!selection) { setPasteWarning(true); return; }
          replaceSourceRange(selection, clipboardPlainToMarkdown(text));
          return;
        }
        const fence = String.fromCharCode(96).repeat(Math.max(3, longestBacktickRun(text) + 1));
        insertTechnicalBlock(fence + normalizedCodeLanguage(codeLanguage) + "\n" + text + "\n" + fence);
      } catch { setPasteWarning(true); }
    }

    function clearInlineFormatting() {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      if (start === end) return;
      for (const marker of ["**", "~~", "_"]) {
        if (value.slice(start - marker.length, start) !== marker
          || value.slice(end, end + marker.length) !== marker) continue;
        const plain = value.slice(start, end);
        replaceSourceRange({ start: start - marker.length, end: end + marker.length }, plain);
        return;
      }
    }

    function findNext() {
      if (!findText) return;
      const textarea = textareaRef.current;
      const current = textareaOffsetToSourceOffset(value, textarea?.selectionEnd ?? 0);
      let at = value.indexOf(findText, current);
      if (at < 0) at = value.indexOf(findText);
      if (at < 0) return;
      const selection = { start: at, end: at + findText.length };
      historyRef.current = rememberEditorSelection(historyRef.current, selection);
      setMode("write");
      pendingSelectionRef.current = selection;
    }

    function replaceAllMatches() {
      if (!findText || !value.includes(findText)) return;
      replaceSourceRange({ start: 0, end: value.length }, value.split(findText).join(replaceText));
    }

    function insertVisualParagraph(offset: number) {
      if (offset < 0 || offset > value.length) return;
      const next = value.slice(0, offset) + "\n\n" + value.slice(offset);
      const at = offset + 2;
      pendingSelectionRef.current = { start: at, end: at };
      commitSource(next);
    }

    useLayoutEffect(() => {
      const pending = pendingSelectionRef.current;
      const textarea = textareaRef.current;
      if (!pending || !textarea || mode === "preview" || authoringMode !== "advanced") return;

      textarea.focus();
      textarea.setSelectionRange(
        sourceOffsetToTextareaOffset(value, pending.start),
        sourceOffsetToTextareaOffset(value, pending.end),
      );
      pendingSelectionRef.current = null;
    }, [mode, value, authoringMode]);

    useLayoutEffect(() => {
      const pending = pendingVisualSelectionRef.current;
      const editor = editorRef.current;
      if (!pending || !editor || authoringMode !== "simple" || mode !== "write") return;
      if (!restoreVisualDomSelection(editor, value, pending)) return;
      pendingVisualSelectionRef.current = null;
      visualSelectionRef.current = pending;
      visualSelectionKnownRef.current = true;
      historyRef.current = rememberEditorSelection(historyRef.current, pending);
    }, [value, authoringMode, mode]);

    function replaceSelection(
      prefix: string,
      suffix: string,
      emptySelectionOffset = prefix.length,
    ) {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const nextValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);

      if (selected) {
        pendingSelectionRef.current = {
          start: start + prefix.length,
          end: end + prefix.length,
        };
      } else {
        const caret = start + emptySelectionOffset;
        pendingSelectionRef.current = { start: caret, end: caret };
      }
      commitSource(nextValue);
    }

    function prefixSelectedLines(prefixForLine: (index: number) => string) {
      const selection = sourceSelection();
      if (!selection) return;
      const { start: selectionStart, end: selectionEnd } = selection;

      if (selectionStart === selectionEnd) {
        const lineStart = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
        const prefix = prefixForLine(0);
        const nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        const caret = selectionStart + prefix.length;
        pendingSelectionRef.current = { start: caret, end: caret };
        commitSource(nextValue);
        return;
      }

      const lineStart = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
      const effectiveEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
        ? selectionEnd - 1
        : selectionEnd;
      const nextBreak = value.indexOf("\n", effectiveEnd);
      const lineEnd = nextBreak === -1 ? value.length : nextBreak;
      const selectedLines = value.slice(lineStart, lineEnd);
      const transformed = selectedLines
        .split("\n")
        .map((line, index) => prefixForLine(index) + line)
        .join("\n");
      const nextValue = value.slice(0, lineStart) + transformed + value.slice(lineEnd);

      pendingSelectionRef.current = {
        start: lineStart,
        end: lineStart + transformed.length,
      };
      commitSource(nextValue);
    }

    function insertLink() {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const label = selected || t("editorLink");
      const destination = "https://";
      const inserted = "[" + label + "](" + destination + ")";
      const nextValue = value.slice(0, start) + inserted + value.slice(end);

      if (selected) {
        const destinationStart = start + label.length + 3;
        pendingSelectionRef.current = {
          start: destinationStart,
          end: destinationStart + destination.length,
        };
      } else {
        pendingSelectionRef.current = {
          start: start + 1,
          end: start + 1 + label.length,
        };
      }
      commitSource(nextValue);
    }

    function insertFencedCodeBlock() {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const language = normalizedCodeLanguage(codeLanguage);
      const needsLeadingBreak = start > 0 && value[start - 1] !== "\n";
      const needsTrailingBreak = end < value.length && value[end] !== "\n";
      const leading = needsLeadingBreak ? "\n\n" : "";
      const trailing = needsTrailingBreak ? "\n\n" : "";
      const fence = "`".repeat(Math.max(3, longestBacktickRun(selected) + 1));
      const fenceStart = leading + fence + language + "\n";
      const fenceEnd = "\n" + fence + trailing;
      const nextValue = value.slice(0, start) + fenceStart + selected + fenceEnd + value.slice(end);

      if (selected) {
        pendingSelectionRef.current = {
          start: start + fenceStart.length,
          end: start + fenceStart.length + selected.length,
        };
      } else {
        const caret = start + fenceStart.length;
        pendingSelectionRef.current = { start: caret, end: caret };
      }
      commitSource(nextValue);
    }

    useImperativeHandle(forwardedRef, () => ({
      focus() {
        const selection = sourceSelection() ?? historyRef.current.current.selection;
        setMode("write");
        if (authoringMode === "simple") {
          pendingVisualSelectionRef.current = selection;
          visualSelectionRef.current = selection;
          visualSelectionKnownRef.current = true;
        } else {
          pendingSelectionRef.current = selection;
        }
      },
      insertText(text: string) {
        const selection = sourceSelection() ?? historyRef.current.current.selection;
        const nextValue = value.slice(0, selection.start) + text + value.slice(selection.end);
        const caret = selection.start + text.length;
        const after = { start: caret, end: caret };
        pendingSelectionRef.current = after;
        setMode("write");
        commitSource(nextValue, selection, after);
      },
      acknowledgePublished(publishedDraftId: string, publishedVersion: number) {
        draft.acknowledgePublished(publishedDraftId, publishedVersion);
      },
    }), [mode, value, authoringMode, draft]);

    return (
      <div ref={editorRef} className={"markdown-editor" + (fullScreen ? " is-fullscreen" : "")}
        data-mode={mode} data-authoring={authoringMode}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape" && fullScreen) setFullScreen(false);
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            editorRef.current?.closest("form")?.requestSubmit();
            return;
          }
          if (authoringMode !== "simple" || !(event.ctrlKey || event.metaKey) || event.altKey) return;
          const key = event.key.toLowerCase();
          if (key === "b" || key === "i" || key === "k") {
            event.preventDefault();
            if (key === "b") replaceSelection("**", "**", 2);
            if (key === "i") replaceSelection("_", "_", 1);
            if (key === "k") insertLink();
            return;
          }
          if (key === "z" || key === "y") {
            event.preventDefault();
            travelHistory(key === "y" || event.shiftKey ? "redo" : "undo");
          }
        }}
      >
        {accountId && draftContextKey ? (
          <>
            <input type="hidden" name="editorDraftId" value={draft.draftId} readOnly />
            <input type="hidden" name="editorDraftVersion" value={draft.expectedVersion} readOnly />
          </>
        ) : null}
        <div className="markdown-editor-toolbar" role="toolbar" aria-label={t("editorToolbar")}>
          <div className="markdown-editor-formatting">
            <div className="markdown-editor-tool-group">
              <button type="button" disabled={disabled} title={t("editorUndo")} aria-label={t("editorUndo")} onClick={() => travelHistory("undo")}>↶</button>
              <button type="button" disabled={disabled} title={t("editorRedo")} aria-label={t("editorRedo")} onClick={() => travelHistory("redo")}>↷</button>
            </div>
            <div className="markdown-editor-tool-group">
              <button type="button" disabled={disabled} aria-label={t("editorBold")} title={t("editorBold")}
                onClick={() => replaceSelection("**", "**", 2)}><strong>B</strong></button>
              <button type="button" disabled={disabled} aria-label={t("editorItalic")} title={t("editorItalic")}
                onClick={() => replaceSelection("_", "_", 1)}><em>I</em></button>
              <button type="button" disabled={disabled} aria-label={t("editorStrike")} title={t("editorStrike")}
                onClick={() => replaceSelection("~~", "~~", 2)}><s>S</s></button>
              <button type="button" disabled={disabled} aria-label={t("editorLink")} title={t("editorLink")}
                onClick={insertLink}>↗</button>
              <button type="button" disabled={disabled} aria-label={t("editorBulletedList")} title={t("editorBulletedList")}
                onClick={() => prefixSelectedLines(() => "- ")}>•</button>
              <button type="button" disabled={disabled} aria-label={t("editorNumberedList")} title={t("editorNumberedList")}
                onClick={() => prefixSelectedLines((index) => String(index + 1) + ". ")}>1.</button>
              <button type="button" disabled={disabled} aria-label={t("editorQuote")} title={t("editorQuote")}
                onClick={() => prefixSelectedLines(() => "> ")}>❞</button>
              <details className="markdown-editor-extra-menu">
                <summary aria-label={t("editorEmoji")}>☺</summary>
                <div className="markdown-editor-extra-options">
                  {["😀", "🙂", "👍", "❤️"].map((emoji) =>
                    <button type="button" key={emoji} disabled={disabled} onClick={() => replaceSelection(emoji, "", emoji.length)}
                      aria-label={emoji}>{emoji}</button>,
                  )}
                </div>
              </details>
              <details className="markdown-editor-extra-menu">
                <summary aria-label={t("editorMoreTools")}>•••</summary>
                <div className="markdown-editor-extra-options">
                  <button type="button" disabled={disabled} onClick={() => prefixSelectedLines(() => "## ")}>H2</button>
                  <button type="button" disabled={disabled} onClick={() => prefixSelectedLines(() => "### ")}>H3</button>
                  <button type="button" disabled={disabled} onClick={() => replaceSelection("\n\n---\n\n", "", 5)}>—</button>
                  <button type="button" disabled={disabled} aria-label={t("editorSpoiler")}
                    onClick={() => insertTechnicalBlock(":::spoiler\n\n:::")}>{t("editorSpoiler")}</button>
                  <button type="button" disabled={disabled} aria-label={t("editorTable")}
                    onClick={() => insertTechnicalBlock("|  |  |\n| --- | --- |\n|  |  |")}>{t("editorTable")}</button>
                  <button type="button" disabled={disabled} aria-label={t("editorClearFormatting")}
                    onClick={clearInlineFormatting}>{t("editorClearFormatting")}</button>
                  <button type="button" disabled={disabled} aria-label={t("editorPastePlain")}
                    onClick={() => void pasteFromClipboard("plain")}>{t("editorPastePlain")}</button>
                  {authoringMode === "advanced" ? (
                    <>
                      <button type="button" disabled={disabled} aria-label={t("editorInlineCode")} onClick={() => {
                        const selection = sourceSelection();
                        if (!selection) return;
                        const { prefix, suffix } = inlineCodeAffixes(value.slice(selection.start, selection.end));
                        replaceSelection(prefix, suffix, prefix.length);
                      }}>{t("editorInlineCode")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorCodeBlock")}
                        onClick={insertFencedCodeBlock}>{t("editorCodeBlock")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorPasteCode")}
                        onClick={() => void pasteFromClipboard("code")}>{t("editorPasteCode")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorFindReplace")}
                        onClick={() => setFindOpen((open) => !open)}>{t("editorFindReplace")}</button>
                    </>
                  ) : null}
                </div>
              </details>
            </div>
          </div>

            <label className="markdown-editor-language">
              <span>{t("editorCodeLanguage")}</span>
              <input
                type="text"
                dir="ltr"
                value={codeLanguage}
                maxLength={32}
                disabled={disabled}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("editorCodeLanguagePlaceholder")}
                onChange={(event) => setCodeLanguage(event.target.value)}
              />
            </label>
          <div className="markdown-editor-controls">
            <button type="button" disabled={disabled} onClick={() => switchAuthoring(authoringMode === "simple" ? "advanced" : "simple")}>
              {t(authoringMode === "simple" ? "editorAdvanced" : "editorSimple")}
            </button>
            {authoringMode === "simple"
              ? <button type="button" disabled={disabled} aria-pressed={mode === "preview"}
                  onClick={() => {
                    if (mode === "preview") {
                      pendingVisualSelectionRef.current =
                        visualSelectionRef.current ?? historyRef.current.current.selection;
                      setMode("write");
                    } else {
                      rememberSelection(sourceSelection());
                      setMode("preview");
                    }
                  }}>{t("editorModePreview")}</button>
              : <details className="markdown-editor-preview-menu">
                  <summary>{t("editorModePreview")}</summary>
                  <div className="markdown-editor-preview-options">
                    {(["write", "preview", "split"] as const).map((item) =>
                      <button type="button" key={item} disabled={disabled} aria-pressed={mode === item}
                        onClick={() => setMode(item)}>
                        {t(item === "write" ? "editorModeMarkdown" : item === "preview" ? "editorModePreview" : "editorModeSplit")}
                      </button>,
                    )}
                  </div>
                </details>}
            <button type="button" disabled={disabled} aria-pressed={fullScreen}
              title={t("editorFullScreen")} aria-label={t("editorFullScreen")}
              onClick={() => setFullScreen((previous) => !previous)}>⛶</button>
          </div>
        </div>

        {authoringMode === "advanced" && findOpen ? (
          <div className="markdown-editor-find" role="group" aria-label={t("editorFindReplace")}>
            <input aria-label={t("editorFind")} value={findText} onChange={(event) => setFindText(event.target.value)} />
            <input aria-label={t("editorReplacement")} value={replaceText} onChange={(event) => setReplaceText(event.target.value)} />
            <button type="button" onClick={findNext}>{t("editorFindNext")}</button>
            <button type="button" onClick={replaceAllMatches}>{t("editorReplaceAll")}</button>
            <button type="button" onClick={() => setFindOpen(false)}>{t("profileCancel")}</button>
          </div>
        ) : null}
        <div className={"markdown-editor-workspace is-" + mode}>
          {authoringMode === "simple" && mode !== "preview" ? (
            <VisualMarkdownEditor
              markdown={value} disabled={disabled}
              onTextEdit={updateVisualText}
              onSelection={(selection) => {
                visualSelectionKnownRef.current = true;
                visualSelectionRef.current = selection;
                rememberSelection(selection);
              }}
              onInsertParagraph={insertVisualParagraph}
              onEditTechnical={() => switchAuthoring("advanced")}
              onReplaceRange={replaceSourceRange}
              onTableDimension={extendTable}
              onPasteTable={pasteSpreadsheet}
              onPasteFallback={() => setPasteWarning(true)}
            />
          ) : null}
          <div className={"markdown-editor-write-pane" + (mode === "preview" ? " is-preview-hidden" : "")}>
            <input type="hidden" name={name} value={value} disabled={disabled} readOnly />
            <textarea
              ref={textareaRef}
              id={id}
              required={required}
              tabIndex={mode === "preview" || authoringMode === "simple" ? -1 : undefined}
              rows={rows}
              disabled={disabled}
              aria-describedby={describedBy}
              value={textareaMarkdown(value)}
              onChange={(event) => commitTextareaValue(
                event.currentTarget.value,
                event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                event.currentTarget.selectionEnd ?? event.currentTarget.selectionStart ?? event.currentTarget.value.length,
              )}
              onSelect={(event) => rememberSelection({
                start: textareaOffsetToSourceOffset(value, event.currentTarget.selectionStart ?? 0),
                end: textareaOffsetToSourceOffset(value, event.currentTarget.selectionEnd ?? 0),
              })}
              onKeyUp={(event) => {
                rememberSelection(textareaSourceSelection());
                if (event.key === " " || event.key === "Enter") draft.saveLocal();
              }}
              onPasteCapture={() => { window.setTimeout(() => draft.saveLocal(), 0); }}
              onScroll={(event) => syncSplitScroll(event.currentTarget, previewRef.current)}
              onKeyDown={(event) => {
                if (!disabled && !event.ctrlKey && !event.metaKey && !event.altKey && codeKey(event.key, event.shiftKey)) {
                  event.preventDefault();
                  return;
                }
                if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                const key = event.key.toLowerCase();
                if (key === "f" && authoringMode === "advanced") {
                  event.preventDefault();
                  setFindOpen(true);
                  return;
                }
                if (key === "z" || key === "y") {
                  event.preventDefault();
                  travelHistory(key === "y" || event.shiftKey ? "redo" : "undo");
                }
              }}
              onBeforeInput={(event) => {
                rememberSelection({
                  start: textareaOffsetToSourceOffset(value, event.currentTarget.selectionStart ?? 0),
                  end: textareaOffsetToSourceOffset(value, event.currentTarget.selectionEnd ?? 0),
                });
                const inputType = (event.nativeEvent as InputEvent).inputType;
                if (inputType !== "historyUndo" && inputType !== "historyRedo") return;
                event.preventDefault();
                travelHistory(inputType === "historyUndo" ? "undo" : "redo");
              }}
              onFocus={() => {
                if (mode === "preview") setMode("write");
                rememberSelection(textareaSourceSelection());
              }}
              onInvalid={() => {
                const selection = textareaSourceSelection();
                if (authoringMode === "simple") {
                  pendingVisualSelectionRef.current = selection;
                  visualSelectionRef.current = selection;
                  visualSelectionKnownRef.current = true;
                  setMode("write");
                  return;
                }
                if (mode === "preview") {
                  pendingSelectionRef.current = selection;
                  setMode("write");
                }
              }}
            />
          </div>

          {pasteWarning ? <p className="markdown-editor-paste-warning" role="alert">{t("editorPasteTableWarning")}</p> : null}
          {mode !== "write" && (
            <section ref={previewRef} id={id + "-preview"} className="markdown-editor-preview" aria-label={t("editorPreviewHeading")}
              onScroll={(event) => syncSplitScroll(event.currentTarget, textareaRef.current)}>
              <header className="markdown-editor-preview-header">
                <strong>{t("editorPreviewHeading")}</strong>
              </header>
              {value.trim() ? (
                <ForumMarkdown>{value}</ForumMarkdown>
              ) : (
                <p className="markdown-editor-preview-empty">{t("editorPreviewEmpty")}</p>
              )}
            </section>
          )}
        </div>
        {draft.element}
      </div>
    );
  },
);
