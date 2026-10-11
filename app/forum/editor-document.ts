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

interface FormattingDelimiter {
  depth: number;
  open: { start: number; end: number; text: string };
  close: { start: number; end: number; text: string };
}

interface MarkdownFormattingClearResult {
  markdown: string;
  selection: EditorSelection;
}

const CLEARABLE_INLINE_NODE_TYPES = new Set(["strong", "emphasis", "delete", "link"]);

function nodeRange(node: PositionedNode): EditorSelection | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start! <= end!
    ? { start: start!, end: end! }
    : null;
}

function inlineFormattingDelimiter(
  markdown: string,
  node: PositionedNode,
  depth: number,
): FormattingDelimiter | null {
  if (!CLEARABLE_INLINE_NODE_TYPES.has(node.type)) return null;
  const range = nodeRange(node);
  const children = (node.children ?? [])
    .map(nodeRange)
    .filter((item): item is EditorSelection => item !== null);
  if (!range || children.length === 0) return null;

  const contentStart = Math.min(...children.map((item) => item.start));
  const contentEnd = Math.max(...children.map((item) => item.end));
  if (contentStart <= range.start || contentEnd >= range.end) return null;

  const open = {
    start: range.start,
    end: contentStart,
    text: markdown.slice(range.start, contentStart),
  };
  const close = {
    start: contentEnd,
    end: range.end,
    text: markdown.slice(contentEnd, range.end),
  };
  if (!open.text || !close.text) return null;
  if (node.type === "link" && (open.text !== "[" || !close.text.startsWith("]("))) return null;
  return { depth, open, close };
}

function mergeDeletionRanges(ranges: EditorSelection[]): EditorSelection[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: EditorSelection[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    previous.end = Math.max(previous.end, range.end);
  }
  return merged;
}

/**
 * Remove supported inline text formatting from exactly the requested source range.
 * Structural Markdown and protected technical content stay intact. Formatting which
 * crosses a selection boundary is split so unselected text keeps its original style.
 */
export function clearInlineMarkdownFormatting(
  markdown: string,
  targetSelection: EditorSelection,
  selectionAfter: EditorSelection = targetSelection,
): MarkdownFormattingClearResult {
  const target = validSelection(targetSelection, markdown.length);
  const preserved = validSelection(selectionAfter, markdown.length);
  if (target.start === target.end || markdown.length === 0) {
    return { markdown, selection: preserved };
  }

  const root = parseForumMarkdown(markdown) as PositionedNode;
  const deletions: EditorSelection[] = [];
  const closeAtStart: Array<{ depth: number; text: string }> = [];
  const openAtEnd: Array<{ depth: number; text: string }> = [];

  function visit(node: PositionedNode, depth: number): void {
    const delimiter = inlineFormattingDelimiter(markdown, node, depth);
    if (delimiter) {
      const contentStart = delimiter.open.end;
      const contentEnd = delimiter.close.start;
      if (target.start < contentEnd && target.end > contentStart) {
        if (target.start <= contentStart) {
          deletions.push({ start: delimiter.open.start, end: delimiter.open.end });
        } else {
          closeAtStart.push({ depth, text: delimiter.close.text });
        }

        if (target.end >= contentEnd) {
          deletions.push({ start: delimiter.close.start, end: delimiter.close.end });
        } else {
          openAtEnd.push({ depth, text: delimiter.open.text });
        }
      }
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  }
  visit(root, 0);

  const mergedDeletions = mergeDeletionRanges(deletions);
  const insertions = new Map<number, string>();
  if (closeAtStart.length > 0) {
    insertions.set(
      target.start,
      closeAtStart
        .sort((left, right) => right.depth - left.depth)
        .map((item) => item.text)
        .join(""),
    );
  }
  if (openAtEnd.length > 0) {
    const opening = openAtEnd
      .sort((left, right) => left.depth - right.depth)
      .map((item) => item.text)
      .join("");
    insertions.set(target.end, (insertions.get(target.end) ?? "") + opening);
  }

  if (mergedDeletions.length === 0 && insertions.size === 0) {
    return { markdown, selection: preserved };
  }

  let next = "";
  let deletionIndex = 0;
  for (let index = 0; index <= markdown.length; index += 1) {
    next += insertions.get(index) ?? "";
    if (index === markdown.length) break;
    while (
      deletionIndex < mergedDeletions.length
      && mergedDeletions[deletionIndex]!.end <= index
    ) {
      deletionIndex += 1;
    }
    const deletion = mergedDeletions[deletionIndex];
    if (deletion && deletion.start <= index && index < deletion.end) continue;
    next += markdown[index]!;
  }

  function mapOffset(offset: number, includeInsertionAtBoundary: boolean): number {
    const bounded = Math.min(Math.max(Math.trunc(offset), 0), markdown.length);
    let mapped = bounded;
    for (const deletion of mergedDeletions) {
      if (deletion.end <= bounded) mapped -= deletion.end - deletion.start;
      else if (deletion.start < bounded) mapped -= bounded - deletion.start;
    }
    for (const [position, text] of insertions) {
      if (position < bounded || (includeInsertionAtBoundary && position === bounded)) {
        mapped += text.length;
      }
    }
    return mapped;
  }

  if (preserved.start === preserved.end) {
    const caret = mapOffset(preserved.start, true);
    return { markdown: next, selection: { start: caret, end: caret } };
  }
  return {
    markdown: next,
    selection: {
      start: mapOffset(preserved.start, true),
      end: mapOffset(preserved.end, false),
    },
  };
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
