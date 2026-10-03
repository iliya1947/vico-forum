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
    expect(screen.getByRole("heading", { name: "TypeScript & architecture" })).toBeInTheDocument();
  });
});
