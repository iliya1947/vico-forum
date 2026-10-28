import { describe, expect, it } from "vitest";
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
    expect(mentionProfileLink("A[B]*", "/he/users/abc")).toBe(String.raw`[A\[B\]\*](/he/users/abc)`);
  });
});


describe("published mention recipients", () => {
  it("uses literal spoiler labels and independently parsed table cells, like the renderer", () => {
    const source = [
      ":::spoiler [Label](/en/users/label)",
      "[Body](/en/users/body)", "", "> [Quoted](/en/users/quote)", ":::", "",
      "| A | B |", "| --- | --- |",
      "| > [Quote](/en/users/cell-quote) | [Visible](/en/users/cell) |",
      "| `[Code](/en/users/code)` | [Duplicate](/en/users/body) |",
    ].join("\n");
    expect(publishedMentionRecipients(source)).toEqual(["body", "cell"]);
  });
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
