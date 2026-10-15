import { describe, expect, it } from "vitest";
import {
  applyTextareaEdit, clearInlineMarkdownFormatting, createEditorHistory, editableCodeRanges,
  editableVisualTextRanges, editVisualText,
  recordEditorEdit, redoEditorEdit, setParagraphDirection, sourceOffsetToTextareaOffset, textareaMarkdown,
  textareaOffsetToSourceOffset, undoEditorEdit,
} from "./editor-document";

describe("Editor 2.0 lossless document foundation", () => {
  it("persists a single paragraph's direction without touching other source spans", () => {
    const source = "English *first*.\r\n\r\nעברית **second**.\r\n\r\n```ts\nconst code = true;\n```";
    const first = setParagraphDirection(source, { start: 3, end: 3 }, "rtl");
    expect(first?.markdown).toBe(source.replace("English *first*.", "English *first*. {:vico-dir=rtl}"));
    const second = setParagraphDirection(first!.markdown, {
      start: first!.markdown.indexOf("second"), end: first!.markdown.indexOf("second"),
    }, "ltr");
    expect(second?.markdown).toContain("עברית **second**. {:vico-dir=ltr}");
    expect(second?.markdown).toContain("\r\n\r\n");
    expect(second?.markdown).toContain("```ts\nconst code = true;\n```");
    const reset = setParagraphDirection(second!.markdown, { start: 4, end: 4 }, "auto");
    expect(reset?.markdown).toBe(source.replace("עברית **second**.", "עברית **second**. {:vico-dir=ltr}"));
    expect(setParagraphDirection(source, { start: source.indexOf("const"), end: source.indexOf("const") }, "rtl")).toBeNull();
    expect(setParagraphDirection(source, { start: 3, end: source.indexOf("second") }, "rtl")).toBeNull();
  });

  it.each([
    ["Setext H1", "Before\n\nTitle\n===\n\nAfter", "Before\n\nTitle {:vico-dir=rtl}\n===\n\nAfter"],
    ["Setext H2 CRLF", "Before\r\n\r\nTitle\r\n---\r\n\r\nAfter", "Before\r\n\r\nTitle {:vico-dir=rtl}\r\n---\r\n\r\nAfter"],
    ["ATX closing hashes", "Before\n\n## Title ##\n\nAfter", "Before\n\n## Title {:vico-dir=rtl} ##\n\nAfter"],
    ["ATX closing hashes and inline formatting", "## **Title** ###", "## **Title** {:vico-dir=rtl} ###"],
    ["Plain ATX heading", "## Title", "## Title {:vico-dir=rtl}"],
  ])("preserves %s when applying, changing and resetting direction", (_case, source, expected) => {
    const selected = source.indexOf("Title") + 2;
    const originalSelection = { start: selected, end: selected };
    const forced = setParagraphDirection(source, originalSelection, "rtl");
    expect(forced?.markdown).toBe(expected);
    const changed = setParagraphDirection(forced!.markdown, originalSelection, "ltr");
    expect(changed?.markdown).toBe(expected.replace("{:vico-dir=rtl}", "{:vico-dir=ltr}"));
    const reset = setParagraphDirection(changed!.markdown, originalSelection, "auto");
    expect(reset?.markdown).toBe(source);
  });

  it("does not change source during view/mode switches or reparse", () => {
    const source = "  alpha  \r\n\r\n```ts\nconst x = 1;\n```\r\n\r\nunknown ** markup";
    const document = createEditorHistory(source);
    expect(document.current.markdown).toBe(source);
    editableVisualTextRanges(document.current.markdown);
    expect(document.current.markdown).toBe(source);
    expect(document.past).toHaveLength(0);
  });

  it("maps textarea LF offsets back to exact source offsets without normalizing CRLF", () => {
    const source = "first\r\nsecond\rthird\nfourth";
    expect(textareaMarkdown(source)).toBe("first\nsecond\nthird\nfourth");
    const secondStart = textareaMarkdown(source).indexOf("second");
    expect(textareaOffsetToSourceOffset(source, secondStart)).toBe(source.indexOf("second"));
    expect(sourceOffsetToTextareaOffset(source, source.indexOf("third"))).toBe(
      textareaMarkdown(source).indexOf("third"),
    );
  });

  it("applies a textarea edit only to the changed normalized span", () => {
    const source = "first\r\nsecond\r\nthird";
    expect(applyTextareaEdit(source, "first\nSECOND\nthird")).toBe(
      "first\r\nSECOND\r\nthird",
    );
    expect(applyTextareaEdit(source, textareaMarkdown(source))).toBe(source);
  });

  it("treats strikethrough text as an editable visual range", () => {
    const source = "Before ~~old~~ after";
    const oldStart = source.indexOf("old");
    expect(editableVisualTextRanges(source)).toContainEqual({
      start: oldStart,
      end: oldStart + "old".length,
    });
  });

  it("clears supported inline formatting across the requested range while preserving technical syntax", () => {
    const source = "## **bold** _italic_ ~~strike~~ [link](https://example.com) `code`";
    const result = clearInlineMarkdownFormatting(
      source,
      { start: 0, end: source.length },
    );
    expect(result.markdown).toBe("## bold italic strike link `code`");
    expect(result.selection).toEqual({ start: 0, end: result.markdown.length });
  });

  it("splits formatting at partial selection boundaries without changing unselected text", () => {
    const strong = "**alpha beta**";
    const strongStart = strong.indexOf("pha");
    const strongEnd = strongStart + "pha b".length;
    const strongResult = clearInlineMarkdownFormatting(
      strong,
      { start: strongStart, end: strongEnd },
    );
    expect(strongResult.markdown).toBe("**al**pha b**eta**");
    expect(strongResult.markdown.slice(
      strongResult.selection.start,
      strongResult.selection.end,
    )).toBe("pha b");

    const link = "[alpha beta](https://example.com)";
    const linkStart = link.indexOf("pha");
    const linkEnd = linkStart + "pha b".length;
    const linkResult = clearInlineMarkdownFormatting(
      link,
      { start: linkStart, end: linkEnd },
    );
    expect(linkResult.markdown).toBe(
      "[al](https://example.com)pha b[eta](https://example.com)",
    );
    expect(linkResult.markdown.slice(
      linkResult.selection.start,
      linkResult.selection.end,
    )).toBe("pha b");
  });

  it("excludes fenced code info and closing fence from code-only key ranges", () => {
    const source = "```tsx\nabc\n```";
    const ranges = editableCodeRanges(source);
    expect(ranges).toHaveLength(1);
    expect(source.slice(ranges[0]!.start, ranges[0]!.end)).toBe("abc\n");
    expect(ranges[0]!.start).toBe(source.indexOf("abc"));
    expect(ranges[0]!.end).toBe(source.lastIndexOf("```"));
  });

  it("edits nearby prose without rewriting fenced code, inline code or invalid syntax", () => {
    const source = "Before \n\n```ts\nconst a = 1;\n```\n\nAfter with `inline` and **broken";
    const document = createEditorHistory(source);
    const start = source.indexOf("After");
    const edited = editVisualText(document, { start, end: start + 5 }, "Later");
    expect(edited?.current.markdown).toBe(source.replace("After", "Later"));
    expect(edited?.current.markdown).toContain("```ts\nconst a = 1;\n```");
    expect(undoEditorEdit(edited!).current.markdown).toBe(source);
    expect(redoEditorEdit(undoEditorEdit(edited!)).current.markdown).toBe(edited?.current.markdown);
  });

  it("refuses edits in protected technical or structural content", () => {
    const source = "Text `code` [link](https://example.com)\n\n```diff\n+new\n-old\n```";
    const document = createEditorHistory(source);
    for (const needle of ["code", "https://", "+new"]) {
      const start = source.indexOf(needle);
      expect(editVisualText(document, { start, end: start + needle.length }, "removed")).toBeNull();
    }
    const linkStart = source.indexOf("link");
    const linkEdit = editVisualText(document, { start: linkStart, end: linkStart + 4 }, "label");
    expect(linkEdit?.current.markdown).toContain("[label](https://example.com)");
    expect(document.current.markdown).toBe(source);
  });

  it("restores the exact bytes and selections through undo/redo", () => {
    const source = "  Hebrew שלום\r\n\r\n```c#\nX\n```";
    const first = createEditorHistory(source);
    const second = recordEditorEdit(first, source + "\nend", { start: 1, end: 1 }, { start: 4, end: 4 });
    const third = recordEditorEdit(second, source + "\nend!", { start: 4, end: 4 }, { start: 5, end: 5 });
    const before = undoEditorEdit(undoEditorEdit(third));
    expect(before.current).toEqual({ markdown: source, selection: { start: 1, end: 1 } });
    expect(redoEditorEdit(redoEditorEdit(before)).current.markdown).toBe(source + "\nend!");
    expect(third.current.markdown).toContain("\r\n");
  });

  it("clears redo on new edit and retains bounded history", () => {
    let document = createEditorHistory("a");
    for (let index = 0; index < 110; index++) {
      document = recordEditorEdit(document, document.current.markdown + "a",
        { start: 0, end: 0 }, { start: 0, end: 0 });
    }
    expect(document.past).toHaveLength(100);
    const undone = undoEditorEdit(document);
    const divergent = recordEditorEdit(undone, "different", { start: 0, end: 0 }, { start: 0, end: 0 });
    expect(divergent.future).toHaveLength(0);
    expect(redoEditorEdit(divergent)).toBe(divergent);
  });
});
