import { describe, expect, it } from "vitest";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parseForumMarkdown } from "../markdown-syntax";
import { mentionProfileLink, mentionTokenAtCaret, publishedMentionRecipients } from "./mentions";

describe("mention authoring tokens", () => {
  it("finds only a name fragment immediately at the caret", () => {
    expect(mentionTokenAtCaret("Hello @Ada", 10)).toEqual({
      start: 6, end: 10, query: "Ada",
    });
    expect(mentionTokenAtCaret("(@שלו", 5)).toEqual({
      start: 1, end: 5, query: "שלו",
    });
    expect(mentionTokenAtCaret("someone@example.com", 18)).toBeNull();
    expect(mentionTokenAtCaret("Hello @Ada trailing", 19)).toBeNull();
    expect(mentionTokenAtCaret("Hello @Ada", 8)).toEqual({ start: 6, end: 8, query: "A" });
    expect(mentionTokenAtCaret("@", 1)).toBeNull();
  });

  it("serializes the member id as a stable profile URL and escapes Markdown in the label", () => {
    expect(mentionProfileLink("Ada Lovelace", "/ru/users/123")).toBe("[Ada Lovelace](/ru/users/123)");
    expect(mentionProfileLink("A[B]*", "/he/users/abc")).toBe("[A&#91;B&#93;&#42;](/he/users/abc)");
  });
  it("keeps GFM strikethrough markers literal in the authoritative mention label", () => {
    const name = "~~Ada &copy;~~";
    const markdown = mentionProfileLink(name, "/en/users/member-42");
    expect(markdown).toBe("[&#126;&#126;Ada &#38;copy&#59;&#126;&#126;](/en/users/member-42)");
    const root = parseForumMarkdown(markdown);
    expect(root.children).toMatchObject([{
      type: "paragraph",
      children: [{ type: "link", url: "/en/users/member-42", children: [
        { type: "text", value: name },
      ] }],
    }]);
    expect(JSON.stringify(root)).not.toContain('"delete"');
    expect(publishedMentionRecipients(markdown)).toEqual(["member-42"]);
  });

  it.each([
    "Ada <https://example.test> &copy;",
    "Ada <someone@example.test> &copy;",
    "A [nested](https://example.test) ~~name~~",
    String.raw`\\*[]<> ![] \\ \`backtick\` &copy;`,
  ])("serializes complex allowed display names as one literal profile-link child: %s", (name) => {
    const markdown = mentionProfileLink(name, "/en/users/member-42");
    const paragraph = parseForumMarkdown(markdown).children[0];
    expect(paragraph).toMatchObject({
      type: "paragraph",
      children: [{ type: "link", url: "/en/users/member-42",
        children: [{ type: "text", value: name }] }],
    });
    if (paragraph?.type !== "paragraph") throw new Error("Expected single paragraph");
    expect(paragraph.children).toHaveLength(1);
    const [link] = paragraph.children;
    if (link?.type !== "link") throw new Error("Expected one profile link");
    expect(link.children).toHaveLength(1);
    expect(publishedMentionRecipients(markdown)).toEqual(["member-42"]);
  });

  it.each([
    "\u0001", "\u0008", "\u000b", "\u000c", "\u000e", "\u001f", "\u007f",
    "\t", "\n", "\r",
  ])("preserves a valid display-name control character %j", (control) => {
    const name = "A" + control + "B";
    const markdown = mentionProfileLink(name, "/en/users/member-42");
    const paragraph = parseForumMarkdown(markdown).children[0];
    expect(paragraph).toMatchObject({ type: "paragraph", children: [
      { type: "link", url: "/en/users/member-42", children: [{ type: "text", value: name }] },
    ] });
    if (paragraph?.type !== "paragraph") throw new Error("Expected paragraph");
    expect(paragraph.children).toHaveLength(1);
    expect(publishedMentionRecipients(markdown)).toEqual(["member-42"]);
  });

  it.each([
    "Ada &copy;",
    "Alice &amp; Bob",
    "Code &#169; reviewer",
    "Name & plain",
  ])("preserves the literal mention label %s through Markdown parsing", (name) => {
    const markdown = mentionProfileLink(name, "/en/users/member-42");
    expect(markdown).toContain("&#38;");
    expect(fromMarkdown(markdown).children[0]).toMatchObject({
      type: "paragraph",
      children: [{
        type: "link",
        url: "/en/users/member-42",
        children: [{ type: "text", value: name }],
      }],
    });
    expect(publishedMentionRecipients(markdown)).toEqual(["member-42"]);
  });

});


describe("published mention recipients", () => {
  it("extracts unique immutable recipient IDs from rendered profile links", () => {
    const markdown = [
      "[Ada](/en/users/member-1) and [Ada again](/ru/users/member-1)",
      "[שלומית](/he/users/member-2) and a bare @member-3",
      "[ordinary link](/en/topics/example) [external](https://example.org/en/users/member-4)",
    ].join("\n\n");
    expect(publishedMentionRecipients(markdown)).toEqual(["member-1", "member-2"]);
  });

  it("excludes blockquotes, fenced code, inline code, images, and malformed URLs", () => {
    const markdown = [
      "> [Quoted](/en/users/quoted)",
      "",
      "`[Inline](/en/users/inline)`",
      "",
      "```md",
      "[Fenced](/en/users/fenced)",
      "```",
      "",
      "![Image](/en/users/image)",
      "[Valid](/en/users/real)",
      "[Broken](/en/users/%ZZ)",
      "[Other host](https://outside.invalid/en/users/stranger)",
    ].join("\n");
    expect(publishedMentionRecipients(markdown)).toEqual(["real"]);
  });

  it("accepts encoded stable IDs and ignores query or fragment variants", () => {
    const markdown = "[Encoded](/en/users/id%20with%20spaces) [Fragment](/en/users/other#section)";
    expect(publishedMentionRecipients(markdown)).toEqual(["id with spaces"]);
  });
});
