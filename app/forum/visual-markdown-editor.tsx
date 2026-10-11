import { useLayoutEffect, useRef, type ReactNode } from "react";
import { fromMarkdown } from "mdast-util-from-markdown";
import { useTranslation } from "react-i18next";
import type { EditorSelection } from "./editor-document";
import { ForumMarkdown } from "./markdown";
import { segmentTechnicalMarkdown, encodeTableCell, type MarkdownTable } from "./technical-markdown";
import { clipboardHtmlToMarkdown, clipboardPlainToMarkdown } from "./clipboard-markdown";

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
  onReplaceRange(range: EditorSelection, source: string): void;
  onTableDimension(table: MarkdownTable, dimension: "row" | "column"): void;
  onPasteTable(range: EditorSelection, plain: string): void;
  onPasteFallback(): void;
}

export function escapeVisualMarkdownText(value: string): string {
  // Use the same literal-text escaping rule for visual typing and plain paste:
  // a leading #, >, list marker or rule must not silently become Markdown syntax.
  return clipboardPlainToMarkdown(value);
}

/** Resolve DOM ranges relative to the whole visual leaf, not to one text node.
 * Browsers may split contentEditable text into several adjacent text nodes on paste.
 * Offsets use UTF-16 units, matching JavaScript/Markdown source span indices.
 */
function visualSelectionOffsets(element: HTMLElement, selection: Range, text: string): EditorSelection | null {
  if (element.textContent !== text || !element.contains(selection.startContainer)
    || !element.contains(selection.endContainer)) return null;
  const from = document.createRange();
  from.selectNodeContents(element);
  from.setEnd(selection.startContainer, selection.startOffset);
  const to = document.createRange();
  to.selectNodeContents(element);
  to.setEnd(selection.endContainer, selection.endOffset);
  return { start: from.toString().length, end: to.toString().length };
}

function sourceRange(node: VisualNode): EditorSelection | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start! <= end!
    ? { start: start!, end: end! }
    : null;
}

function VisualTextLeaf({
  text, range, raw, disabled, onTextEdit, onSelection, onInsertParagraph, onPasteTable, onReplaceRange, onPasteFallback,
}: {
  text: string;
  range: EditorSelection;
  raw: string;
  disabled: boolean;
  onTextEdit: VisualEditorProps["onTextEdit"];
  onSelection: VisualEditorProps["onSelection"];
  onInsertParagraph: VisualEditorProps["onInsertParagraph"];
  onPasteTable: VisualEditorProps["onPasteTable"];
  onReplaceRange: VisualEditorProps["onReplaceRange"];
  onPasteFallback: VisualEditorProps["onPasteFallback"];
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const forcePlainPasteRef = useRef(false);
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
    // Escaped Markdown does not have a one-to-one visual/source offset map.
    const offsets = raw === text && selection.rangeCount > 0
      ? visualSelectionOffsets(element, selection.getRangeAt(0), text) : null;
    onSelection(offsets ? { start: range.start + offsets.start, end: range.start + offsets.end } : null);
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
        if (event.key.toLowerCase() === "v" && (event.ctrlKey || event.metaKey) && event.shiftKey) {
          forcePlainPasteRef.current = true;
        }
        if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        onInsertParagraph(range.end);
      }}
      onPaste={(event) => {
        event.preventDefault();
        const plain = event.clipboardData.getData("text/plain");
        const forcePlain = forcePlainPasteRef.current;
        forcePlainPasteRef.current = false;
        const pastedText = plain.replace(/[\r\n]+/gu, " ");
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const active = selection.getRangeAt(0);
        if (!event.currentTarget.contains(active.commonAncestorContainer)) return;
        // A visual text position cannot be used as a source byte offset when
        // escape sequences or multiple DOM nodes make the mapping ambiguous.
        const offsets = raw === text ? visualSelectionOffsets(event.currentTarget, active, text) : null;
        if (!offsets) {
          onPasteFallback();
          return;
        }
        const selected = {
          start: range.start + offsets.start,
          end: range.start + offsets.end,
        };
        if (plain.includes("\t")) {
          onPasteTable(selected, plain);
          return;
        }
        const html = forcePlain ? "" : event.clipboardData.getData("text/html");
        if (html || plain.includes("\n") || plain.includes("\r")) {
          const converted = html ? clipboardHtmlToMarkdown(html) : null;
          if (converted !== null) onReplaceRange(selected, converted);
          else if (plain) onReplaceRange(selected, clipboardPlainToMarkdown(plain));
          // HTML-only unsupported clipboard entries must never erase a selection.
          if (html && converted === null) onPasteFallback();
          return;
        }
        active.deleteContents();
        const leaf = document.createTextNode(pastedText);
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
  node, markdown, disabled, baseOffset, ...actions
}: { node: VisualNode; markdown: string; disabled: boolean; baseOffset: number } & Pick<
VisualEditorProps, "onTextEdit" | "onSelection" | "onInsertParagraph" | "onEditTechnical" | "onReplaceRange" | "onTableDimension" | "onPasteTable" | "onPasteFallback"
>): ReactNode {
  const { t } = useTranslation("common");
  const children = node.children?.map((child, index) =>
    <VisualNodeView key={index} node={child} markdown={markdown} disabled={disabled} baseOffset={baseOffset} {...actions} />,
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
        range={{ start: range.start + baseOffset, end: range.end + baseOffset }} disabled={disabled} {...actions}
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

function VisualTable({
  table, offset, disabled, onReplaceRange, onTableDimension,
}: {
  table: MarkdownTable;
  offset: number;
  disabled: boolean;
  onReplaceRange: VisualEditorProps["onReplaceRange"];
  onTableDimension: VisualEditorProps["onTableDimension"];
}) {
  const { t } = useTranslation("common");
  const cells = (cell: MarkdownTable["headers"][number], key: number, heading: boolean) => {
    const value = cell.text.replace(/\\([|\\])/gu, "$1");
    const edit = <input
      aria-label={t(heading ? "editorTableHeader" : "editorTableCell")}
      dir="auto"
      disabled={disabled}
      value={value}
      onChange={(event) => onReplaceRange(
        { start: cell.span.start + offset, end: cell.span.end + offset },
        encodeTableCell(event.currentTarget.value),
      )}
    />;
    return heading ? <th key={key} scope="col">{edit}</th> : <td key={key}>{edit}</td>;
  };
  return <div className="markdown-editor-visual-table">
    <div className="forum-markdown-table-scroll" tabIndex={0}>
      <table className="forum-markdown-table">
        <thead><tr>{table.headers.map((cell, index) => cells(cell, index, true))}</tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={index}>
          {row.map((cell, column) => cells(cell, column, false))}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="markdown-editor-table-actions">
      <button type="button" disabled={disabled} onClick={() => onTableDimension({
        ...table, span: { start: table.span.start + offset, end: table.span.end + offset },
      }, "row")}>{t("editorAddTableRow")}</button>
      <button type="button" disabled={disabled} onClick={() => onTableDimension({
        ...table, span: { start: table.span.start + offset, end: table.span.end + offset },
      }, "column")}>{t("editorAddTableColumn")}</button>
    </div>
  </div>;
}

export function VisualMarkdownEditor(props: VisualEditorProps & { sourceBase?: number }) {
  const { markdown, disabled = false, sourceBase = 0, ...actions } = props;
  const { t } = useTranslation("common");
  const segments = segmentTechnicalMarkdown(markdown);
  return (
    <section className="markdown-editor-visual post-body" aria-label={t("editorVisualSurface")} data-authoring="simple">
      {segments.map((segment, index) => {
        if (segment.kind === "table") return <VisualTable key={index} table={segment}
          offset={sourceBase} disabled={disabled} onReplaceRange={actions.onReplaceRange}
          onTableDimension={actions.onTableDimension} />;
        if (segment.kind === "spoiler") return (
          <details className="forum-markdown-spoiler" key={index}>
            <summary>{segment.title || t("editorSpoiler")}</summary>
            <VisualMarkdownEditor markdown={segment.body} disabled={disabled}
              sourceBase={sourceBase + segment.bodyStart} {...actions} />
          </details>
        );
        if (segment.kind === "protected") return (
          <div key={index} className="markdown-editor-protected" data-visual-protected="table">
            <pre dir="ltr">{segment.source}</pre>
            <button type="button" disabled={disabled} onClick={actions.onEditTechnical}>
              {t("editorEditInMarkdown")}
            </button>
          </div>
        );
        const root = fromMarkdown(segment.source) as VisualNode;
        return root.children?.length
          ? <VisualNodeView key={index} node={root} markdown={segment.source}
              baseOffset={sourceBase + segment.span.start} disabled={disabled} {...actions} />
          : null;
      })}
      {(!markdown || markdown.endsWith("\n\n")) ? (
        <p><VisualTextLeaf text="" raw=""
          range={{ start: sourceBase + markdown.length, end: sourceBase + markdown.length }}
          disabled={disabled} onTextEdit={actions.onTextEdit}
          onSelection={actions.onSelection} onInsertParagraph={actions.onInsertParagraph}
          onPasteTable={actions.onPasteTable}
          onReplaceRange={actions.onReplaceRange} onPasteFallback={actions.onPasteFallback} /></p>
      ) : null}
    </section>
  );
}
