import { describe, expect, it } from "vitest";
import {
  applyTextareaEdit, clearInlineMarkdownFormatting, createEditorHistory, editableCodeRanges,
  editableVisualTextRanges, editVisualText,
  recordEditorEdit, redoEditorEdit, setParagraphDirection, sourceOffsetToTextareaOffset, textareaMarkdown,
  removeAttachmentImages, replaceAttachmentImageId,
  textareaOffsetToSourceOffset, undoEditorEdit,
} from "./editor-document";

describe("Editor 2.0 lossless document foundation", () => {
  it("removes active attachment images while preserving the same text inside code and escaped syntax", () => {
    const id = "23b93562-0550-4eef-88af-f951d6ea6138";
    const image = `![caption](vico-attachment:${id})`;
    const untouched = `\`\`\`md\r\n${image}\r\n\`\`\`\r\n\r\n\`${image}\`\r\n\r\n\\${image}`;
    const source = `${image}\r\n\r\n${untouched}\r\n\r\n![reference][file]\r\n\r\n[file]: vico-attachment:${id}\r\n`;
    expect(removeAttachmentImages(source, id)).toBe(`\r\n\r\n${untouched}\r\n\r\n\r\n\r\n[file]: vico-attachment:${id}\r\n`);
  });

  it("re-keys active attachment destinations without rewriting code, labels or escaped images", () => {
    const old = "23b93562-0550-4eef-88af-f951d6ea6138", next = "23b93562-0550-4eef-88af-f951d6ea6139";
    const url = `vico-attachment:${old}`;
    const active = `![${url}](${url} "title")`;
    const reference = `![ref][file]\r\n\r\n[file]: <${url}> "caption"`;
    const inert = "`" + active + "`\r\n\r\n\\" + active + "\r\n\r\n```md\n" + active + "\n```";
    const source = active + "\r\n\r\n" + reference + "\r\n\r\n" + inert;
    expect(replaceAttachmentImageId(source, old, next)).toBe(
      `![${url}](vico-attachment:${next} "title")\r\n\r\n![ref][file]\r\n\r\n[file]: <vico-attachment:${next}> "caption"\r\n\r\n` + inert);
  });

  it.each(["", "\n", "\r\n\r\nFollowing text"])("re-keys a bare reference definition with suffix %j", (suffix) => {
    const old = "23b93562-0550-4eef-88af-f951d6ea6138", next = "23b93562-0550-4eef-88af-f951d6ea6139";
    const source = `![caption][file]\n\n[file]: vico-attachment:${old}${suffix}`;
    expect(replaceAttachmentImageId(source, old, next)).toBe(
      `![caption][file]\n\n[file]: vico-attachment:${next}${suffix}`);
  });

  it("re-keys the actual destination when image labels and titles contain destination-like text", () => {
    const old = "23b93562-0550-4eef-88af-f951d6ea6138", next = "23b93562-0550-4eef-88af-f951d6ea6139";
    const label = "`x](vico-attachment:" + old + ")`";
    const title = ` "also ](vico-attachment:${old})"`;
    expect(replaceAttachmentImageId(`![${label}](vico-attachment:${old}${title})`, old, next))
      .toBe(`![${label}](vico-attachment:${next}${title})`);
  });

  it.each(["![file][]", "![file]", "![caption][FiLe]"])("re-keys the active reference form %s without changing other definitions", (image) => {
    const old = "23b93562-0550-4eef-88af-f951d6ea6138", next = "23b93562-0550-4eef-88af-f951d6ea6139";
    const url = `vico-attachment:${old}`;
    const untouched = `\n\n[file]: ${url}\n\n[link](<${url}>)\n\n[link-only][other]\n\n[other]: ${url}\n\n[unused]: ${url}`;
    const source = image + `\n\n[file]: ${url}` + untouched;
    expect(replaceAttachmentImageId(source, old, next)).toBe(image + `\n\n[file]: vico-attachment:${next}` + untouched);
  });

  it.each(["vico&#45;attachment:", "vico\\-attachment:"])("re-keys decoded active destinations written as %s", (scheme) => {
    const old = "23b93562-0550-4eef-88af-f951d6ea6138", next = "23b93562-0550-4eef-88af-f951d6ea6139";
    const source = `> ![caption](<${scheme}${old}>)\r\n>\r\n> ![reference][file]\r\n>\r\n> [file]: ${scheme}${old}`;
    expect(replaceAttachmentImageId(source, old, next)).toBe(
      `> ![caption](<vico-attachment:${next}>)\r\n>\r\n> ![reference][file]\r\n>\r\n> [file]: vico-attachment:${next}`);
  });

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
