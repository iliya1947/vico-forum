import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { PermissionKey } from "./catalog";
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

function renderView(result?: { ok?: boolean; error?: "conflict" }) {
  const router = createMemoryRouter([{
    path: "*",
    element: (
      <HeaderAuthProvider initialUser={{ name: "Manager", canManageAuthorization: true }}>
        <AuthorizationAdminView
          locale="en"
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

    expect(await screen.findByRole("heading", { name: "Authorization management" })).toBeVisible();
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
