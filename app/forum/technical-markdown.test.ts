import { describe, expect, it } from "vitest";
import { addTableDimension, segmentTechnicalMarkdown, spreadsheetToMarkdown } from "./technical-markdown";

describe("Editor 2.0 technical Markdown source boundaries", () => {
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

  it("converts rectangular spreadsheet TSV to escaped Markdown; rejects loss-prone shapes", () => {
    expect(spreadsheetToMarkdown("A\tB\n1\t2")).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(spreadsheetToMarkdown("A\tB\nfoo|bar\tx\\y")).toContain("foo\\|bar");
    expect(spreadsheetToMarkdown("A\tB\n1\t2\t3")).toBeNull();
    expect(spreadsheetToMarkdown('A\tB\n"line one\nline two"\t3')).toBeNull();
  });
});
