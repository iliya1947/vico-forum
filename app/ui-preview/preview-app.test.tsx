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
      expect(scenario.label).not.toMatch(/(?:^| · )(?:guest|user|manager|owner)(?: · |$)/i);
    }
  });

  it("includes the protected AP-07 topic page as a manager-only visual fixture", () => {
    expect(scenarios).toContainEqual(expect.objectContaining({
      id: "admin-topic", view: "admin-topic",
      allowedIdentities: ["manager"],
    }));
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
    const owner = screen.getByRole("button", { name: "Owner" });

    expect(guest).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Notifications · mixed" })).not.toBeInTheDocument();

    await userEvent.click(user);
    expect(user).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Notifications · mixed" })).toBeInTheDocument();

    await userEvent.click(manager);
    expect(manager).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Authorization" })).toBeInTheDocument();

    await userEvent.click(owner);
    expect(owner).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("option", { name: "Authorization" })).toBeInTheDocument();
  });
});


describe("embedded preview routing", () => {
  it("renders one admin shell with topic and message Quick actions in the AP-07 fixture", async () => {
    render(<EmbeddedPreview scenarioId="admin-topic" />);
    expect(await screen.findByRole("heading", { name: "Admin panel" })).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll(".admin-topic .topic-message").length).toBeGreaterThan(0);
    expect(document.querySelector(".message-admin-tools")).not.toBeNull();
  });

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


describe("interactive Pages preview", () => {
  it("runs the global search form instead of blocking GET submissions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="home-guest" />);

    await user.click(screen.getByRole("link", { name: "Search the forum" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Search query" });
    await user.clear(search);
    await user.type(search, "TypeScript");
    await user.click(within(screen.getByRole("search")).getByRole("button"));
    expect(screen.getByRole("link", { name: /How should I structure a typed API client\?/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mixed RTL content with code blocks/ })).toBeInTheDocument();
  });

  it("creates a topic, posts a reply, selects it as best answer, and marks the topic solved", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.type(screen.getByRole("textbox", { name: "Topic title" }), "Interactive preview topic");
    await user.type(screen.getByLabelText("First message"), "This topic was created inside the Pages preview.");

    const create = screen.getByRole("button", { name: "Create topic" });
    await waitFor(() => expect(create).toBeEnabled());
    await user.click(create);

    expect(await screen.findByRole("heading", { level: 1, name: "Interactive preview topic" })).toBeInTheDocument();
    expect(screen.getByText("This topic was created inside the Pages preview.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reply"), "This reply was added without a backend.");
    const postReply = screen.getByRole("button", { name: "Post reply" });
    await waitFor(() => expect(postReply).toBeEnabled());
    await user.click(postReply);

    expect(await screen.findByText("This reply was added without a backend.")).toBeInTheDocument();

    await user.click(screen.getByText("Select as best answer"));
    await user.click(screen.getByRole("button", { name: "Message #2" }));

    const prompt = await screen.findByRole("region", { name: "Problem solved?" });
    expect(screen.getByText("Best answer")).toBeInTheDocument();
    await user.click(within(prompt).getByRole("button", { name: "Yes, mark as solved" }));

    await waitFor(() => expect(document.querySelector(".solved-badge")).not.toBeNull());
    expect(screen.getByText("Best answer")).toBeInTheDocument();
  });

  it("edits the signed-in user's profile and keeps the saved preview data", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="profile-edit" identity="user" />);

    const bio = screen.getByLabelText("About");
    await user.clear(bio);
    await user.type(bio, "Updated locally in the functional Pages preview.");

    const website = screen.getByLabelText("Website");
    await user.clear(website);
    await user.type(website, "https://vico.example/");

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Profile saved.");
    expect(screen.getByText("Updated locally in the functional Pages preview.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Edit profile" }));
    expect(screen.getByLabelText("About")).toHaveValue("Updated locally in the functional Pages preview.");
    expect(screen.getByLabelText("Website")).toHaveValue("https://vico.example/");
  });

  it("opens a notification, marks it read, and follows the referenced message", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="notifications-user" identity="user" />);

    const notification = screen.getByRole("button", {
      name: /Open reply: How should I structure a typed API client\?/,
    });
    expect(notification).toHaveClass("is-unread");
    await user.click(notification);

    expect(await screen.findByRole("heading", { level: 1, name: "How should I structure a typed API client?" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Notifications, 3 unread" }));
    const reopened = await screen.findByRole("button", {
      name: /Open reply: How should I structure a typed API client\?/,
    });
    expect(reopened).not.toHaveClass("is-unread");
    expect(within(reopened).getByText("Read")).toBeInTheDocument();
  });

  it("checks similar Help questions and publishes a new Help question", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="help-solutions-ask" identity="user" />);

    await user.click(screen.getByRole("button", { name: "Ask a question" }));
    const form = document.getElementById("help-question-create-form") as HTMLFormElement;
    expect(form).not.toBeNull();

    await user.type(within(form).getByRole("textbox", { name: "Question title" }), "Worker session redirect problem");
    await user.type(within(form).getByLabelText("Question details"), "My Worker loses its session after redirect.");
    await user.type(within(form).getByRole("textbox", { name: "Tags" }), "Cloudflare, Auth");

    await user.click(within(form).getByRole("button", { name: "Check similar questions" }));
    expect(await screen.findByRole("heading", { level: 3, name: "Similar questions" })).toBeInTheDocument();
    const similar = screen.getByRole("region", { name: "Similar questions" });
    expect(within(similar).getByRole("link", { name: /Why does my Worker lose the session after redirect\?/ })).toBeInTheDocument();

    const activeForm = document.getElementById("help-question-create-form") as HTMLFormElement;
    const publish = within(activeForm).getByRole("button", { name: "Ask question" });
    await waitFor(() => expect(publish).toBeEnabled());
    await user.click(publish);

    expect(await screen.findByRole("heading", { level: 1, name: "Worker session redirect problem" })).toBeInTheDocument();
    expect(screen.getByText("My Worker loses its session after redirect.")).toBeInTheDocument();
  });

  it("resolves moderation signals and duplicate appeals inside the preview queue", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);

    expect(screen.getByRole("link", { name: "Needs details (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mixed (1)" })).toBeInTheDocument();
    expect(screen.getByText("#signal-142")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept signal" }));

    await waitFor(() => expect(screen.queryByText("#signal-142")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Needs details (0)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mixed (0)" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Appeals (1)" }));
    expect(await screen.findByText("#appeal-146")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reject dispute" }));

    await waitFor(() => expect(screen.queryByText("#appeal-146")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Appeals (0)" })).toBeInTheDocument();
  });

  it("runs admin topic quick actions and keeps their local state", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();

    const topicActions = document.querySelector(".topic-admin-tools > summary");
    expect(topicActions).not.toBeNull();
    await user.click(topicActions!);

    await user.click(screen.getByRole("button", { name: "Unpin topic" }));
    await waitFor(() => expect(screen.queryByText("Pinned")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Pin topic" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close topic" }));
    expect(await screen.findByText("Closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen topic" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Message #2" }));
    await waitFor(() => {
      const followup = document.querySelector("#post-followup");
      expect(followup).not.toBeNull();
      expect(followup?.classList.contains("best-answer")).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: "Reopen topic" }));
    await waitFor(() => expect(screen.queryByText("Closed")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Pin topic" }));
    expect(await screen.findByText("Pinned")).toBeInTheDocument();
  });

  it("opens message history and corrects source language in the admin preview", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const question = document.querySelector("#post-question");
    expect(question).not.toBeNull();
    const actions = question!.querySelector(".message-admin-tools > summary");
    expect(actions).not.toBeNull();
    await user.click(actions!);

    await user.click(within(question as HTMLElement).getByRole("button", { name: "Edit history" }));
    const historyHeading = await within(question as HTMLElement)
      .findByRole("heading", { name: "Published revisions" });
    expect(historyHeading).toBeInTheDocument();
    const historySection = historyHeading.closest(".topic-post-history") as HTMLElement;
    expect(await within(historySection).findByText(
      "I want strong typing without coupling the whole app to one HTTP library.",
    )).toBeInTheDocument();

    const sourceLocale = within(question as HTMLElement).getByLabelText("Correct source language");
    await user.clear(sourceLocale);
    await user.type(sourceLocale, "he");
    await user.click(within(question as HTMLElement).getByRole("button", { name: "Correct language" }));

    expect(await within(question as HTMLElement).findByText("Source language: he")).toBeInTheDocument();
  });

  it("keeps manager authorization read-only and runs Owner authorization mutations", async () => {
    const user = userEvent.setup();
    const view = render(<EmbeddedPreview scenarioId="admin" identity="manager" />);

    expect(await screen.findByRole("heading", { name: "Authorization management" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create custom role" })).not.toBeInTheDocument();

    view.rerender(<EmbeddedPreview scenarioId="admin" identity="owner" />);
    expect(await screen.findByRole("button", { name: "Create custom role" })).toBeInTheDocument();

    const createRoleForm = document.querySelector(".admin-create-role") as HTMLElement;
    expect(createRoleForm).not.toBeNull();
    await user.type(within(createRoleForm).getByLabelText("Role slug"), "support-lead");
    await user.type(within(createRoleForm).getByLabelText("Display name"), "Support lead");
    await user.click(within(createRoleForm).getByRole("button", { name: "Create custom role" }));

    const createdHeading = await screen.findByRole("heading", { name: "Support lead" });
    const roleCard = createdHeading.closest(".admin-role-card") as HTMLElement;
    expect(roleCard).not.toBeNull();

    const renameForm = roleCard.querySelector(".admin-rename-role") as HTMLElement;
    const renameInput = within(renameForm).getByLabelText("Display name");
    await user.clear(renameInput);
    await user.type(renameInput, "Support lead renamed");
    await user.click(within(renameForm).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { name: "Support lead renamed" })).toBeInTheDocument();

    const renamedCard = screen.getByRole("heading", { name: "Support lead renamed" })
      .closest(".admin-role-card") as HTMLElement;
    const grantsForm = renamedCard.querySelector(".admin-permissions-form") as HTMLElement;
    await user.click(within(grantsForm).getByLabelText("forum.topic.pin"));
    await user.click(within(grantsForm).getByRole("button", { name: "Save" }));

    const alexCard = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    const assignment = alexCard.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(within(assignment).getByLabelText("Assigned role"), "Support lead renamed");
    await user.click(within(assignment).getByRole("button", { name: "Save" }));

    const refreshedAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(refreshedAlex).getByText("Support lead renamed")).toBeInTheDocument();

    const override = within(refreshedAlex).getByLabelText("forum.reply.create: Permissions");
    await user.selectOptions(override, "deny");
    await user.click(within(override.closest("form") as HTMLElement).getByRole("button", { name: "Save" }));

    const effective = refreshedAlex.querySelector(".admin-effective-permissions") as HTMLElement;
    expect(within(effective).getByText("forum.topic.pin")).toBeInTheDocument();
    expect(within(effective).queryByText("forum.reply.create")).not.toBeInTheDocument();

    const latestAssignment = refreshedAlex.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(within(latestAssignment).getByLabelText("Assigned role"), "User");
    await user.click(within(latestAssignment).getByRole("button", { name: "Save" }));

    const deletableCard = screen.getByRole("heading", { name: "Support lead renamed" })
      .closest(".admin-role-card") as HTMLElement;
    await user.click(within(deletableCard).getByRole("button", { name: "Delete role" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Support lead renamed" })).not.toBeInTheDocument());
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
