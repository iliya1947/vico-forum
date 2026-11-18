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

  it("saves the preferred language from Settings and switches the preview locale", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();

    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "User preferences" }));
    const locale = await screen.findByRole("combobox", { name: "Preferred language" });
    await user.selectOptions(locale, "ru");
    await user.click(screen.getByRole("button", { name: "Save language" }));

    await waitFor(() => expect(document.documentElement.lang).toBe("ru"));
    const savedLocale = document.querySelector("#settings-preferred-locale") as HTMLSelectElement | null;
    expect(savedLocale?.value).toBe("ru");
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("updates the owner Google registration flag in Forum & roles", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const google = screen.getByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("shows a registration conflict and revalidates to the current policy", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-forum-registration-conflict" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Settings changed. Review the current values and try again.",
    );

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).not.toBeChecked();
    });
  });

  it("shows unavailable registration feedback without changing the saved policy", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-forum-registration-unavailable" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Registration settings are temporarily unavailable.",
    );

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("shows invalid registration feedback without changing the saved policy", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-forum-registration-invalid" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid registration settings.");

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("shows forbidden registration feedback without changing the saved policy", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-forum-registration-forbidden" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the Owner can change registration settings.",
    );

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("applies the owner registration policy to a new Sign up preview", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    render(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(
      "New Google registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("keeps Google sign-up available when email registration is closed", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const email = await screen.findByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(email);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    render(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(
      "New email registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("removes both registration methods when the owner closes both", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(google);
    await user.click(email);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    render(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(
      "New email registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(screen.getByText(
      "New Google registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(document.querySelector(".credential-form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("keeps existing email and Google sign-in available when registration is fully closed", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const googleRegistration = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const emailRegistration = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(googleRegistration);
    await user.click(emailRegistration);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    render(<EmbeddedPreview scenarioId="credentials-sign-in" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Vico Forum" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText(
      "New email registrations are currently closed. Existing users can sign in.",
    )).not.toBeInTheDocument();
    expect(screen.queryByText(
      "New Google registrations are currently closed. Existing users can sign in.",
    )).not.toBeInTheDocument();
  });

  it("creates, configures, assigns, overrides, protects, then deletes an unassigned custom role in Forum & roles", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const createRoleForm = document.querySelector(".admin-create-role") as HTMLElement;
    expect(createRoleForm).not.toBeNull();

    await user.type(within(createRoleForm).getByLabelText("Role slug"), "settings-helper");
    await user.type(within(createRoleForm).getByLabelText("Display name"), "Settings helper");
    await user.click(within(createRoleForm).getByRole("button", { name: "Create custom role" }));

    const createdHeading = await screen.findByRole("heading", { name: "Settings helper" });
    const roleCard = createdHeading.closest(".admin-role-card") as HTMLElement;
    expect(roleCard).not.toBeNull();
    expect(within(roleCard).getByText("Role slug: settings-helper")).toBeInTheDocument();

    const renameForm = roleCard.querySelector(".admin-rename-role") as HTMLElement;
    const displayName = within(renameForm).getByLabelText("Display name");
    await user.clear(displayName);
    await user.type(displayName, "Settings helper renamed");
    await user.click(within(renameForm).getByRole("button", { name: "Save" }));

    const renamedHeading = await screen.findByRole("heading", { name: "Settings helper renamed" });
    const renamedCard = renamedHeading.closest(".admin-role-card") as HTMLElement;
    expect(within(renamedCard).getByText("Role slug: settings-helper")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Settings helper" })).not.toBeInTheDocument();

    const grantsForm = renamedCard.querySelector(".admin-permissions-form") as HTMLElement;
    await user.click(within(grantsForm).getByLabelText("forum.topic.pin"));
    await user.click(within(grantsForm).getByRole("button", { name: "Save" }));

    const updatedHeading = await screen.findByRole("heading", { name: "Settings helper renamed" });
    const updatedCard = updatedHeading.closest(".admin-role-card") as HTMLElement;
    expect(within(updatedCard).getByLabelText(/^Permissions: 1\//)).toBeInTheDocument();
    expect(within(updatedCard).getByLabelText("forum.topic.pin")).toBeChecked();

    const alexHeading = screen.getByRole("heading", { name: "Alex Rivera" });
    const alexCard = alexHeading.closest(".admin-user-card") as HTMLElement;
    const assignmentForm = alexCard.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(
      within(assignmentForm).getByLabelText("Assigned role"),
      "Settings helper renamed",
    );
    await user.click(within(assignmentForm).getByRole("button", { name: "Save" }));

    const refreshedAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(refreshedAlex).getByText("Settings helper renamed")).toBeInTheDocument();

    const override = within(refreshedAlex).getByLabelText("forum.topic.pin: Permissions");
    await user.selectOptions(override, "deny");
    await user.click(within(override.closest("form") as HTMLElement).getByRole("button", { name: "Save" }));

    const overriddenAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(overriddenAlex).getByLabelText("forum.topic.pin: Permissions")).toHaveValue("deny");
    const effectivePermissions = overriddenAlex.querySelector(".admin-effective-permissions") as HTMLElement;
    expect(within(effectivePermissions).queryByText("forum.topic.pin")).not.toBeInTheDocument();

    const assignedRoleHeading = screen.getByRole("heading", { name: "Settings helper renamed" });
    const assignedRoleCard = assignedRoleHeading.closest(".admin-role-card") as HTMLElement;
    await user.click(within(assignedRoleCard).getByRole("button", { name: "Delete role" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This role is assigned to users and cannot be deleted.",
    );
    expect(screen.getByRole("heading", { name: "Settings helper renamed" })).toBeInTheDocument();
    const stillAssignedAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(stillAssignedAlex).getByText("Settings helper renamed")).toBeInTheDocument();

    const resetAssignment = stillAssignedAlex.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(within(resetAssignment).getByLabelText("Assigned role"), "User");
    await user.click(within(resetAssignment).getByRole("button", { name: "Save" }));

    const resetAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(resetAlex).getByText("User")).toBeInTheDocument();

    const deletableRoleHeading = screen.getByRole("heading", { name: "Settings helper renamed" });
    const deletableRoleCard = deletableRoleHeading.closest(".admin-role-card") as HTMLElement;
    await user.click(within(deletableRoleCard).getByRole("button", { name: "Delete role" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Authorization settings saved.");
    expect(screen.queryByRole("heading", { name: "Settings helper renamed" })).not.toBeInTheDocument();
  });

  it("keeps the registration version unchanged on a no-op save", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const versionBefore = document.querySelector('input[name="expectedVersion"]') as HTMLInputElement | null;
    expect(versionBefore?.value).toBe("1");

    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");
    await waitFor(() => {
      const versionAfter = document.querySelector('input[name="expectedVersion"]') as HTMLInputElement | null;
      expect(versionAfter?.value).toBe("1");
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("updates the owner email registration flag independently from Google", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const google = screen.getByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(email);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).not.toBeChecked();
    });
  });

  it("changes administrator workspace density through the real local preference control", async () => {
    window.localStorage.removeItem("vico:administrator-workspace:v1:maya");
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Administrator preferences" })).toBeInTheDocument();
    const density = screen.getByRole("combobox", { name: "Density" });
    expect(density).toHaveValue("comfortable");

    await user.selectOptions(density, "compact");
    expect(screen.getByRole("combobox", { name: "Density" })).toHaveValue("compact");
  });

  it("uses the last visited Admin destination when that opening behavior is selected", async () => {
    const key = "vico:administrator-workspace:v1:owner";
    window.localStorage.removeItem(key);
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    let settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    const behavior = await screen.findByRole("combobox", { name: "Open behavior" });
    const destination = screen.getByRole("combobox", { name: "Default destination" });
    expect(behavior).toHaveValue("default");
    expect(destination).toHaveValue("overview");

    await user.selectOptions(destination, "roles");
    await user.click(screen.getByRole("link", { name: "Open Admin" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Roles & permissions" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Settings" }));
    settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Default destination" }), "overview");
    await user.selectOptions(screen.getByRole("combobox", { name: "Open behavior" }), "last");

    expect(screen.getByRole("link", { name: "Open Admin" })).toHaveAttribute("href", "/en/admin/authorization");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toMatchObject({
      adminEntry: "last",
      adminDefault: "overview",
      adminLast: "roles",
    });
  });

  it("opens the selected default Needs attention mode", async () => {
    const key = "vico:administrator-workspace:v1:maya";
    window.localStorage.removeItem(key);
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    const mode = await screen.findByRole("combobox", { name: "Default mode" });
    expect(mode).toHaveValue("signals");

    await user.selectOptions(mode, "complaints");

    const openAttention = screen.getByRole("link", { name: "Open Needs attention" });
    expect(openAttention).toHaveAttribute("href", "/en/attention?mode=complaints&group=group1");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toMatchObject({
      attentionEntry: "default",
      attentionDefaultMode: "complaints",
      attentionDefaultGroup: "group1",
    });

    await user.click(openAttention);
    expect(await screen.findByRole("heading", { level: 2, name: "Queue" })).toBeInTheDocument();
  });

  it("uses the last visited Needs attention group when that opening behavior is selected", async () => {
    const key = "vico:administrator-workspace:v1:maya";
    window.localStorage.removeItem(key);
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    let settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    const behavior = await screen.findByRole("combobox", { name: "Open behavior" });
    const group = screen.getByRole("combobox", { name: "Default group" });
    expect(behavior).toHaveValue("default");
    expect(group).toHaveValue("needs-details");

    await user.selectOptions(group, "needs-review");
    await user.click(screen.getByRole("link", { name: "Open Needs attention" }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toMatchObject({
        attentionLastMode: "signals",
        attentionLastGroup: "needs-review",
      });
    });

    await user.click(screen.getByRole("link", { name: "Settings" }));
    settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Default group" }), "needs-details");
    await user.selectOptions(screen.getByRole("combobox", { name: "Open behavior" }), "last");

    expect(screen.getByRole("link", { name: "Open Needs attention" })).toHaveAttribute(
      "href",
      "/en/attention?mode=signals&group=needs-review",
    );
    expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toMatchObject({
      attentionEntry: "last",
      attentionDefaultMode: "signals",
      attentionDefaultGroup: "needs-details",
      attentionLastMode: "signals",
      attentionLastGroup: "needs-review",
    });
  });

  it("persists the administrator technical-details default for the current account", async () => {
    const key = "vico:administrator-workspace:v1:maya";
    window.localStorage.removeItem(key);
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    let settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    const technicalDetails = await screen.findByRole("checkbox", {
      name: "Expand secondary technical details by default",
    });
    expect(technicalDetails).not.toBeChecked();

    await user.click(technicalDetails);
    expect(technicalDetails).toBeChecked();
    expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toMatchObject({
      technicalDetailsExpanded: true,
    });

    cleanup();
    render(<EmbeddedPreview scenarioId="section-user" identity="manager" />);
    const secondUser = userEvent.setup();

    await secondUser.click(screen.getByRole("link", { name: "Settings" }));
    settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await secondUser.click(within(settingsOverview).getByRole("link", { name: "Administrator preferences" }));

    expect(await screen.findByRole("checkbox", {
      name: "Expand secondary technical details by default",
    })).toBeChecked();
  });

  it("shows the non-fresh session state without exposing session controls", async () => {
    render(<EmbeddedPreview scenarioId="settings-account-not-fresh" identity="user" />);

    expect(await screen.findByRole("heading", { level: 2, name: "Account & security" })).toBeInTheDocument();

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByRole("status")).toHaveTextContent(
      "To view and manage sessions, sign out and sign in again to create a fresh session.",
    );
    expect(within(sessions).queryByText("Chrome on Windows")).not.toBeInTheDocument();
    expect(within(sessions).queryByText("Safari on iPhone")).not.toBeInTheDocument();
    expect(within(sessions).queryByText("Firefox on Android tablet")).not.toBeInTheDocument();
    expect(within(sessions).queryByRole("button", { name: "Sign out this other session" })).not.toBeInTheDocument();
    expect(within(sessions).queryByRole("button", { name: "Sign out all other sessions" })).not.toBeInTheDocument();
  });

  it("shows a Google-only account without offering password change", async () => {
    render(<EmbeddedPreview scenarioId="settings-account-google-only" identity="user" />);

    expect(await screen.findByRole("heading", { level: 2, name: "Account & security" })).toBeInTheDocument();

    const methods = document.querySelector("#settings-account-methods")?.parentElement as HTMLElement;
    expect(within(methods).getByText("Google")).toBeInTheDocument();
    expect(within(methods).queryByText("Email and password")).not.toBeInTheDocument();
    expect(within(methods).getByText(
      "This account has no password credential. Adding a password is not available here.",
    )).toBeInTheDocument();
    expect(within(methods).queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Change password" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("links Google locally from Account & security without invoking real OAuth", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Account & security" }));

    const methods = document.querySelector("#settings-account-methods")?.parentElement as HTMLElement;
    expect(within(methods).getByText("Email and password")).toBeInTheDocument();
    expect(within(methods).queryByText("Google")).not.toBeInTheDocument();

    await user.click(within(methods).getByRole("button", { name: "Connect Google" }));

    expect(await within(methods).findByText("Google")).toBeInTheDocument();
    expect(within(methods).queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
  });

  it("signs out one other active session while preserving the remaining sessions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Account & security" }));

    expect(await screen.findByRole("heading", { level: 3, name: "Linked sign-in methods" })).toBeInTheDocument();

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    const safari = within(sessions).getByText("Safari on iPhone").closest("li") as HTMLElement;
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
    expect(within(sessions).getByText("This session")).toBeInTheDocument();

    await user.click(within(safari).getByRole("button", { name: "Sign out this other session" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Other sessions signed out.");
    await waitFor(() => expect(within(sessions).queryByText("Safari on iPhone")).not.toBeInTheDocument());
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByRole("button", { name: "Sign out all other sessions" })).toBeInTheDocument();
  });

  it("reports an already inactive other session and refreshes the list", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-account-session-not-found" identity="user" />);

    const sessionsHeading = await screen.findByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    const safari = within(sessions).getByText("Safari on iPhone").closest("li") as HTMLElement;

    await user.click(within(safari).getByRole("button", { name: "Sign out this other session" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This session is no longer active. Refresh the list.",
    );
    await waitFor(() => expect(within(sessions).queryByText("Safari on iPhone")).not.toBeInTheDocument());
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("This session")).toBeInTheDocument();
  });

  it("shows a controlled unavailable error without changing sessions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-account-unavailable" identity="user" />);

    await user.type(screen.getByLabelText("Current password"), "preview-current-password");
    await user.type(screen.getByLabelText("New password"), "preview-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account security is temporarily unavailable.",
    );

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
  });

  it("shows a stale account-session conflict without changing data", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-account-stale" identity="user" />);

    await user.type(screen.getByLabelText("Current password"), "preview-current-password");
    await user.type(screen.getByLabelText("New password"), "preview-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account changed. Refresh before saving.",
    );

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
  });

  it("shows a controlled invalid-password error without changing sessions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-account-invalid-password" identity="user" />);

    await user.type(screen.getByLabelText("Current password"), "wrong-current-password");
    await user.type(screen.getByLabelText("New password"), "preview-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is incorrect.");

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
  });

  it("shows the password rate-limit state without changing sessions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="settings-account-rate-limited" identity="user" />);

    await user.type(screen.getByLabelText("Current password"), "preview-current-password");
    await user.type(screen.getByLabelText("New password"), "preview-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many password change attempts. Try again shortly.",
    );

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
  });

  it("changes the representative password without revoking other sessions", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Account & security" }));

    await user.type(screen.getByLabelText("Current password"), "preview-current-password");
    await user.type(screen.getByLabelText("New password"), "preview-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Password changed.");

    const sessionsHeading = screen.getByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();
  });

  it("signs out all other active sessions while preserving the current session", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Account & security" }));

    const sessionsHeading = await screen.findByRole("heading", { level: 3, name: "Active sessions" });
    const sessions = sessionsHeading.parentElement as HTMLElement;
    expect(within(sessions).getByText("Safari on iPhone")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Android tablet")).toBeInTheDocument();

    await user.click(within(sessions).getByRole("button", { name: "Sign out all other sessions" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Other sessions signed out.");

    await waitFor(() => {
      expect(within(sessions).queryByText("Safari on iPhone")).not.toBeInTheDocument();
      expect(within(sessions).queryByText("Firefox on Android tablet")).not.toBeInTheDocument();
    });
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("This session")).toBeInTheDocument();
    expect(within(sessions).queryByRole("button", { name: "Sign out all other sessions" })).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  it("saves online visibility in Privacy settings and updates the local home presence", async () => {
    const user = userEvent.setup();
    render(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await user.click(screen.getByRole("link", { name: "Settings" }));
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Privacy" }));

    const showOnline = await screen.findByRole("checkbox", { name: "Show me online" });
    expect(showOnline).toBeChecked();
    await user.click(showOnline);
    expect(screen.getByText("Off: do not appear in the public online member list or count.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save privacy setting" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Online visibility saved.");
    expect(screen.getByRole("checkbox", { name: "Show me online" })).not.toBeChecked();

    const breadcrumbs = document.querySelector(".breadcrumbs") as HTMLElement;
    await user.click(within(breadcrumbs).getByRole("link", { name: "Home" }));

    const online = await screen.findByRole("heading", { level: 2, name: "Who's online" });
    const card = online.closest(".home-online-card") as HTMLElement;
    expect(within(card).queryByRole("link", { name: "Alex" })).not.toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Maya Cohen" })).toBeInTheDocument();
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
