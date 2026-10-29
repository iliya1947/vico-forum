import { parseForumMarkdown } from "../markdown-syntax";

interface CodeTree {
  type: string;
  value?: string;
  children?: CodeTree[];
}

/** GFM's narrow table-code transport rule: only escaped pipes are decoded.
 * Pairs of backslashes stay literal; other punctuation/entities are untouched.
 * Source positions continue to refer to the authored (escaped) cell text.
 */
export function decodeTableCode(value: string): string {
  return value.replace(/\\([\\|])/gu, (raw, escaped: string) => escaped === "|" ? "|" : raw);
}

export function applyTableCodeSemantics(tree: CodeTree): void {
  if (tree.type === "inlineCode" && tree.value !== undefined) tree.value = decodeTableCode(tree.value);
  tree.children?.forEach(applyTableCodeSemantics);
}

export function parseTableCellMarkdown(source: string): ReturnType<typeof parseForumMarkdown> {
  const tree = parseForumMarkdown(source);
  applyTableCodeSemantics(tree);
  return tree;
}

/** Used only when ReactMarkdown is rendering an already segmented Vico cell. */
export function remarkTableCellCode() {
  return (tree: ReturnType<typeof parseForumMarkdown>): void => applyTableCodeSemantics(tree);
}

/** The existing table lexer needs an odd number of backslashes before a pipe.
 * With GFM decoding this represents an even number of literal backslashes.
 * Reject the unrepresentable odd case instead of losing a character.
 */
export function encodeTableCode(value: string): string | null {
  if (/[\r\n]/u.test(value)) return null;
  let valid = true;
  const result = value.replace(/(\\*)\|/gu, (_, escapes: string) => {
    if (escapes.length % 2) valid = false;
    return escapes + "\\|";
  });
  return valid ? result : null;
}
