import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

type SyntaxTokenKind = "comment" | "keyword" | "literal" | "number" | "string";

interface SyntaxToken {
  text: string;
  kind?: SyntaxTokenKind;
}

const languageAliases: Readonly<Record<string, string>> = {
  js: "javascript",
  jsx: "javascript",
  javascript: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  json: "json",
  py: "python",
  python: "python",
  sh: "shell",
  shell: "shell",
  bash: "shell",
  css: "css",
  html: "html",
  xml: "html",
  sql: "sql",
};

const languageKeywords: Readonly<Record<string, ReadonlySet<string>>> = {
  javascript: new Set([
    "async", "await", "break", "case", "catch", "class", "const", "continue", "default",
    "delete", "do", "else", "export", "extends", "finally", "for", "from", "function",
    "get", "if", "import", "in", "instanceof", "let", "new", "of", "return", "set",
    "static", "super", "switch", "this", "throw", "try", "typeof", "var", "void",
    "while", "with", "yield",
  ]),
  typescript: new Set([
    "abstract", "any", "as", "asserts", "async", "await", "boolean", "break", "case",
    "catch", "class", "const", "continue", "declare", "default", "delete", "do", "else",
    "enum", "export", "extends", "finally", "for", "from", "function", "get", "if",
    "implements", "import", "in", "infer", "instanceof", "interface", "is", "keyof",
    "let", "namespace", "never", "new", "number", "object", "of", "private", "protected",
    "public", "readonly", "return", "satisfies", "set", "static", "string", "super",
    "switch", "symbol", "this", "throw", "try", "type", "typeof", "unknown", "var",
    "void", "while", "with", "yield",
  ]),
  json: new Set(),
  python: new Set([
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
    "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
    "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
    "with", "yield",
  ]),
  shell: new Set([
    "case", "do", "done", "elif", "else", "esac", "export", "fi", "for", "function",
    "if", "in", "local", "readonly", "select", "then", "until", "while",
  ]),
  css: new Set(["and", "important", "not", "only", "or"]),
  html: new Set(),
  sql: new Set([
    "alter", "and", "as", "asc", "begin", "by", "case", "commit", "create", "delete",
    "desc", "distinct", "drop", "else", "end", "from", "group", "having", "insert",
    "into", "join", "left", "limit", "not", "null", "on", "or", "order", "outer",
    "right", "rollback", "select", "set", "table", "then", "union", "update", "values",
    "when", "where",
  ]),
};

const literalWords = new Set([
  "false", "null", "true", "undefined", "None", "False", "True",
]);

function normalizeLanguage(language: string | undefined): string | null {
  if (!language) return null;
  return languageAliases[language.trim().toLowerCase()] ?? null;
}

function syntaxTokenPattern(language: string): RegExp {
  const comments = language === "python" || language === "shell"
    ? String.raw`#[^\n]*`
    : language === "sql"
      ? String.raw`--[^\n]*`
      : String.raw`\/\*[\s\S]*?\*\/|\/\/[^\n]*`;
  const backtick = String.fromCharCode(96);
  const templateString = backtick + String.raw`(?:\\.|[^` + backtick + String.raw`\\])*` + backtick;

  return new RegExp(
    `(${comments}|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|`
      + templateString
      + String.raw`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)`,
    "gu",
  );
}

function classifySyntaxToken(
  text: string,
  language: string,
  keywords: ReadonlySet<string>,
): SyntaxTokenKind | undefined {
  if (
    text.startsWith("//")
    || text.startsWith("/*")
    || ((language === "python" || language === "shell") && text.startsWith("#"))
    || (language === "sql" && text.startsWith("--"))
  ) {
    return "comment";
  }
  if (text.startsWith('"') || text.startsWith("'") || text.startsWith(String.fromCharCode(96))) {
    return "string";
  }
  if (/^\d/u.test(text)) return "number";
  if (literalWords.has(text)) return "literal";
  if (keywords.has(language === "sql" ? text.toLowerCase() : text)) return "keyword";
  return undefined;
}

export function highlightCode(code: string, language: string | undefined): SyntaxToken[] {
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) return [{ text: code }];

  const pattern = syntaxTokenPattern(normalizedLanguage);
  const keywords = languageKeywords[normalizedLanguage] ?? new Set<string>();
  const tokens: SyntaxToken[] = [];
  let cursor = 0;

  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ text: code.slice(cursor, index) });
    const text = match[0];
    tokens.push({
      text,
      kind: classifySyntaxToken(text, normalizedLanguage, keywords),
    });
    cursor = index + text.length;
  }

  if (cursor < code.length) tokens.push({ text: code.slice(cursor) });
  return tokens.length > 0 ? tokens : [{ text: code }];
}

function ForumCodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const { t } = useTranslation("common");
  const [copyState, setCopyState] = useState<"copied" | "error" | null>(null);
  const [wrap, setWrap] = useState(false);
  const displayLanguage = language?.trim() || null;
  const tokens = highlightCode(code, displayLanguage ?? undefined);

  async function copyCode() {
    setCopyState(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <figure className="forum-code-block" dir="ltr" data-wrap={wrap ? "true" : "false"}>
      <figcaption className="forum-code-toolbar">
        <span className="forum-code-language">
          {displayLanguage || t("codeLanguagePlainText")}
        </span>
        <span className="forum-code-actions">
          <button
            type="button"
            aria-pressed={wrap}
            onClick={() => setWrap((current) => !current)}
          >
            {t(wrap ? "codeNoWrap" : "codeWrap")}
          </button>
          <button type="button" onClick={() => void copyCode()}>
            {t("codeCopy")}
          </button>
        </span>
        {copyState && (
          <span
            className={copyState === "error" ? "forum-code-feedback is-error" : "forum-code-feedback"}
            role="status"
            aria-live="polite"
          >
            {t(copyState === "copied" ? "codeCopied" : "codeCopyFailed")}
          </span>
        )}
      </figcaption>
      <pre tabIndex={0}>
        <code className={displayLanguage ? `language-${displayLanguage}` : undefined}>
          {tokens.map((token, index) =>
            token.kind ? (
              <span className={`syntax-${token.kind}`} key={index}>{token.text}</span>
            ) : token.text
          )}
        </code>
      </pre>
    </figure>
  );
}

export function ForumMarkdown({ children }: { children: string }) {
  return (
    <div className="post-body">
      <ReactMarkdown
        components={{
          img: () => null,
          a: ({ children: linkChildren, href, title }) => (
            <a href={href} title={title} rel="nofollow noopener noreferrer ugc" target="_blank">{linkChildren}</a>
          ),
          pre: ({ children: preChildren }) => <>{preChildren}</>,
          code: ({ children: codeChildren, className }) => {
            const source = String(codeChildren);
            const language = className?.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
            const block = Boolean(language) || source.includes("\n");

            if (!block) {
              return <code className={className}>{codeChildren}</code>;
            }

            return (
              <ForumCodeBlock
                code={source.replace(/\n$/u, "")}
                language={language}
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
