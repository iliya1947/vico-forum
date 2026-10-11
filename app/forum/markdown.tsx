import { createContext, useContext, useEffect, useState } from "react";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useTranslation } from "react-i18next";
import ReactMarkdown, { type Components } from "react-markdown";
import { segmentTechnicalMarkdown, type MarkdownTable } from "./technical-markdown";

const HIGHLIGHTED_POST_LENGTH_LIMIT = 12_000;
const HighlightBudgetContext = createContext(true);

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

  return new RegExp(
    `(${comments}|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|`
      + String.raw`\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)`,
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
  if (!normalizedLanguage || code.length > 20_000) return [{ text: code }];

  const pattern = syntaxTokenPattern(normalizedLanguage);
  const keywords = languageKeywords[normalizedLanguage] ?? new Set<string>();
  const tokens: SyntaxToken[] = [];
  let cursor = 0;

  for (const match of code.matchAll(pattern)) {
    if (tokens.length >= 2_000) return [{ text: code }];
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
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const { t } = useTranslation("common");
  const [copyState, setCopyState] = useState<"copied" | "error" | null>(null);
  const accountId = useHeaderAuthUser()?.id ?? null;
  const [wrap, setWrap] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(false);
  useEffect(() => {
    try {
      setWrap(accountId ? localStorage.getItem("vico:editor:code-wrap:" + accountId) === "true" : false);
      setLineNumbers(accountId ? localStorage.getItem("vico:editor:code-lines:" + accountId) === "true" : false);
    } catch { setWrap(false); setLineNumbers(false); }
  }, [accountId]);

  function setPreference(key: "code-wrap" | "code-lines", enabled: boolean) {
    if (!accountId) return;
    try { localStorage.setItem("vico:editor:" + key + ":" + accountId, String(enabled)); } catch { /* Storage denied. */ }
  }
  const displayLanguage = language?.trim() || null;
  const allowHighlight = useContext(HighlightBudgetContext);
  const tokens = allowHighlight ? highlightCode(code, displayLanguage ?? undefined) : [{ text: code }];

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
    <figure className="forum-code-block" data-wrap={wrap ? "true" : "false"}>
      <figcaption className="forum-code-toolbar">
        <span className="forum-code-language" dir={displayLanguage ? "ltr" : undefined}>
          {displayLanguage || t("codeLanguagePlainText")}
        </span>
        {filename ? <span className="forum-code-filename" dir="ltr">{filename}</span> : null}
        <span className="forum-code-actions">
          <button
            type="button"
            aria-pressed={wrap}
            onClick={() => setWrap((current) => {
              setPreference("code-wrap", !current);
              return !current;
            })}
          >
            {t(wrap ? "codeNoWrap" : "codeWrap")}
          </button>
          <button type="button" aria-pressed={lineNumbers} onClick={() => setLineNumbers((current) => {
            setPreference("code-lines", !current);
            return !current;
          })}>{t("editorLineNumbers")}</button>
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
      <pre tabIndex={0} dir="ltr" data-line-numbers={lineNumbers ? "true" : "false"}>
        <code className={displayLanguage ? `language-${displayLanguage}` : undefined}>
          {displayLanguage?.toLowerCase() === "diff"
            ? code.split("\n").map((line, index, rows) => (
              <span className={line.startsWith("+") ? "syntax-diff-add" : line.startsWith("-") ? "syntax-diff-remove" : undefined} key={index}>
                {line}{index < rows.length - 1 ? "\n" : ""}
              </span>
            ))
            : tokens.map((token, index) =>
              token.kind ? <span className={`syntax-${token.kind}`} key={index}>{token.text}</span> : token.text)}
        </code>
        {lineNumbers ? <span className="forum-code-line-gutter" aria-hidden="true">
          {code.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}
        </span> : null}
      </pre>
    </figure>
  );
}

const markdownComponents: Components = {
  img: () => null,
  a: ({ children: linkChildren, href, title }) => (
    <a href={href} title={title} rel="nofollow noopener noreferrer ugc" target="_blank">{linkChildren}</a>
  ),
  pre: ({ children: preChildren }) => <>{preChildren}</>,
  code: ({ children: codeChildren, className, node }) => {
    const source = String(codeChildren);
    const language = className?.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
    const metadata = node?.data?.meta;
    const fileMatch = typeof metadata === "string"
      ? /(?:^|\s)(?:file|filename)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/u.exec(metadata)
      : null;
    const name = fileMatch?.[1] ?? fileMatch?.[2] ?? fileMatch?.[3];
    const filename = name && name.length <= 256 && ![...name].some((character) => character.charCodeAt(0) < 32) ? name : undefined;
    const block = Boolean(language) || source.includes("\n");

    if (!block) {
      return <code className={className}>{codeChildren}</code>;
    }

    return (
      <ForumCodeBlock
        code={source.replace(/\n$/u, "")}
        language={language}
        filename={filename}
      />
    );
  },
};

function ForumTable({ table }: { table: MarkdownTable }) {
  return (
    <div className="forum-markdown-table-scroll" tabIndex={0}>
      <table className="forum-markdown-table">
        <thead><tr>{table.headers.map((cell, index) => (
          <th key={index} scope="col" style={{ textAlign: table.align[index] ?? undefined }}>
            <ReactMarkdown components={markdownComponents}>{cell.text}</ReactMarkdown>
          </th>
        ))}</tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={index}>
          {row.map((cell, column) => (
            <td key={column} style={{ textAlign: table.align[column] ?? undefined }}>
              <ReactMarkdown components={markdownComponents}>{cell.text}</ReactMarkdown>
            </td>
          ))}
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export function ForumMarkdown({ children }: { children: string }) {
  const { t } = useTranslation("common");
  const segments = segmentTechnicalMarkdown(children);
  return (
    <div className="post-body">
      <HighlightBudgetContext.Provider value={children.length <= HIGHLIGHTED_POST_LENGTH_LIMIT}>
        {segments.map((segment, index) => {
          if (segment.kind === "table") return <ForumTable table={segment} key={index} />;
          if (segment.kind === "spoiler") return (
            <details className="forum-markdown-spoiler" key={index}>
              <summary>{segment.title || t("editorSpoiler")}</summary>
              <ForumMarkdown>{segment.body}</ForumMarkdown>
            </details>
          );
          return <ReactMarkdown components={markdownComponents} key={index}>{segment.source}</ReactMarkdown>;
        })}
      </HighlightBudgetContext.Provider>
    </div>
  );
}
