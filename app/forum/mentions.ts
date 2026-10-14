/** A mention autocomplete token is only the immediate word at the authoring caret. */
export interface MentionToken { start: number; end: number; query: string }

export function mentionTokenAtCaret(markdown: string, caret: number): MentionToken | null {
  if (!Number.isSafeInteger(caret) || caret < 0 || caret > markdown.length) return null;
  const match = /@([\\p{L}\\p{N}_-]{1,32})$/u.exec(markdown.slice(0, caret));
  if (!match) return null;
  const start = caret - match[0].length;
  if (start > 0) {
    const before = markdown[start - 1]!;
    if (!/\\s/u.test(before) && !"([{".includes(before)) return null;
  }
  return { start, end: caret, query: match[1]! };
}

export function mentionProfileLink(name: string, profilePath: string): string {
  // Markdown link text must remain text, never author-controlled link syntax.
  const escapedName = name.replace(/[\\\\[\\]\\*_`]/gu, "\\\\$&");
  return `[${escapedName}](${profilePath})`;
}
