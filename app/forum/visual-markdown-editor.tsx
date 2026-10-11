import { useLayoutEffect, useRef, type ReactNode } from "react";
import { fromMarkdown } from "mdast-util-from-markdown";
import { useTranslation } from "react-i18next";
import type { EditorSelection } from "./editor-document";
import { ForumMarkdown } from "./markdown";

interface VisualNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
  children?: VisualNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

interface VisualEditorProps {
  markdown: string;
  disabled?: boolean;
  onTextEdit(range: EditorSelection, value: string): void;
  onSelection(selection: EditorSelection | null): void;
  onInsertParagraph(offset: number): void;
  onEditTechnical(): void;
}

export function escapeVisualMarkdownText(value: string): string {
  // Only the changed text leaf is encoded; surrounding markup is never serialized.
  return value.replace(/\\|`|\*|_|\[|\]|<|>/gu, "\\$&");
}

function sourceRange(node: VisualNode): EditorSelection | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start! <= end!
    ? { start: start!, end: end! }
    : null;
}

function VisualTextLeaf({
  text, range, raw, disabled, onTextEdit, onSelection, onInsertParagraph,
}: {
  text: string;
  range: EditorSelection;
  raw: string;
  disabled: boolean;
  onTextEdit: VisualEditorProps["onTextEdit"];
  onSelection: VisualEditorProps["onSelection"];
  onInsertParagraph: VisualEditorProps["onInsertParagraph"];
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    // The browser owns the active editable text node. React never rewrites its
    // children during a keystroke, which avoids resetting the caret.
    if (element && element !== document.activeElement && element.textContent !== text) {
      element.textContent = text;
    }
  }, [text]);

  const reportSelection = () => {
    const element = ref.current;
    const selection = window.getSelection();
    if (!element || !selection || !selection.anchorNode || !selection.focusNode
      || !element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) {
      onSelection(null);
      return;
    }
    // Nontrivial raw escapes do not correspond 1:1 with visual offsets.
    if (raw !== text) {
      onSelection(null);
      return;
    }
    const start = Math.min(selection.anchorOffset, selection.focusOffset);
    const end = Math.max(selection.anchorOffset, selection.focusOffset);
    onSelection({ start: range.start + start, end: range.start + end });
  };

  return (
    <span
      ref={ref}
      contentEditable={!disabled}
      role="textbox"
      aria-multiline="false"
      suppressContentEditableWarning
      spellCheck
      data-visual-text="true"
      data-source-start={range.start}
      onInput={(event) => {
        const next = (event.currentTarget.textContent ?? "").replace(/[\r\n]+/gu, " ");
        onTextEdit(range, next);
      }}
      onSelect={reportSelection}
      onKeyUp={reportSelection}
      onMouseUp={reportSelection}
      onFocus={reportSelection}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        onInsertParagraph(range.end);
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain").replace(/[\r\n]+/gu, " ");
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const active = selection.getRangeAt(0);
        if (!event.currentTarget.contains(active.commonAncestorContainer)) return;
        active.deleteContents();
        const leaf = document.createTextNode(text);
        active.insertNode(leaf);
        active.setStartAfter(leaf);
        active.collapse(true);
        selection.removeAllRanges();
        selection.addRange(active);
        onTextEdit(range, event.currentTarget.textContent ?? "");
      }}
    />
  );
}

function VisualNodeView({
  node, markdown, disabled, ...actions
}: { node: VisualNode; markdown: string; disabled: boolean } & Pick<
VisualEditorProps, "onTextEdit" | "onSelection" | "onInsertParagraph" | "onEditTechnical"
>): ReactNode {
  const { t } = useTranslation("common");
  const children = node.children?.map((child, index) =>
    <VisualNodeView key={index} node={child} markdown={markdown} disabled={disabled} {...actions} />,
  );
  switch (node.type) {
    case "root": return <>{children}</>;
    case "paragraph": return <p>{children}</p>;
    case "heading": {
      const level = node.depth === 1 ? "h1" : node.depth === 3 ? "h3" : node.depth === 4 ? "h4" : node.depth === 5 ? "h5" : node.depth === 6 ? "h6" : "h2";
      if (level === "h1") return <h1>{children}</h1>;
      if (level === "h3") return <h3>{children}</h3>;
      if (level === "h4") return <h4>{children}</h4>;
      if (level === "h5") return <h5>{children}</h5>;
      if (level === "h6") return <h6>{children}</h6>;
      return <h2>{children}</h2>;
    }
    case "strong": return <strong>{children}</strong>;
    case "emphasis": return <em>{children}</em>;
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "list": return node.ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
    case "listItem": return <li>{children}</li>;
    case "thematicBreak": return <hr />;
    case "break": return <br />;
    case "link": {
      const range = sourceRange(node);
      if (range && markdown[range.start] === "[") return (
        <span className="markdown-editor-protected" data-visual-protected="link-target">
          <span className="markdown-editor-visual-link">{children}</span>
          <button type="button" disabled={disabled} onClick={actions.onEditTechnical}>
            {t("editorEditInMarkdown")}
          </button>
        </span>
      );
      return <span className="markdown-editor-protected" data-visual-protected="link">
        <code>{node.children?.map((child) => child.value ?? "").join("") ?? ""}</code>
        <button type="button" disabled={disabled} onClick={actions.onEditTechnical}>{t("editorEditInMarkdown")}</button>
      </span>;
    }
    case "text": {
      const range = sourceRange(node);
      if (!range) return node.value ?? "";
      return <VisualTextLeaf
        text={node.value ?? ""} raw={markdown.slice(range.start, range.end)}
        range={range} disabled={disabled} {...actions}
      />;
    }
    default: {
      const range = sourceRange(node);
      const source = range ? markdown.slice(range.start, range.end) : node.value ?? "";
      const label = node.type === "link" || node.type === "linkReference"
        ? (node.children ?? []).map((item) => item.value ?? "").join("") || source
        : node.type === "image" ? node.alt ?? source
        : node.type === "inlineCode" ? node.value ?? source : source;
      if (node.type === "code") return (
        <div className="markdown-editor-protected" data-visual-protected={node.type}>
          <ForumMarkdown>{source}</ForumMarkdown>
          <button type="button" disabled={disabled} onClick={actions.onEditTechnical}>
            {t("editorEditInMarkdown")}
          </button>
        </div>
      );
      return (
        <span className="markdown-editor-protected" data-visual-protected={node.type}>
          <code>{label}</code>
          <button type="button" disabled={disabled} onClick={actions.onEditTechnical}>
            {t("editorEditInMarkdown")}
          </button>
        </span>
      );
    }
  }
}

export function VisualMarkdownEditor(props: VisualEditorProps) {
  const { markdown, disabled = false, ...actions } = props;
  const { t } = useTranslation("common");
  const root = fromMarkdown(markdown) as VisualNode;
  return (
    <section className="markdown-editor-visual post-body" aria-label={t("editorVisualSurface")} data-authoring="simple">
      {root.children?.length
        ? <VisualNodeView node={root} markdown={markdown} disabled={disabled} {...actions} />
        : <p><VisualTextLeaf
            text="" raw="" range={{ start: 0, end: 0 }} disabled={disabled}
            onTextEdit={actions.onTextEdit}
            onSelection={actions.onSelection}
            onInsertParagraph={actions.onInsertParagraph}
          /></p>}
      {root.children?.length && markdown.endsWith("\n\n") ? (
        <p><VisualTextLeaf text="" raw="" range={{ start: markdown.length, end: markdown.length }}
          disabled={disabled} onTextEdit={actions.onTextEdit}
          onSelection={actions.onSelection} onInsertParagraph={actions.onInsertParagraph} /></p>
      ) : null}
    </section>
  );
}
