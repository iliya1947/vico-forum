import { describe, expect, it, vi } from "vitest";
import { addTableDimension, decodeTableCell, encodeTableCell, segmentTechnicalMarkdown, spreadsheetToMarkdown } from "./technical-markdown";

describe("Editor 2.0 technical Markdown source boundaries", () => {
  it("does bounded parsing work for repeated unmatched spoiler openers", () => {
    const source = ":::spoiler\n".repeat(1_000);
    const exec = vi.spyOn(RegExp.prototype, "exec");
    let calls: number;
    try {
      expect(segmentTechnicalMarkdown(source)).toEqual([
        { kind: "prose", span: { start: 0, end: source.length }, source },
      ]);
      calls = exec.mock.calls.length;
    } finally { exec.mockRestore(); }
    // Counts actual parser work rather than relying on machine-dependent timing.
    expect(calls).toBeLessThan(20_000);
  });
  it("finds an ordinary table and keeps absolute cell positions", () => {
    const markdown = "Before\n\n| A | B |\n| --- | :---: |\n| one | two |\n\nAfter";
    const table = segmentTechnicalMarkdown(markdown).find((segment) => segment.kind === "table");
    expect(table?.kind).toBe("table");
    if (!table || table.kind !== "table") return;
    expect(table.headers.map((cell) => markdown.slice(cell.span.start, cell.span.end))).toEqual(["A", "B"]);
    expect(table.rows[0]?.[0]?.text).toBe("one");
    expect(table.align).toEqual([null, "center"]);
    expect(markdown.slice(table.span.start, table.span.end)).toContain("| one | two |");
  });

  it("does not mistake text inside fenced code for tables or spoilers", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const markdown = [fence + "md", "| A | B |", "| --- | --- |", ":::spoiler", "secret", ":::", fence].join("\n");
    expect(segmentTechnicalMarkdown(markdown).map((segment) => segment.kind)).toEqual(["prose"]);
  });

  it("renders only closed spoiler syntax and does not rewrite its source", () => {
    const markdown = "Prefix\n\n:::spoiler Secret\nbody **bold**\n:::\n\nSuffix";
    const spoiler = segmentTechnicalMarkdown(markdown).find((segment) => segment.kind === "spoiler");
    expect(spoiler && spoiler.kind === "spoiler" ? spoiler.title : null).toBe("Secret");
    expect(spoiler && spoiler.kind === "spoiler" ? spoiler.body : null).toBe("body **bold**\n");
    expect(segmentTechnicalMarkdown(":::spoiler no close").map((segment) => segment.kind)).toEqual(["prose"]);
    expect(markdown).toContain(":::spoiler");
  });

  it("does not close a spoiler at markers inside fenced code", () => {
    const fence = "```";
    const source = [
      "Before", "",
      ":::spoiler Secret",
      fence + "md",
      ":::",
      fence,
      "Still inside", ":::",
      "",
      "After",
    ].join("\n");
    const segments = segmentTechnicalMarkdown(source);
    const spoiler = segments.find((part) => part.kind === "spoiler");
    expect(spoiler?.kind).toBe("spoiler");
    if (spoiler?.kind !== "spoiler") return;
    expect(spoiler.body).toBe([fence + "md", ":::", fence, "Still inside"].join("\n") + "\n");
    expect(source.slice(spoiler.span.start, spoiler.span.end)).toContain("Still inside\n:::");
    const unclosed = [":::spoiler", fence + "md", ":::", fence].join("\n");
    expect(segmentTechnicalMarkdown(unclosed).some((part) => part.kind === "spoiler")).toBe(false);
  });

  it("preserves escaped cells and all unrelated source during structural table changes", () => {
    const source = "Top\r\n\r\n| Header | C |\n| --- | --- |\n| a\\|b | raw |\n\nBottom";
    const table = segmentTechnicalMarkdown(source).find((segment) => segment.kind === "table");
    if (!table || table.kind !== "table") throw new Error("table missing");
    const newRow = addTableDimension(source, table, "row");
    expect(newRow).toContain("a\\|b");
    expect(newRow.startsWith("Top\r\n\r\n")).toBe(true);
    expect(newRow.endsWith("\n\nBottom")).toBe(true);
    const newColumn = addTableDimension(source, table, "column");
    expect(newColumn).toContain("a\\|b");
    const parsed = segmentTechnicalMarkdown(newColumn).find((segment) => segment.kind === "table");
    expect(parsed && parsed.kind === "table" ? parsed.headers.length : null).toBe(3);
  });

  it("protects an ordinary Markdown table with more than 200 data rows as one block", () => {
    const rows = Array.from({ length: 201 }, (_, index) => `| row-${index + 1} | value-${index + 1} |`);
    const source = ["| A | B |", "| --- | --- |", ...rows].join("\n");
    const segments = segmentTechnicalMarkdown(source);

    expect(segments.map((segment) => segment.kind)).toEqual(["protected"]);
    const protectedTable = segments[0];
    expect(protectedTable?.kind).toBe("protected");
    if (!protectedTable || protectedTable.kind !== "protected") return;
    expect(protectedTable.source).toBe(source);
    expect(protectedTable.source).toContain("| row-201 | value-201 |");
  });

  it("protects a table shape that would lose data if converted to ordinary cells", () => {
    const source = "| A | B |\n| --- | --- |\n| one | two | extra |";
    expect(segmentTechnicalMarkdown(source).some((segment) => segment.kind === "protected")).toBe(true);
  });

  it("serializes spreadsheet cells as literal Markdown-safe text and restores their exact values", () => {
    const values = [
      ["**literal**", "[shown](https://example.org)"],
      ["a|b", "x\\y"],
      ["~~strike~~", "&copy;"],
      ["# Heading", "_emphasis_"],
    ];
    const source = spreadsheetToMarkdown(
      "First\tSecond\n" + values.map((row) => row.join("\t")).join("\n"),
    );
    expect(source).not.toBeNull();
    const table = segmentTechnicalMarkdown(source!).find((item) => item.kind === "table");
    if (!table || table.kind !== "table") throw new Error("table missing");
    expect(table.rows.map((row) => row.map((cell) => decodeTableCell(cell.text)))).toEqual(values);
    expect(table.rows[0]?.[0]?.text).toBe("\\*\\*literal\\*\\*");
    expect(table.rows[0]?.[1]?.text).toContain("\\[shown\\]\\(");
    expect(table.rows[1]?.[0]?.text).toBe("a\\|b");
    expect(table.rows[1]?.[1]?.text).toBe("x\\\\y");
    expect(encodeTableCell("first\nsecond")).toBe("first second");
    expect(encodeTableCell("first\r\nsecond")).toBe("first second");
  });

  it("converts rectangular spreadsheet TSV to escaped Markdown; rejects loss-prone shapes", () => {
    expect(spreadsheetToMarkdown("A\tB\n1\t2")).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(spreadsheetToMarkdown("A\tB\nfoo|bar\tx\\y")).toContain("foo\\|bar");
    expect(spreadsheetToMarkdown("A\tB\n1\t2\t3")).toBeNull();
    expect(spreadsheetToMarkdown('A\tB\n"line one\nline two"\t3')).toBeNull();
  });
});
