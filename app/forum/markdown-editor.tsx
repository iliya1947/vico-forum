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
import { createEditorHistory, editVisualText, recordEditorEdit, redoEditorEdit, undoEditorEdit, type EditorSelection } from "./editor-document";
import { VisualMarkdownEditor, escapeVisualMarkdownText } from "./visual-markdown-editor";
import { useHeaderAuthUser } from "../auth/auth-controls";

export interface MarkdownEditorHandle {
  focus: () => void;
  insertText: (text: string) => void;
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
    },
    forwardedRef,
  ) {
    const { t } = useTranslation("common");
    const authUser = useHeaderAuthUser();
    const visualSelectionRef = useRef<EditorSelection | null>(null);
    const [authoringMode, setAuthoringMode] = useState<"simple" | "advanced">(defaultAuthoringMode);
    const [fullScreen, setFullScreen] = useState(false);
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
      setAuthoringMode(next);
      setMode("write");
      visualSelectionRef.current = null;
      if (accountId) {
        try { window.localStorage.setItem("vico:editor:mode:" + accountId, next); } catch { /* private mode */ }
      }
    }

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const historyRef = useRef(createEditorHistory(defaultValue));
    const [value, setValue] = useState(defaultValue);

    function commitSource(nextValue: string) {
      const textarea = textareaRef.current;
      const before = {
        start: textarea?.selectionStart ?? value.length,
        end: textarea?.selectionEnd ?? value.length,
      };
      const after = pendingSelectionRef.current ?? before;
      historyRef.current = recordEditorEdit(historyRef.current, nextValue, before, after);
      setValue(nextValue);
    }

    function travelHistory(direction: "undo" | "redo") {
      const next = direction === "undo"
        ? undoEditorEdit(historyRef.current)
        : redoEditorEdit(historyRef.current);
      if (next === historyRef.current) return;
      historyRef.current = next;
      pendingSelectionRef.current = next.current.selection;
      if (mode === "preview") setMode("write");
      setValue(next.current.markdown);
    }
    const [codeLanguage, setCodeLanguage] = useState("");
    const [mode, setMode] = useState<EditorMode>(defaultPreviewOpen ? "preview" : "write");

    function sourceSelection(): EditorSelection {
      if (authoringMode === "simple") {
        return visualSelectionRef.current ?? { start: value.length, end: value.length };
      }
      const textarea = textareaRef.current;
      return {
        start: textarea?.selectionStart ?? value.length,
        end: textarea?.selectionEnd ?? value.length,
      };
    }

    function updateVisualText(range: EditorSelection, text: string) {
      const next = editVisualText(historyRef.current, range, escapeVisualMarkdownText(text));
      if (!next) { switchAuthoring("advanced"); return; }
      historyRef.current = next;
      setValue(next.current.markdown);
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
      textarea.setSelectionRange(pending.start, pending.end);
      pendingSelectionRef.current = null;
    }, [mode, value, authoringMode]);

    function replaceSelection(
      prefix: string,
      suffix: string,
      emptySelectionOffset = prefix.length,
    ) {
      const { start, end } = sourceSelection();
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
      const { start: selectionStart, end: selectionEnd } = sourceSelection();

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
      const { start, end } = sourceSelection();
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
      const { start, end } = sourceSelection();
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
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? value.length;
        const end = textarea.selectionEnd ?? start;
        if (authoringMode === "simple" || mode === "preview") {
          pendingSelectionRef.current = { start, end };
          switchAuthoring("advanced");
          return;
        }

        textarea.focus();
      },
      insertText(text: string) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? value.length;
        const end = textarea.selectionEnd ?? start;
        const nextValue = value.slice(0, start) + text + value.slice(end);
        const caret = start + text.length;
        pendingSelectionRef.current = { start: caret, end: caret };
        if (mode === "preview" || authoringMode === "simple") switchAuthoring("advanced");
        commitSource(nextValue);
      },
    }), [mode, value, authoringMode]);

    return (
      <div className={"markdown-editor" + (fullScreen ? " is-fullscreen" : "")}
        data-mode={mode} data-authoring={authoringMode}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape" && fullScreen) setFullScreen(false);
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
                  {authoringMode === "advanced" ? (
                    <>
                      <button type="button" disabled={disabled} aria-label={t("editorInlineCode")} onClick={() => {
                        const selection = sourceSelection();
                        const { prefix, suffix } = inlineCodeAffixes(value.slice(selection.start, selection.end));
                        replaceSelection(prefix, suffix, prefix.length);
                      }}>{t("editorInlineCode")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorCodeBlock")}
                        onClick={insertFencedCodeBlock}>{t("editorCodeBlock")}</button>
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
                  onClick={() => setMode(mode === "preview" ? "write" : "preview")}>{t("editorModePreview")}</button>
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

        <div className={"markdown-editor-workspace is-" + mode}>
          {authoringMode === "simple" && mode !== "preview" ? (
            <VisualMarkdownEditor
              markdown={value} disabled={disabled}
              onTextEdit={updateVisualText}
              onSelection={(selection) => { visualSelectionRef.current = selection; }}
              onInsertParagraph={insertVisualParagraph}
              onEditTechnical={() => switchAuthoring("advanced")}
            />
          ) : null}
          <div className={"markdown-editor-write-pane" + (mode === "preview" ? " is-preview-hidden" : "")}>
            <textarea
              ref={textareaRef}
              id={id}
              name={name}
              required={required}
              tabIndex={mode === "preview" || authoringMode === "simple" ? -1 : undefined}
              rows={rows}
              disabled={disabled}
              aria-describedby={describedBy}
              value={value}
              onChange={(event) => commitSource(event.target.value)}
              onKeyDown={(event) => {
                if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                const key = event.key.toLowerCase();
                if (key === "z" || key === "y") {
                  event.preventDefault();
                  travelHistory(key === "y" || event.shiftKey ? "redo" : "undo");
                }
              }}
              onBeforeInput={(event) => {
                const inputType = (event.nativeEvent as InputEvent).inputType;
                if (inputType !== "historyUndo" && inputType !== "historyRedo") return;
                event.preventDefault();
                travelHistory(inputType === "historyUndo" ? "undo" : "redo");
              }}
              onFocus={() => {
                if (mode === "preview") setMode("write");
              }}
              onInvalid={() => {
                if (mode !== "preview" && authoringMode !== "simple") return;
                const textarea = textareaRef.current;
                const start = textarea?.selectionStart ?? value.length;
                const end = textarea?.selectionEnd ?? start;
                pendingSelectionRef.current = { start, end };
                switchAuthoring("advanced");
              }}
            />
          </div>

          {mode !== "write" && (
            <section id={id + "-preview"} className="markdown-editor-preview" aria-label={t("editorPreviewHeading")}>
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
      </div>
    );
  },
);
