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
    const [previewOpen, setPreviewOpen] = useState(defaultPreviewOpen);

    useLayoutEffect(() => {
      const pending = pendingSelectionRef.current;
      const textarea = textareaRef.current;
      if (!pending || !textarea) return;

      textarea.focus();
      textarea.setSelectionRange(pending.start, pending.end);
      pendingSelectionRef.current = null;
    }, [value]);

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
        textareaRef.current?.focus();
      },
      insertText(text: string) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? value.length;
        const end = textarea.selectionEnd ?? start;
        const nextValue = value.slice(0, start) + text + value.slice(end);
        const caret = start + text.length;
        pendingSelectionRef.current = { start: caret, end: caret };
        setValue(nextValue);
      },
    }), [value]);

    return (
      <div className="markdown-editor">
        <div className="markdown-editor-toolbar" role="toolbar" aria-label={t("editorToolbar")}>
          <div className="markdown-editor-formatting">
            <button
              type="button"
              disabled={disabled}
              aria-label={t("editorBold")}
              title={t("editorBold")}
              onClick={() => replaceSelection("**", "**", 2)}
            >
              <strong aria-hidden="true">B</strong>
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("editorItalic")}
              title={t("editorItalic")}
              onClick={() => replaceSelection("_", "_", 1)}
            >
              <em aria-hidden="true">I</em>
            </button>
            <button
              type="button"
              disabled={disabled}
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
              {t("editorInlineCode")}
            </button>
            <button type="button" disabled={disabled} onClick={insertFencedCodeBlock}>
              {t("editorCodeBlock")}
            </button>
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

          <button
            type="button"
            className="markdown-editor-preview-toggle"
            disabled={disabled}
            aria-expanded={previewOpen}
            aria-controls={id + "-preview"}
            onClick={() => setPreviewOpen((current) => !current)}
          >
            {t(previewOpen ? "editorPreviewHide" : "editorPreviewShow")}
          </button>
        </div>

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
        />

        {previewOpen && (
          <section
            id={id + "-preview"}
            className="markdown-editor-preview"
            aria-label={t("editorPreviewHeading")}
          >
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
    );
  },
);
