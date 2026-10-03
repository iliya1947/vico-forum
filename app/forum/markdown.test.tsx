import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ForumMarkdown, highlightCode } from "./markdown";

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

    const { container } = renderMarkdown("```ts\\nconst answer = true;\\n```");
    const codeBlock = container.querySelector(".forum-code-block");
    expect(codeBlock).toHaveAttribute("dir", "ltr");
    expect(codeBlock).toHaveAttribute("data-wrap", "false");

    await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }));
    expect(codeBlock).toHaveAttribute("data-wrap", "true");
    expect(screen.getByRole("button", { name: "No wrap" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("const answer = true;");
    expect(screen.getByText("Code copied")).toBeInTheDocument();
  });

  it("reports clipboard failure without changing the code", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });

    const { container } = renderMarkdown("```js\\nlet value = 1;\\n```");
    await userEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(screen.getByText("Could not copy code.")).toBeInTheDocument();
    expect(container.querySelector("pre")?.textContent).toBe("let value = 1;");
  });

  it("keeps rendered code LTR inside an RTL page context", () => {
    const { container } = renderMarkdown(
      "فقرة **مهمة**\\n\\n```ts\\nconst x = 1;\\n```",
      "rtl",
    );

    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("مهمة").tagName).toBe("STRONG");
    expect(container.querySelector(".forum-code-block")).toHaveAttribute("dir", "ltr");
  });

  it("leaves unknown languages readable without syntax classes", () => {
    const tokens = highlightCode("alpha beta", "made-up-language");
    expect(tokens).toEqual([{ text: "alpha beta" }]);
  });
});
