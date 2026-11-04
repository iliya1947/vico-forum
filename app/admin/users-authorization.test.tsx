import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { adminAccess } from "./access";
import { AdminUserDetail } from "./users";
import type { AuthorizationRole, UserAuthorization } from "../../db/authorization-repository";
import type { PermissionKey } from "../authorization/catalog";

function i18n() {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") resources[key] = descriptor.source;
    else for (const [part, value] of Object.entries(descriptor.source)) resources[`${key}_${part}`] = value;
  }
  return createTranslationRuntime({
    locale: { translationLocale: "en", direction: "ltr", formatting: { locale: "en", timeZone: "UTC" },
      fallbackLocales: [], nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common: resources } },
    bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}

const actorId = "admin-actor";
const userId = "target/עברית";
const roles: AuthorizationRole[] = [
  { id: "builtin-user", slug: "user", displayName: "User", isSystem: true },
  { id: "builtin-moderator", slug: "moderator", displayName: "Moderator", isSystem: true },
];
const permissions: PermissionKey[] = ["forum.reply.create", "forum.topic.pin"];
const access = adminAccess(new Set(["admin.users.read", "access.authorization.manage"]));
const profile = {
  id: userId, name: "Target עברית", image: null, joinedAt: "2026-10-01T10:00:00.000Z",
  bio: "Public details", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true },
  messageCount: 0, bestAnswerCount: 0,
};

let router: ReturnType<typeof createMemoryRouter> | undefined;
afterEach(() => { cleanup(); router?.dispose(); router = undefined; });

function mount() {
  let currentRole: AuthorizationRole = roles[0]!;
  let override: "allow" | "deny" | undefined;
  const action = vi.fn(async ({ request }: { request: Request }) => {
    const form = await request.formData();
    const intent = form.get("intent");
    expect(form.get("userId")).toBe(userId);
    if (intent === "assignRole") {
      currentRole = roles.find(role => role.id === form.get("roleId"))!;
    } else if (intent === "override") {
      expect(form.get("permission")).toBe("forum.topic.pin");
      const value = form.get("effect");
      override = value === "inherit" ? undefined : value as "allow" | "deny";
    } else {
      throw Error("unexpected intent");
    }
    return { ok: true };
  });
  const loader = vi.fn(async () => {
    const authorization: UserAuthorization = {
      role: currentRole, explicitAssignment: currentRole !== roles[0],
      grants: ["forum.reply.create"],
      overrides: override ? { "forum.topic.pin": override } : {},
      effectivePermissions: override === "allow"
        ? ["forum.reply.create", "forum.topic.pin"] : ["forum.reply.create"],
    };
    return {
    locale: "en", access, user: { ...profile, role: currentRole },
    managerActorId: actorId, permissions,
    management: {
      userId, roles,
      authorization,
    },
  };
  });
  function Detail() { return <AdminUserDetail {...useLoaderData<typeof loader>()} />; }
  router = createMemoryRouter([
    { path: "/en/admin/users/:userId", loader, element: <Detail /> },
    { path: "/en/admin/authorization", action, element: <p>Authorization destination</p> },
  ], { initialEntries: [`/en/admin/users/${encodeURIComponent(userId)}`] });
  const result = render(<I18nextProvider i18n={i18n()}><RouterProvider router={router} /></I18nextProvider>);
  return { ...result, action, loader, router };
}
function formFor(container: HTMLElement, intent: string, permission?: string) {
  return [...container.querySelectorAll<HTMLFormElement>("form")].find(form =>
    form.querySelector<HTMLInputElement>('input[name="intent"]')?.value === intent &&
    (permission === undefined || form.querySelector<HTMLInputElement>('input[name="permission"]')?.value === permission));
}

describe("AP-09 canonical fetcher composition", () => {
  it("sends existing assignment and override intents without leaving detail, then revalidates the selected user", async () => {
    const mounted = mount();
    await screen.findByRole("heading", { name: "Authorization management", level: 3 });
    expect(mounted.container.querySelector('input[name="inlineUserAuthorization"]')).toBeNull();
    const assignment = formFor(mounted.container, "assignRole")!;
    expect(assignment).toBeDefined();
    expect(assignment.querySelector<HTMLInputElement>('input[name="userId"]')?.value).toBe(userId);
    expect(assignment.getAttribute("action")).toBe("/en/admin/authorization");
    const role = assignment.querySelector('select[name="roleId"]') as unknown as HTMLSelectElement;
    fireEvent.change(role, { target: { value: "builtin-moderator" } });
    fireEvent.submit(assignment);
    await waitFor(() => expect(mounted.action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(
      (formFor(mounted.container, "assignRole")?.querySelector('select[name="roleId"]') as HTMLSelectElement | null)?.value,
    ).toBe("builtin-moderator"));
    expect(mounted.loader).toHaveBeenCalledTimes(2);
    expect(mounted.router.state.location.pathname).toBe(`/en/admin/users/${encodeURIComponent(userId)}`);

    const overrideForm = formFor(mounted.container, "override", "forum.topic.pin")!;
    expect(overrideForm.getAttribute("action")).toBe("/en/admin/authorization");
    fireEvent.change(overrideForm.querySelector('select[name="effect"]') as unknown as HTMLSelectElement, { target: { value: "allow" } });
    fireEvent.submit(overrideForm);
    await waitFor(() => expect(mounted.action).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(
      (formFor(mounted.container, "override", "forum.topic.pin")?.querySelector('select[name="effect"]') as HTMLSelectElement | null)?.value,
    ).toBe("allow"));
    expect(mounted.router.state.location.pathname).toBe(`/en/admin/users/${encodeURIComponent(userId)}`);
    expect(mounted.container.querySelector('form input[name="editorActorId"]')).toBeNull();
  });

  it("does not render management controls to read-only users and preserves public fields", () => {
    const english = i18n();
    const readOnly = adminAccess(new Set(["admin.users.read"]));
    const element = <AdminUserDetail locale="en" access={readOnly} user={profile} />;
    router = createMemoryRouter([{ path: "*", element }], { initialEntries: ["/en/admin/users/target"] });
    const view = render(<I18nextProvider i18n={english}><RouterProvider router={router}/></I18nextProvider>);
    expect(view.container.querySelector("#authorization")).toBeNull();
    expect(formFor(view.container, "assignRole")).toBeUndefined();
    expect(formFor(view.container, "override", "forum.topic.pin")).toBeUndefined();
    expect(view.container.textContent).toContain("Public details");
  });
});
