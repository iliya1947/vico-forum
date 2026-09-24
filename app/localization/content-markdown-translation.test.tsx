import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ForumMarkdown } from "../forum/markdown";
import {
  MAX_TRANSLATED_MARKDOWN_SEGMENT_CHARACTERS,
  MarkdownTranslationValidationError,
  protectMarkdownForTranslation,
  type MarkdownSegmentTranslation,
} from "./content-markdown-translation";

afterEach(cleanup);

function translateIdentity(
  segments: readonly { id: string; text: string }[],
): MarkdownSegmentTranslation[] {
  return segments.map((segment) => ({ id: segment.id, value: segment.text }));
}

function protectedMarkers(value: string): string[] {
  return value.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu) ?? [];
}

describe("protected CommonMark translation", () => {
  it("extracts ordered semantic text while preserving block and inline structure", () => {
    const source = `# Translate this **carefully**

- First *human phrase*
- Visit [documentation](https://example.com/docs)

> שלום עולם
`;
    const first = protectMarkdownForTranslation(source);
    const second = protectMarkdownForTranslation(source);

    expect(second.protectedMarkdown).toBe(first.protectedMarkdown);
    expect(second.segments).toEqual(first.segments);
    expect(first.segments.map((segment) => segment.id)).toEqual([
      "segment:root/heading[0]/text[0]",
      "segment:root/heading[0]/strong[1]/text[0]",
      "segment:root/list[1]/listItem[0]/paragraph[0]/text[0]",
      "segment:root/list[1]/listItem[0]/paragraph[0]/emphasis[1]/text[0]",
      "segment:root/list[1]/listItem[1]/paragraph[0]/text[0]",
      "segment:root/list[1]/listItem[1]/paragraph[0]/link[1]/text[0]",
      "segment:root/blockquote[2]/paragraph[0]/text[0]",
    ]);
    expect(first.segments.map((segment) => segment.text).join("\n")).not.toContain(
      "https://example.com/docs",
    );

    const restored = first.restore(translateIdentity(first.segments));
    const { container } = render(<ForumMarkdown>{restored}</ForumMarkdown>);

    expect(screen.getByRole("heading", { name: "Translate this carefully" })).not.toBeNull();
    expect(screen.getByText("carefully").tagName).toBe("STRONG");
    expect(screen.getByText("human phrase").tagName).toBe("EM");
    expect(screen.getByRole("link", { name: "documentation" }).getAttribute("href"))
      .toBe("https://example.com/docs");
    expect(container.querySelector("blockquote")?.textContent).toContain("שלום עולם");
  });

  it("never exposes inline/fenced/indented code, autolink URLs, raw HTML, or image data as segments", () => {
    const source = `Before \`inlineCode()\` after.

    const indented = fooBar();

\`\`\`ts
const fenced = fooBar();
\`\`\`

<https://example.com/raw>

![tracking](https://evil.example/pixel.png)

<div>raw html</div>
`;
    const document = protectMarkdownForTranslation(source);
    const exposed = document.segments.map((segment) => segment.text).join("\n");

    expect(exposed).toContain("Before ");
    expect(exposed).toContain(" after.");
    expect(exposed).not.toContain("inlineCode");
    expect(exposed).not.toContain("indented");
    expect(exposed).not.toContain("fenced");
    expect(exposed).not.toContain("https://example.com/raw");
    expect(exposed).not.toContain("tracking");
    expect(exposed).not.toContain("evil.example");
    expect(exposed).not.toContain("raw html");

    const restored = document.restore(translateIdentity(document.segments));
    const { container } = render(<ForumMarkdown>{restored}</ForumMarkdown>);
    expect(screen.getByText("inlineCode()").tagName).toBe("CODE");
    expect(screen.getByText(/const indented/).closest("pre")).not.toBeNull();
    expect(screen.getByText(/const fenced/).closest("pre")).not.toBeNull();
    expect(screen.getByRole("link", { name: "https://example.com/raw" }).getAttribute("href"))
      .toBe("https://example.com/raw");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".post-body > div")).toBeNull();
  });

  it("protects repeated URLs and technical identifiers with ordered collision-safe tokens", () => {
    const source = "Call fetchData() at https://api.example/v1 with API_TOKEN and fetchData() again.";
    const document = protectMarkdownForTranslation(source);

    expect(document.segments).toHaveLength(1);
    const segment = document.segments[0]!;
    const tokens = protectedMarkers(segment.text);
    expect(tokens).toHaveLength(4);
    expect(new Set(tokens).size).toBe(4);

    const translated = `Вызови ${tokens[0]} через ${tokens[1]} с ${tokens[2]}, затем ${tokens[3]} снова.`;
    const restored = document.restore([{ id: segment.id, value: translated }]);
    expect(restored).toContain("fetchData()");
    expect(restored).toContain("https://api.example/v1");
    expect(restored.match(/fetchData\(\)/gu)).toHaveLength(2);
    const { container } = render(<ForumMarkdown>{restored}</ForumMarkdown>);
    expect(container.textContent).toContain("API_TOKEN");

    expect(() => document.restore([{
      id: segment.id,
      value: `Вызови ${tokens[1]} затем ${tokens[0]} с ${tokens[2]} и ${tokens[3]}.`,
    }])).toThrow(expect.objectContaining({
      code: "protected-token-mismatch",
      disposition: "original-fallback",
    }));
    expect(() => document.restore([{
      id: segment.id,
      value: `Вызови ${tokens[0]} ${tokens[0]} ${tokens[1]} ${tokens[2]} ${tokens[3]}.`,
    }])).toThrow(expect.objectContaining({ code: "protected-token-mismatch" }));
  });

  it("allocates deterministic marker namespaces that cannot collide with source text", () => {
    const source = "Human VICOSEGMENT0X text and ⟦VICOPROTECTED0X marker with fetchData().";
    const document = protectMarkdownForTranslation(source);

    expect(document.protectedMarkdown).toContain("VICOSEGMENT1X");
    expect(document.segments[0]?.text).not.toContain("⟦VICOPROTECTED0X");
    expect(document.segments[0]?.text).toContain("⟦VICOPROTECTED1X");
    const restored = document.restore(translateIdentity(document.segments));
    const { container } = render(<ForumMarkdown>{restored}</ForumMarkdown>);
    expect(container.textContent).toContain("VICOSEGMENT0X");
    expect(container.textContent).toContain("⟦VICOPROTECTED0X");
  });

  it("rejects missing, extra, duplicate, blank, oversized, and malformed segment translations", () => {
    const document = protectMarkdownForTranslation("# Heading\n\nBody text.");
    expect(document.segments.length).toBeGreaterThan(1);
    const valid = translateIdentity(document.segments);

    for (const invalid of [
      valid.slice(1),
      [...valid, { id: "segment:extra", value: "extra" }],
      [valid[0]!, valid[0]!, ...valid.slice(1)],
    ]) {
      expect(() => document.restore(invalid)).toThrow(expect.objectContaining({
        code: "invalid-segment-set",
        disposition: "original-fallback",
      }));
    }

    expect(() => document.restore([
      { ...valid[0]!, value: "   " },
      ...valid.slice(1),
    ])).toThrow(expect.objectContaining({ code: "invalid-segment-value" }));
    expect(() => document.restore([
      { ...valid[0]!, value: "x".repeat(MAX_TRANSLATED_MARKDOWN_SEGMENT_CHARACTERS + 1) },
      ...valid.slice(1),
    ])).toThrow(expect.objectContaining({ code: "invalid-segment-value" }));
    expect(() => document.restore([
      { ...valid[0]!, value: "bad\u0000value" },
      ...valid.slice(1),
    ])).toThrow(expect.objectContaining({ code: "invalid-segment-value" }));
  });

  it("inserts provider values as text and rejects attempts that would change block structure", () => {
    const document = protectMarkdownForTranslation(
      "Safe paragraph with [label](https://example.com/docs).",
    );
    const inlineTranslations = document.segments.map((segment, index) => ({
      id: segment.id,
      value: index === 0
        ? "[evil](javascript:alert(1)) <script>alert(1)</script>"
        : segment.text,
    }));

    const restored = document.restore(inlineTranslations);
    const { container } = render(<ForumMarkdown>{restored}</ForumMarkdown>);

    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByRole("link", { name: "evil" })).toBeNull();
    expect(screen.getByRole("link", { name: "label" }).getAttribute("href"))
      .toBe("https://example.com/docs");
    expect(container.textContent).toContain("[evil](javascript:alert(1))");
    expect(container.textContent).toContain("<script>alert(1)</script>");

    const blockInjection = document.segments.map((segment, index) => ({
      id: segment.id,
      value: index === 0 ? "safe\n\n# injected" : segment.text,
    }));
    expect(() => document.restore(blockInjection)).toThrow(
      expect.objectContaining({
        code: "protected-structure-mismatch",
        disposition: "original-fallback",
      }),
    );
  });

  it("preserves escaped Markdown, Unicode/RTL text, and the existing no-external-image renderer policy", () => {
    const source = `Escaped \\*literal\\* and \\[brackets\\].

فقرة عربية مع fooBar.

![tracking](https://evil.example/pixel.png)
`;
    const document = protectMarkdownForTranslation(source);
    const restored = document.restore(translateIdentity(document.segments));
    const { container } = render(<div dir="rtl"><ForumMarkdown>{restored}</ForumMarkdown></div>);

    expect(container.querySelector("em")).toBeNull();
    expect(screen.queryByRole("link", { name: "brackets" })).toBeNull();
    expect(container.textContent).toContain("*literal*");
    expect(container.textContent).toContain("[brackets]");
    expect(container.textContent).toContain("فقرة عربية مع fooBar.");
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps failures typed for exact-original fallback by later content execution", () => {
    const document = protectMarkdownForTranslation("Translate fetchData() safely.");
    const segment = document.segments[0]!;
    const [token] = protectedMarkers(segment.text);

    try {
      document.restore([{ id: segment.id, value: `Перевод без ${token ? "" : "token"}` }]);
      throw new Error("expected validation error");
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownTranslationValidationError);
      expect(error).toMatchObject({
        code: "protected-token-mismatch",
        disposition: "original-fallback",
      });
    }
  });
});
