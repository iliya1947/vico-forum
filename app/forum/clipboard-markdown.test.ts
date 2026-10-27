import { describe, expect, it } from "vitest";
import { parseForumMarkdown } from "../markdown-syntax";
import { clipboardHtmlToMarkdown, clipboardPlainToMarkdown } from "./clipboard-markdown";

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

  it("preserves multiline Unicode when plain clipboard text is escaped", () => {
    expect(clipboardPlainToMarkdown("שלום\n**literal**")).toBe("שלום\n\\*\\*literal\\*\\*");
    expect(clipboardPlainToMarkdown("# Title\n- item")).toBe("\\# Title\n\\- item");
  });
});
