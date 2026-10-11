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

export function parseForumMarkdown(value: string) {
  return fromMarkdown(value, forumMarkdownFromOptions);
}

export function serializeForumMarkdown(tree: Parameters<typeof toMarkdown>[0]): string {
  return toMarkdown(tree, forumMarkdownToOptions);
}
