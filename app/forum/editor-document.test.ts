import { describe, expect, it } from "vitest";
import { parseForumMarkdown } from "../markdown-syntax";
import {
  insertVisualParagraph, joinVisualParagraph,
  applyTextareaEdit, clearInlineMarkdownFormatting, createEditorHistory, editableCodeRanges,
  editableVisualTextRanges, editVisualText,
  recordEditorEdit, redoEditorEdit, setParagraphDirection, sourceOffsetToTextareaOffset, textareaMarkdown,
  removeAttachmentImages, replaceAttachmentImageId,
  textareaOffsetToSourceOffset, undoEditorEdit,
} from "./editor-document";

type FormattingNode = {
  type: string; value?: string; children?: FormattingNode[];
  position?: { start: { offset?: number } };
};

function formattingCharacters(markdown: string) {
  const result: Array<{ character: string; formats: string[]; sourceOffset: number }> = [];
  function visit(node: FormattingNode, formats: string[] = []) {
    const active = ["strong", "emphasis", "delete"].includes(node.type) ? [...formats, node.type] : formats;
    let offset = node.position?.start.offset ?? 0;
    if (node.type === "text") for (const character of node.value ?? "") {
      result.push({ character, formats: /\s/u.test(character) ? [] : active, sourceOffset: offset });
      offset += character.length;
    }
    for (const child of node.children ?? []) visit(child, active);
  }
  visit(parseForumMarkdown(markdown));
  return result;
}

describe("Editor 2.0 lossless document foundation", () => {
  it.each([
    ["~~**~~a (b)~~**~~", "a"],
    ["~~**~~a(b)~~**~~", "a"],
    ["~~**~~𐐀 (b)~~**~~", "𐐀"],
    ["~~**~~б (в)~~**~~", "б"],
    ["~~**~~a !b!~~**~~", "a"],
    ["~~**~~a [b]~~**~~", "a"],
    ["~~*~~a (b)~~*~~", "a"],
    ["~~*~~a(b)~~*~~", "a"],
    ["[~~**~~a (b)~~**~~](https://example.test)", "a"],
    ["~~**~~alpha (beta)~~**~~", "pha"],
    ["~~**prefix ~~a (b)~~ suffix**~~", "a"],
    ["~~**a ~~(b)~~ tail**~~", "a"],
    ["~~**prefix ~~a (b)~~ suffix**~~", "prefix"],
    ["~~**~~a (b)~~**~~", "a (b)"],
  ])("preserves effective formatting across repeated strike seams: %s / %s", (inline, selected) => {
    const source = "Untouched\r\n\r\n" + inline + "\r\n\r\n```ts\nkeep **bytes**\n```";
    const start = source.indexOf(selected, source.indexOf(inline)), end = start + selected.length;
    const expected = formattingCharacters(source).map(({ character, formats, sourceOffset }) => ({
      character, formats: [...new Set(sourceOffset >= start && sourceOffset < end ? [] : formats)].sort(),
    }));
    const result = clearInlineMarkdownFormatting(source, { start, end });
    expect(formattingCharacters(result.markdown).map(({ character, formats }) => ({
      character, formats: [...new Set(formats)].sort(),
    }))).toEqual(expected);
    expect(formattingCharacters(result.markdown.slice(result.selection.start, result.selection.end))
      .map((item) => item.character).join("")).toBe(selected);
    expect(result.markdown.startsWith("Untouched\r\n\r\n")).toBe(true);
    expect(result.markdown.endsWith("\r\n\r\n```ts\nkeep **bytes**\n```")).toBe(true);
  });

  it("leaves a redundant strike away from the rebuilt boundary byte-identical", () => {
    const source = "~~before **~~inside~~** after~~";
    const start = source.indexOf("bef");
    const result = clearInlineMarkdownFormatting(source, { start, end: start + 3 });
    expect(result.markdown).toContain("**~~inside~~** after~~");
  });

  it.each(["~~**alpha beta**~~", "~~*alpha beta*~~", "~~alpha beta~~", "**~~alpha beta~~**"]
    .flatMap((source) => ["a", "l", "alpha", "beta"].map((selected) => [source, selected] as const)))("keeps selected-only rendered formatting for %s / %s", (source, selected) => {
    const start = source.indexOf(selected), end = start + selected.length;
    const expected = formattingCharacters(source).map(({ character, formats, sourceOffset }) => ({
      character, formats: sourceOffset >= start && sourceOffset < end ? [] : formats,
    }));
    const result = clearInlineMarkdownFormatting(source, { start, end });
    expect(formattingCharacters(result.markdown).map(({ character, formats }) => ({ character, formats }))).toEqual(expected);
    expect(formattingCharacters(result.markdown.slice(result.selection.start, result.selection.end))
      .map((item) => item.character).join("")).toBe(selected);
  });

  it.each(["𐐀", "б"])("preserves encoded %s on a mixed strike boundary", (selected) => {
    const source = `~~**${selected}lpha beta**~~`;
    const start = source.indexOf(selected);
    const result = clearInlineMarkdownFormatting(source, { start, end: start + selected.length });
    expect(formattingCharacters(result.markdown).map((item) => item.character).join("")).toBe(`${selected}lpha beta`);
    expect(formattingCharacters(result.markdown)[0]?.formats).toEqual([]);
    expect(formattingCharacters(result.markdown).slice(1).filter((item) => item.character.trim())
      .every((item) => item.formats.includes("delete") && item.formats.includes("strong"))).toBe(true);
    expect(formattingCharacters(result.markdown.slice(result.selection.start, result.selection.end))
      .map((item) => item.character).join("")).toBe(selected);
  });

  it("clears all nested strike formatting without leaving markers", () => {
    const source = "~~**alpha beta**~~";
    expect(clearInlineMarkdownFormatting(source, { start: 0, end: source.length }).markdown).toBe("alpha beta");
  });

  it.each([
    ["**alpha *beta gamma* delta**", "beta", "**alpha** beta ***gamma* delta**"],
    ["**alpha *beta gamma* delta**", "gamma", "**alpha *beta*** gamma **delta**"],
    ["**alpha *beta* gamma**", "beta", "**alpha** beta **gamma**"],
    ["**alpha *beta* gamma**", "gamma", "**alpha *beta*** gamma"],
    ["[alpha beta](https://x)", "alpha", "alpha[ beta](https://x)"],
    ["[alpha beta](https://x)", "beta", "[alpha ](https://x)beta"],
    ["[**alpha beta**](https://x)", "beta", "[**alpha** ](https://x)beta"],
  ])("clears %s / %s without corrupting nested or unselected link boundaries", (source, selected, expected) => {
    const start = source.indexOf(selected);
    const result = clearInlineMarkdownFormatting(source, { start, end: start + selected.length });
    expect(result.markdown).toBe(expected);
    expect(result.markdown.slice(result.selection.start, result.selection.end)).toBe(selected);
  });

  it.each([
    ["beta", 0, "**alpha** \n\n***beta gamma* delta**"],
    ["gamma", 5, "**alpha *beta gamma***\n\n **delta**"],
    ["beta", 2, "**alpha *be***\n\n***ta gamma* delta**"],
  ])("splits nested formatting at %s + %s", (word, offset, expected) => {
    const source = "**alpha *beta gamma* delta**";
    const caret = source.indexOf(word) + offset;
    const result = insertVisualParagraph(source, { start: caret, end: caret });
    expect(result.markdown).toBe(expected);
    expect(result.markdown.slice(result.selection.start)).toMatch(/^(?:beta|delta|ta)/);
  });

  it.each(["ltr", "rtl"])("retains the previous paragraph's explicit %s direction on join", (direction) => {
    const source = `Alpha {:vico-dir=${direction}}\r\n\r\nBeta`;
    const caret = source.indexOf("Beta");
    const result = joinVisualParagraph(source, { start: caret, end: caret });
    expect(result?.markdown).toBe(`AlphaBeta {:vico-dir=${direction}}`);
    expect(result?.selection).toEqual({ start: 5, end: 5 });
    const empty = source.slice(0, caret);
    expect(joinVisualParagraph(empty, { start: empty.length, end: empty.length }))
      .toEqual({ markdown: `Alpha {:vico-dir=${direction}}`, selection: { start: 5, end: 5 } });
  });

  it("retains terminal direction during wrapper coalescing and preserves a right-only override", () => {
    for (const current of ["", " {:vico-dir=rtl}", " {:vico-dir=ltr}"]) {
      const source = `**Alpha** {:vico-dir=rtl}\n\n**Beta**${current}`;
      const caret = source.indexOf("Beta");
      expect(joinVisualParagraph(source, { start: caret, end: caret })?.markdown)
        .toBe("**AlphaBeta** {:vico-dir=rtl}");
    }
    const source = "Alpha\n\nBeta {:vico-dir=rtl}";
    const caret = source.indexOf("Beta");
    expect(joinVisualParagraph(source, { start: caret, end: caret })?.markdown)
      .toBe("AlphaBeta {:vico-dir=rtl}");
  });

  it.each(["beta", "gamma", "𐐀amma"])("preserves nested-link flanking and selected character references: %s", (selected) => {
    const second = selected === "𐐀amma" ? selected : "gamma";
    const source = `**alpha [beta ${second}](https://x) delta**`;
    const start = source.indexOf(selected);
    const result = clearInlineMarkdownFormatting(source, { start, end: start + selected.length });
    const root = parseForumMarkdown(result.markdown);
    const text = (node: { value?: string; children?: unknown[] }): string => node.value
      ?? (node.children ?? []).map((child) => text(child as Parameters<typeof text>[0])).join("");
    expect(text(root)).toBe(`alpha beta ${second} delta`);
    expect(text(parseForumMarkdown(result.markdown.slice(result.selection.start, result.selection.end)))).toBe(selected);
    expect(result.markdown).toContain("https://x");
  });

  it.each(["**alpha beta**", "*alpha beta*", "~~alpha beta~~", "**_alpha beta_**", "[alpha beta](https://example.com)"])("splits active wrappers without touching surrounding source: %s", (inline) => {
    const source = "Before\r\n\r\n" + inline + "\r\n\r\n```js\nconst x = 1;\n```";
    const caret = source.indexOf("alpha") + 5;
    const result = insertVisualParagraph(source, { start: caret, end: caret });
    expect(result.markdown.startsWith("Before\r\n\r\n")).toBe(true);
    expect(result.markdown.endsWith("\r\n\r\n```js\nconst x = 1;\n```")).toBe(true);
    expect(result.markdown.slice(result.selection.start)).toMatch(/^beta/);
  });

  it.each([
    ["_Alpha_\n\nBeta", "*Alpha*Beta"],
    ["Alpha\n\n_Beta_", "Alpha*Beta*"],
    ["**Alpha**\n\n__Beta__", "**AlphaBeta**"],
  ])("preserves emphasis flanking when joining %s", (source, expected) => {
    const caret = source.indexOf("Beta");
    expect(joinVisualParagraph(source, { start: caret, end: caret })?.markdown).toBe(expected);
  });

  it("preserves paragraph indentation and joins prose inside a spoiler body", () => {
    expect(joinVisualParagraph("Alpha\n\n beta", { start: 7, end: 7 })?.markdown).toBe("Alpha beta");
    const source = ":::spoiler Label\nAlpha \n\nbeta\n:::\n";
    const caret = source.indexOf("beta");
    const joined = joinVisualParagraph(source, { start: caret, end: caret });
    expect(joined?.markdown).toBe(":::spoiler Label\nAlpha beta\n:::\n");
  });

  it("joins an empty trailing paragraph but keeps protected block boundaries", () => {
    expect(joinVisualParagraph("Alpha\n\n", { start: 7, end: 7 })?.markdown).toBe("Alpha");
    for (const source of ["# Heading\n\nBeta", "```ts\ncode\n```\n\nBeta", "- List\n\nBeta", "| H |\n| --- |\n| cell |\n\nBeta"]) {
      const start = source.indexOf("Beta");
      expect(joinVisualParagraph(source, { start, end: start })).toBeNull();
    }
    expect(joinVisualParagraph("Alpha\n\nBeta", { start: 8, end: 8 })).toBeNull();
    const formatted = "**_Alpha_**\n\n**_Beta_**";
    const caret = formatted.indexOf("Beta");
    const joined = joinVisualParagraph(formatted, { start: caret, end: caret });
    expect(joined?.markdown).toBe("***AlphaBeta***");
    expect(joined?.selection).toEqual({ start: 8, end: 8 });
  });

  it.each([
    ["**alpha beta**", "alpha", "alpha **beta**"],
    ["**alpha beta**", "beta", "**alpha** beta"],
    ["~~alpha beta~~", "alpha", "alpha ~~beta~~"],
    ["*alpha beta*", "beta", "*alpha* beta"],
    ["**alpha   beta**", "alpha", "alpha   **beta**"],
    ["_alpha beta_", "pha b", "*al*pha b*eta*"],
  ])("keeps unselected formatting valid around whitespace: %s / %s", (source, selected, expected) => {
    const start = source.indexOf(selected);
    const result = clearInlineMarkdownFormatting(source, { start, end: start + selected.length });
    expect(result.markdown).toBe(expected);
    expect(result.markdown.slice(result.selection.start, result.selection.end)).toBe(selected);
  });
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
