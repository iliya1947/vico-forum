import type { Nodes } from "mdast";
import { fromMarkdown, type Options as FromMarkdownOptions } from "mdast-util-from-markdown";
import {
  gfmStrikethroughFromMarkdown,
  gfmStrikethroughToMarkdown,
} from "mdast-util-gfm-strikethrough";
import { toMarkdown, type Options as ToMarkdownOptions } from "mdast-util-to-markdown";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";

const strikeSyntax = gfmStrikethrough({ singleTilde: false });
const strikeFromMarkdown = gfmStrikethroughFromMarkdown();
const strikeToMarkdown = gfmStrikethroughToMarkdown();

export const forumMarkdownFromOptions: FromMarkdownOptions = {
  extensions: [strikeSyntax],
  mdastExtensions: [strikeFromMarkdown],
};

export const forumMarkdownToOptions: ToMarkdownOptions = {
  extensions: [strikeToMarkdown],
};

interface RemarkParserData {
  micromarkExtensions?: NonNullable<FromMarkdownOptions["extensions"]>;
  fromMarkdownExtensions?: NonNullable<FromMarkdownOptions["mdastExtensions"]>;
}

/**
 * Add only the agreed GFM strikethrough syntax to react-markdown.
 * Full GFM is intentionally not enabled because it would also change links,
 * task lists, tables, and footnotes.
 */
export function remarkForumStrikethrough(this: unknown): undefined {
  const processor = this as { data(): RemarkParserData };
  const data = processor.data();
  const micromarkExtensions =
    data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(strikeSyntax);
  fromMarkdownExtensions.push(strikeFromMarkdown);
  return undefined;
}


/**
 * Explicit per-block direction marker for authored Markdown:
 * "Example {:vico-dir=rtl}". The marker is ordinary source text, but only a
 * trailing, unescaped token on a paragraph/heading is interpreted. Parsed
 * source positions retain their original offsets for precise visual editing.
 */
type ForumMdastNode = Nodes;

function applyParagraphDirections(node: ForumMdastNode): void {
  if ("children" in node) node.children.forEach(applyParagraphDirections);
  if (node.type === "listItem" && node.children.length === 1) {
    const direction = node.children[0]?.data?.hProperties?.dir;
    if (direction === "ltr" || direction === "rtl") {
      node.data ??= {};
      node.data.hProperties = { ...node.data.hProperties, dir: direction };
    }
  }
  if (node.type !== "paragraph" && node.type !== "heading") return;
  const last = node.children.at(-1);
  if (last?.type !== "text" || !last.value) return;
  const marker = /[ \t]+\{:vico-dir=(ltr|rtl)\}$/u.exec(last.value);
  if (!marker) return;
  last.value = last.value.slice(0, -marker[0].length);
  if (last.position?.end.offset !== undefined) {
    last.position.end.offset -= marker[0].length;
  }
  if (!last.value) node.children.pop();
  node.data ??= {};
  node.data.hProperties = { ...node.data.hProperties, dir: marker[1] as "ltr" | "rtl" };
}

/** Render only the two recognized direction values; never pass user HTML through. */
export function remarkForumParagraphDirection() {
  return (tree: ReturnType<typeof fromMarkdown>): void => applyParagraphDirections(tree);
}

export function parseForumMarkdown(value: string): ReturnType<typeof fromMarkdown> {
  const tree = fromMarkdown(value, forumMarkdownFromOptions);
  applyParagraphDirections(tree);
  return tree;
}

export function serializeForumMarkdown(tree: Parameters<typeof toMarkdown>[0]): string {
  return toMarkdown(tree, forumMarkdownToOptions);
}
