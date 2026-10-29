import { describe, expect, it } from "vitest";
import { parseRenderedForumMarkdown, serializeRenderedForumMarkdown } from "./semantic-markdown";
import { protectMarkdownForTranslation } from "../localization/content-markdown-translation";

describe("authored direction translation round trip", () => {
  it.each([
    "Human prose {:vico-dir=rtl}", "Human prose {:vico-dir=ltr}",
    "## Human heading {:vico-dir=rtl}", "Human heading {:vico-dir=ltr}\n---",
    "- Human item {:vico-dir=rtl}",
    ":::spoiler Label\nHuman prose {:vico-dir=rtl}\n:::",
    "| Header | Value |\n| --- | --- |\n| Human prose {:vico-dir=rtl} | Other |",
  ])("retains authored direction for %s", (source) => {
    const before = parseRenderedForumMarkdown(source);
    const serialize = serializeRenderedForumMarkdown(before);
    const doc = protectMarkdownForTranslation(source);
    const restored = doc.restore(doc.segments.map((segment) => ({ id: segment.id, value: segment.text })));
    expect(serialize).toContain(source.includes("=rtl") ? "{:vico-dir=rtl}" : "{:vico-dir=ltr}");
    expect(restored).toContain(source.includes("=rtl") ? "{:vico-dir=rtl}" : "{:vico-dir=ltr}");
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => key === "position" ? undefined : item));
    expect(normalize(parseRenderedForumMarkdown(restored))).toEqual(normalize(before));
  });

  it.each([String.raw`Human prose \{:vico-dir=rtl}`, String.raw`Human prose \{:vico-dir=ltr}`])(
    "retains literal escaped direction text: %s", (source) => {
      const doc = protectMarkdownForTranslation(source);
      const restored = doc.restore(doc.segments.map((segment) => ({ id: segment.id, value: segment.text })));
      expect(restored).toContain(String.raw`\{:vico-dir=`);
      expect(JSON.stringify(parseRenderedForumMarkdown(restored))).not.toContain('"dir":');
    },
  );

  it("preserves direction after an ordinary translation and keeps literal lookalikes inactive", () => {
    const doc = protectMarkdownForTranslation("Human prose {:vico-dir=rtl}");
    expect(doc.restore(doc.segments.map((segment) => ({ id: segment.id, value: "Переведённый текст" }))))
      .toContain("Переведённый текст {:vico-dir=rtl}");
  });
});
