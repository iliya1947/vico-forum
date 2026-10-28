import { describe, expect, it } from "vitest";
import { parseForumMarkdown } from "../markdown-syntax";
import { clipboardHtmlToMarkdown, clipboardPlainToMarkdown } from "./clipboard-markdown";
import { segmentTechnicalMarkdown } from "./technical-markdown";

describe("Editor 2.0 clipboard import", () => {
  it("keeps supported rich formatting, headings and links", () => {
    const html = '<h2>Heading</h2><p><strong>Bold</strong> and <a href="https://example.com">link</a></p>';
    const source = clipboardHtmlToMarkdown(html);
    expect(source).toContain("## Heading");
    expect(source).toContain("**Bold**");
    expect(source).toContain("[link](https://example.com)");
  });

  it("preserves boundary backticks and spaces in pasted inline code", () => {
    expect(clipboardHtmlToMarkdown("<p><code>`foo`</code></p>")).toBe("`` `foo` ``");
    expect(clipboardHtmlToMarkdown("<p><code> foo </code></p>")).toBe("`  foo  `");
  });

  it("preserves consecutive blank lines within HTML preformatted code through Markdown parsing", () => {
    const code = "first\n\n\n\nlast";
    const source = clipboardHtmlToMarkdown("<pre><code>" + code + "</code></pre>");
    expect(source).toBe("```\n" + code + "\n```");
    expect(parseForumMarkdown(source!).children.filter((node) => node.type === "code"))
      .toMatchObject([{ type: "code", value: code }]);
  });

  it("normalizes HTML prose without collapsing blank lines in adjacent fenced code", () => {
    const code = "first\n\n\n``` inside\n\n\nlast";
    const source = clipboardHtmlToMarkdown(
      "<p>Before</p><pre><code>" + code + "</code></pre><p>After</p>",
    );
    expect(source).toBe("Before\n\n````\n" + code + "\n````\n\nAfter");
    expect(parseForumMarkdown(source!).children.map((node) => node.type))
      .toEqual(["paragraph", "code", "paragraph"]);
    expect(parseForumMarkdown(source!).children.find((node) => node.type === "code"))
      .toMatchObject({ type: "code", value: code });
    expect(clipboardHtmlToMarkdown("<p>One</p><div><p>Two</p></div>"))
      .toBe("One\n\nTwo");
  });

  it("turns simple spreadsheet HTML into ordinary safe Markdown", () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    expect(clipboardHtmlToMarkdown(html)).toContain("| 1 | 2 |");
  });

  it("rejects scripts, active content, merged cells and unsafe links", () => {
    expect(clipboardHtmlToMarkdown('<script>alert(1)</script><p>safe</p>')).toBeNull();
    expect(clipboardHtmlToMarkdown('<p><a href="javascript:alert(1)">x</a></p>')).toBeNull();
    expect(clipboardHtmlToMarkdown('<table><tr><td colspan="2">x</td><td>y</td></tr></table>')).toBeNull();
  });

  it.each([
    ["---", String.raw`\---`],
    ["===", String.raw`\===`],
    ["--", String.raw`\--`],
    ["~~literal~~", String.raw`\~\~literal\~\~`],
    ["&copy;", "&amp;copy;"],
    ["ordinary text", "ordinary text"],
  ])("retains ordinary literal %s instead of creating Markdown syntax", (original, escaped) => {
    const markdown = clipboardPlainToMarkdown(original);
    expect(markdown).toBe(escaped);
    expect(parseForumMarkdown(markdown).children).toMatchObject([
      { type: "paragraph", children: [{ type: "text", value: original }] },
    ]);
  });

  it("protects a literal setext underline and character references across plain clipboard lines", () => {
    const markdown = clipboardPlainToMarkdown("Heading\n---\n~~plain~~ &copy;");
    expect(parseForumMarkdown(markdown).children).toMatchObject([
      { type: "paragraph" },
    ]);
    const paragraph = parseForumMarkdown(markdown).children[0]!;
    if (paragraph.type !== "paragraph") throw new Error("Expected literal paragraph, not Markdown formatting");
    expect(paragraph.children).toMatchObject([{ type: "text", value: "Heading\n---\n~~plain~~ &copy;" }]);
  });

  it.each([
    ["    &copy; ~~literal~~", "&#32;   &amp;copy; \\~\\~literal\\~\\~"],
    ["     &copy; ~~literal~~", "&#32;    &amp;copy; \\~\\~literal\\~\\~"],
  ])("preserves indented ordinary plain-text paste %j as paragraph text", (original, expectedSource) => {
    const markdown = clipboardPlainToMarkdown(original);
    expect(markdown).toBe(expectedSource);
    const [paragraph] = parseForumMarkdown(markdown).children;
    expect(paragraph).toMatchObject({ type: "paragraph" });
    if (paragraph?.type !== "paragraph") throw new Error("Unexpected indented code");
    expect(paragraph.children).toMatchObject([{ type: "text", value: original }]);
  });

  it.each([
    "\t&copy; ~~literal~~",
    " \t&copy; ~~literal~~",
    "  \t[link](https://example.test) ~~literal~~",
  ])("keeps tab-indented forced prose literal rather than showing source escapes: %j", (plain) => {
    const markdown = clipboardPlainToMarkdown(plain);
    expect(markdown).toBe(plain);
    const tree = parseForumMarkdown(markdown);
    expect(tree.children[0]).toMatchObject({ type: "code" });
    if (tree.children[0]?.type !== "code") throw new Error("Expected literal code block");
    expect(tree.children[0].value).toContain(plain.includes("[link]") ? "[link]" : "&copy;");
    expect(tree.children[0].value).toContain("~~literal~~");
  });

  it("keeps multiline setext equals markers as literal paragraphs", () => {
    const markdown = clipboardPlainToMarkdown("Heading\\n===\\n~~plain~~ &copy;".replaceAll("\\n", "\n"));
    const tree = parseForumMarkdown(markdown);
    expect(tree.children).toMatchObject([{ type: "paragraph" }]);
    if (tree.children[0]?.type !== "paragraph") throw new Error("Unexpected heading");
    expect(tree.children[0].children).toMatchObject([{
      type: "text", value: "Heading\n===\n~~plain~~ &copy;",
    }]);
  });

  it.each([
    ["Before", "\t&copy; ~~literal~~", false],
    ["Before", "\n\t&copy; ~~literal~~", false],
    ["Before", "\n\n\t&copy; ~~literal~~", true],
    ["&#32;   Before", "\t&copy; ~~literal~~", false],
    ["", "\t&copy; ~~literal~~", true],
  ] as const)("uses actual Markdown context for tabbed plain text (%j, %j)", (before, plain, expectedCode) => {
    const source = clipboardPlainToMarkdown(plain, {
      markdown: before, selection: { start: before.length, end: before.length },
    });
    const parsed = parseForumMarkdown(before + source);
    if (expectedCode) {
      const code = parsed.children.find((node) => node.type === "code");
      if (code?.type !== "code") throw new Error("Expected real indented code");
      expect(code.value).toContain("&copy; ~~literal~~");
      expect(source).toBe(clipboardPlainToMarkdown(plain));
    } else {
      expect(parsed.children.some((node) => node.type === "code")).toBe(false);
      expect(source).toContain("&amp;copy;");
      const paragraph = parsed.children.find((node) => node.type === "paragraph");
      if (paragraph?.type !== "paragraph") throw new Error("Expected prose");
      expect(paragraph.children.map((node) => "value" in node ? node.value : "").join(""))
        .toContain("&copy; ~~literal~~");
    }
  });


  it.each([
    [":::spoiler Label\nAlpha\n:::", true],
    [":::spoiler Label\nBefore Alpha\n:::", false],
    [":::spoiler Label\nBefore\n\nAlpha\n:::", true],
  ] as const)("uses renderer-local spoiler body context for literal tab paste (%j)", (source, isCode) => {
    const start = source.indexOf("Alpha");
    const raw = "\t&copy; ~~literal~~";
    const insertion = clipboardPlainToMarkdown(raw, {
      markdown: source, selection: { start, end: start + "Alpha".length },
    });
    expect(insertion).toBe(isCode ? raw : "\t&amp;copy; \\~\\~literal\\~\\~");
    const published = source.slice(0, start) + insertion + source.slice(start + "Alpha".length);
    const spoiler = segmentTechnicalMarkdown(published).find((segment) => segment.kind === "spoiler");
    if (spoiler?.kind !== "spoiler") throw new Error("Expected spoiler");
    const parsed = parseForumMarkdown(spoiler.body);
    expect(parsed.children.some((node) => node.type === "code")).toBe(isCode);
    expect(parsed.children.some((node) => node.type === "delete")).toBe(false);
  });

  it("preserves multiline Unicode when plain clipboard text is escaped", () => {
    expect(clipboardPlainToMarkdown("שלום\n**literal**")).toBe("שלום\n\\*\\*literal\\*\\*");
    expect(clipboardPlainToMarkdown("# Title\n- item")).toBe("\\# Title\n\\- item");
  });
  it.each([
    ["spoiler", ":::spoiler Label\nAlpha\n:::", "\\:::spoiler Label\nAlpha\n:::"],
    ["table", "| A | B |\n| --- | --- |\n| 1 | 2 |", "\\| A \\| B \\|\n\\| --- \\| --- \\|\n\\| 1 \\| 2 \\|"],
    ["RTL direction", "Text {:vico-dir=rtl}", "Text \\{:vico-dir=rtl}"],
    ["LTR direction", "Text {:vico-dir=ltr}", "Text \\{:vico-dir=ltr}"],
  ] as const)("keeps literal Vico %s clipboard source inactive", (_kind, plain, expectedSource) => {
    const source = clipboardPlainToMarkdown(plain);
    expect(source).toBe(expectedSource);
    expect(segmentTechnicalMarkdown(source).every((part) => part.kind === "prose")).toBe(true);
    expect(parseForumMarkdown(source).children.every((node) => node.type === "paragraph")).toBe(true);
    expect(JSON.stringify(parseForumMarkdown(source))).not.toContain('"dir":"rtl"');
    expect(JSON.stringify(parseForumMarkdown(source))).not.toContain('"dir":"ltr"');
  });

  it("preserves actual tab-indented code even with Vico-shaped literal payload", () => {
    expect(clipboardPlainToMarkdown("\t| A | B |")).toBe("\t| A | B |");
    expect(clipboardPlainToMarkdown("\t:::spoiler Label")).toBe("\t:::spoiler Label");
  });

});
