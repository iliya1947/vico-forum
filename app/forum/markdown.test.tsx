import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ForumMarkdown } from "./markdown";

afterEach(cleanup);

describe("ForumMarkdown", () => {
  it("renders CommonMark paragraphs, emphasis, lists, inline code, and fenced code", () => {
    const { container } = render(<ForumMarkdown>{`First *important* paragraph.

- one
- two with \`inline()\`

\`\`\`ts
const longValue = "code";
\`\`\``}</ForumMarkdown>);

    expect(screen.getByText("important").tagName).toBe("EM");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("inline()").tagName).toBe("CODE");
    expect(screen.getByText(/const longValue/).closest("pre")).not.toBeNull();
  });

  it("does not turn raw HTML, event handlers, unsafe URLs, or images into active DOM", () => {
    const { container } = render(<ForumMarkdown>{`<script>window.pwned = true</script>

<button onclick="window.pwned = true">unsafe</button>

[bad](javascript:alert(1))

![tracking](https://evil.example/pixel.png)`}</ForumMarkdown>);

    expect(container.querySelector("script, button, img")).toBeNull();
    const unsafeLink = container.querySelector("a");
    expect(unsafeLink?.getAttribute("href")).not.toMatch(/^javascript:/i);
  });

  it("keeps HTTPS links useful and marks them as user-generated content", () => {
    render(<ForumMarkdown>[documentation](https://example.com/docs)</ForumMarkdown>);
    expect(screen.getByRole("link", { name: "documentation" })).toMatchObject({
      href: "https://example.com/docs",
      target: "_blank",
      rel: "nofollow noopener noreferrer ugc",
    });
  });

  it("renders markdown and code inside an RTL page context", () => {
    const { container } = render(<div dir="rtl"><ForumMarkdown>{`فقرة **مهمة** و \`const x = 1\``}</ForumMarkdown></div>);
    expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByText("مهمة").tagName).toBe("STRONG");
    expect(screen.getByText("const x = 1")).not.toBeNull();
  });
});
