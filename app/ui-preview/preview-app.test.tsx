import "@testing-library/jest-dom/vitest";
import { cleanup, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { EmbeddedPreview, PreviewController, scenarios } from "./preview-app";

configure({ asyncUtilTimeout: 3_000 });

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1_000 });
});

async function renderEmbeddedPreview(ui: Parameters<typeof render>[0]) {
  const result = render(ui);
  await waitFor(() => {
    expect(result.container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
  return result;
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("link", { name: "Settings" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  await waitFor(() => {
    expect(document.querySelector(".settings-overview")).not.toBeNull();
  });
}

async function reopenForumSettingsFromBreadcrumbs(user: ReturnType<typeof userEvent.setup>) {
  const breadcrumbs = document.querySelector(".breadcrumbs") as HTMLElement;
  await user.click(within(breadcrumbs).getByRole("link", { name: "Settings" }));
  const settingsOverview = await waitFor(() => {
    const overview = document.querySelector(".settings-overview") as HTMLElement | null;
    expect(overview).not.toBeNull();
    return overview as HTMLElement;
  });
  await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));
  expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
}

async function openSettingsSection(
  user: ReturnType<typeof userEvent.setup>,
  linkName: string,
  headingName: string,
) {
  const settingsOverview = await waitFor(() => {
    const overview = document.querySelector(".settings-overview") as HTMLElement | null;
    expect(overview).not.toBeNull();
    return overview as HTMLElement;
  });
  await user.click(within(settingsOverview).getByRole("link", { name: linkName }));
  expect(await screen.findByRole("heading", { level: 2, name: headingName })).toBeInTheDocument();
}

async function findAlexMeasures(user: ReturnType<typeof userEvent.setup>) {
  const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
  await user.click(within(nav).getByRole("link", { name: "User measures" }));
  await user.type(await screen.findByLabelText("Exact user ID"), "alex");
  await user.click(screen.getByRole("button", { name: "Find user" }));

  const targetHeading = await screen.findByRole("heading", { level: 3, name: "Alex Rivera" });
  return targetHeading.closest(".admin-forum") as HTMLElement;
}

async function openExistingAlexMeasure(user: ReturnType<typeof userEvent.setup>) {
  const measures = await findAlexMeasures(user);
  const list = measures.querySelector(".admin-forum-objects") as HTMLElement;
  const reason = within(list).getByText(
    "Repeated off-topic promotional posts after a moderator warning.",
  );
  const item = reason.closest("li") as HTMLElement;
  await user.click(within(item).getByRole("link"));
  await screen.findByRole("heading", { level: 2, name: "Measure details" });
}

async function openAlexAdminUserItem(user: ReturnType<typeof userEvent.setup>) {
  const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
  await user.click(within(nav).getByRole("link", { name: "Users" }));
  expect(await screen.findByRole("heading", { level: 2, name: "Users" })).toBeInTheDocument();

  const users = document.querySelector(".admin-forum") as HTMLElement;
  const alexLink = within(users).getByRole("link", { name: "Alex Rivera" });
  return alexLink.closest("li") as HTMLElement;
}

async function openAlexProfileAuthorization(user: ReturnType<typeof userEvent.setup>) {
  const alexItem = await openAlexAdminUserItem(user);
  await user.click(within(alexItem).getByRole("link", { name: "Authorization" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Alex Rivera" })).toBeInTheDocument();

  return waitFor(() => {
    const authorization = document.querySelector("#authorization") as HTMLElement | null;
    expect(authorization).not.toBeNull();
    return authorization as HTMLElement;
  });
}

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

  it("includes the protected AP-07 topic page for Manager and Owner", () => {
    expect(scenarios).toContainEqual(expect.objectContaining({
      id: "admin-topic", view: "admin-topic",
      allowedIdentities: ["manager", "owner"],
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


describe("embedded preview routing", { timeout: 10_000 }, () => {
  it("keeps tag index counts aligned with the preview tag pages", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="tags-guest" />);

    const cloudflare = await screen.findByRole("link", { name: /#Cloudflare/ });
    expect(cloudflare).toHaveTextContent("3");
    const postgresql = screen.getByRole("link", { name: /#PostgreSQL/ });
    expect(postgresql).toHaveTextContent("2");
  });

  it("opens the requested non-TypeScript tag instead of the TypeScript fixture", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="tag-cloudflare-guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "#Cloudflare" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Worker auth: session boundary vs permissions/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Why does my Worker lose the session after redirect\?/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /How should Cache-Control be configured on Cloudflare\?/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "#TypeScript" })).not.toBeInTheDocument();
  });

  it("returns the shared 404 state for a missing tag", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="tag-missing" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(document.querySelector(".tags-heading")).toBeNull();
  });

  it("returns the shared 404 state for a missing profile", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-missing" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(document.querySelector(".profile-card")).toBeNull();
  });

  it("returns the shared 404 state for a missing category", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="category-missing" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(document.querySelector(".category-heading")).toBeNull();
  });

  it("returns the shared 404 state for a missing section", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-missing" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(document.querySelector(".section-heading")).toBeNull();
  });

  it("returns the shared 404 state for a missing topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="topic-missing" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
    expect(document.querySelector(".topic-breadcrumb-row")).toBeNull();
  });

  it("returns the shared 404 state for an unknown preview route", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="route-real-404" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", { level: 1, name: "Forum page not found" })).toBeInTheDocument();
    expect(within(missing).getByText("The category, section, or topic does not exist.")).toBeInTheDocument();
  });

  it("requires sign-in for guest direct access to Authorization", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authorization management" })).not.toBeInTheDocument();
  });

  it("denies ordinary user direct access to Authorization", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-user-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authorization management" })).not.toBeInTheDocument();
  });

  it("requires sign-in for guest direct access to Admin topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".admin-topic")).toBeNull();
  });

  it("denies ordinary user direct access to Admin topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic-user-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(document.querySelector(".admin-topic")).toBeNull();
  });

  it("opens the requested non-primary Admin topic instead of the typed-api fixture", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic-worker-auth" identity="manager" />);

    expect(await screen.findByRole("heading", {
      level: 2,
      name: "Worker auth: session boundary vs permissions",
    })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Topic" }))
      .toHaveAttribute("href", "/en/topics/worker-auth");
    expect(screen.queryByRole("heading", {
      level: 2,
      name: "How should I structure a typed API client?",
    })).not.toBeInTheDocument();
  });

  it("returns 404 for a missing Admin topic after Manager admission", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic-missing" identity="manager" />);

    const missing = await screen.findByRole("alert");
    expect(missing).toHaveAttribute("data-status", "404");
    expect(within(missing).getByRole("heading", {
      level: 1,
      name: "Forum page not found",
    })).toBeInTheDocument();
    expect(document.querySelector(".admin-topic")).toBeNull();
  });

  it("keeps Admin admission ahead of target lookup for a guest missing topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic-missing-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(unauthenticated).toHaveAttribute("data-status", "401");
    expect(within(unauthenticated).getByRole("heading", {
      level: 1,
      name: "Sign in required",
    })).toBeInTheDocument();
    expect(document.querySelector(".admin-topic")).toBeNull();
  });

  it("records a created role in live Admin History", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin" identity="owner" />);

    await screen.findByRole("heading", { name: "Authorization management" });
    const createRole = document.querySelector(".admin-create-role") as HTMLElement;
    await user.type(within(createRole).getByLabelText("Role slug"), "preview-reviewer");
    await user.type(within(createRole).getByLabelText("Display name"), "Preview Reviewer");
    await user.click(within(createRole).getByRole("button", { name: "Create custom role" }));

    expect(await screen.findByRole("heading", { name: "Preview Reviewer" })).toBeInTheDocument();
    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "History" }));

    expect(await screen.findByRole("heading", { level: 2, name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Role created" })).toBeInTheDocument();
    expect(screen.getByText("preview-reviewer")).toBeInTheDocument();
  });

  it("records a registration-policy change in live Admin History", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    await user.click(screen.getByRole("link", { name: "Admin panel" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "History" }));

    expect(await screen.findByRole("heading", {
      level: 3,
      name: "Registration settings changed",
    })).toBeInTheDocument();
    expect(screen.getByText("Google registration")).toBeInTheDocument();
  });

  it("records an accepted Help signal in live Admin History", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);

    await user.click(screen.getByRole("button", { name: "Accept signal" }));
    await waitFor(() => expect(screen.queryByText("#signal-142")).not.toBeInTheDocument());

    await user.click(screen.getByRole("link", { name: "Admin panel" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "History" }));

    const historyHeading = await screen.findByRole("heading", {
      level: 3,
      name: "Help signal reviewed",
    });
    const historyEvent = historyHeading.closest("li") as HTMLElement;
    expect(within(historyEvent).getByText("signal-142")).toBeInTheDocument();
    expect(historyEvent).toHaveTextContent("Accepted");
  });

  it("opens User measures from the Admin shell navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "User measures" }));

    expect(await screen.findByRole("heading", { level: 2, name: "User measures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Pending measure appeals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review appeal #1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Exact user ID")).toBeInTheDocument();
  });

  it("finds Alex by exact ID and opens the existing Admin measure detail", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    expect(await screen.findByRole("heading", { level: 2, name: "Alex Rivera" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Measure details" })).toBeInTheDocument();
    const measureInfo = document.querySelector("[aria-labelledby='measure-info-title']") as HTMLElement;
    expect(within(measureInfo).getByText(
      "Repeated off-topic promotional posts after a moderator warning.",
    )).toBeInTheDocument();
  });

  it("creates an Admin measure and opens its detail page", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const measures = await findAlexMeasures(user);
    const createForm = measures.querySelector("#measure-create-reason")?.closest("form") as HTMLElement;
    await user.type(within(createForm).getByLabelText("Original reason"), "Temporary preview restriction.");
    await user.click(within(createForm).getByRole("button", { name: "Create measure" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Alex Rivera" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Measure details" })).toBeInTheDocument();
    const measureInfo = document.querySelector("[aria-labelledby='measure-info-title']") as HTMLElement;
    expect(within(measureInfo).getByText("Temporary preview restriction.")).toBeInTheDocument();
  });

  it("changes an Admin measure and records the new version", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    const changeHeading = await screen.findByRole("heading", { level: 3, name: "Change measure" });
    const changeForm = changeHeading.closest("form") as HTMLElement;
    await user.type(within(changeForm).getByLabelText("Explanation"), "Updated preview restriction scope.");
    await user.click(within(changeForm).getByRole("checkbox", { name: "Create topics" }));
    await user.click(within(changeForm).getByRole("button", { name: "Change measure" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getAllByText("Updated preview restriction scope.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Version: 2").length).toBeGreaterThan(0);
  });

  it("lifts an Admin measure and removes its pending appeal from the index", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    const liftHeading = await screen.findByRole("heading", { level: 3, name: "Lift measure" });
    const liftForm = liftHeading.closest("form") as HTMLElement;
    await user.type(within(liftForm).getByLabelText("Explanation"), "Restriction no longer needed.");
    await user.click(within(liftForm).getByRole("button", { name: "Lift measure" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getByText("Status: Lifted")).toBeInTheDocument();

    const measuresNav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(measuresNav).getByRole("link", { name: "User measures" }));
    expect(await screen.findByText("No pending measure appeals available.")).toBeInTheDocument();
  });

  it("reviews a pending Admin measure appeal and persists the decision", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    const reviewHeading = await screen.findByRole("heading", { level: 3, name: "Review appeal #1" });
    const reviewForm = reviewHeading.closest("form") as HTMLElement;
    await user.type(within(reviewForm).getByLabelText("Explanation"), "The appeal does not change the original facts.");
    await user.click(within(reviewForm).getByRole("button", { name: "Review appeal" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getByRole("heading", { level: 3, name: "1. Rejected" })).toBeInTheDocument();
    expect(screen.getAllByText("The appeal does not change the original facts.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Review appeal" })).not.toBeInTheDocument();
  });

  it("accepts an Admin measure appeal with a change remedy and records it in History", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    const reviewHeading = await screen.findByRole("heading", { level: 3, name: "Review appeal #1" });
    const reviewForm = reviewHeading.closest("form") as HTMLElement;
    await user.selectOptions(within(reviewForm).getByLabelText("Outcome"), "accepted");
    await user.selectOptions(within(reviewForm).getByLabelText("Decision remedy"), "change");
    await user.type(
      within(reviewForm).getByLabelText("Explanation"),
      "Keep the measure but broaden the restricted actions.",
    );
    await user.click(within(reviewForm).getByRole("checkbox", { name: "Create topics" }));
    await user.click(within(reviewForm).getByRole("button", { name: "Review appeal" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getByRole("heading", { level: 3, name: "1. Accepted" })).toBeInTheDocument();
    expect(screen.getAllByText("Version: 2").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Review appeal" })).not.toBeInTheDocument();

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "History" }));
    expect(await screen.findByRole("heading", { level: 2, name: "History" })).toBeInTheDocument();

    const historyHeading = await screen.findByRole("heading", {
      level: 3,
      name: "User measure appeal resolved",
    });
    const historyEvent = historyHeading.closest("li") as HTMLElement;
    expect(historyEvent).toHaveTextContent("Accepted");
    expect(historyEvent).toHaveTextContent("Decision remedy: Change measure");
    expect(historyEvent).toHaveTextContent("Keep the measure but broaden the restricted actions.");
    expect(within(historyEvent).getByText("topics.create")).toBeInTheDocument();
  });

  it("accepts an Admin measure appeal with a lift remedy and records it in History", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openExistingAlexMeasure(user);

    const reviewHeading = await screen.findByRole("heading", { level: 3, name: "Review appeal #1" });
    const reviewForm = reviewHeading.closest("form") as HTMLElement;
    await user.selectOptions(within(reviewForm).getByLabelText("Outcome"), "accepted");
    await user.selectOptions(within(reviewForm).getByLabelText("Decision remedy"), "lift");
    await user.type(
      within(reviewForm).getByLabelText("Explanation"),
      "The appeal justifies ending the restriction.",
    );
    await user.click(within(reviewForm).getByRole("button", { name: "Review appeal" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getByText("Status: Lifted")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "1. Accepted" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review appeal" })).not.toBeInTheDocument();

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "History" }));
    expect(await screen.findByRole("heading", { level: 2, name: "History" })).toBeInTheDocument();

    const historyHeading = await screen.findByRole("heading", {
      level: 3,
      name: "User measure appeal resolved",
    });
    const historyEvent = historyHeading.closest("li") as HTMLElement;
    expect(historyEvent).toHaveTextContent("Accepted");
    expect(historyEvent).toHaveTextContent("Decision remedy: Lift measure");
    expect(historyEvent).toHaveTextContent("Active");
    expect(historyEvent).toHaveTextContent("Lifted");
    expect(historyEvent).toHaveTextContent("The appeal justifies ending the restriction.");
  });

  it("opens Admin Overview from the Admin shell navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "Overview" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".admin-overview-stats")).not.toBeNull();
    const destinations = document.querySelector(".admin-destinations") as HTMLElement;
    expect(within(destinations).getByRole("link", { name: "Forum" })).toBeInTheDocument();
  });

  it("opens Users from the Admin shell navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "Users" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Users" })).toBeInTheDocument();
    const users = document.querySelector(".admin-forum") as HTMLElement;
    expect(within(users).getByRole("link", { name: "Maya Cohen" })).toBeInTheDocument();
    expect(within(users).getByRole("link", { name: "Alex Rivera" })).toBeInTheDocument();
  });

  it("shows Owner-self private account information without self-deactivation", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-owner-self" identity="owner" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Forum Owner" })).toBeInTheDocument();
    const account = document.querySelector("#owner-account") as HTMLElement;
    expect(within(account).getByRole("heading", {
      level: 2,
      name: "Private account information",
    })).toBeInTheDocument();
    expect(within(account).getByText("owner@example.test")).toBeInTheDocument();
    expect(within(account).getByText("Password")).toBeInTheDocument();
    expect(within(account).getByText("Google")).toBeInTheDocument();
    expect(document.querySelector(".owner-deactivate-button")).toBeNull();
  });

  it("shows Owner-self active and retained session details", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-owner-self" identity="owner" />);

    const sessions = document.querySelector("#owner-sessions") as HTMLElement;
    expect(await within(sessions).findByRole("heading", {
      level: 3,
      name: "Active sessions",
    })).toBeInTheDocument();
    expect(within(sessions).getByText(/preview-owner-current-session/)).toBeInTheDocument();
    expect(within(sessions).getByText(/Current session/)).toBeInTheDocument();
    expect(within(sessions).getByText(/preview-owner-expired-session/)).toBeInTheDocument();
    expect(within(sessions).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(sessions).getByText("Firefox on Linux")).toBeInTheDocument();
  });

  it("shows retained Owner-self personal History but hides it from Manager", async () => {
    const { unmount } = await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-owner-self" identity="owner" />);

    const history = document.querySelector("#owner-history") as HTMLElement;
    expect(await within(history).findByRole("heading", {
      level: 2,
      name: "History",
    })).toBeInTheDocument();
    expect(within(history).getByRole("heading", {
      level: 3,
      name: "Account created",
    })).toBeInTheDocument();
    expect(within(history).getByText("preview-account-created-owner")).toBeInTheDocument();

    unmount();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);
    const user = userEvent.setup();
    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "Users" }));
    const ownerLink = await screen.findByRole("link", { name: "Forum Owner" });
    await user.click(ownerLink);

    expect(await screen.findByRole("heading", { level: 1, name: "Forum Owner" })).toBeInTheDocument();
    expect(document.querySelector("#owner-account")).toBeNull();
    expect(document.querySelector("#owner-history")).toBeNull();
  });

  it("opens the privileged Authorization section from Admin Users", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const authorization = await openAlexProfileAuthorization(user);

    expect(within(authorization).getByRole("heading", {
      level: 3,
      name: "Authorization management",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "User measures" })).toBeInTheDocument();
    expect(screen.getByText(
      "Repeated off-topic promotional posts after a moderator warning.",
    )).toBeInTheDocument();
  });

  it("opens the exact target Admin measures list from the privileged profile section", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    await openAlexProfileAuthorization(user);

    const measures = await waitFor(() => {
      const section = document.querySelector("#measures") as HTMLElement | null;
      expect(section).not.toBeNull();
      return section as HTMLElement;
    });
    await user.click(within(measures).getByRole("link", { name: "User measures" }));

    const targetInput = await screen.findByLabelText("Exact user ID");
    expect(targetInput).toHaveValue("alex");
    expect(screen.getByRole("heading", { level: 2, name: "User measures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Alex Rivera" })).toBeInTheDocument();
  });

  it("updates inline profile authorization through the canonical Owner writer", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="owner" />);

    const authorization = await openAlexProfileAuthorization(user);

    const roleForm = authorization.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(within(roleForm).getByLabelText("Assigned role"), "role-moderator");
    await user.click(within(roleForm).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Authorization was updated.");
    expect(document.querySelector(".profile-role")).toHaveTextContent("Moderator");
    const refreshedRoleForm = document.querySelector("#authorization .admin-role-assignment") as HTMLElement;
    expect(within(refreshedRoleForm).getByLabelText("Assigned role")).toHaveValue("role-moderator");
  });

  it("filters the Admin Users directory through its GET search", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const nav = document.querySelector(".admin-panel-nav") as HTMLElement;
    await user.click(within(nav).getByRole("link", { name: "Users" }));

    const query = await screen.findByLabelText("Search users by name or ID");
    await user.type(query, "noa");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("link", { name: "Noa Levi" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Alex Rivera" })).not.toBeInTheDocument();
    expect(screen.getByText("Matching users: 1")).toBeInTheDocument();
  });

  it("opens Admin forum from the Admin topic breadcrumb", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const trail = document.querySelector(".admin-forum-trail") as HTMLElement;
    await user.click(within(trail).getByRole("link", { name: "Forum" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Development" })).toBeInTheDocument();
  });

  it("opens the Admin category from the Admin topic breadcrumb", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const trail = document.querySelector(".admin-forum-trail") as HTMLElement;
    await user.click(within(trail).getByRole("link", { name: "Development" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Development" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TypeScript & architecture" })).toBeInTheDocument();
  });

  it("opens the Admin section from the Admin topic breadcrumb", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

    const trail = document.querySelector(".admin-forum-trail") as HTMLElement;
    await user.click(within(trail).getByRole("link", { name: "TypeScript & architecture" }));

    expect(await screen.findByRole("heading", {
      level: 2,
      name: "TypeScript & architecture",
    })).toBeInTheDocument();
    expect(screen.getByRole("link", {
      name: "How should I structure a typed API client?",
    })).toBeInTheDocument();
  });

  it("opens the Admin topic fixture for Owner as well as Manager", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="owner" />);

    expect(await screen.findByRole("heading", { name: "Admin panel" })).toBeInTheDocument();
    expect(document.querySelector(".admin-topic")).not.toBeNull();
  });

  it("renders one admin shell with topic and message Quick actions in the AP-07 fixture", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" />);
    expect(await screen.findByRole("heading", { name: "Admin panel" })).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll(".admin-topic .topic-message").length).toBeGreaterThan(0);
    expect(document.querySelector(".message-admin-tools")).not.toBeNull();
  });

  it("opens a pinned category-card topic instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="category-guest" />);

    const pinned = await screen.findAllByRole("link", { name: "Section guide and useful resources" });
    await userEvent.click(pinned[0]!);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Section guide and useful resources",
    })).toBeInTheDocument();
    expect(screen.queryByRole("heading", {
      level: 1,
      name: "How should I structure a typed API client?",
    })).not.toBeInTheDocument();
  });

  it("opens a latest category-card topic instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="category-guest" />);

    const primary = await screen.findByRole("link", {
      name: "How should I structure a typed API client?",
    });
    const sectionCard = primary.closest("article") as HTMLElement;
    await userEvent.click(within(sectionCard).getByRole("button", { name: "Show more topics" }));
    await userEvent.click(await within(sectionCard).findByRole("link", {
      name: "A practical example from this section",
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "A practical example from this section",
    })).toBeInTheDocument();
  });

  it("resolves category-card topics outside Development", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="category-vibe-ai-guest" />);

    await userEvent.click(await screen.findByRole("link", {
      name: "Latest question in General",
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Latest question in General",
    })).toBeInTheDocument();
  });

  it("opens the generated topic author's matching profile", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="tag-typescript-guest" />);

    await userEvent.click(await screen.findByRole("link", { name: /Mixed RTL content with code blocks/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mixed RTL content with code blocks" })).toBeInTheDocument();

    const authorLinks = await screen.findAllByRole("link", { name: "Noa Levi" });
    await userEvent.click(authorLinks[0]!);

    expect(await screen.findByRole("heading", { level: 1, name: "Noa Levi" })).toBeInTheDocument();
    expect(document.querySelector(".profile-card")).not.toBeNull();
  });

  it("opens the Attention reporter's matching profile", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Appeals (1)" }));

    await userEvent.click(await screen.findByRole("link", { name: "Jordan Chen" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Jordan Chen" })).toBeInTheDocument();
    expect(document.querySelector(".profile-card")).not.toBeNull();
  });

  it("opens the selected Popular topic instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="popular-guest" />);

    const links = await screen.findAllByRole("link", { name: /How do I design a job queue without overcomplicating it\?/ });
    await userEvent.click(links[0]!);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "How do I design a job queue without overcomplicating it?",
    })).toBeInTheDocument();
    expect(screen.queryByRole("heading", {
      level: 1,
      name: "How should I structure a typed API client?",
    })).not.toBeInTheDocument();
  });

  it("opens the selected Unanswered topic instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="unanswered-guest" />);

    await userEvent.click(await screen.findByRole("link", {
      name: /How should context be passed between several AI agents\?/,
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "How should context be passed between several AI agents?",
    })).toBeInTheDocument();
  });

  it("opens the selected Unread topic instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="unread-user" />);

    await userEvent.click(await screen.findByRole("link", {
      name: /How should context be passed between several AI agents\?/,
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "How should context be passed between several AI agents?",
    })).toBeInTheDocument();
  });

  it("opens the real section view directly from the homepage category map", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="home-guest" />);

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


describe("interactive Pages preview", { timeout: 10_000 }, () => {
  it("runs the global search form instead of blocking GET submissions", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="home-guest" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-registration-conflict" identity="owner" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-registration-unavailable" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Registration settings are temporarily unavailable.",
    );

    await reopenForumSettingsFromBreadcrumbs(user);

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("shows invalid registration feedback without changing the saved policy", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-registration-invalid" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid registration settings.");

    await reopenForumSettingsFromBreadcrumbs(user);

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("shows forbidden registration feedback without changing the saved policy", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-registration-forbidden" identity="owner" />);

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    expect(google).toBeChecked();
    expect(email).toBeChecked();

    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the Owner can change registration settings.",
    );

    await reopenForumSettingsFromBreadcrumbs(user);

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    });
  });

  it("applies the owner registration policy to a new Sign up preview", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    await user.click(google);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(
      "New Google registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("keeps Google sign-up available when email registration is closed", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const email = await screen.findByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(email);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    await waitFor(() => {
      const version = document.querySelector('input[name="expectedVersion"]') as HTMLInputElement | null;
      expect(version?.value).toBe("2");
    });

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(
      "New email registrations are currently closed. Existing users can sign in.",
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("removes both registration methods when the owner closes both", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const google = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const email = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(google);
    await user.click(email);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    await waitFor(() => {
      const version = document.querySelector('input[name="expectedVersion"]') as HTMLInputElement | null;
      expect(version?.value).toBe("2");
    });

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-register" identity="guest" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    const googleRegistration = await screen.findByRole("checkbox", { name: "Allow new accounts through Google" });
    const emailRegistration = screen.getByRole("checkbox", { name: "Allow new accounts through email and password" });
    await user.click(googleRegistration);
    await user.click(emailRegistration);
    await user.click(screen.getByRole("button", { name: "Save registration settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration settings updated.");

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-sign-in" identity="guest" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Vico Forum" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText(
      "New email registrations are currently closed. Existing users can sign in.",
    )).not.toBeInTheDocument();
    expect(screen.queryByText(
      "New Google registrations are currently closed. Existing users can sign in.",
    )).not.toBeInTheDocument();
  });

  it("requires sign-in for guest access to Forum & roles", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authorization management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Registration" })).not.toBeInTheDocument();
  });

  it("shows Forum & roles to Owner in Settings overview and navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);

    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsOverview).getByRole("link", { name: "Forum & roles" })).toHaveAttribute(
      "href",
      "/en/settings/forum",
    );
    const forumNavigationLink = within(settingsNavigation).getByRole("link", { name: "Forum & roles" });
    expect(forumNavigationLink).toHaveAttribute("href", "/en/settings/forum");

    await user.click(forumNavigationLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const activeSettingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(activeSettingsNavigation).getByRole("link", { name: "Forum & roles" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
    const settingsBreadcrumb = within(breadcrumbs).getByRole("link", { name: "Settings" });
    expect(settingsBreadcrumb).toHaveAttribute("href", "/en/settings");
    await user.click(settingsBreadcrumb);

    const returnedSettingsOverview = await waitFor(() => {
      const overview = document.querySelector(".settings-overview") as HTMLElement | null;
      expect(overview).not.toBeNull();
      return overview as HTMLElement;
    });
    expect(within(returnedSettingsOverview).getByRole("link", { name: "Forum & roles" })).toBeInTheDocument();
  });

  it("moves Owner from Forum & roles to User preferences through Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    let settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    await user.click(within(settingsNavigation).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    const userPreferencesLink = within(settingsNavigation).getByRole("link", { name: "User preferences" });
    expect(userPreferencesLink).toHaveAttribute("href", "/en/settings/user");
    await user.click(userPreferencesLink);

    expect(await screen.findByRole("heading", { level: 2, name: "User preferences" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "User preferences" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const forumRolesLink = within(settingsNavigation).getByRole("link", { name: "Forum & roles" });
    expect(forumRolesLink).toHaveAttribute("href", "/en/settings/forum");
    await user.click(forumRolesLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Forum & roles" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("moves Owner from Forum & roles to Account & security through Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    let settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    await user.click(within(settingsNavigation).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    const accountLink = within(settingsNavigation).getByRole("link", { name: "Account & security" });
    expect(accountLink).toHaveAttribute("href", "/en/settings/account");
    await user.click(accountLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Account & security" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Account & security" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("moves Owner from Forum & roles to Privacy through Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    let settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    await user.click(within(settingsNavigation).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    const privacyLink = within(settingsNavigation).getByRole("link", { name: "Privacy" });
    expect(privacyLink).toHaveAttribute("href", "/en/settings/privacy");
    await user.click(privacyLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Privacy" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("moves Owner from Forum & roles to Administrator preferences through Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    let settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    await user.click(within(settingsNavigation).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    const administratorLink = within(settingsNavigation).getByRole("link", { name: "Administrator preferences" });
    expect(administratorLink).toHaveAttribute("href", "/en/settings/administrator");
    await user.click(administratorLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Administrator preferences" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Administrator preferences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("hides Forum & roles from ordinary user Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);

    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsOverview).queryByRole("link", { name: "Forum & roles" })).not.toBeInTheDocument();
    expect(within(settingsNavigation).queryByRole("link", { name: "Forum & roles" })).not.toBeInTheDocument();
  });

  it("hides Administrator preferences from ordinary user Settings navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);

    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsOverview).queryByRole("link", { name: "Administrator preferences" })).not.toBeInTheDocument();
    expect(within(settingsNavigation).queryByRole("link", { name: "Administrator preferences" })).not.toBeInTheDocument();
  });

  it("requires sign-in for guest direct access to Settings overview", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-overview-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Settings" })).not.toBeInTheDocument();
    expect(document.querySelector(".settings-overview")).toBeNull();
  });

  it("requires sign-in for guest direct access to User preferences", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-user-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "User preferences" })).not.toBeInTheDocument();
    expect(document.querySelector(".settings-overview")).toBeNull();
  });

  it("requires sign-in for guest direct access to Account & security", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Account & security" })).not.toBeInTheDocument();
    expect(document.querySelector(".settings-overview")).toBeNull();
  });

  it("requires sign-in for guest direct access to Privacy", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-privacy-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Privacy" })).not.toBeInTheDocument();
    expect(document.querySelector(".settings-overview")).toBeNull();
  });

  it("requires sign-in for guest direct access to Administrator preferences", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-administrator-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Administrator preferences" })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin entry")).not.toBeInTheDocument();
  });

  it("denies ordinary user direct access to Administrator preferences", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-administrator-user-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Administrator preferences" })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin entry")).not.toBeInTheDocument();
  });

  it("denies ordinary user access to Forum & roles", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-user-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authorization management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Registration" })).not.toBeInTheDocument();
  });

  it("opens Administrator preferences directly for Manager with active navigation", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-administrator-manager" />);

    expect(await screen.findByRole("heading", { level: 2, name: "Administrator preferences" })).toBeInTheDocument();
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Administrator preferences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens Administrator preferences directly for Owner with Forum & roles still available", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-administrator-owner" />);

    expect(await screen.findByRole("heading", { level: 2, name: "Administrator preferences" })).toBeInTheDocument();
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Administrator preferences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(settingsNavigation).getByRole("link", { name: "Forum & roles" })).toHaveAttribute(
      "href",
      "/en/settings/forum",
    );
  });

  it("shows Administrator preferences to Manager in Settings and opens it from navigation", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);

    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    let settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsOverview).getByRole("link", { name: "Administrator preferences" })).toHaveAttribute(
      "href",
      "/en/settings/administrator",
    );
    const administratorLink = within(settingsNavigation).getByRole("link", { name: "Administrator preferences" });
    expect(administratorLink).toHaveAttribute("href", "/en/settings/administrator");
    await user.click(administratorLink);

    expect(await screen.findByRole("heading", { level: 2, name: "Administrator preferences" })).toBeInTheDocument();
    settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsNavigation).getByRole("link", { name: "Administrator preferences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps Forum & roles owner-only for managers in Settings", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    const settingsNavigation = document.querySelector(".settings-panel-nav") as HTMLElement;
    expect(within(settingsOverview).queryByRole("link", { name: "Forum & roles" })).not.toBeInTheDocument();
    expect(within(settingsNavigation).queryByRole("link", { name: "Forum & roles" })).not.toBeInTheDocument();

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-forum-manager-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authorization management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Registration" })).not.toBeInTheDocument();
  });

  it("creates, configures, assigns, overrides, protects, then deletes an unassigned custom role in Forum & roles", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
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

    const duplicateRoleForm = document.querySelector(".admin-create-role") as HTMLElement;
    await user.clear(within(duplicateRoleForm).getByLabelText("Role slug"));
    await user.type(within(duplicateRoleForm).getByLabelText("Role slug"), "settings-helper");
    await user.clear(within(duplicateRoleForm).getByLabelText("Display name"));
    await user.type(within(duplicateRoleForm).getByLabelText("Display name"), "Duplicate settings helper");
    await user.click(within(duplicateRoleForm).getByRole("button", { name: "Create custom role" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Check the submitted values.");
    expect(screen.queryByRole("heading", { name: "Duplicate settings helper" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings helper" })).toBeInTheDocument();

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

    await waitFor(() => {
      const updatedHeading = screen.getByRole("heading", { name: "Settings helper renamed" });
      const updatedCard = updatedHeading.closest(".admin-role-card") as HTMLElement;
      expect(within(updatedCard).getByLabelText(/^Permissions: 1\//)).toBeInTheDocument();
      expect(within(updatedCard).getByLabelText("forum.topic.pin")).toBeChecked();
    });

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

    await waitFor(() => {
      const overriddenAlex = screen.getByRole("heading", { name: "Alex Rivera" })
        .closest(".admin-user-card") as HTMLElement;
      expect(within(overriddenAlex).getByLabelText("forum.topic.pin: Permissions")).toHaveValue("deny");
      const effectivePermissions = overriddenAlex.querySelector(".admin-effective-permissions") as HTMLElement;
      expect(within(effectivePermissions).queryByText("forum.topic.pin")).not.toBeInTheDocument();
    });

    const assignedRoleHeading = screen.getByRole("heading", { name: "Settings helper renamed" });
    const assignedRoleCard = assignedRoleHeading.closest(".admin-role-card") as HTMLElement;
    await user.click(within(assignedRoleCard).getByRole("button", { name: "Delete role" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This role is assigned to users and cannot be deleted.",
    );
    expect(screen.getByRole("heading", { name: "Settings helper renamed" })).toBeInTheDocument();
    const stillAssignedAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(stillAssignedAlex).getByLabelText("Assigned role")).toHaveDisplayValue("Settings helper renamed");

    const resetAssignment = stillAssignedAlex.querySelector(".admin-role-assignment") as HTMLElement;
    await user.selectOptions(within(resetAssignment).getByLabelText("Assigned role"), "User");
    await user.click(within(resetAssignment).getByRole("button", { name: "Save" }));

    const resetAlex = screen.getByRole("heading", { name: "Alex Rivera" })
      .closest(".admin-user-card") as HTMLElement;
    expect(within(resetAlex).getByText("User")).toBeInTheDocument();

    const deletableRoleHeading = screen.getByRole("heading", { name: "Settings helper renamed" });
    const deletableRoleCard = deletableRoleHeading.closest(".admin-role-card") as HTMLElement;
    await user.click(within(deletableRoleCard).getByRole("button", { name: "Delete role" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Authorization was updated.");
    expect(screen.queryByRole("heading", { name: "Settings helper renamed" })).not.toBeInTheDocument();
  }, 10_000);

  it("rejects an invalid custom role slug in Forum & roles", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const createRoleForm = document.querySelector(".admin-create-role") as HTMLElement;
    const roleCountBefore = document.querySelectorAll(".admin-role-card").length;
    const slug = within(createRoleForm).getByLabelText("Role slug");

    await user.type(slug, "Invalid slug!");
    await user.type(within(createRoleForm).getByLabelText("Display name"), "Invalid role");

    expect(slug).toHaveAttribute("pattern", "[a-z][a-z0-9-]{0,62}");
    expect(slug).toHaveValue("Invalid slug!");
    await user.click(within(createRoleForm).getByRole("button", { name: "Create custom role" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Check the submitted values.");
    expect(document.querySelectorAll(".admin-role-card")).toHaveLength(roleCountBefore);
    expect(screen.queryByRole("heading", { name: "Invalid role" })).not.toBeInTheDocument();
  });

  it("blocks an empty custom role display name in Forum & roles before submission", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
    await user.click(within(settingsOverview).getByRole("link", { name: "Forum & roles" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Registration" })).toBeInTheDocument();
    const createRoleForm = document.querySelector(".admin-create-role") as HTMLElement;
    const roleCountBefore = document.querySelectorAll(".admin-role-card").length;
    const displayName = within(createRoleForm).getByLabelText("Display name");

    await user.type(within(createRoleForm).getByLabelText("Role slug"), "empty-name");
    expect(displayName).toBeInvalid();
    await user.click(within(createRoleForm).getByRole("button", { name: "Create custom role" }));

    expect(displayName).toBeInvalid();
    expect(document.querySelectorAll(".admin-role-card")).toHaveLength(roleCountBefore);
    expect(screen.queryByText("Role slug: empty-name")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the registration version unchanged on a no-op save", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="owner" />);

    await openSettings(user);
    await openSettingsSection(user, "Administrator preferences", "Administrator preferences");

    const behavior = await screen.findByLabelText("On entry, open", { selector: "#settings-admin-entry" });
    const destination = screen.getByRole("combobox", { name: "Default Admin section" });
    expect(behavior).toHaveValue("default");
    expect(destination).toHaveValue("overview");

    await user.selectOptions(destination, "roles");
    await user.click(screen.getByRole("link", { name: "Open Admin" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Roles & permissions" })).toBeInTheDocument();

    await openSettings(user);
    await openSettingsSection(user, "Administrator preferences", "Administrator preferences");

    await user.selectOptions(screen.getByRole("combobox", { name: "Default Admin section" }), "overview");
    await user.selectOptions(screen.getByLabelText("On entry, open", { selector: "#settings-admin-entry" }), "last");

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);
    await openSettingsSection(user, "Administrator preferences", "Administrator preferences");

    const behavior = await screen.findByRole("combobox", { name: "On entry, open" });
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

    await openSettings(user);
    await openSettingsSection(user, "Administrator preferences", "Administrator preferences");

    await user.selectOptions(screen.getByRole("combobox", { name: "Default group" }), "needs-details");
    await user.selectOptions(screen.getByRole("combobox", { name: "On entry, open" }), "last");

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);

    await openSettings(user);
    const settingsOverview = document.querySelector(".settings-overview") as HTMLElement;
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="manager" />);
    const secondUser = userEvent.setup();

    await openSettings(secondUser);
    await openSettingsSection(secondUser, "Administrator preferences", "Administrator preferences");

    expect(await screen.findByRole("checkbox", {
      name: "Expand secondary technical details by default",
    })).toBeChecked();
  });

  it("shows the non-fresh session state without exposing session controls", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-not-fresh" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-google-only" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
    await openSettingsSection(user, "Account & security", "Account & security");

    const methods = document.querySelector("#settings-account-methods")?.parentElement as HTMLElement;
    expect(within(methods).getByText("Email and password")).toBeInTheDocument();
    expect(within(methods).queryByText("Google")).not.toBeInTheDocument();

    await user.click(within(methods).getByRole("button", { name: "Connect Google" }));

    expect(await within(methods).findByText("Google")).toBeInTheDocument();
    expect(within(methods).queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
  });

  it("signs out one other active session while preserving the remaining sessions", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-session-not-found" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-unavailable" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-stale" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-invalid-password" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="settings-account-rate-limited" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
    await openSettingsSection(user, "Account & security", "Account & security");

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="section-user" identity="user" />);

    await openSettings(user);
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

  it("redirects an authenticated user away from Sign in", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-sign-in-authenticated" />);

    expect(await screen.findByRole("link", { name: /TypeScript & architecture/ })).toBeInTheDocument();
    expect(document.querySelector(".credential-page")).toBeNull();
  });

  it("redirects an authenticated user away from Sign up", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-register-authenticated" />);

    expect(await screen.findByRole("link", { name: /TypeScript & architecture/ })).toBeInTheDocument();
    expect(document.querySelector(".credential-page")).toBeNull();
  });

  it("preserves a safe return destination across the guest credential switch", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="credentials-sign-in-return-to" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Vico Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Need an account? Sign up" })).toHaveAttribute(
      "href",
      "/en/sign-up?returnTo=%2Fen%2Ftopics%2Ftyped-api%23post-answer",
    );
  });

  it("edits the signed-in user's profile and keeps the saved preview data", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-edit" identity="user" />);

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

  it("opens My measures from the signed-in profile and reaches measure detail", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="profile-own" identity="user" />);

    await user.click(await screen.findByRole("link", { name: "My measures" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My measures" })).toBeInTheDocument();

    const measureLink = document.querySelector(".admin-forum-objects a");
    expect(measureLink).not.toBeNull();
    await user.click(measureLink!);

    expect(await screen.findByRole("heading", { level: 1, name: "Measure details" })).toBeInTheDocument();
    const measureInfo = document.querySelector("[aria-labelledby='measure-info-title']") as HTMLElement;
    expect(within(measureInfo).getByText(
      "Repeated off-topic promotional posts after a moderator warning.",
    )).toBeInTheDocument();
  });

  it("submits an appeal and keeps the pending measure state in preview", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="account-measure-detail" identity="user" />);

    await user.type(
      await screen.findByLabelText("Appeal explanation"),
      "The restriction no longer matches my current forum activity.",
    );
    await user.click(screen.getByRole("button", { name: "Submit appeal" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Change saved.");
    expect(screen.getByText("The restriction no longer matches my current forum activity.")).toBeInTheDocument();
    expect(screen.getByText("1. Pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit appeal" })).not.toBeInTheDocument();
  });

  it("requires sign-in for guest direct access to My measures", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="account-measures-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(unauthenticated).toHaveAttribute("data-status", "401");
    expect(within(unauthenticated).getByRole("heading", {
      level: 1,
      name: "Sign in required",
    })).toBeInTheDocument();
    expect(document.querySelector(".profile-card")).toBeNull();
  });

  it("requires sign-in for guest direct access to Notifications", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="notifications-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".notifications-heading")).toBeNull();
  });

  it("requires sign-in for guest direct access to Unread", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="unread-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".unread-topic-groups")).toBeNull();
    expect(document.querySelector(".unanswered-heading")).toBeNull();
  });

  it("requires sign-in for guest direct access to Needs attention", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-guest-unauthenticated" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".attention-center-page")).toBeNull();
  });

  it("denies ordinary user direct access to Needs attention", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-user-forbidden" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(document.querySelector(".attention-center-page")).toBeNull();
  });

  it("opens a notification, marks it read, and follows the referenced message", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="notifications-user" identity="user" />);

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

  it("requires sign-in for guest direct access to My questions", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-mine-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".help-solutions-page")).toBeNull();
  });

  it("requires sign-in for guest direct access to Want to help", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-want-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".help-solutions-page")).toBeNull();
  });

  it("requires sign-in for guest direct access to For me", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-for-me-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".help-solutions-page")).toBeNull();
  });

  it("requires sign-in for guest direct access to the Needs review filter", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-filters-needs-review-guest" />);

    const unauthenticated = await screen.findByRole("alert");
    expect(within(unauthenticated).getByRole("heading", { level: 1, name: "Sign in required" })).toBeInTheDocument();
    expect(within(unauthenticated).getByText("Sign in to access this page.")).toBeInTheDocument();
    expect(document.querySelector(".help-solutions-page")).toBeNull();
  });

  it("denies ordinary user direct access to the Needs review filter", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-filters-needs-review-user" />);

    const forbidden = await screen.findByRole("alert");
    expect(within(forbidden).getByRole("heading", { level: 1, name: "Access denied" })).toBeInTheDocument();
    expect(within(forbidden).getByText("You do not have permission to open this page.")).toBeInTheDocument();
    expect(document.querySelector(".help-solutions-page")).toBeNull();
  });

  it("keeps the Needs review filter available to Manager", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-filters-manager" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Help & solutions" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Solution" })).toHaveValue("needs-review");
    expect(screen.getByRole("option", { name: "Needs review" })).toBeInTheDocument();
  });

  it("checks similar Help questions and publishes a new Help question", async () => {
    const user = userEvent.setup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="help-solutions-ask" identity="user" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin-topic" identity="manager" />);

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
    const view = await renderEmbeddedPreview(<EmbeddedPreview scenarioId="admin" identity="manager" />);

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
  }, 10_000);
});


describe("Preview confirmation and attention fixtures", () => {
  it("opens confirmation on the matched topic route and dismisses without solving", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId={scenarioId} />);
    await screen.findByRole("heading", { level: 1, name: "How should I structure a typed API client?" });
    expect(document.querySelector("#solution-confirmation")).toBeNull();
    expect(Boolean(document.querySelector(".solved-badge"))).toBe(solved);
    expect(Boolean(document.querySelector(".best-answer-label"))).toBe(bestAnswer);
    if (scenarioId === "topic-reply-error") expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not apply the confirmation fixture to another navigated topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="topic-best-answer-unsolved" identity="user" />);
    await screen.findByRole("region", { name: "Problem solved?" });
    await userEvent.click(screen.getByRole("link", { name: "TypeScript & architecture" }));
    const otherTopic = await screen.findByRole("link", { name: /Mixed RTL content with code blocks/u });
    await userEvent.click(otherTopic);
    expect(await screen.findByRole("heading", { level: 1, name: "Mixed RTL content with code blocks" })).toBeInTheDocument();
    expect(document.querySelector("#solution-confirmation")).toBeNull();
    expect(document.querySelector(".best-answer-label")).toBeNull();
  });

  it("opens the Attention topic target instead of the primary fallback topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);

    await userEvent.click(await screen.findByRole("link", {
      name: "Why does my Worker lose the session after redirect?",
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Why does my Worker lose the session after redirect?",
    })).toBeInTheDocument();
    expect(screen.queryByRole("heading", {
      level: 1,
      name: "How should I structure a typed API client?",
    })).not.toBeInTheDocument();
  });

  it("opens both the disputed Attention topic and its canonical original", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Appeals (1)" }));

    await userEvent.click(await screen.findByRole("link", {
      name: "Why doesn't my database reconnect?",
    }));
    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Why doesn't my database reconnect?",
    })).toBeInTheDocument();

    cleanup();
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Appeals (1)" }));
    await userEvent.click(await screen.findByRole("link", {
      name: "Configuring sessions in Cloudflare Workers",
    }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Configuring sessions in Cloudflare Workers",
    })).toBeInTheDocument();
  });

  it("opens the reported best answer on the solved Attention topic", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Needs review (2)" }));

    const signalId = await screen.findByText("#signal-144");
    const signal = within(signalId.closest("article")!);
    await userEvent.click(signal.getByRole("link", { name: "View reported answer" }));

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "How to deploy a React Router app?",
    })).toBeInTheDocument();
    expect(document.querySelector("#post-best-answer")).not.toBeNull();
    expect(document.querySelector(".solved-badge")).not.toBeNull();
    expect(document.querySelector(".best-answer-label")).not.toBeNull();
  });

  it("shows the advertised appeal card after actual group navigation", async () => {
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-signals" identity="manager" />);
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
    await renderEmbeddedPreview(<EmbeddedPreview scenarioId="attention-empty" identity="manager" />);
    await userEvent.click(await screen.findByRole("link", { name: "Appeals (1)" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Appeals" })).toBeInTheDocument();
    expect(document.querySelectorAll(".attention-case")).toHaveLength(0);
  });
});
