import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { ForumMarkdown } from "./markdown";

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
}

interface PendingSelection {
  start: number;
  end: number;
}

type EditorMode = "write" | "preview" | "split";

function normalizedCodeLanguage(value: string): string {
  return value.trim().replace(/[^a-z0-9_+.-]/giu, "").slice(0, 32);
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
    },
    forwardedRef,
  ) {
    const { t } = useTranslation("common");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const [value, setValue] = useState(defaultValue);
    const [codeLanguage, setCodeLanguage] = useState("ts");
    const [mode, setMode] = useState<EditorMode>(defaultPreviewOpen ? "split" : "write");

    useLayoutEffect(() => {
      const pending = pendingSelectionRef.current;
      const textarea = textareaRef.current;
      if (!pending || !textarea || mode === "preview") return;

      textarea.focus();
      textarea.setSelectionRange(pending.start, pending.end);
      pendingSelectionRef.current = null;
    }, [mode, value]);

    function replaceSelection(
      prefix: string,
      suffix: string,
      emptySelectionOffset = prefix.length,
    ) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? start;
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
      setValue(nextValue);
    }

    function prefixSelectedLines(prefixForLine: (index: number) => string) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selectionStart = textarea.selectionStart ?? value.length;
      const selectionEnd = textarea.selectionEnd ?? selectionStart;

      if (selectionStart === selectionEnd) {
        const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
        const prefix = prefixForLine(0);
        const nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        const caret = selectionStart + prefix.length;
        pendingSelectionRef.current = { start: caret, end: caret };
        setValue(nextValue);
        return;
      }

      const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
      const nextBreak = value.indexOf("\n", selectionEnd);
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
      setValue(nextValue);
    }

    function insertLink() {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? start;
      const selected = value.slice(start, end);
      const label = selected || "link text";
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
      setValue(nextValue);
    }

    function insertFencedCodeBlock() {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? start;
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
      setValue(nextValue);
    }

    useImperativeHandle(forwardedRef, () => ({
      focus() {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? value.length;
        const end = textarea.selectionEnd ?? start;
        if (mode === "preview") {
          pendingSelectionRef.current = { start, end };
          setMode("write");
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
        if (mode === "preview") setMode("write");
        setValue(nextValue);
      },
    }), [mode, value]);

    return (
      <div className="markdown-editor" data-mode={mode}>
        <div className="markdown-editor-modebar">
          <div className="markdown-editor-modes" role="group" aria-label={t("editorViewMode")}>
            <button type="button" disabled={disabled} aria-pressed={mode === "write"} onClick={() => setMode("write")}>
              {t("editorModeWrite")}
            </button>
            <button type="button" disabled={disabled} aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
              {t("editorModePreview")}
            </button>
            <button type="button" disabled={disabled} aria-pressed={mode === "split"} onClick={() => setMode("split")}>
              {t("editorModeSplit")}
            </button>
          </div>
        </div>

        {mode !== "preview" && (
          <div className="markdown-editor-toolbar" role="toolbar" aria-label={t("editorToolbar")}>
            <div className="markdown-editor-formatting">
              <div className="markdown-editor-tool-group">
                <button type="button" disabled={disabled} aria-label={t("editorHeading")} title={t("editorHeading")} onClick={() => prefixSelectedLines(() => "## ")}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-heading">H</span>
                </button>
                <button type="button" disabled={disabled} aria-label={t("editorBold")} title={t("editorBold")} onClick={() => replaceSelection("**", "**", 2)}>
                  <strong aria-hidden="true">B</strong>
                </button>
                <button type="button" disabled={disabled} aria-label={t("editorItalic")} title={t("editorItalic")} onClick={() => replaceSelection("_", "_", 1)}>
                  <em aria-hidden="true">I</em>
                </button>
              </div>

              <div className="markdown-editor-tool-group">
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={t("editorInlineCode")}
                  title={t("editorInlineCode")}
                  onClick={() => {
                    const textarea = textareaRef.current;
                    if (!textarea) return;
                    const selected = value.slice(
                      textarea.selectionStart ?? value.length,
                      textarea.selectionEnd ?? textarea.selectionStart ?? value.length,
                    );
                    const { prefix, suffix } = inlineCodeAffixes(selected);
                    replaceSelection(prefix, suffix, prefix.length);
                  }}
                >
                  <span aria-hidden="true" className="markdown-editor-glyph is-code">&lt;/&gt;</span>
                </button>
                <button type="button" disabled={disabled} aria-label={t("editorCodeBlock")} title={t("editorCodeBlock")} onClick={insertFencedCodeBlock}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-code-block">{"{ }"}</span>
                </button>
              </div>

              <div className="markdown-editor-tool-group">
                <button type="button" disabled={disabled} aria-label={t("editorQuote")} title={t("editorQuote")} onClick={() => prefixSelectedLines(() => "> ")}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-quote">❞</span>
                </button>
                <button type="button" disabled={disabled} aria-label={t("editorLink")} title={t("editorLink")} onClick={insertLink}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-link">↗</span>
                </button>
              </div>

              <div className="markdown-editor-tool-group">
                <button type="button" disabled={disabled} aria-label={t("editorBulletedList")} title={t("editorBulletedList")} onClick={() => prefixSelectedLines(() => "- ")}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-list">•</span>
                </button>
                <button type="button" disabled={disabled} aria-label={t("editorNumberedList")} title={t("editorNumberedList")} onClick={() => prefixSelectedLines((index) => String(index + 1) + ". ")}>
                  <span aria-hidden="true" className="markdown-editor-glyph is-list">1.</span>
                </button>
              </div>
            </div>

            <label className="markdown-editor-language">
              <span>{t("editorCodeLanguage")}</span>
              <input
                type="text"
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
          </div>
        )}

        <div className={"markdown-editor-workspace is-" + mode}>
          <div className={"markdown-editor-write-pane" + (mode === "preview" ? " is-preview-hidden" : "")}>
            <textarea
              ref={textareaRef}
              id={id}
              name={name}
              required={required}
              rows={rows}
              disabled={disabled}
              aria-describedby={describedBy}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => {
                if (mode === "preview") setMode("write");
              }}
              onInvalid={() => {
                if (mode !== "preview") return;
                const textarea = textareaRef.current;
                const start = textarea?.selectionStart ?? value.length;
                const end = textarea?.selectionEnd ?? start;
                pendingSelectionRef.current = { start, end };
                setMode("write");
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
