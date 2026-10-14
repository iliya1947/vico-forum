import { fromMarkdown } from "mdast-util-from-markdown";
/** A mention autocomplete token is only the immediate word at the authoring caret. */
export interface MentionToken { start: number; end: number; query: string }

export function mentionTokenAtCaret(markdown: string, caret: number): MentionToken | null {
  if (!Number.isSafeInteger(caret) || caret < 0 || caret > markdown.length) return null;
  const match = /@([\p{L}\p{N}_-]{1,32})$/u.exec(markdown.slice(0, caret));
  if (!match) return null;
  const start = caret - match[0].length;
  if (start > 0) {
    const before = markdown[start - 1]!;
    if (!/\s/u.test(before) && !"([{".includes(before)) return null;
  }
  return { start, end: caret, query: match[1]! };
}

export function mentionProfileLink(name: string, profilePath: string): string {
  // Markdown link text must remain text, never author-controlled link syntax.
  const escapedName = [...name].map((char) => "\\[]*_".includes(char) || char.charCodeAt(0) === 96 ? "\\" + char : char).join("");
  return `[${escapedName}](${profilePath})`;
}
/** Recipients must come from parsed profile links, not bare @words or displayed names. */
export function publishedMentionRecipients(markdown: string): string[] {
  const recipients = new Set<string>();
  const root = fromMarkdown(markdown);
  function visit(node: { type: string; url?: string; children?: readonly unknown[] }, excluded: boolean) {
    if (excluded || node.type === "blockquote" || node.type === "code" || node.type === "inlineCode"
      || node.type === "html" || node.type === "image") return;
    if (node.type === "link" && node.url) {
      // Profile URLs inserted by the editor contain an immutable, path-encoded ID.
      const match = /^\\/[^/?#]+\\/users\\/([^/?#]+)\\/?$/u.exec(node.url);
      if (match) {
        try {
          const id = decodeURIComponent(match[1]!);
          if (id && encodeURIComponent(id) === match[1]) recipients.add(id);
        } catch { /* Malformed URL is not a mention. */ }
      }
    }
    for (const child of node.children ?? []) {
      if (child && typeof child === "object" && "type" in child) {
        visit(child as { type: string; url?: string; children?: readonly unknown[] }, false);
      }
    }
  }
  visit(root, false);
  return [...recipients];
}
