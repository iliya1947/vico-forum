export interface SourceSpan { start: number; end: number }
export interface TableCell { text: string; span: SourceSpan }
export interface MarkdownTable {
  kind: "table";
  span: SourceSpan;
  headers: TableCell[];
  align: ("left" | "center" | "right" | null)[];
  rows: TableCell[][];
}
export interface MarkdownSpoiler {
  kind: "spoiler";
  span: SourceSpan;
  title: string;
  body: string;
  bodyStart: number;
}
export interface MarkdownProtected {
  kind: "protected";
  span: SourceSpan;
  source: string;
}
export interface MarkdownProse {
  kind: "prose";
  span: SourceSpan;
  source: string;
}
export type TechnicalSegment = MarkdownTable | MarkdownSpoiler | MarkdownProse | MarkdownProtected;

interface Line { text: string; start: number; end: number }

function linesOf(source: string): Line[] {
  const result: Line[] = [];
  let start = 0;
  while (start < source.length) {
    const newline = source.indexOf("\n", start);
    const end = newline < 0 ? source.length : newline + 1;
    result.push({ text: source.slice(start, end).replace(/\r?\n$/u, ""), start, end });
    start = end;
  }
  return result;
}

function splitCells(line: Line): TableCell[] | null {
  const source = line.text;
  if (!source.includes("|")) return null;
  const raw: SourceSpan[] = [];
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== "|") continue;
    let escapes = 0;
    for (let k = i - 1; k >= 0 && source[k] === "\\"; k--) escapes++;
    if (escapes % 2) continue;
    raw.push({ start, end: i });
    start = i + 1;
  }
  raw.push({ start, end: source.length });
  if (source.trimStart().startsWith("|")) raw.shift();
  if (source.trimEnd().endsWith("|")) raw.pop();
  if (raw.length < 1 || raw.length > 40) return null;
  return raw.map((span) => {
    const part = source.slice(span.start, span.end);
    const before = part.length - part.trimStart().length;
    const after = part.length - part.trimEnd().length;
    const from = span.start + before;
    const to = Math.max(from, span.end - after);
    return {
      text: source.slice(from, to),
      span: { start: line.start + from, end: line.start + to },
    };
  });
}

function tableAt(lines: Line[], index: number): { table: MarkdownTable; next: number } | null {
  if (index + 1 >= lines.length) return null;
  const header = splitCells(lines[index]!);
  const separator = splitCells(lines[index + 1]!);
  if (!header || !separator || header.length !== separator.length) return null;
  if (!separator.every((cell) => /^:?-{3,}:?$/u.test(cell.text))) return null;
  const align = separator.map((cell) => cell.text.startsWith(":")
    ? cell.text.endsWith(":") ? "center" as const : "left" as const
    : cell.text.endsWith(":") ? "right" as const : null);
  const rows: TableCell[][] = [];
  let next = index + 2;
  while (next < lines.length && rows.length < 200) {
    const candidate = lines[next]!;
    if (candidate.text.trim() === "" || /^\s*[:]{3}/u.test(candidate.text)) break;
    const cells = splitCells(candidate);
    if (!cells || cells.length !== header.length) {
      if (candidate.text.includes("|")) return null; // complex shape remains protected
      break;
    }
    rows.push(cells);
    next++;
  }
  return {
    table: {
      kind: "table",
      span: { start: lines[index]!.start, end: lines[next - 1]!.end },
      headers: header,
      align,
      rows,
    },
    next,
  };
}

function protectedTableAt(lines: Line[], index: number, source: string):
  { block: MarkdownProtected; next: number } | null {
  const header = lines[index]?.text ?? "";
  const separator = lines[index + 1]?.text ?? "";
  if (!header.includes("|") || !separator.includes("|")
    || !/^-?[ |:\t-]*-{3,}[ |:\t-]*$/u.test(separator.trim())) return null;
  let next = index + 2;
  while (next < lines.length && lines[next]!.text.trim() && lines[next]!.text.includes("|")) next++;
  return {
    block: { kind: "protected",
      span: { start: lines[index]!.start, end: lines[next - 1]!.end },
      source: source.slice(lines[index]!.start, lines[next - 1]!.end) },
    next,
  };
}

function spoilerAt(lines: Line[], index: number, source: string): { spoiler: MarkdownSpoiler; next: number } | null {
  const open = /^:::spoiler(?:[ \t]+([^\r\n]*?))?[ \t]*$/u.exec(lines[index]!.text);
  if (!open) return null;
  let next = index + 1;
  while (next < lines.length && !/^:::[ \t]*$/u.test(lines[next]!.text)) next++;
  if (next === lines.length) return null; // unclosed marker remains literal Markdown
  return {
    spoiler: {
      kind: "spoiler",
      span: { start: lines[index]!.start, end: lines[next]!.end },
      title: open[1] ?? "",
      bodyStart: lines[index]!.end,
      body: source.slice(lines[index]!.end, lines[next]!.start),
    },
    next: next + 1,
  };
}

/**
 * Only top-level, safely recognized blocks are intercepted. Source spans refer
 * to the original UTF-16 string; unrecognized / complex syntax stays untouched.
 */
export function segmentTechnicalMarkdown(source: string): TechnicalSegment[] {
  const lines = linesOf(source);
  const result: TechnicalSegment[] = [];
  let proseStart = 0;
  let fenceChar: string | null = null;
  let fenceWidth = 0;
  function emitProse(until: number) {
    if (until > proseStart) result.push({
      kind: "prose",
      span: { start: proseStart, end: until },
      source: source.slice(proseStart, until),
    });
    proseStart = until;
  }
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (fenceChar) {
      const close = /^ {0,3}(\x60{3,}|~{3,})[ \t]*$/u.exec(line.text);
      if (close && close[1]![0] === fenceChar && close[1]!.length >= fenceWidth) {
        fenceChar = null;
      }
      i++;
      continue;
    }
    const open = /^ {0,3}(\x60{3,}|~{3,})(.*)$/u.exec(line.text);
    if (open) {
      fenceChar = open[1]![0]!;
      fenceWidth = open[1]!.length;
      i++;
      continue;
    }
    const spoiler = spoilerAt(lines, i, source);
    const table = spoiler ? null : tableAt(lines, i);
    const protectedTable = spoiler || table ? null : protectedTableAt(lines, i, source);
    const found = spoiler?.spoiler ?? table?.table ?? protectedTable?.block;
    if (!found) { i++; continue; }
    emitProse(line.start);
    result.push(found);
    i = spoiler?.next ?? table?.next ?? protectedTable!.next;
    proseStart = found.span.end;
  }
  emitProse(source.length);
  return result.length ? result : [{ kind: "prose", span: { start: 0, end: source.length }, source }];
}

export function encodeTableCell(text: string): string {
  return text.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

export function serializeTable(
  headers: readonly string[], rows: readonly (readonly string[])[],
  align: readonly ("left" | "center" | "right" | null)[] = [],
): string {
  const row = (cells: readonly string[]) => "| " + cells.map(encodeTableCell).join(" | ") + " |";
  const rules = headers.map((_, i) => align[i] === "center" ? ":---:"
    : align[i] === "left" ? ":---" : align[i] === "right" ? "---:" : "---");
  return [row(headers), row(rules), ...rows.map(row)].join("\n");
}

export function addTableDimension(
  source: string, table: MarkdownTable, dimension: "row" | "column",
): string {
  const headers = table.headers.map((cell) => cell.text);
  const rows = table.rows.map((cells) => cells.map((cell) => cell.text));
  let align = [...table.align];
  if (dimension === "column") {
    headers.push("");
    align = [...align, null];
    rows.forEach((row) => row.push(""));
  } else {
    rows.push(headers.map(() => ""));
  }
  // Preserve existing cell escapes verbatim when only the structure changes.
  const rawRow = (cells: string[]) => "| " + cells.join(" | ") + " |";
  const rule = align.map((value) => value === "center" ? ":---:" : value === "left" ? ":---" : value === "right" ? "---:" : "---");
  const normalized = [rawRow(headers), rawRow(rule), ...rows.map(rawRow)].join("\n");
  const hasEol = source.slice(table.span.start, table.span.end).endsWith("\n");
  return source.slice(0, table.span.start) + normalized + (hasEol ? "\n" : "") + source.slice(table.span.end);
}

/**
 * Spreadsheet TSV is accepted only when rectangular and representable as an
 * ordinary Markdown table. Ambiguous quoted/multiline cells are not discarded.
 */
export function spreadsheetToMarkdown(text: string): string | null {
  const clean = text.replace(/\r\n/gu, "\n").replace(/\n$/u, "");
  if (!clean.includes("\t") || clean.includes('"') || clean.length > 30_000) return null;
  const rows = clean.split("\n").map((row) => row.split("\t"));
  const columns = rows[0]?.length ?? 0;
  if (rows.length < 1 || rows.length > 200 || columns < 2 || columns > 40
    || rows.some((row) => row.length !== columns)) return null;
  return serializeTable(rows[0]!, rows.slice(1));
}
