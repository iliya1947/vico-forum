import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmbeddedPreview, scenarios } from "./preview-app";

describe("UI preview state catalog", () => {
  it("keeps locale and direction out of State options", () => {
    expect(scenarios.length).toBeGreaterThan(0);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);

    for (const scenario of scenarios) {
      expect(scenario.locale).toBe("en");
      expect(scenario.direction).toBe("ltr");
      expect(scenario.label).not.toMatch(/(?:^| · )(?:EN|RU|HE|RTL)(?: · |$)/);
    }
  });
});


describe("embedded preview routing", () => {
  it("opens the real category view from a homepage rail", async () => {
    render(<EmbeddedPreview scenarioId="home-guest" />);

    await userEvent.click(await screen.findByRole("link", { name: "Open Development" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Development" })).toBeInTheDocument();
    const sectionLink = screen.getByRole("link", { name: /TypeScript & architecture/ });
    expect(sectionLink).toBeInTheDocument();

    await userEvent.click(sectionLink);

    expect(await screen.findByRole("heading", { level: 1, name: "TypeScript & architecture" })).toBeInTheDocument();
    const topicLink = screen.getByRole("link", { name: /How should I structure a typed API client\?/ });
    expect(topicLink).toBeInTheDocument();

    await userEvent.click(topicLink);

    expect(await screen.findByRole("heading", { level: 1, name: "How should I structure a typed API client?" })).toBeInTheDocument();
    expect(screen.getByText("I want strong typing without coupling the whole app to one HTTP library.")).toBeInTheDocument();
  });
});


describe("editor preview states", () => {
  it("shows the create-topic Markdown editor with fenced-code preview", async () => {
    render(<EmbeddedPreview scenarioId="section-editor" />);

    expect(await screen.findByRole("toolbar", { name: "Markdown formatting" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByLabelText("First message")).toHaveValue(expect.stringContaining("```ts"));
  });

  it("shows a targeted reply with an inserted Markdown quote and preview", async () => {
    render(<EmbeddedPreview scenarioId="topic-editor" />);

    expect(await screen.findByText("Replying to Message #1")).toBeInTheDocument();
    expect(screen.getByLabelText("Reply")).toHaveValue(expect.stringContaining("> I want strong typing"));
    expect(screen.getByRole("region", { name: "Markdown preview" })).toBeInTheDocument();
  });
});
