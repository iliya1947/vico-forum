import { describe, expect, it } from "vitest";
import { pastePlainTextIntoExistingCode } from "./code-plain-paste";
import { createEditorHistory, recordEditorEdit, undoEditorEdit, redoEditorEdit } from "./editor-document";
import { parseRenderedForumMarkdown, serializeRenderedForumMarkdown, type ForumSemanticNode } from "./semantic-markdown";
import { decodeTableCode, encodeTableCode } from "./table-code";

function codes(source: string): string[] {
  const values: string[] = [];
  function visit(node: ForumSemanticNode) {
    if (node.type === "code" || node.type === "inlineCode") values.push(node.value!);
    node.children?.forEach(visit);
  }
  visit(parseRenderedForumMarkdown(source));
  return values;
}
function paste(original: string, payload: string, selected = "Alpha") {
  const start = original.indexOf(selected);
  const selection = { start, end: start + selected.length };
  const result = pastePlainTextIntoExistingCode(original, selection, payload);
  expect(result).not.toBeNull();
  expect(result).not.toHaveProperty("blocked");
  if (!result || "blocked" in result) throw new Error("Expected successful code edit");
  const history = recordEditorEdit(createEditorHistory(original), result.markdown, selection, result.selection);
  expect(undoEditorEdit(history).current).toEqual({ markdown: original, selection });
  expect(redoEditorEdit(undoEditorEdit(history)).current).toEqual(result);
  expect(result.selection.start).toBe(result.selection.end);
  return result;
}
const contexts = [
  ["root", (value: string) => value],
  ["spoiler", (value: string) => ":::spoiler Outer\n" + value + "\n:::"],
  ["table header", (value: string) => "| " + value + " | B |\n| :--- | ---: |\n| Other | Cell |"],
  ["table body", (value: string) => "| A | B |\n| :--- | ---: |\n| " + value + " | Other |"],
] as const;
const inlinePayloads = ["~~literal~~ &copy; | value |", " padded ", " left", "right ", "   ",
  "`", "``a```", "שלום 😀 e\u0301", "\\* &amp; <a>", "\\\\|", "  `x`  "];
describe("literal code editing model", () => {
  for (const [name, wrap] of contexts) {
    it.each(inlinePayloads)(name + " inline code preserves %j", (payload) => {
      const original = wrap("`Alpha`");
      const result = paste(original, payload);
      expect(codes(result.markdown)).toEqual([payload]);
      // Adjacent cells/spoiler title/alignment and outside source stay exact.
      const oldStart = original.indexOf("`"), oldEnd = original.indexOf("`", oldStart + 1) + 1;
      expect(result.markdown.startsWith(original.slice(0, oldStart))).toBe(true);
      expect(result.markdown.endsWith(original.slice(oldEnd))).toBe(true);
    });
    it(name + " maps existing padding, escapes, Unicode and a partial selection", () => {
      const original = wrap("``  😀Alpha suffix  ``");
      const result = paste(original, "`new` ");
      expect(codes(result.markdown)).toEqual([" 😀`new`  suffix "]);
      expect(result.markdown.slice(0, result.selection.start)).toContain("`new` ");
    });
  }
  const blockContexts = [
    ["tab indented", "\tBefore\n\tAlpha\n\tAfter\n\nOutside", "Before\n", "\nAfter"],
    ["space indented", "    Before\n    Alpha\n    After\n\nOutside", "Before\n", "\nAfter"],
    ["indented spoiler", ":::spoiler Outer\n\tBefore\n\tAlpha\n\tAfter\n:::", "Before\n", "\nAfter"],
    ["quoted fence", "> ```js file=a.ts\n> Before\n> Alpha\n> After\n> ```\n\nOutside", "Before\n", "\nAfter"],
    ["quoted indent", ">     Before\n>     Alpha\n>     After\n\nOutside", "Before\n", "\nAfter"],
    ["list fence", "- ```\n  Before\n  Alpha\n  After\n  ```\n\nOutside", "Before\n", "\nAfter"],
    ["list indent", "- item\n\n      Before\n      Alpha\n      After\n\nOutside", "Before\n", "\nAfter"],
    ["nested list quote", "- > ```\n  > Before\n  > Alpha\n  > After\n  > ```\n\nOutside", "Before\n", "\nAfter"],
    ["first-line list indent", "-     Alpha\n      After\n\nOutside", "", "\nAfter"],
    ["partial tab semantic indent", "-\t\tAlpha\n\nOutside", "  ", ""],
    ["extra semantic indent", "  ```\n    Alpha\n    After\n  ```\n\nOutside", "  ", "\n  After"],
  ] as const;
  for (const [name, original, before, after] of blockContexts) {
    it.each(["First\n**formatted**\nLast", "First\n\nLast", "First\n  space\n\ttab\nLast", "שלום 😀\r\nMiddle\rLast"])(
      name + " preserves logical content and containers for %j", (payload) => {
        const result = paste(original, payload);
        expect(codes(result.markdown)).toEqual([before + payload + after]);
        if (original.endsWith("\n\nOutside")) expect(result.markdown.endsWith("\n\nOutside")).toBe(true);
      });
  }
  for (const marker of ["`", "~"]) for (const eol of ["\n", "\r", "\r\n"]) {
    it.each([2, 3, 5])(`fenced ${marker} with ${JSON.stringify(eol)} candidate %i`, (width) => {
      const original = "  " + marker.repeat(3) + "js file=a.ts\n  Before\n  Alpha\n  After\n  " + marker.repeat(3) + "\n\nOutside";
      const payload = marker.repeat(width) + eol + "**literal**" + eol + marker.repeat(width);
      const result = paste(original, payload);
      expect(codes(result.markdown)).toEqual(["Before\n" + payload + "\nAfter"]);
      expect(result.markdown.startsWith("  " + marker.repeat(width >= 3 ? width + 1 : 3) + "js file=a.ts\n")).toBe(true);
    });
  }
  it("preserves mixed original EOLs and UTF-16 source selection", () => {
    const original = "```js\r\n😀Before\rAlpha\nAfter\r\n```\r\n\r\nOutside";
    const result = paste(original, "שלום\r\n**literal**");
    expect(codes(result.markdown)).toEqual(["😀Before\rשלום\r\n**literal**\nAfter"]);
    expect(result.markdown).toBe(original.replace("Alpha", "שלום\r\n**literal**"));
  });
  it("maps a multiline selection through quote prefixes", () => {
    const original = "> ```\n> Before\n> Alpha\n> Beta\n> After\n> ```";
    const result = paste(original, "First\nLast", "Alpha\n> Beta");
    expect(codes(result.markdown)).toEqual(["Before\nFirst\nLast\nAfter"]);
  });
  it("uses literal source backslashes outside tables", () => {
    expect(codes(paste("`Alpha`", "\\|").markdown)).toEqual(["\\|"]);
  });
  it("rejects unrepresentable table code without a prose fallback", () => {
    const original = contexts[3][1]("`Alpha`");
    const start = original.indexOf("Alpha");
    for (const payload of ["\\|", "a\nb", "\0", ""]) {
      expect(pastePlainTextIntoExistingCode(original, { start, end: start + 5 }, payload)).toEqual({ blocked: true });
    }
  });
  it("does not edit fence metadata or a selection crossing code/prose", () => {
    const original = "```js\nAlpha\n```\n\nOutside";
    expect(pastePlainTextIntoExistingCode(original, { start: 3, end: 5 }, "text")).toEqual({ blocked: true });
    expect(pastePlainTextIntoExistingCode(original, { start: 7, end: original.length }, "text")).toEqual({ blocked: true });
    expect(pastePlainTextIntoExistingCode("Alpha", { start: 0, end: 5 }, "text")).toBeNull();
  });
});

describe("shared table-code transport", () => {
  it.each([0, 2, 4, 6])("round-trips %i literal backslashes before pipe across semantic serialization", (count) => {
    const value = "\\".repeat(count) + "| &copy; ~~literal~~";
    const encoded = encodeTableCode(value)!;
    expect(decodeTableCode(encoded)).toBe(value);
    const source = contexts[3][1]("`" + encoded + "`");
    expect(codes(source)).toEqual([value]);
    expect(codes(serializeRenderedForumMarkdown(parseRenderedForumMarkdown(source)))).toEqual([value]);
  });
  it.each([1, 3, 5])("does not pretend %i literal backslashes before pipe is representable", (count) => {
    expect(encodeTableCode("\\".repeat(count) + "|")).toBeNull();
  });
  it("does not decode other punctuation or entity syntax as Markdown", () => {
    const source = contexts[3][1]("`\\*\\~ &copy; \\|`");
    expect(codes(source)).toEqual(["\\*\\~ &copy; |"]);
  });
});


it("keeps caret after the inserted value through escape/delimiter/prefix edits", () => {
  for (const [original, payload, expectedTail] of [
    ["`Alpha tail`", "`new`", " tail ``"],
    ["`Alpha tail`", " padded ", " tail`"],
    ["| A | B |\n| --- | --- |\n| `Alpha tail` | Other |", "a|b", " tail` | Other |"],
    ["> ```\n> Alpha tail\n> ```", "x\ny", " tail\n> ```"],
  ]) {
    const result = paste(original!, payload!);
    expect(result.markdown.slice(result.selection.start)).toBe(expectedTail);
  }
});

it("allows exact caret insertion in empty code and treats positions outside inline delimiters as prose", () => {
  for (const original of ["```\n\n```", "```\r\n\r\n```", "> ```\n> \n> ```"]) {
    const caret = original.indexOf("\n") + (original.startsWith(">") ? 3 : 1);
    const result = pastePlainTextIntoExistingCode(original, { start: caret, end: caret }, "one\ntwo");
    expect(result).not.toHaveProperty("blocked");
    if (!result || "blocked" in result) throw new Error("Expected empty-code edit");
    expect(codes(result.markdown)).toEqual(["one\ntwo"]);
  }
  expect(pastePlainTextIntoExistingCode("`code`", { start: 6, end: 6 }, "plain")).toBeNull();
});


it("keeps a safe indented outer fence width when physical indentation already protects the candidate", () => {
  const original = "  ```\n  Alpha\n  ```";
  const result = paste(original, "one\n  ```\ntwo");
  expect(result.markdown).toBe("  ```\n  one\n    ```\n  two\n  ```");
  expect(codes(result.markdown)).toEqual(["one\n  ```\ntwo"]);
});
