import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { PermissionKey } from "./catalog";
import { adminAccess } from "../admin/access";
import { AuthorizationAdminView } from "./admin-view";

afterEach(cleanup);

function commonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

function i18n() {
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
    resourcesByLocale: { en: { common: commonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

const permissions: PermissionKey[] = [
  "forum.topic.create",
  "forum.reply.create",
  "access.authorization.manage",
];

const systemRole = {
  id: "role-user",
  slug: "user",
  displayName: "User",
  isSystem: true,
  grants: ["forum.topic.create"] as PermissionKey[],
};

const customRole = {
  id: "role-reviewer",
  slug: "reviewer",
  displayName: "Reviewer",
  isSystem: false,
  grants: ["forum.reply.create"] as PermissionKey[],
};

const users = [{
  id: "alex",
  name: "Alex Rivera",
  email: "alex@example.test",
  role: customRole,
  explicitAssignment: true,
  authorization: {
    role: customRole,
    explicitAssignment: true,
    grants: customRole.grants,
    overrides: { "forum.topic.create": "allow" as const },
    effectivePermissions: ["forum.topic.create", "forum.reply.create"] as PermissionKey[],
  },
}];

function renderView(result?: { ok?: boolean; error?: "conflict" }, grants: PermissionKey[] = ["access.authorization.manage"]) {
  const router = createMemoryRouter([{
    path: "*",
    element: (
      <HeaderAuthProvider initialUser={{ id: "fixture-user", name: "Manager", canManageAuthorization: true }}>
        <AuthorizationAdminView
          locale="en"
          access={adminAccess(new Set(grants))}
          permissions={permissions}
          roles={[systemRole, customRole]}
          users={users}
          result={result}
        />
      </HeaderAuthProvider>
    ),
  }], { initialEntries: ["/en/admin/authorization"] });

  return render(
    <I18nextProvider i18n={i18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

function formByIntent(container: HTMLElement, intent: string) {
  return [...container.querySelectorAll("form")].find((form) =>
    form.querySelector<HTMLInputElement>('input[name="intent"]')?.value === intent
  );
}

describe("authorization management presentation", () => {
  it("keeps every existing management mutation intent and field contract visible", async () => {
    const { container } = renderView();

    expect(await screen.findByRole("heading", { name: "Authorization management", level: 2 })).toBeVisible();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll(".admin-panel-nav")).toHaveLength(1);
    expect(container.querySelector('.admin-panel-nav [aria-current="page"]')).toHaveAttribute("href", "/en/admin/authorization");
    expect(container.querySelector('.admin-panel-nav a[href$="/history"]')).toBeNull();
    expect(screen.getByRole("heading", { name: "Roles" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();

    expect(formByIntent(container, "createRole")).toBeTruthy();
    expect(formByIntent(container, "renameRole")).toBeTruthy();
    expect(formByIntent(container, "roleGrants")).toBeTruthy();
    expect(formByIntent(container, "deleteRole")).toBeTruthy();
    expect(formByIntent(container, "assignRole")).toBeTruthy();
    expect(formByIntent(container, "override")).toBeTruthy();

    expect(formByIntent(container, "createRole")?.querySelector('[name="slug"]')).toBeTruthy();
    expect(formByIntent(container, "createRole")?.querySelector('[name="displayName"]')).toBeTruthy();
    expect(formByIntent(container, "roleGrants")?.querySelector('[name="permission"]')).toBeTruthy();
    expect(formByIntent(container, "assignRole")?.querySelector('[name="roleId"]')).toBeTruthy();
    expect(formByIntent(container, "override")?.querySelector('[name="effect"]')).toBeTruthy();
  });

  it("shares Overview/History destinations from the actor's effective access", async () => {
    const {container}=renderView(undefined,["access.authorization.manage","admin.history.read","forum.topic.pin"]);
    expect(await screen.findByRole("heading",{name:"Admin panel",level:1})).toBeVisible();
    expect(container.querySelector('.admin-panel-nav a[href="/en/admin"]')).toHaveTextContent("Overview");
    expect(container.querySelector('.admin-panel-nav a[href="/en/admin/history"]')).toHaveTextContent("History");
    expect(container.querySelector('.admin-panel-nav a[href*="admin-forum"]')).toBeTruthy();
  });

  it("keeps custom-role deletion visually distinct and never offers it for built-in roles", async () => {
    const { container } = renderView();
    await screen.findByRole("heading", { name: "Authorization management" });

    const deleteForms = [...container.querySelectorAll('form')].filter((form) =>
      form.querySelector<HTMLInputElement>('input[name="intent"]')?.value === "deleteRole"
    );
    expect(deleteForms).toHaveLength(1);
    expect(deleteForms[0]?.querySelector<HTMLInputElement>('input[name="roleId"]')?.value).toBe("role-reviewer");
    expect(screen.getByRole("button", { name: "Delete role" })).toHaveClass("admin-danger-action");
  });

  it("presents success and lockout/conflict feedback through safe localized messages", async () => {
    const saved = renderView({ ok: true });
    expect(await screen.findByRole("status")).toHaveTextContent("Authorization was updated.");
    saved.unmount();

    renderView({ error: "conflict" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This change would cause a lockout or the role is assigned.",
    );
  });
});
