import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { ForumMarkdown, ForumInlineAttachmentProvider, highlightCode } from "./markdown";
import { attributedQuoteMarkdown } from "./quote-markdown";
import { spreadsheetToMarkdown } from "./technical-markdown";
import { clipboardHtmlToMarkdown } from "./clipboard-markdown";
import { publishedMentionRecipients } from "./mentions";

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


function renderMarkdownForUser(markdown: string, userId: string) {
  return render(
    <I18nextProvider i18n={runtime()}>
      <HeaderAuthProvider initialUser={{ id: userId, name: "Member" }}>
        <ForumMarkdown>{markdown}</ForumMarkdown>
      </HeaderAuthProvider>
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("attributed public message quotes", () => {
  it("preserves author permalink and full Markdown in a normal protected blockquote", () => {
    const permalink = "/he/topics/sample#post-message-15";
    const code = String.fromCharCode(96).repeat(3);
    const source = "A **strong** line  \n\n" + code + "ts\nconst x = 1;\n" + code;
    const quote = attributedQuoteMarkdown({
      author: "Alice [developer]",
      messageNumber: 15,
      permalink,
      content: source,
    });
    expect(quote).toContain("Alice \\[developer\\]");
    expect(quote).toContain("> A **strong** line  ");
    expect(quote).toContain("> " + code + "ts\n> const x = 1;\n> " + code);
    const { container } = renderMarkdown(quote, "rtl");
    const attribution = container.querySelector(".forum-quote-attribution");
    expect(attribution).toHaveTextContent("Alice [developer] · #15");
    expect(attribution?.querySelector("a")).toHaveAttribute("href", permalink);
    expect(container.querySelector(".forum-quote-content strong")).toHaveTextContent("strong");
    expect(container.querySelector(".forum-quote-content pre")).toHaveTextContent("const x = 1;");
    expect(container.querySelectorAll(".forum-quoted-block")).toHaveLength(1);
    expect(container.querySelector(".forum-quote-toggle")).toBeNull();
    expect(publishedMentionRecipients(quote)).toEqual([]);
  });

  it.each(["A &copy; B", "A &amp; B", "שלום 😀 &copy;"])(
    "keeps literal author entities and Unicode: %s", (author) => {
      const permalink = "/ru/topics/example#post-7";
      const quote = attributedQuoteMarkdown({ author, messageNumber: 7, permalink, content: "Hello" });
      expect(quote).toContain("&amp;");
      const { container } = renderMarkdown(quote);
      expect(container.querySelector(".forum-quote-attribution")).toHaveTextContent(author + " · #7");
      expect(container.querySelector(".forum-quote-attribution a")).toHaveAttribute("href", permalink);
    },
  );

  it("distinguishes attributed nested quotes from ordinary Markdown blockquotes and links", () => {
    const inner = attributedQuoteMarkdown({
      author: "Inner", messageNumber: 3,
      permalink: "/en/topics/sample#post-inner", content: "Inside",
    }).trim();
    const nested = attributedQuoteMarkdown({
      author: "Outer", messageNumber: 2,
      permalink: "/en/topics/sample#post-outer", content: "Outer prose\n\n" + inner,
    });
    const { container } = renderMarkdown(nested + "\n> [Read original](https://example.com)");
    expect([...container.querySelectorAll(".forum-quote-attribution")].map((node) => node.textContent?.trim()))
      .toEqual(["↳ Outer · #2", "↳ Inner · #3"]);
    const legacy = container.querySelectorAll(".forum-quoted-block");
    expect(legacy).toHaveLength(3);
    expect(legacy[2]?.querySelector(".forum-quote-attribution")).toBeNull();
    expect(legacy[2]?.querySelector("a")).toHaveAttribute("href", "https://example.com");
  });

  it("collapses only measured long quotes, restores content and retains source metadata", async () => {
    const original = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects");
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: function(this: Range) {
        return Array.from({ length: this.toString().length > 80 ? 7 : 1 }, (_, index) => ({
          top: index * 20, bottom: index * 20 + 16, height: 16,
          left: 0, right: 100, width: 100,
        }));
      },
    });
    try {
      const quote = attributedQuoteMarkdown({
        author: "Anna",
        messageNumber: 2,
        permalink: "/en/topics/t#post-abc",
        content: "long ".repeat(50),
      });
      const { container } = renderMarkdown(quote);
      const content = container.querySelector<HTMLElement>(".forum-quote-content")!;
      const button = screen.getByRole("button", { name: "Show full quote" });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(content.style.maxHeight).not.toBe("");
      expect(container.querySelector(".forum-quote-attribution")).toHaveTextContent("Anna · #2");
      await userEvent.click(button);
      expect(screen.getByRole("button", { name: "Collapse quote" })).toHaveAttribute("aria-expanded", "true");
      expect(content.style.maxHeight).toBe("");
      expect(content.textContent).toContain("long long");
      await userEvent.click(screen.getByRole("button", { name: "Collapse quote" }));
      expect(screen.getByRole("button", { name: "Show full quote" })).toHaveAttribute("aria-expanded", "false");
    } finally {
      if (original) Object.defineProperty(Range.prototype, "getClientRects", original);
      else Reflect.deleteProperty(Range.prototype, "getClientRects");
    }
  });
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

  it("renders spreadsheet-pasted cell syntax literally without modifying authored rich Markdown", () => {
    const source = spreadsheetToMarkdown(
      "Label\tValue\n**literal**\t[shown](https://example.org)\na|b\tx\\y",
    );
    expect(source).not.toBeNull();
    const { container } = renderMarkdown(source!);
    const rows = [...container.querySelectorAll(".forum-markdown-table tr")].map((row) =>
      [...row.querySelectorAll("th,td")].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["Label", "Value"],
      ["**literal**", "[shown](https://example.org)"],
      ["a|b", "x\\y"],
    ]);
    expect(container.querySelector(".forum-markdown-table strong, .forum-markdown-table a")).toBeNull();
  });

  it("renders HTML spreadsheet table values as literal text", () => {
    const source = clipboardHtmlToMarkdown(
      "<table><tr><th>Label</th><th>Value</th></tr>"
      + "<tr><td>**literal**</td><td>[shown](https://example.org)</td></tr></table>",
    );
    expect(source).not.toBeNull();
    const { container } = renderMarkdown(source!);
    expect([...container.querySelectorAll(".forum-markdown-table tbody td")].map((cell) => cell.textContent))
      .toEqual(["**literal**", "[shown](https://example.org)"]);
    expect(container.querySelector(".forum-markdown-table strong, .forum-markdown-table a")).toBeNull();
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

  it("sets independent automatic direction on mixed-language prose blocks without changing source", () => {
    const source = [
      "English **first** with `const x = 1`.",
      "",
      "עברית **שנייה**.",
      "",
      "## العربية عنوان",
      "",
      "- רשימה אחת",
      "- English item",
      "",
      "> العربية اقتباس",
      "",
      "```ts",
      "const answer = 42;",
      "```",
    ].join("\n");
    const { container } = renderMarkdown(source, "rtl");
    const body = container.querySelector(".post-body")!;
    const paragraphs = [...body.querySelectorAll("p")];
    expect(paragraphs.map((p) => p.textContent)).toContain("English first with const x = 1.");
    expect(paragraphs.filter((p) => /English first|עברית|العربية اقتباس/u.test(p.textContent ?? ""))
      .map((p) => p.getAttribute("dir"))).toEqual(["auto", "auto", "auto"]);
    expect(body.querySelector("h2")).toHaveAttribute("dir", "auto");
    expect([...body.querySelectorAll("li")].map((li) => li.getAttribute("dir"))).toEqual(["auto", "auto"]);
    expect(body.querySelector("p code")).toHaveAttribute("dir", "ltr");
    expect(body.querySelector(".forum-code-block pre")).toHaveAttribute("dir", "ltr");
    expect(body.querySelector(".forum-code-block pre")).toHaveTextContent("const answer = 42;");
  });

  it("renders authored paragraph direction and hides only recognized source markers", () => {
    const source = [
      "English **first** {:vico-dir=rtl}",
      "",
      "עברית `build` {:vico-dir=ltr}",
      "",
      "## عنوان {:vico-dir=ltr}",
      "",
      "- English item {:vico-dir=rtl}",
      "- עברית item {:vico-dir=ltr}",
      "",
      "Literal {:vico-dir=auto} and \\{:vico-dir=rtl}",
      "",
      "```txt",
      "{:vico-dir=rtl}",
      "```",
    ].join("\n");
    const { container } = renderMarkdown(source, "ltr");
    const prose = [...container.querySelectorAll(".post-body p")];
    expect(prose[0]).toHaveAttribute("dir", "rtl");
    expect(prose[0]).toHaveTextContent("English first");
    expect(prose[0]).not.toHaveTextContent("vico-dir");
    expect(prose[1]).toHaveAttribute("dir", "ltr");
    expect(prose[1]).toHaveTextContent("עברית build");
    expect(prose[1]?.querySelector("code")).toHaveAttribute("dir", "ltr");
    expect(container.querySelector(".post-body h2")).toHaveAttribute("dir", "ltr");
    const items = [...container.querySelectorAll(".post-body li")];
    expect(items.map((item) => item.getAttribute("dir"))).toEqual(["rtl", "ltr"]);
    expect(items.map((item) => item.textContent?.includes("vico-dir"))).toEqual([false, false]);
    expect(prose.at(-1)).toHaveAttribute("dir", "auto");
    expect(prose.at(-1)).toHaveTextContent("{:vico-dir=auto}");
    expect(container.querySelector(".forum-code-block pre")).toHaveTextContent("{:vico-dir=rtl}");
  });

  it.each([
    ["Setext H1", "Title {:vico-dir=rtl}\n===", "h1", "rtl"],
    ["Setext H2", "Title {:vico-dir=ltr}\n---", "h2", "ltr"],
    ["Setext H2 CRLF", "Title {:vico-dir=rtl}\r\n---", "h2", "rtl"],
    ["Closed ATX", "## Title {:vico-dir=rtl} ##", "h2", "rtl"],
    ["Closed ATX formatted", "### **Title** {:vico-dir=ltr} ###", "h3", "ltr"],
    ["Plain ATX", "## Title {:vico-dir=rtl}", "h2", "rtl"],
  ])("renders %s as the original heading with the requested direction", (_kind, source, tag, direction) => {
    const { container } = renderMarkdown(source);
    const heading = container.querySelector(`.post-body ${tag}`);
    expect(heading).not.toBeNull();
    expect(heading).toHaveAttribute("dir", direction);
    expect(heading).toHaveTextContent("Title");
    expect(heading).not.toHaveTextContent("vico-dir");
    expect(container.querySelector(".post-body p")).toBeNull();
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


  it("restores code preferences per account without leaking them to another user", () => {
    const firstUser = "code-pref-restore-a";
    const secondUser = "code-pref-restore-b";
    const firstWrap = "vico:editor:code-wrap:" + firstUser;
    const firstLines = "vico:editor:code-lines:" + firstUser;
    const secondWrap = "vico:editor:code-wrap:" + secondUser;
    const secondLines = "vico:editor:code-lines:" + secondUser;
    [firstWrap, firstLines, secondWrap, secondLines].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(firstWrap, "true");
    localStorage.setItem(firstLines, "true");

    try {
      const view = renderMarkdownForUser("~~~ts\nconst first = 1;\n~~~", firstUser);
      expect(view.container.querySelector(".forum-code-block")).toHaveAttribute("data-wrap", "true");
      expect(view.container.querySelector(".forum-code-block pre")).toHaveAttribute("data-line-numbers", "true");

      view.rerender(
        <I18nextProvider i18n={runtime()}>
          <HeaderAuthProvider initialUser={{ id: secondUser, name: "Member" }}>
            <ForumMarkdown>{"~~~ts\nconst second = 2;\n~~~"}</ForumMarkdown>
          </HeaderAuthProvider>
        </I18nextProvider>,
      );
      expect(view.container.querySelector(".forum-code-block")).toHaveAttribute("data-wrap", "false");
      expect(view.container.querySelector(".forum-code-block pre")).toHaveAttribute("data-line-numbers", "false");
    } finally {
      [firstWrap, firstLines, secondWrap, secondLines].forEach((key) => localStorage.removeItem(key));
    }
  });

  it("propagates code preferences across mounted blocks in the same document", async () => {
    const userId = "code-pref-same-document";
    const wrapKey = "vico:editor:code-wrap:" + userId;
    const linesKey = "vico:editor:code-lines:" + userId;
    localStorage.removeItem(wrapKey);
    localStorage.removeItem(linesKey);

    try {
      const { container } = renderMarkdownForUser(
        "~~~ts\nconst first = 1;\n~~~\n\n~~~ts\nconst second = 2;\n~~~",
        userId,
      );
      const blocks = [...container.querySelectorAll(".forum-code-block")];
      expect(blocks).toHaveLength(2);

      await userEvent.click(screen.getAllByRole("button", { name: "Wrap lines" })[0]!);
      expect(blocks.map((block) => block.getAttribute("data-wrap"))).toEqual(["true", "true"]);

      await userEvent.click(screen.getAllByRole("button", { name: "Line numbers" })[0]!);
      expect(blocks.map((block) => block.querySelector("pre")?.getAttribute("data-line-numbers")))
        .toEqual(["true", "true"]);
    } finally {
      localStorage.removeItem(wrapKey);
      localStorage.removeItem(linesKey);
    }
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
