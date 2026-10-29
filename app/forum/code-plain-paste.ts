import { fromMarkdown, type Handle } from "mdast-util-from-markdown";
import { forumMarkdownFromOptions } from "../markdown-syntax";
import type { EditorSelection, EditorSnapshot } from "./editor-document";
import { inlineCodeAffixes } from "./inline-code";
import { parseRenderedForumMarkdown, type ForumSemanticNode } from "./semantic-markdown";
import { decodeTableCode, encodeTableCode } from "./table-code";
import { segmentTechnicalMarkdown } from "./technical-markdown";

type Node = ReturnType<typeof fromMarkdown>["children"][number];
type Span = { start: number; end: number };
type Part = Span & { value: string; eol?: boolean };
type CodeUnit = {
  node: Node & { value: string };
  parts: Part[];
  fences: Span[];
  source: string;
  base: number;
  table: boolean;
  listPrefixes: Span[];
  prefixes: Span[];
};
export type CodePasteResult = EditorSnapshot | { blocked: true } | null;

/** Physical code lines only: never normalize the rest of the authored document. */
function lines(value: string): Array<{ text: string; eol: string; start: number }> {
  const result: Array<{ text: string; eol: string; start: number }> = [];
  const re = /\r\n|\r|\n/gu;
  let start = 0;
  for (const match of value.matchAll(re)) {
    result.push({ text: value.slice(start, match.index), eol: match[0], start });
    start = match.index + match[0].length;
  }
  result.push({ text: value.slice(start), eol: "", start });
  return result;
}

/** Ask the actual parser for code data, padding and container boundaries.
 * The public enter/exit API buffers ordinary text nodes exactly as the default
 * code-data handler does. We don't introduce a second Markdown grammar.
 */
function codeUnits(source: string, base: number, table: boolean): CodeUnit[] {
  const data = new Map<object, { parts: Part[]; fences: Span[] }>();
  const listPrefixes: Span[] = [];
  const prefixes: Span[] = [];
  const capture: Handle = function (token) {
    let code: object | undefined;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const node = this.stack[i]!;
      if (node.type === "code" || node.type === "inlineCode") { code = node; break; }
    }
    const span = { start: token.start.offset, end: token.end.offset };
    if (token.type === "listItemPrefix") listPrefixes.push(span);
    if (["listItemPrefix", "listItemIndent", "blockQuotePrefix", "linePrefix"].includes(token.type)) {
      prefixes.push(span); return;
    }
    if (code) {
      let entry = data.get(code);
      if (!entry) { entry = { parts: [], fences: [] }; data.set(code, entry); }
      if (token.type === "codeFencedFenceSequence") entry.fences.push(span);
      else if (token.type === "lineEnding") {
        // Micromark can extend the token end through the next container prefix.
        const eol = /^(?:\r\n|\r|\n)/u.exec(source.slice(span.start))?.[0];
        if (eol) entry.parts.push({ start: span.start, end: span.start + eol.length, value: eol, eol: true });
      } else entry.parts.push({ ...span, value: this.sliceSerialize(token) });
    }
  };
  const enterData: Handle = function (token) {
    capture.call(this, token);
    this.enter({ type: "text", value: this.sliceSerialize(token) }, token);
  };
  const exitData: Handle = function (token) { this.exit(token); };
  const tree = fromMarkdown(source, { ...forumMarkdownFromOptions,
    mdastExtensions: [...(forumMarkdownFromOptions.mdastExtensions ?? []), {
      enter: { codeFlowValue: enterData, codeTextData: enterData,
        codeFencedFenceSequence: capture, lineEnding: capture, listItemPrefix: capture,
        listItemIndent: capture, blockQuotePrefix: capture, linePrefix: capture },
      exit: { codeFlowValue: exitData, codeTextData: exitData },
    }],
  });
  const result: CodeUnit[] = [];
  function visit(node: { type: string; children?: unknown[] }) {
    if (node.type === "code" || node.type === "inlineCode") {
      const entry = data.get(node) ?? { parts: [], fences: [] };
      const parts = [...entry.parts];
      if (node.type === "code") {
        if (entry.fences.length && parts[0]?.eol) parts.shift();
        if (parts.at(-1)?.eol) parts.pop();
      }
      result.push({ node: node as CodeUnit["node"], parts, fences: entry.fences,
        source, base, table, listPrefixes, prefixes });
    }
    node.children?.forEach((child) => visit(child as typeof node));
  }
  visit(tree);
  return result;
}

function locateUnits(markdown: string, base = 0): CodeUnit[] {
  const units: CodeUnit[] = [];
  for (const part of segmentTechnicalMarkdown(markdown)) {
    if (part.kind === "spoiler") units.push(...locateUnits(part.body, base + part.bodyStart));
    else if (part.kind === "table") {
      for (const row of [part.headers, ...part.rows]) {
        for (const cell of row) units.push(...codeUnits(cell.text, base + cell.span.start, true));
      }
    } else units.push(...codeUnits(part.source, base + part.span.start, false));
  }
  return units;
}

/** Offsets inside stripped padding/prefixes have a boundary projection, while
 * a partial CRLF or partially expanded tab has no exact content boundary.
 */
function logicalOffset(unit: CodeUnit, at: number): number | null {
  let offset = 0;
  for (const part of unit.parts) {
    if (at < part.start) return offset;
    const raw = unit.source.slice(part.start, part.end);
    const virtual = part.value.endsWith(raw) ? part.value.slice(0, part.value.length - raw.length) : "";
    const extra = /^ *$/u.test(virtual) ? virtual.length : 0;
    if (at === part.start) return offset + extra;
    if (at < part.end) {
      if (part.eol || (raw !== part.value && !extra)) return null;
      return offset + extra + at - part.start;
    }
    offset += part.value.length;
  }
  return offset;
}

function continuationPrefix(unit: CodeUnit, at: number, virtualSpaces = 0): string {
  const source = unit.source;
  const lineStart = Math.max(source.lastIndexOf("\n", at - 1), source.lastIndexOf("\r", at - 1)) + 1;
  let prefix = source.slice(lineStart, at);
  // First-line list markers become continuation indentation. Quotes and code
  // indentation remain exactly as identified by the parser's content boundary.
  for (const span of [...unit.listPrefixes].sort((a, b) => b.start - a.start)) {
    if (span.start < lineStart || span.end > at) continue;
    const continuation = source.slice(span.start, span.end).replace(/[^ \t]/gu, " ");
    prefix = prefix.slice(0, span.start - lineStart) + continuation + prefix.slice(span.end - lineStart);
  }
  if (virtualSpaces) {
    let columns = 0;
    prefix = [...prefix].map((char) => {
      const width = char === "\t" ? 4 - columns % 4 : 1;
      columns += width;
      return char === "\t" ? " ".repeat(width) : char;
    }).join("").slice(0, -virtualSpaces);
  }
  return prefix;
}

/** Compare renderer semantics, changing just the selected code value. This
 * guards container/technical boundaries as well as the payload, not only ticks.
 */
function semanticShape(tree: ForumSemanticNode, target: number, value: string): string {
  let ordinal = 0;
  function clean(node: ForumSemanticNode): unknown {
    const result: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(node)) {
      if (key === "position") continue;
      if (key === "children") result[key] = node.children?.map(clean);
      else result[key] = field;
    }
    if (node.type === "code" || node.type === "inlineCode") {
      if (ordinal++ === target) result.value = value;
    }
    return result;
  }
  return JSON.stringify(clean(tree));
}

/** null is genuinely not-code; blocked must never fall back to prose escaping. */
export function pastePlainTextIntoExistingCode(
  markdown: string, selection: EditorSelection, text: string,
): CodePasteResult {
  const blocked = { blocked: true } as const;
  if (!Number.isSafeInteger(selection.start) || !Number.isSafeInteger(selection.end)
    || selection.start < 0 || selection.end < selection.start || selection.end > markdown.length) return blocked;
  const units = locateUnits(markdown);
  const index = units.findIndex(({ node, base }) => {
    const start = base + node.position!.start.offset!, end = base + node.position!.end.offset!;
    if (node.type === "inlineCode" && selection.start === selection.end
      && (selection.start === start || selection.start === end)) return false;
    return start <= selection.start && selection.end <= end;
  });
  if (index < 0) {
    // A selection crossing code/prose or two code units is ambiguous, not prose.
    return units.some(({ node, base }) => selection.start < base + node.position!.end.offset!
      && selection.end > base + node.position!.start.offset!) ? blocked : null;
  }
  const unit = units[index]!;
  const start = selection.start - unit.base, end = selection.end - unit.base;
  const value = unit.parts.map((part) => part.value).join("");
  if (value !== unit.node.value) return blocked;
  let from = logicalOffset(unit, start), to = logicalOffset(unit, end);
  if (from === null || to === null) return blocked;
  let logical = value;
  if (unit.table) {
    // Decode prefix as well as whole value, retaining source→value projection.
    // Cutting an escape pair is ambiguous and cannot be silently repaired.
    if (decodeTableCode(value.slice(0, from)) + decodeTableCode(value.slice(from)) !== decodeTableCode(value)
      || decodeTableCode(value.slice(0, to)) + decodeTableCode(value.slice(to)) !== decodeTableCode(value)) return blocked;
    from = decodeTableCode(value.slice(0, from)).length;
    to = decodeTableCode(value.slice(0, to)).length;
    logical = decodeTableCode(value);
  }
  const expected = logical.slice(0, from) + text + logical.slice(to);
  const expectedShape = semanticShape(parseRenderedForumMarkdown(markdown), index, expected);
  const edits: Array<Span & { value: string }> = [];
  let caret: number;
  if (unit.node.type === "inlineCode") {
    const rawStart = unit.node.position!.start.offset!, rawEnd = unit.node.position!.end.offset!;
    const oldWidth = /^`+/u.exec(unit.source.slice(rawStart, rawEnd))![0].length;
    if (start < rawStart + oldWidth || end > rawEnd - oldWidth) return blocked;
    const encoded = unit.table ? encodeTableCode(expected) : expected;
    if (encoded === null || !expected.length) return blocked;
    const affixes = inlineCodeAffixes(encoded);
    const minimum = /^`+/u.exec(affixes.prefix)![0].length;
    let width = oldWidth;
    const runs = new Set([...encoded.matchAll(/`+/gu)].map((match) => match[0].length));
    while (runs.has(width)) width++;
    const padding = affixes.prefix.slice(minimum);
    let prefixEnd = Math.max(unit.source.lastIndexOf("\n", rawStart - 1), unit.source.lastIndexOf("\r", rawStart - 1)) + 1;
    for (const span of [...unit.prefixes].sort((a, b) => a.start - b.start)) {
      if (span.start === prefixEnd && span.end <= rawStart) prefixEnd = span.end;
    }
    const prefix = continuationPrefix(unit, prefixEnd);
    const body = lines(encoded).map((line, i) => (i ? prefix : "") + line.text + line.eol).join("");
    const replacement = "`".repeat(width) + padding + body + padding + "`".repeat(width);
    edits.push({ start: unit.base + rawStart, end: unit.base + rawEnd, value: replacement });
    const before = logical.slice(0, from) + text;
    const encodedBefore = unit.table ? encodeTableCode(before) : before;
    if (encodedBefore === null) return blocked;
    caret = unit.base + rawStart + width + padding.length + encodedBefore.length
      + (lines(encodedBefore).length - 1) * prefix.length;
  } else {
    const first = unit.parts[0], last = unit.parts.at(-1);
    // Opening/info/closing fence lines are not editable content. An empty fenced
    // block has a content boundary immediately after the opener's physical EOL.
    const opening = unit.fences[0];
    const openerLine = opening ? lines(unit.source.slice(opening.end))[0]! : null;
    let emptyStart = opening && openerLine ? opening.end + openerLine.text.length + openerLine.eol.length : -1;
    for (const span of [...unit.prefixes].sort((a, b) => a.start - b.start)) {
      if (span.start === emptyStart) emptyStart = span.end;
    }
    const contentStart = first?.start ?? emptyStart;
    const contentEnd = last?.end ?? contentStart;
    if (start < contentStart || end > contentEnd) return blocked;
    const dataLine = unit.parts.find((part) => !part.eol && part.start <= start && start <= part.end)
      ?? unit.parts.find((part) => !part.eol && part.start >= start);
    const prefixAt = opening?.start ?? dataLine?.start;
    if (prefixAt === undefined) return blocked;
    const rawData = dataLine && unit.source.slice(dataLine.start, dataLine.end);
    const virtualSpaces = !opening && dataLine && rawData && dataLine.value.endsWith(rawData)
      ? dataLine.value.length - rawData.length : 0;
    const prefix = continuationPrefix(unit, prefixAt, virtualSpaces);
    const inserted = lines(text).map((line, i) => (i ? prefix : "") + line.text + line.eol).join("");
    edits.push({ ...selection, value: inserted });
    caret = selection.start + inserted.length;
    if (opening) {
      const marker = unit.source[opening.start]!;
      const width = opening.end - opening.start;
      let hazard = 0;
      for (const line of lines(expected)) {
        const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/u.exec(line.text);
        if (match?.[1]?.[0] === marker && match[1].length >= width) hazard = Math.max(hazard, match[1].length);
      }
      const unchangedFenceCandidate = markdown.slice(0, selection.start) + inserted + markdown.slice(selection.end);
      if (hazard && expectedShape !== semanticShape(parseRenderedForumMarkdown(unchangedFenceCandidate), -1, "")) {
        const newWidth = Math.max(hazard + 1, ...unit.fences.map((span) => span.end - span.start));
        for (const span of unit.fences) edits.push({ start: unit.base + span.start, end: unit.base + span.end,
          value: marker.repeat(newWidth) });
        caret += newWidth - width;
      }
    }
  }
  let next = markdown;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, edit.start) + edit.value + next.slice(edit.end);
  }
  if (expectedShape !== semanticShape(parseRenderedForumMarkdown(next), -1, "")) return blocked;
  return { markdown: next, selection: { start: caret, end: caret } };
}
