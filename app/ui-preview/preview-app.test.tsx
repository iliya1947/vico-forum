import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { EmbeddedPreview, PreviewController, scenarios } from "./preview-app";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

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


describe("Preview confirmation and attention fixtures", () => {
  it("opens confirmation on the matched topic route and dismisses without solving", async () => {
    render(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
    const prompt = await screen.findByRole("region", { name: "Problem solved?" });
    expect(within(prompt).getByRole("button", { name: "Yes, mark as solved" })).toBeInTheDocument();
    expect(screen.getByText("Best answer")).toBeInTheDocument();
    expect(document.querySelector(".solved-badge")).toBeNull();
    const no = within(prompt).getByRole("link", { name: "No, keep it unsolved" });
    expect(no).toHaveAttribute("href", "/en/topics/typed-api#post-answer");
    await userEvent.click(no);
    await waitFor(() => expect(document.querySelector("#solution-confirmation")).toBeNull());
    expect(screen.getByText("Best answer")).toBeInTheDocument();
    expect(document.querySelector(".solved-badge")).toBeNull();
  });

  it.each(["ru", "he"])("retains confirmation query and answer through locale change to %s", async (locale) => {
    render(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
    await screen.findByRole("region", { name: "Problem solved?" });
    const language = document.querySelector(".site-header select")!;
    await userEvent.selectOptions(language, locale);
    await waitFor(() => expect(document.documentElement.lang).toBe(locale));
    expect(document.querySelector("#solution-confirmation")).toBeInTheDocument();
    expect(document.querySelector(".solution-confirmation-dismiss"))
      .toHaveAttribute("href", `/${locale}/topics/typed-api#post-answer`);
    expect(document.querySelector(".solved-badge")).toBeNull();
    expect(document.querySelectorAll(".best-answer-label")).toHaveLength(1);
  });

  it.each([
    ["topic-solved-user", true, true],
    ["topic-unsolved", false, false],
    ["editor-reply", false, false],
    ["topic-reply-error", false, false],
  ] as const)("preserves ordinary topic state %s", async (scenarioId, solved, bestAnswer) => {
    render(<EmbeddedPreview scenarioId={scenarioId} />);
    await screen.findByRole("heading", { level: 1, name: "How should I structure a typed API client?" });
    expect(document.querySelector("#solution-confirmation")).toBeNull();
    expect(Boolean(document.querySelector(".solved-badge"))).toBe(solved);
    expect(Boolean(document.querySelector(".best-answer-label"))).toBe(bestAnswer);
    if (scenarioId === "topic-reply-error") expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not apply the confirmation fixture to another navigated topic", async () => {
    render(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
    await screen.findByRole("region", { name: "Problem solved?" });
    await userEvent.click(screen.getByRole("link", { name: "TypeScript & architecture" }));
    const otherTopic = await screen.findByRole("link", { name: /Mixed RTL content with code blocks/u });
    await userEvent.click(otherTopic);
    expect(await screen.findByRole("heading", { level: 1, name: "Mixed RTL content with code blocks" })).toBeInTheDocument();
    expect(document.querySelector("#solution-confirmation")).toBeNull();
    expect(document.querySelector(".best-answer-label")).toBeNull();
  });

  it("shows the advertised appeal card after actual group navigation", async () => {
    render(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    const appeals = await screen.findByRole("link", { name: "Appeals (1)" });
    await userEvent.click(appeals);
    expect(appeals).toHaveAttribute("aria-current", "page");
    const id = await screen.findByText("#appeal-146");
    const card = within(id.closest("article")!);
    expect(card.getByRole("link", { name: "Jordan Chen" })).toBeInTheDocument();
    expect(card.getByText("My issue occurs after a network timeout, not after credential expiry.")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Configuring sessions in Cloudflare Workers" }))
      .toHaveAttribute("href", "/en/topics/canonical-help");
    expect(document.querySelectorAll(".attention-case")).toHaveLength(1);
    await userEvent.click(screen.getByRole("link", { name: "Duplicate (1)" }));
    expect(await screen.findByText("#signal-143")).toBeInTheDocument();
    expect(screen.queryByText("#appeal-146")).not.toBeInTheDocument();
  });

  it("keeps signal, review-status and mixed topic-count controls", async () => {
    render(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    for (const [label, ids] of [
      ["Needs details (1)", ["#signal-142"]],
      ["Needs review (2)", ["#signal-144", "#best-answer"]],
      ["Solution outdated (1)", ["#signal-145"]],
      ["Mixed (1)", ["#signal-142", "#signal-143"]],
    ] as const) {
      await userEvent.click(await screen.findByRole("link", { name: label }));
      for (const id of ids) expect(await screen.findByText(id)).toBeInTheDocument();
      expect(document.querySelectorAll(".attention-case")).toHaveLength(ids.length);
    }
  });

  it("preserves the explicit empty attention fixture", async () => {
    render(<EmbeddedPreview scenarioId="attention-empty" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Appeals (1)" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Appeals" })).toBeInTheDocument();
    expect(document.querySelectorAll(".attention-case")).toHaveLength(0);
  });
});
