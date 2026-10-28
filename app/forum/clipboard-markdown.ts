import { inlineCodeMarkdown } from "./editor-document";
import { parseForumMarkdown } from "../markdown-syntax";
import { segmentTechnicalMarkdown, serializeTable } from "./technical-markdown";

const tick = String.fromCharCode(96);

function escapeText(value: string): string {
  return value.replace(/\\|`|\*|_|<|>|\[|\]|~|&/gu,
    (char) => char === "&" ? "&amp;" : "\\" + char);
}

function textAsMarkdown(value: string, rawCodeLines?: ReadonlySet<number>): string {
  return value.replace(/\r\n/gu, "\n").split("\n").map((line, index) => {
    // Raw tabs are code only when the whole Markdown document parses them so.
    if (/^ {0,3}\t/u.test(line) && (!rawCodeLines || rawCodeLines.has(index))) return line;
    // Markdown would parse four leading spaces as an indented code
    // block and display our literal-text escapes instead of decoding them.
    // One structural character reference preserves the whitespace as prose.
    const prefix = /^ {4}/u.test(line) ? "&#32;" : "";
    const escaped = prefix ? prefix + escapeText(line.slice(1)) : escapeText(line);
    // Vico parses spoilers and tables before CommonMark, and directions after
    // CommonMark. Protect their source syntax on the literal clipboard path.
    // A genuine indented-code line returned above remains byte-for-byte raw.
    const literal = escaped
      .replace(/\|/gu, "\\|")
      .replace(/\{:vico-dir=(?:ltr|rtl)\}/gu, "\\$&")
      .replace(/^:::spoiler(?=[ \t]|$)/u, "\\:::spoiler")
      .replace(/^:::[ \t]*$/u, "\\$&");
    // Plain text must not accidentally become a heading, quote or list item.
    return literal.replace(/^([ \t]{0,3})([#>+\-=]|\d+[.)])(?=\s|$)/u,
      (_, indent: string, marker: string) => indent + "\\" + marker)
      .replace(/^([ \t]{0,3})(-{2,}|={2,})(?=\s|$)/u,
        (_, indent: string, rule: string) => indent + "\\" + rule);
  }).join("\n");
}

// Clipboard prose uses compact paragraph spacing, but fenced code created from
// <pre> must retain its original blank lines. The generated fence is longer than
// every backtick run within the code, so it cannot close inside the code body.
function normalizeClipboardProse(source: string): string {
  const fence = /^(`{3,})\n[\s\S]*?^\1(?=\n|$)/gmu;
  const compact = (value: string) => value.replace(/\n{3,}/gu, "\n\n");
  let end = 0;
  let normalized = "";
  for (const match of source.matchAll(fence)) {
    const start = match.index;
    if (start === undefined) continue;
    normalized += compact(source.slice(end, start));
    normalized += match[0];
    end = start + match[0].length;
  }
  return (normalized + compact(source.slice(end))).trim();
}

/**
 * Converts only safe structural formatting; external styles, scripts and
 * executable content are never transferred. Unsupported structures return
 * null so the caller can use a labelled plain-text fallback.
 */
export function clipboardHtmlToMarkdown(html: string): string | null {
  if (html.length > 100_000 || typeof DOMParser === "undefined") return null;
  // DOMParser may relocate <script> into the document head before traversal.
  if (/<\s*\/?\s*(?:script|style|svg|iframe|object|embed|form|img)\b/iu.test(html)) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  let valid = true;
  function plain(element: Node): string {
    return element.textContent ?? "";
  }
  function children(node: Node): string {
    return [...node.childNodes].map(convert).join("");
  }
  function listItems(element: Element, ordered: boolean): string {
    const items = [...element.children].filter((child) => child.tagName.toLowerCase() === "li");
    if (items.length !== element.children.length) { valid = false; return ""; }
    return "\n" + items.map((item, i) => {
      const marker = ordered ? String(i + 1) + ". " : "- ";
      return marker + children(item).trim().replace(/\n/gu, "\n  ");
    }).join("\n") + "\n\n";
  }
  function table(element: Element): string {
    const rows = [...element.querySelectorAll("tr")];
    if (rows.length === 0 || rows.length > 200) { valid = false; return ""; }
    const values = rows.map((row) =>
      [...row.children].map((cell) => {
        if (cell.hasAttribute("rowspan") || cell.hasAttribute("colspan")
          || !["th", "td"].includes(cell.tagName.toLowerCase())
          || cell.querySelector("table, br, p, div, ul, ol, pre")) valid = false;
        return plain(cell);
      }));
    const width = values[0]?.length ?? 0;
    if (width < 2 || width > 40 || values.some((row) => row.length !== width || row.some((v) => v.includes("\n")))) {
      valid = false; return "";
    }
    return "\n\n" + serializeTable(values[0]!, values.slice(1)) + "\n\n";
  }
  function convert(node: Node): string {
    if (node.nodeType === 3) return escapeText(node.nodeValue ?? "");
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    const name = element.tagName.toLowerCase();
    if (["script", "style", "svg", "iframe", "object", "embed", "form", "img"].includes(name)) {
      valid = false;
      return "";
    }
    const inner = () => children(element);
    if (["b", "strong"].includes(name)) return "**" + inner() + "**";
    if (["em", "i"].includes(name)) return "_" + inner() + "_";
    if (name === "s" || name === "del") return "~~" + inner() + "~~";
    if (name === "code") {
      return inlineCodeMarkdown(plain(element));
    }
    if (name === "pre") {
      const value = plain(element).replace(/\r\n/gu, "\n");
      return "\n\n" + tick.repeat(3 + Math.max(0, ...[...value.matchAll(/\x60+/gu)].map((m) => m[0].length - 2)))
        + "\n" + value + "\n" + tick.repeat(3 + Math.max(0, ...[...value.matchAll(/\x60+/gu)].map((m) => m[0].length - 2))) + "\n\n";
    }
    if (name === "a") {
      const href = element.getAttribute("href") ?? "";
      if (!/^https?:\/\//iu.test(href) || (/[\s()<>]/u.test(href) || [...href].some((character) => character.charCodeAt(0) < 32))) { valid = false; return plain(element); }
      return "[" + inner() + "](" + href + ")";
    }
    if (name === "br") return "\n";
    if (["p", "div"].includes(name)) return "\n\n" + inner() + "\n\n";
    if (/^h[1-6]$/u.test(name)) return "\n\n" + "#".repeat(Number(name[1])) + " " + inner() + "\n\n";
    if (name === "blockquote") return "\n\n" + inner().trim().split("\n").map((line) => "> " + line).join("\n") + "\n\n";
    if (name === "ul") return listItems(element, false);
    if (name === "ol") return listItems(element, true);
    if (name === "li") return inner();
    if (name === "table") return table(element);
    if (["tbody", "thead", "span"].includes(name)) return inner();
    valid = false;
    return inner();
  }
  const source = normalizeClipboardProse(children(doc.body));
  return valid ? source : null;
}

export interface ClipboardPasteContext {
  markdown: string;
  selection: { start: number; end: number };
}

export function clipboardPlainToMarkdown(text: string, context?: ClipboardPasteContext): string {
  const initial = textAsMarkdown(text);
  if (!context || !/^ {0,3}\t/mu.test(text.replace(/\r\n/gu, "\n"))) return initial;
  const { markdown, selection } = context;
  if (!Number.isSafeInteger(selection.start) || !Number.isSafeInteger(selection.end)
    || selection.start < 0 || selection.end < selection.start || selection.end > markdown.length) {
    return textAsMarkdown(text, new Set());
  }

  // Judge code versus prose using the actual source surrounding the selection.
  const candidate = markdown.slice(0, selection.start) + initial + markdown.slice(selection.end);
  const codes: Array<{ start: number; end: number }> = [];
  type MarkdownNode = {
    type: string;
    position?: { start: { offset?: number }; end: { offset?: number } };
    children?: readonly unknown[];
  };
  // Like the public renderer, treat spoiler bodies and table cells as their
  // own Markdown documents rather than parsing custom markers as root prose.
  function collectRendered(source: string, base = 0) {
    for (const segment of segmentTechnicalMarkdown(source)) {
      if (segment.kind === "prose") {
        collectWithOffset(parseForumMarkdown(segment.source), base + segment.span.start);
      } else if (segment.kind === "spoiler") {
        collectRendered(segment.body, base + segment.bodyStart);
      } else if (segment.kind === "protected") {
        collectWithOffset(parseForumMarkdown(segment.source), base + segment.span.start);
      } else if (segment.kind === "table") {
        for (const row of [segment.headers, ...segment.rows]) {
          for (const cell of row) collectWithOffset(parseForumMarkdown(cell.text), base + cell.span.start);
        }
      }
    }
  }
  function collectWithOffset(node: MarkdownNode, base: number) {
    const start = node.position?.start.offset, end = node.position?.end.offset;
    if (node.type === "code" && start !== undefined && end !== undefined) {
      codes.push({ start: base + start, end: base + end });
    }
    for (const child of node.children ?? []) {
      if (child && typeof child === "object" && "type" in child) collectWithOffset(child as typeof node, base);
    }
  }
  collectRendered(candidate);
  const codeLines = new Set<number>();
  let offset = selection.start;
  initial.split("\n").forEach((line, index) => {
    if (/^ {0,3}\t/u.test(line) && codes.some((code) => code.start <= offset && offset < code.end)) {
      codeLines.add(index);
    }
    offset += line.length + 1;
  });
  return textAsMarkdown(text, codeLines);
}
