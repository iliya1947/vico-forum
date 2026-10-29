import { toMarkdown, type Handle } from "mdast-util-to-markdown";
import { forumMarkdownToOptions, parseForumMarkdown } from "../markdown-syntax";
import { parseTableCellMarkdown } from "./table-code";
import { segmentTechnicalMarkdown } from "./technical-markdown";

export interface ForumSemanticNode {
  type: string;
  children?: ForumSemanticNode[];
  value?: string;
  [key: string]: unknown;
}

/** Match the renderer's parsing boundaries, including literal spoiler labels.
 * Positions are local to each prose/cell/body; this tree is not for source edits.
 */
export function parseRenderedForumMarkdown(source: string): ForumSemanticNode {
  const children: ForumSemanticNode[] = [];
  for (const segment of segmentTechnicalMarkdown(source)) {
    if (segment.kind === "spoiler") {
      children.push({ type: "vicoSpoiler", children: [
        { type: "vicoSpoilerTitle", children: [{ type: "text", value: segment.title }] },
        parseRenderedForumMarkdown(segment.body),
      ] });
    } else if (segment.kind === "table") {
      children.push({ type: "vicoTable", align: segment.align, children:
        [segment.headers, ...segment.rows].map((row) => ({
          type: "vicoTableRow", children: row.map((cell) => ({
            type: "vicoTableCell", children: parseTableCellMarkdown(cell.text).children as ForumSemanticNode[],
          })),
        })),
      });
    } else {
      children.push(...parseForumMarkdown(segment.source).children as ForumSemanticNode[]);
    }
  }
  return { type: "root", children };
}

/** Escape separators in serialized cells without changing existing escapes/code. */
function protectCellPipes(source: string): string {
  let result = "";
  let escapes = 0;
  for (const char of source) {
    if (char === "|" && escapes % 2 === 0) result += "\\";
    result += char;
    escapes = char === "\\" ? escapes + 1 : 0;
  }
  return result;
}

export function serializeRenderedForumMarkdown(tree: ForumSemanticNode): string {
  const handlers: Record<string, Handle> = {
    vicoSpoiler(node) {
      const spoiler = node as unknown as ForumSemanticNode;
      const title = spoiler.children?.[0]?.children?.[0]?.value ?? "";
      const body = serializeRenderedForumMarkdown(spoiler.children![1]!);
      return `:::spoiler${title ? " " + title : ""}\n${body}:::`;
    },
    vicoTable(node) {
      const table = node as unknown as ForumSemanticNode;
      const rows = table.children!.map((row) => "| " + row.children!.map((cell) =>
        protectCellPipes(serializeRenderedForumMarkdown({ type: "root", children: cell.children })
          .trimEnd().replace(/\n/gu, " ")),
      ).join(" | ") + " |");
      const align = table.align as Array<"left" | "center" | "right" | null>;
      rows.splice(1, 0, "| " + align.map((value) => value === "center" ? ":---:"
        : value === "left" ? ":---" : value === "right" ? "---:" : "---").join(" | ") + " |");
      return rows.join("\n");
    },
  };
  return toMarkdown(tree as Parameters<typeof toMarkdown>[0], { ...forumMarkdownToOptions, handlers });
}
