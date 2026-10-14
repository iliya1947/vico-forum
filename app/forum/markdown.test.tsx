import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ForumMarkdown, ForumInlineAttachmentProvider, highlightCode } from "./markdown";

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[key + "_" + branch] = value;
    }
  }
  return resources;
}

function runtime() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: canonicalCommonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function renderMarkdown(markdown: string, direction?: "ltr" | "rtl") {
  return render(
    <I18nextProvider i18n={runtime()}>
      <div dir={direction}>
        <ForumMarkdown>{markdown}</ForumMarkdown>
      </div>
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("authorized inline attachment image Markdown", () => {
  const id = "23b93562-0550-4eef-88af-f951d6ea6138";
  const url = `/api/attachments/file/${id}?post=post-123`;
  const body = `Before ![shot](vico-attachment:${id}) after\n\n![remote](https://example.invalid/tracker.png)`;

  it("uses only a current server-verified raster reference, never arbitrary image URLs", () => {
    const attached = { id, fileName: "shot.png", byteSize: 5, detectedType: "png", url };
    const view = render(<I18nextProvider i18n={runtime()}>
      <ForumInlineAttachmentProvider attachments={[attached]}>
        <ForumMarkdown>{body}</ForumMarkdown>
      </ForumInlineAttachmentProvider>
    </I18nextProvider>);
    expect(screen.getByAltText("shot.png")).toHaveAttribute("src", url + "&view=inline");
    expect(screen.queryByAltText("remote")).not.toBeInTheDocument();
    view.rerender(<I18nextProvider i18n={runtime()}>
      <ForumInlineAttachmentProvider attachments={[]}>
        <ForumMarkdown>{body}</ForumMarkdown>
      </ForumInlineAttachmentProvider>
    </I18nextProvider>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not turn non-raster and unrecognized IDs into working images", () => {
    render(<I18nextProvider i18n={runtime()}>
      <ForumInlineAttachmentProvider attachments={[{
        id, fileName: "source.txt", byteSize: 5, detectedType: "text", url,
      }]}>
        <ForumMarkdown>{body}</ForumMarkdown>
      </ForumInlineAttachmentProvider>
    </I18nextProvider>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Editor 2.0 technical rendering", () => {
  it("renders ordinary Markdown tables in published content safely", () => {
    const { container } = renderMarkdown("| Name | Value |\n| --- | --- |\n| **A** | [docs](https://example.org) |");
    expect(container.querySelectorAll(".forum-markdown-table th")).toHaveLength(2);
    expect(container.querySelectorAll(".forum-markdown-table td")).toHaveLength(2);
    expect(screen.getByText("A").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("rel", "nofollow noopener noreferrer ugc");
  });

  it("renders agreed double-tilde strikethrough without enabling unrelated GFM syntax", () => {
    const { container } = renderMarkdown("Before ~~old~~ after");
    expect(screen.getByText("old").tagName).toBe("DEL");
    expect(container.textContent).toContain("Before old after");
  });

  it("supports a collapsed spoiler without executing inline HTML or opening images", async () => {
    const { container } = renderMarkdown(":::spoiler Info\n**secret**\n\n<script>alert(1)</script>\n:::");
    const spoiler = container.querySelector(".forum-markdown-spoiler");
    expect(spoiler).not.toHaveAttribute("open");
    expect(spoiler?.querySelector("summary")).toHaveTextContent("Info");
    expect(spoiler?.querySelector("strong")).toHaveTextContent("secret");
    expect(container.querySelector("script, img")).toBeNull();
    await userEvent.click(screen.getByText("Info"));
    expect(spoiler).toHaveAttribute("open");
  });

  it("shows a fenced-code filename separately from copyable source", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const fence = String.fromCharCode(96).repeat(3);
    renderMarkdown(fence + 'tsx filename="src/main.tsx"\nexport const n = 4;\n' + fence);
    expect(screen.getByText("src/main.tsx")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("export const n = 4;");
  });

  it("highlights Diff plus and minus while preserving exact copied code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const source = "+added\n-removed\n unchanged";
    const { container } = renderMarkdown(String.fromCharCode(96).repeat(3) + "diff\n" + source + "\n" + String.fromCharCode(96).repeat(3));
    expect(container.querySelector(".syntax-diff-add")).toHaveTextContent("+added");
    expect(container.querySelector(".syntax-diff-remove")).toHaveTextContent("-removed");
    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith(source);
  });
});

describe("ForumMarkdown", () => {
  it("renders CommonMark paragraphs, emphasis, lists, inline code, and fenced code", () => {
    const { container } = renderMarkdown(`First *important* paragraph.

- one
- two with \`inline()\`

\`\`\`ts
const longValue = "code";
\`\`\``);

    expect(screen.getByText("important").tagName).toBe("EM");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("inline()").tagName).toBe("CODE");
    expect(container.querySelector("pre")?.textContent).toContain('const longValue = "code";');
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(container.querySelector(".syntax-keyword")).toHaveTextContent("const");
    expect(container.querySelector(".syntax-string")).toHaveTextContent('"code"');
  });

  it("does not turn raw HTML, event handlers, unsafe URLs, or images into active DOM", () => {
    const { container } = renderMarkdown(`<script>window.pwned = true</script>

<button onclick="window.pwned = true">unsafe</button>

[bad](javascript:alert(1))

![tracking](https://evil.example/pixel.png)`);

    expect(container.querySelector("script, button, img")).toBeNull();
    const unsafeLink = container.querySelector("a");
    expect(unsafeLink?.getAttribute("href")).not.toMatch(/^javascript:/i);
  });

  it("keeps HTTPS links useful and marks them as user-generated content", () => {
    renderMarkdown("[documentation](https://example.com/docs)");
    expect(screen.getByRole("link", { name: "documentation" })).toMatchObject({
      href: "https://example.com/docs",
      target: "_blank",
      rel: "nofollow noopener noreferrer ugc",
    });
  });

  it("copies code and toggles line wrapping without changing rendered code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    const { container } = renderMarkdown("```ts\nconst answer = true;\n```");
    const codeBlock = container.querySelector(".forum-code-block");
    expect(codeBlock).not.toHaveAttribute("dir", "ltr");
    expect(codeBlock?.querySelector("pre")).toHaveAttribute("dir", "ltr");
    expect(codeBlock).toHaveAttribute("data-wrap", "false");

    await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }));
    expect(codeBlock).toHaveAttribute("data-wrap", "true");
    expect(screen.getByRole("button", { name: "No wrap" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("const answer = true;");
    expect(screen.getByText("Code copied")).toBeInTheDocument();
  });

  it("aligns code rows and line numbers without adding numbers to copied source", async () => {
    const code = "first line\n\nthird line";
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const { container } = renderMarkdown("```txt\n" + code + "\n```");

    const block = container.querySelector(".forum-code-block");
    expect(block?.querySelectorAll(".forum-code-line")).toHaveLength(3);
    expect(block?.querySelectorAll(".forum-code-line-number")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Line numbers" }));
    expect(block?.querySelector("pre")).toHaveAttribute("data-line-numbers", "true");
    expect(Array.from(block?.querySelectorAll(".forum-code-line-number") ?? []).map((node) => node.textContent))
      .toEqual(["1", "2", "3"]);
    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith(code);
  });

  it("preserves source newlines and multiline tokens through code presentation controls", async () => {
    const source = "\n/* multiline\n\ncomment */\nconst value = 1;\n\n";
    const fence = "```";
    const { container } = renderMarkdown(fence + "ts\n" + source + "\n" + fence);
    const sourceText = () => Array.from(container.querySelectorAll(".forum-code-line-text"))
      .map((node) => node.textContent).join("");
    expect(sourceText()).toBe(source);
    expect(container.querySelectorAll(".forum-code-line")).toHaveLength(source.split("\n").length);
    expect(container.querySelector(".forum-code-source-newline")).toBeNull();
    expect(container.querySelectorAll(".syntax-comment")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Line numbers" }));
    await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }));
    expect(sourceText()).toBe(source);
  });

  it("shares the full code gutter width across digit-count boundaries", async () => {
    const fence = "```";
    const ninetyNine = Array.from({ length: 99 }, () => "same()").join("\n");
    const { container, rerender } = renderMarkdown(fence + "txt\n" + ninetyNine + "\n" + fence);
    await userEvent.click(screen.getByRole("button", { name: "Line numbers" }));
    const code = container.querySelector(".forum-code-block code") as HTMLElement;
    expect(code.style.getPropertyValue("--forum-code-gutter-width")).toBe("2ch");
    expect(container.querySelectorAll(".forum-code-line-number")).toHaveLength(99);

    const hundred = ninetyNine + "\nsame()";
    rerender(<I18nextProvider i18n={runtime()}>
      <div><ForumMarkdown>{fence + "txt\n" + hundred + "\n" + fence}</ForumMarkdown></div>
    </I18nextProvider>);
    const updatedCode = container.querySelector(".forum-code-block code") as HTMLElement;
    expect(updatedCode.style.getPropertyValue("--forum-code-gutter-width")).toBe("3ch");
    expect(container.querySelectorAll(".forum-code-line-number")).toHaveLength(100);
    expect(Array.from(container.querySelectorAll(".forum-code-line-text"))
      .map((node) => node.textContent).join("")).toBe(hundred);
  });

  it("respects Diff size and post-wide syntax highlighting budgets", () => {
    const fence = "```";
    const oversized = "+" + "x".repeat(20_001) + "\n-removed";
    const large = renderMarkdown(fence + "diff\n" + oversized + "\n" + fence);
    expect(large.container.querySelector(".syntax-diff-add, .syntax-diff-remove")).toBeNull();
    expect(large.container.querySelector(".forum-code-block code")?.textContent).toBe(oversized);
    large.unmount();

    const post = "Before " + "x".repeat(12_001) + "\n\n" + fence + "diff\n+added\n-removed\n" + fence;
    const budget = renderMarkdown(post);
    expect(budget.container.querySelector(".syntax-diff-add, .syntax-diff-remove")).toBeNull();
    expect(budget.container.querySelector(".forum-code-block code")?.textContent).toBe("+added\n-removed");
  });

  it("reports clipboard failure without changing the code", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });

    const { container } = renderMarkdown("```js\nlet value = 1;\n```");
    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(screen.getByText("Could not copy code.")).toBeInTheDocument();
    expect(container.querySelector("pre")?.textContent).toBe("let value = 1;");
  });

  it("keeps rendered code LTR inside an RTL page context", () => {
    const { container } = renderMarkdown(
      "فقرة **مهمة**\n\n```ts\nconst x = 1;\n```",
      "rtl",
    );

    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("مهمة").tagName).toBe("STRONG");
    expect(container.querySelector(".forum-code-block")).not.toHaveAttribute("dir", "ltr");
    expect(container.querySelector(".forum-code-block pre")).toHaveAttribute("dir", "ltr");
  });

  it("keeps symbolic technical language labels LTR inside RTL while leaving controls RTL", () => {
    const { container } = renderMarkdown(["```c#", "Console.WriteLine(1);", "```"].join("\n"), "rtl");
    expect(container.querySelector(".forum-code-language")).toHaveAttribute("dir", "ltr");
    expect(container.querySelector(".forum-code-language")).toHaveTextContent("c#");
    expect(container.querySelector(".forum-code-toolbar")).not.toHaveAttribute("dir", "ltr");
  });

  it("falls back to plain text for oversized or token-heavy code", () => {
    const huge = "const x = 1;".repeat(2000);
    expect(highlightCode(huge, "ts")).toEqual([{ text: huge }]);
    const dense = "1 ".repeat(3000);
    expect(highlightCode(dense, "ts")).toEqual([{ text: dense }]);
  });

  it("keeps code-block Wrap state when the Markdown source changes", async () => {
    const initial = "```ts\nconst answer = 1;\n```";
    const { container, rerender } = renderMarkdown(initial);
    const block = container.querySelector(".forum-code-block");
    await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }));
    expect(block).toHaveAttribute("data-wrap", "true");

    rerender(
      <I18nextProvider i18n={runtime()}>
        <div>
          <ForumMarkdown>{"```ts\nconst answer = 12;\n```"}</ForumMarkdown>
        </div>
      </I18nextProvider>,
    );

    expect(container.querySelector(".forum-code-block")).toBe(block);
    expect(block).toHaveAttribute("data-wrap", "true");
  });

  it("limits highlighting across all code blocks in a long post without hiding their text", () => {
    const fenced = ["```ts", "const value = 1;\n".repeat(110), "```"].join("\n");
    const message = Array.from({ length: 7 }, () => fenced).join("\n\n");
    expect(message.length).toBeGreaterThan(12_000);
    const { container } = renderMarkdown(message);
    expect(container.querySelectorAll(".forum-code-block")).toHaveLength(7);
    expect(container.querySelectorAll(".syntax-keyword")).toHaveLength(0);
    expect(container.querySelector("pre")?.textContent).toContain("const value = 1;");
  });

  it("keeps the full-post highlight budget inside nested spoilers", () => {
    const code = "const value = 1;\n".repeat(110);
    const spoiler = (index: number) =>
      [":::spoiler Part " + index, "```ts", code.trimEnd(), "```", ":::"].join("\n");
    const message = Array.from({ length: 7 }, (_, index) => spoiler(index)).join("\n\n");
    expect(message.length).toBeGreaterThan(12_000);

    const { container } = renderMarkdown(message);
    expect(container.querySelectorAll(".forum-markdown-spoiler")).toHaveLength(7);
    expect(container.querySelectorAll(".forum-code-block")).toHaveLength(7);
    expect(container.querySelectorAll(".syntax-keyword")).toHaveLength(0);
    expect(container.querySelector("pre")?.textContent).toContain("const value = 1;");
  });

  it("leaves unknown languages readable without syntax classes", () => {
    const tokens = highlightCode("alpha beta", "made-up-language");
    expect(tokens).toEqual([{ text: "alpha beta" }]);
  });
});
