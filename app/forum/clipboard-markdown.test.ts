import { describe, expect, it } from "vitest";
import { clipboardHtmlToMarkdown, clipboardPlainToMarkdown } from "./clipboard-markdown";

describe("Editor 2.0 clipboard import", () => {
  it("keeps supported rich formatting, headings and links", () => {
    const html = '<h2>Heading</h2><p><strong>Bold</strong> and <a href="https://example.com">link</a></p>';
    const source = clipboardHtmlToMarkdown(html);
    expect(source).toContain("## Heading");
    expect(source).toContain("**Bold**");
    expect(source).toContain("[link](https://example.com)");
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

  it("preserves multiline Unicode when plain clipboard text is escaped", () => {
    expect(clipboardPlainToMarkdown("שלום\n**literal**")).toBe("שלום\n\\*\\*literal\\*\\*");
    expect(clipboardPlainToMarkdown("# Title\n- item")).toBe("\\# Title\n\\- item");
  });
});
