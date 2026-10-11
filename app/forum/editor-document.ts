import { fromMarkdown } from "mdast-util-from-markdown";

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

/**
 * Return only leaf text spans which a future WYSIWYG surface can edit safely.
 * All Markdown punctuation, links, code, HTML, tables and unknown nodes remain
 * untouched. Unrecognized syntax is never reserialized or silently discarded.
 */
export function editableVisualTextRanges(markdown: string): EditorSelection[] {
  const root = fromMarkdown(markdown) as PositionedNode;
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
    // Only containers explicitly known to be plain/ordinary Markdown may be traversed.
    if (!new Set([
      "root", "paragraph", "heading", "emphasis", "strong", "blockquote",
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
): EditorHistory | null {
  const markdown = history.current.markdown;
  const { start, end } = range;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
    start < 0 || end < start || end > markdown.length) return null;
  if (markdown.length !== 0 && !editableVisualTextRanges(markdown)
    .some((span) => start >= span.start && end <= span.end)) return null;
  const next = markdown.slice(0, start) + replacement + markdown.slice(end);
  const cursor = start + replacement.length;
  return recordEditorEdit(history, next, range, { start: cursor, end: cursor });
}
