import { parseForumMarkdown } from "../markdown-syntax";

/**
 * The exact Markdown string is authoritative. Parsed nodes are only a read-only
 * guide for visual edits; serializing the tree would normalize untouched input.
 */
export interface EditorSelection {
  start: number;
  end: number;
}

export interface EditorSnapshot {
  markdown: string;
  selection: EditorSelection;
}

export interface EditorHistory {
  current: EditorSnapshot;
  past: EditorSnapshot[];
  future: EditorSnapshot[];
}

const MAX_UNDO_STEPS = 100;

type PositionedNode = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: PositionedNode[];
};

function validSelection(selection: EditorSelection, length: number): EditorSelection {
  const start = Math.min(Math.max(Math.trunc(selection.start), 0), length);
  const end = Math.min(Math.max(Math.trunc(selection.end), start), length);
  return { start, end };
}

export function textareaMarkdown(markdown: string): string {
  return markdown.replace(/\r\n?|\n/gu, "\n");
}

export function textareaOffsetToSourceOffset(markdown: string, offset: number): number {
  const target = Math.min(Math.max(Math.trunc(offset), 0), textareaMarkdown(markdown).length);
  let source = 0;
  let visible = 0;
  while (source < markdown.length && visible < target) {
    if (markdown[source] === "\r" && markdown[source + 1] === "\n") source += 2;
    else source += 1;
    visible += 1;
  }
  return source;
}

export function sourceOffsetToTextareaOffset(markdown: string, offset: number): number {
  const target = Math.min(Math.max(Math.trunc(offset), 0), markdown.length);
  let source = 0;
  let visible = 0;
  while (source < target) {
    if (markdown[source] === "\r" && markdown[source + 1] === "\n") {
      if (source + 1 >= target) break;
      source += 2;
    } else {
      source += 1;
    }
    visible += 1;
  }
  return visible;
}

/**
 * Textarea DOM values normalize line endings to LF. Apply only the edited
 * normalized span back to the exact source so untouched CRLF/CR fragments stay byte-identical.
 */
export function applyTextareaEdit(markdown: string, nextTextareaValue: string): string {
  const previous = textareaMarkdown(markdown);
  if (previous === nextTextareaValue) return markdown;

  let prefix = 0;
  while (
    prefix < previous.length
    && prefix < nextTextareaValue.length
    && previous[prefix] === nextTextareaValue[prefix]
  ) prefix += 1;

  let suffix = 0;
  while (
    suffix < previous.length - prefix
    && suffix < nextTextareaValue.length - prefix
    && previous[previous.length - 1 - suffix] === nextTextareaValue[nextTextareaValue.length - 1 - suffix]
  ) suffix += 1;

  const sourceStart = textareaOffsetToSourceOffset(markdown, prefix);
  const sourceEnd = textareaOffsetToSourceOffset(markdown, previous.length - suffix);
  const inserted = nextTextareaValue.slice(prefix, nextTextareaValue.length - suffix);
  return markdown.slice(0, sourceStart) + inserted + markdown.slice(sourceEnd);
}

export function createEditorHistory(markdown = ""): EditorHistory {
  return { current: { markdown, selection: { start: 0, end: 0 } }, past: [], future: [] };
}

export function rememberEditorSelection(
  history: EditorHistory,
  selection: EditorSelection,
): EditorHistory {
  return {
    ...history,
    current: { ...history.current, selection: validSelection(selection, history.current.markdown.length) },
  };
}

/** Only an explicit edit records a change; changing editor/view modes does not. */
export function recordEditorEdit(
  history: EditorHistory,
  markdown: string,
  before: EditorSelection,
  after: EditorSelection,
): EditorHistory {
  const previous = {
    markdown: history.current.markdown,
    selection: validSelection(before, history.current.markdown.length),
  };
  if (markdown === previous.markdown) {
    return rememberEditorSelection(history, after);
  }
  return {
    current: { markdown, selection: validSelection(after, markdown.length) },
    past: [...history.past.slice(-(MAX_UNDO_STEPS - 1)), previous],
    future: [],
  };
}

export function undoEditorEdit(history: EditorHistory): EditorHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1]!;
  return {
    current: previous,
    past: history.past.slice(0, -1),
    future: [...history.future, history.current],
  };
}

export function redoEditorEdit(history: EditorHistory): EditorHistory {
  if (history.future.length === 0) return history;
  const next = history.future[history.future.length - 1]!;
  return {
    current: next,
    past: [...history.past.slice(-(MAX_UNDO_STEPS - 1)), history.current],
    future: history.future.slice(0, -1),
  };
}

function codeNodeContentRange(markdown: string, node: PositionedNode): EditorSelection | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start! >= end!) return null;

  const raw = markdown.slice(start!, end!);
  const openingBreak = raw.search(/[\r\n]/u);
  if (openingBreak < 0) return { start: start!, end: end! };

  const openingLine = raw.slice(0, openingBreak);
  const openingFence = /^ {0,3}(`{3,}|~{3,})/u.exec(openingLine);
  if (!openingFence) return { start: start!, end: end! };

  const breakLength = raw[openingBreak] === "\r" && raw[openingBreak + 1] === "\n" ? 2 : 1;
  const contentStart = start! + openingBreak + breakLength;

  let effectiveEnd = raw.length;
  while (effectiveEnd > 0 && (raw[effectiveEnd - 1] === "\n" || raw[effectiveEnd - 1] === "\r")) {
    effectiveEnd -= 1;
  }
  const lastLf = raw.lastIndexOf("\n", effectiveEnd - 1);
  const lastCr = raw.lastIndexOf("\r", effectiveEnd - 1);
  const closingStart = Math.max(lastLf, lastCr) + 1;
  const closingLine = raw.slice(closingStart, effectiveEnd);
  const fence = openingFence[1]!;
  const fenceMarker = fence[0]!;
  const closingFence = new RegExp(
    "^ {0,3}" + fenceMarker + "{" + fence.length + ",}[\\t ]*$",
    "u",
  );
  const contentEnd = closingFence.test(closingLine) ? start! + closingStart : end!;

  return contentStart <= contentEnd ? { start: contentStart, end: contentEnd } : null;
}

/**
 * Return source ranges where code-only keyboard editing is allowed.
 * Fenced opening/info and closing fence lines are deliberately excluded.
 */
export function editableCodeRanges(markdown: string): EditorSelection[] {
  const root = parseForumMarkdown(markdown) as PositionedNode;
  const ranges: EditorSelection[] = [];

  function visit(node: PositionedNode): void {
    if (node.type === "code") {
      const range = codeNodeContentRange(markdown, node);
      if (range) ranges.push(range);
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return ranges;
}

/**
 * Return only leaf text spans which a future WYSIWYG surface can edit safely.
 * All Markdown punctuation, links, code, HTML, tables and unknown nodes remain
 * untouched. Unrecognized syntax is never reserialized or silently discarded.
 */
export function editableVisualTextRanges(markdown: string): EditorSelection[] {
  const root = parseForumMarkdown(markdown) as PositionedNode;
  const ranges: EditorSelection[] = [];
  function visit(node: PositionedNode): void {
    if (node.type === "text") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined && start < end) {
        ranges.push({ start, end });
      }
      return;
    }
    // Link labels are editable only for explicit [label](target) links.
    if (node.type === "link") {
      const start = node.position?.start.offset;
      if (start !== undefined && markdown[start] === "[") {
        for (const child of node.children ?? []) visit(child);
      }
      return;
    }
    // Only containers explicitly known to be plain/ordinary Markdown may be traversed.
    if (!new Set([
      "root", "paragraph", "heading", "emphasis", "strong", "delete", "blockquote",
      "list", "listItem",
    ]).has(node.type)) return;
    for (const child of node.children ?? []) visit(child);
  }
  visit(root);
  return ranges;
}

/**
 * A visual text edit is permitted only inside a single parsed text leaf.
 * null means the visual surface must offer switching to Markdown mode instead.
 */
export function editVisualText(
  history: EditorHistory,
  range: EditorSelection,
  replacement: string,
  selectionAfter?: EditorSelection,
): EditorHistory | null {
  const markdown = history.current.markdown;
  const { start, end } = range;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
    start < 0 || end < start || end > markdown.length) return null;
  if (markdown.length !== 0 && !(start === markdown.length && end === start && markdown.endsWith("\n\n")) && !editableVisualTextRanges(markdown)
    .some((span) => start >= span.start && end <= span.end)) return null;
  const next = markdown.slice(0, start) + replacement + markdown.slice(end);
  const cursor = start + replacement.length;
  const before = history.current.selection.start >= start && history.current.selection.end <= end
    ? history.current.selection
    : range;
  return recordEditorEdit(
    history,
    next,
    before,
    selectionAfter ?? { start: cursor, end: cursor },
  );
}
