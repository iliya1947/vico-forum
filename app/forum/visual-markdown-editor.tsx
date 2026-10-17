import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { parseForumMarkdown } from "../markdown-syntax";
import { useTranslation } from "react-i18next";
import type { EditorSelection } from "./editor-document";
import { ForumMarkdown, ForumInlineImage } from "./markdown";
import { segmentTechnicalMarkdown, encodeTableCell, type MarkdownTable } from "./technical-markdown";
import { clipboardHtmlToMarkdown, clipboardPlainToMarkdown } from "./clipboard-markdown";

const visualSpellcheckContext = createContext(true);

interface VisualNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
  children?: VisualNode[];
  data?: { hProperties?: { dir?: "ltr" | "rtl" } };
  position?: { start: { offset?: number }; end: { offset?: number } };
}

interface VisualEditorProps {
  markdown: string;
  disabled?: boolean;
  onTextEdit(
    range: EditorSelection,
    value: string,
    selectionAfter?: EditorSelection,
    saveLocal?: boolean,
  ): void;
  onSelection(selection: EditorSelection | null): void;
  onInsertParagraph(selection: EditorSelection): void;
  onEditTechnical(range?: EditorSelection): void;
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

const ASCII_PUNCTUATION = new Set([..."!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"]);

function decodedReference(source: string): string | null {
  if (!source.startsWith("&") || !source.endsWith(";") || typeof document === "undefined") return null;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = source;
  const decoded = textarea.value;
  return decoded !== source ? decoded : null;
}

function sourceVisualBoundaries(raw: string, text: string): Array<number | null> | null {
  const boundaries: Array<number | null> = Array(text.length + 1).fill(null);
  boundaries[0] = 0;
  let source = 0;
  let visual = 0;

  while (source < raw.length && visual < text.length) {
    if (raw[source] === "\r" && text[visual] === "\n") {
      source += raw[source + 1] === "\n" ? 2 : 1;
      visual += 1;
      boundaries[visual] = source;
      continue;
    }

    if (raw[source] === "\\" && source + 1 < raw.length
      && ASCII_PUNCTUATION.has(raw[source + 1]!)
      && text[visual] === raw[source + 1]) {
      source += 2;
      visual += 1;
      boundaries[visual] = source;
      continue;
    }

    if (raw[source] === "&") {
      const semicolon = raw.indexOf(";", source + 1);
      if (semicolon > source && semicolon - source <= 32) {
        const encoded = raw.slice(source, semicolon + 1);
        const decoded = decodedReference(encoded);
        if (decoded && text.startsWith(decoded, visual)) {
          source = semicolon + 1;
          visual += decoded.length;
          boundaries[visual] = source;
          continue;
        }
      }
    }

    if (raw[source] !== text[visual]) return null;
    source += 1;
    visual += 1;
    boundaries[visual] = source;
  }

  return source === raw.length && visual === text.length ? boundaries : null;
}

export function visualOffsetToSourceOffset(raw: string, text: string, visualOffset: number): number | null {
  if (!Number.isSafeInteger(visualOffset) || visualOffset < 0 || visualOffset > text.length) return null;
  if (raw === text) return visualOffset;
  return sourceVisualBoundaries(raw, text)?.[visualOffset] ?? null;
}

export function sourceOffsetToVisualOffset(raw: string, text: string, sourceOffset: number): number | null {
  if (!Number.isSafeInteger(sourceOffset) || sourceOffset < 0 || sourceOffset > raw.length) return null;
  if (raw === text) return sourceOffset;
  const boundaries = sourceVisualBoundaries(raw, text);
  if (!boundaries) return null;
  const visual = boundaries.findIndex((offset) => offset === sourceOffset);
  return visual >= 0 ? visual : null;
}

function leafForDomPoint(root: HTMLElement, node: Node): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  const leaf = element?.closest<HTMLElement>('[data-visual-text="true"]') ?? null;
  return leaf && root.contains(leaf) ? leaf : null;
}

function domOffsetWithinLeaf(leaf: HTMLElement, node: Node, offset: number): number | null {
  if (!leaf.contains(node) && leaf !== node) return null;
  const range = document.createRange();
  range.selectNodeContents(leaf);
  try {
    range.setEnd(node, offset);
  } catch {
    return null;
  }
  return range.toString().length;
}

function sourcePointForDomPoint(
  root: HTMLElement,
  markdown: string,
  sourceBase: number,
  node: Node,
  offset: number,
): number | null {
  const leaf = leafForDomPoint(root, node);
  if (!leaf) return null;
  const start = Number(leaf.dataset.sourceStart);
  const end = Number(leaf.dataset.sourceEnd);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return null;
  const localStart = start - sourceBase;
  const localEnd = end - sourceBase;
  if (localStart < 0 || localEnd > markdown.length) return null;
  const raw = markdown.slice(localStart, localEnd);
  const text = leaf.textContent ?? "";
  const visualOffset = domOffsetWithinLeaf(leaf, node, offset);
  if (visualOffset === null) return null;
  const relative = visualOffsetToSourceOffset(raw, text, visualOffset);
  return relative === null ? null : start + relative;
}

export function visualDomSelection(
  root: HTMLElement,
  markdown: string,
  sourceBase = 0,
): EditorSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const fragment = range.cloneContents();
  if (fragment.querySelector?.('[data-visual-protected]')) return null;
  let start = sourcePointForDomPoint(root, markdown, sourceBase, range.startContainer, range.startOffset);
  let end = sourcePointForDomPoint(root, markdown, sourceBase, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;

  for (const inline of root.querySelectorAll<HTMLElement>("[data-source-inline=true]")) {
    const sourceStart = Number(inline.dataset.sourceStart);
    const sourceEnd = Number(inline.dataset.sourceEnd);
    if (!Number.isSafeInteger(sourceStart) || !Number.isSafeInteger(sourceEnd)) continue;
    const leaves = [...inline.querySelectorAll<HTMLElement>('[data-visual-text="true"]')];
    const visibleStarts = leaves.map((leaf) => Number(leaf.dataset.sourceStart)).filter(Number.isSafeInteger);
    const visibleEnds = leaves.map((leaf) => Number(leaf.dataset.sourceEnd)).filter(Number.isSafeInteger);
    if (visibleStarts.length === 0 || visibleEnds.length === 0) continue;
    const visibleStart = Math.min(...visibleStarts);
    const visibleEnd = Math.max(...visibleEnds);
    if (start <= visibleStart && end >= visibleEnd) {
      start = Math.min(start, sourceStart);
      end = Math.max(end, sourceEnd);
    }
  }
  return { start, end };
}

function domPointAtTextOffset(leaf: HTMLElement, target: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(leaf, NodeFilter.SHOW_TEXT);
  let remaining = target;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  return target === 0 ? { node: leaf, offset: 0 } : null;
}

function leafForSourceOffset(root: HTMLElement, offset: number, preferEnd: boolean): HTMLElement | null {
  const leaves = [...root.querySelectorAll<HTMLElement>('[data-visual-text="true"]')];
  const candidates = leaves.filter((leaf) => {
    const start = Number(leaf.dataset.sourceStart);
    const end = Number(leaf.dataset.sourceEnd);
    return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= offset && offset <= end;
  });
  if (candidates.length === 0) return null;
  return preferEnd ? candidates[candidates.length - 1]! : candidates[0]!;
}

export function restoreVisualDomSelection(
  root: HTMLElement,
  markdown: string,
  selection: EditorSelection,
): boolean {
  const startLeaf = leafForSourceOffset(root, selection.start, false);
  const endLeaf = leafForSourceOffset(root, selection.end, true);
  if (!startLeaf || !endLeaf) return false;

  const point = (leaf: HTMLElement, sourceOffset: number) => {
    const start = Number(leaf.dataset.sourceStart);
    const end = Number(leaf.dataset.sourceEnd);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    const raw = markdown.slice(start, end);
    const text = leaf.textContent ?? "";
    const visual = sourceOffsetToVisualOffset(raw, text, sourceOffset - start);
    return visual === null ? null : domPointAtTextOffset(leaf, visual);
  };
  const start = point(startLeaf, selection.start);
  const end = point(endLeaf, selection.end);
  if (!start || !end) return false;

  const domRange = document.createRange();
  domRange.setStart(start.node, start.offset);
  domRange.setEnd(end.node, end.offset);
  if (domRange.cloneContents().querySelector("[data-visual-protected]")) return false;

  startLeaf.focus();
  const domSelection = window.getSelection();
  if (!domSelection
    || typeof domSelection.removeAllRanges !== "function"
    || typeof domSelection.addRange !== "function") {
    return document.activeElement === startLeaf;
  }
  domSelection.removeAllRanges();
  domSelection.addRange(domRange);
  return true;
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
  const spellCheck = useContext(visualSpellcheckContext);
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
    if (!element || !selection || selection.rangeCount === 0) {
      onSelection(null);
      return;
    }
    const offsets = visualSelectionOffsets(element, selection.getRangeAt(0), element.textContent ?? "");
    if (!offsets) {
      onSelection(null);
      return;
    }
    const currentText = element.textContent ?? "";
    const start = visualOffsetToSourceOffset(raw, currentText, offsets.start);
    const end = visualOffsetToSourceOffset(raw, currentText, offsets.end);
    onSelection(start === null || end === null ? null : {
      start: range.start + start,
      end: range.start + end,
    });
  };

  return (
    <span
      ref={ref}
      contentEditable={!disabled}
      role="textbox"
      aria-multiline="false"
      suppressContentEditableWarning
      spellCheck={spellCheck}
      data-visual-text="true"
      data-source-start={range.start}
      data-source-end={range.end}
      onBeforeInput={reportSelection}
      onInput={(event) => {
        const next = (event.currentTarget.textContent ?? "").replace(/[\r\n]+/gu, " ");
        const selection = window.getSelection();
        const domRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const offsets = domRange ? visualSelectionOffsets(event.currentTarget, domRange, event.currentTarget.textContent ?? "") : null;
        const escaped = escapeVisualMarkdownText(next);
        const afterStart = offsets ? visualOffsetToSourceOffset(escaped, next, offsets.start) : null;
        const afterEnd = offsets ? visualOffsetToSourceOffset(escaped, next, offsets.end) : null;
        onTextEdit(range, next, afterStart === null || afterEnd === null ? undefined : {
          start: range.start + afterStart,
          end: range.start + afterEnd,
        }, (event.nativeEvent as InputEvent).data === " ");
      }}
      onSelect={reportSelection}
      onKeyUp={reportSelection}
      onMouseUp={reportSelection}
      onFocus={reportSelection}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey) return;
        const selection = window.getSelection();
        const active = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const currentText = event.currentTarget.textContent ?? "";
        const offsets = active ? visualSelectionOffsets(event.currentTarget, active, currentText) : null;
        const sourceStart = offsets ? visualOffsetToSourceOffset(raw, currentText, offsets.start) : null;
        const sourceEnd = offsets ? visualOffsetToSourceOffset(raw, currentText, offsets.end) : null;
        event.preventDefault();
        onInsertParagraph(sourceStart === null || sourceEnd === null
          ? { start: range.end, end: range.end }
          : { start: range.start + sourceStart, end: range.start + sourceEnd });
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
    case "paragraph": return <p dir={node.data?.hProperties?.dir ?? "auto"}>{children}</p>;
    case "heading": {
      const level = node.depth === 1 ? "h1" : node.depth === 3 ? "h3" : node.depth === 4 ? "h4" : node.depth === 5 ? "h5" : node.depth === 6 ? "h6" : "h2";
      if (level === "h1") return <h1 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h1>;
      if (level === "h3") return <h3 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h3>;
      if (level === "h4") return <h4 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h4>;
      if (level === "h5") return <h5 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h5>;
      if (level === "h6") return <h6 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h6>;
      return <h2 dir={node.data?.hProperties?.dir ?? "auto"}>{children}</h2>;
    }
    case "strong": {
      const range = sourceRange(node);
      return <strong
        data-source-inline="true"
        data-source-start={range ? range.start + baseOffset : undefined}
        data-source-end={range ? range.end + baseOffset : undefined}
      >{children}</strong>;
    }
    case "emphasis": {
      const range = sourceRange(node);
      return <em
        data-source-inline="true"
        data-source-start={range ? range.start + baseOffset : undefined}
        data-source-end={range ? range.end + baseOffset : undefined}
      >{children}</em>;
    }
    case "delete": {
      const range = sourceRange(node);
      return <del
        data-source-inline="true"
        data-source-start={range ? range.start + baseOffset : undefined}
        data-source-end={range ? range.end + baseOffset : undefined}
      >{children}</del>;
    }
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "list": return node.ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
    case "listItem": return <li dir={node.data?.hProperties?.dir ?? "auto"}>{children}</li>;
    case "thematicBreak": return <hr />;
    case "break": return <br />;
    case "link": {
      const range = sourceRange(node);
      if (range && markdown[range.start] === "[") return (
        <span className="markdown-editor-protected" data-visual-protected="link-target">
          <span className="markdown-editor-visual-link">{children}</span>
          <button type="button" disabled={disabled} onClick={() => actions.onEditTechnical()}>
            {t("editorEditInMarkdown")}
          </button>
        </span>
      );
      return <span className="markdown-editor-protected" data-visual-protected="link">
        <code>{node.children?.map((child) => child.value ?? "").join("") ?? ""}</code>
        <button type="button" disabled={disabled} onClick={() => actions.onEditTechnical()}>{t("editorEditInMarkdown")}</button>
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
      if (node.type === "image" && node.url?.startsWith("vico-attachment:")) {
        const imageRange = sourceRange(node);
        return <span className="markdown-editor-protected" data-visual-protected="image">
          <ForumInlineImage src={node.url} />
          <button type="button" disabled={disabled}
            onClick={() => actions.onEditTechnical(
              imageRange ? {
                start: imageRange.start + baseOffset,
                end: imageRange.end + baseOffset,
              } : undefined,
            )}>{t("editorEditInMarkdown")}</button>
        </span>;
      }
      const range = sourceRange(node);
      const source = range ? markdown.slice(range.start, range.end) : node.value ?? "";
      const label = node.type === "link" || node.type === "linkReference"
        ? (node.children ?? []).map((item) => item.value ?? "").join("") || source
        : node.type === "image" ? node.alt ?? source
        : node.type === "inlineCode" ? node.value ?? source : source;
      if (node.type === "code") return (
        <div className="markdown-editor-protected" data-visual-protected={node.type}>
          <ForumMarkdown>{source}</ForumMarkdown>
          <button
            type="button"
            disabled={disabled}
            onClick={() => actions.onEditTechnical(
              range
                ? { start: range.start + baseOffset, end: range.end + baseOffset }
                : undefined,
            )}
          >
            {t("editorEditInMarkdown")}
          </button>
        </div>
      );
      return (
        <span className="markdown-editor-protected" data-visual-protected={node.type}>
          <code dir={node.type === "inlineCode" ? "ltr" : undefined}>{label}</code>
          <button type="button" disabled={disabled} onClick={() => actions.onEditTechnical()}>
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

export function VisualMarkdownEditor(props: VisualEditorProps & { sourceBase?: number; spellCheck?: boolean }) {
  const { markdown, disabled = false, sourceBase = 0, spellCheck, ...actions } = props;
  const { t } = useTranslation("common");
  const inheritedSpellCheck = useContext(visualSpellcheckContext);
  const forcePlainPasteRef = useRef(false);
  const segments = segmentTechnicalMarkdown(markdown);
  const reportSurfaceSelection = (root: HTMLElement) => {
    actions.onSelection(visualDomSelection(root, markdown, sourceBase));
  };
  return (
    <visualSpellcheckContext.Provider value={spellCheck ?? inheritedSpellCheck}>
    <section className="markdown-editor-visual post-body" aria-label={t("editorVisualSurface")} data-authoring="simple"
      onKeyDownCapture={(event) => {
        if (!(event.target instanceof Element)
          || event.target.closest(".markdown-editor-visual") !== event.currentTarget) return;
        if (event.key.toLowerCase() === "v" && (event.ctrlKey || event.metaKey) && event.shiftKey) {
          forcePlainPasteRef.current = true;
        }
      }}
      onKeyUpCapture={(event) => {
        if (event.key.toLowerCase() === "v") forcePlainPasteRef.current = false;
      }}
      onPaste={(event) => {
        const plain = event.clipboardData.getData("text/plain");
        const html = event.clipboardData.getData("text/html");
        if (!plain && !html) return;
        const selected = visualDomSelection(event.currentTarget, markdown, sourceBase);
        event.preventDefault();
        event.stopPropagation();
        const forcePlain = forcePlainPasteRef.current;
        forcePlainPasteRef.current = false;
        if (!selected) {
          actions.onPasteFallback();
          return;
        }
        if (forcePlain) {
          actions.onReplaceRange(selected, clipboardPlainToMarkdown(plain));
          return;
        }
        if (plain.includes("\t")) {
          actions.onPasteTable(selected, plain);
          return;
        }
        if (html || plain.includes("\n") || plain.includes("\r")) {
          const converted = html ? clipboardHtmlToMarkdown(html) : null;
          if (converted !== null) actions.onReplaceRange(selected, converted);
          else if (plain) actions.onReplaceRange(selected, clipboardPlainToMarkdown(plain));
          if (html && converted === null) actions.onPasteFallback();
          return;
        }
        actions.onReplaceRange(selected, clipboardPlainToMarkdown(plain));
      }}
      onSelect={(event) => reportSurfaceSelection(event.currentTarget)}
      onMouseUp={(event) => reportSurfaceSelection(event.currentTarget)}
      onKeyUp={(event) => reportSurfaceSelection(event.currentTarget)}
      onFocusCapture={(event) => reportSurfaceSelection(event.currentTarget)}>
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
            <button type="button" disabled={disabled} onClick={() => actions.onEditTechnical()}>
              {t("editorEditInMarkdown")}
            </button>
          </div>
        );
        const root = parseForumMarkdown(segment.source) as VisualNode;
        return root.children?.length
          ? <VisualNodeView key={index} node={root} markdown={segment.source}
              baseOffset={sourceBase + segment.span.start} disabled={disabled} {...actions} />
          : null;
      })}
      {(!markdown || markdown.endsWith("\n\n")) ? (
        <p dir="auto"><VisualTextLeaf text="" raw=""
          range={{ start: sourceBase + markdown.length, end: sourceBase + markdown.length }}
          disabled={disabled} onTextEdit={actions.onTextEdit}
          onSelection={actions.onSelection} onInsertParagraph={actions.onInsertParagraph} /></p>
      ) : null}
    </section>
    </visualSpellcheckContext.Provider>
  );
}
