import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmbeddedPreview, PreviewController, scenarios } from "./preview-app";

describe("UI preview state catalog", () => {
  it("keeps locale and direction out of State options", () => {
    expect(scenarios.length).toBeGreaterThan(0);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);

    for (const scenario of scenarios) {
      expect(scenario.locale).toBe("en");
      expect(scenario.direction).toBe("ltr");
      expect(scenario.label).not.toMatch(/(?:^| · )(?:EN|RU|HE|RTL)(?: · |$)/);
      expect(scenario.label).not.toMatch(/(?:^| · )(?:guest|user|manager)(?: · |$)/i);
    }
  });

  it("keeps dedicated editor states for create-topic, reply, and Help draft review", () => {
    expect(scenarios).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "editor-create-topic", view: "section" }),
      expect.objectContaining({ id: "editor-reply", view: "topic" }),
      expect.objectContaining({
        id: "editor-help-draft",
        view: "category",
        variant: "help-solutions-similar-results",
      }),
    ]));
  });

  it("selects the preview role separately from State", async () => {
    render(<PreviewController />);

    const guest = screen.getByRole("button", { name: "Guest" });
    const user = screen.getByRole("button", { name: "User" });
    const manager = screen.getByRole("button", { name: "Manager" });

    expect(guest).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Notifications · mixed" })).not.toBeInTheDocument();

    await userEvent.click(user);
    expect(user).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Notifications · mixed" })).toBeInTheDocument();

    await userEvent.click(manager);
    expect(manager).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Authorization" })).toBeInTheDocument();
  });
});


describe("embedded preview routing", () => {
  it("opens the real section view directly from the homepage category map", async () => {
    render(<EmbeddedPreview scenarioId="home-guest" />);

    const sectionLink = await screen.findByRole("link", { name: /TypeScript & architecture/ });
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
