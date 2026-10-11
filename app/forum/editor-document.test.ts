import { describe, expect, it } from "vitest";
import {
  createEditorHistory, editableVisualTextRanges, editVisualText,
  recordEditorEdit, redoEditorEdit, undoEditorEdit,
} from "./editor-document";

describe("Editor 2.0 lossless document foundation", () => {
  it("does not change source during view/mode switches or reparse", () => {
    const source = "  alpha  \r\n\r\n```ts\nconst x = 1;\n```\r\n\r\nunknown ** markup";
    const document = createEditorHistory(source);
    expect(document.current.markdown).toBe(source);
    editableVisualTextRanges(document.current.markdown);
    expect(document.current.markdown).toBe(source);
    expect(document.past).toHaveLength(0);
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
    for (const needle of ["code", "link", "https://", "+new"]) {
      const start = source.indexOf(needle);
      expect(editVisualText(document, { start, end: start + needle.length }, "removed")).toBeNull();
    }
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
