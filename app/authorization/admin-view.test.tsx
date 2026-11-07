import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { PermissionKey } from "./catalog";
import type { AuthorizationUserDetails } from "../../db/authorization-repository";
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
  "admin.users.blocks.managePrivileged",
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
  grants: ["forum.reply.create","admin.users.blocks.managePrivileged"] as PermissionKey[],
};

const normalRole = {
  id: "role-helper",
  slug: "helper",
  displayName: "Helper",
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

function renderView(
  result?: { ok?: boolean; error?: "conflict" },
  grants: PermissionKey[] = ["access.authorization.manage"],
  canManageElevated = false,
  targetUsers: readonly AuthorizationUserDetails[] = users,
  canMutateAuthorization = canManageElevated,
) {
  const router = createMemoryRouter([{
    path: "*",
    element: (
      <HeaderAuthProvider initialUser={{ id: "fixture-user", name: "Manager", canManageAuthorization: true }}>
        <AuthorizationAdminView
          locale="en"
          access={adminAccess(new Set(grants))}
          permissions={permissions}
          canManageElevated={canManageElevated}
          canMutateAuthorization={canMutateAuthorization}
          roles={[systemRole, customRole, normalRole]}
          users={targetUsers}
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
    const { container } = renderView(undefined, undefined, true);

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

  it("preserves read-only grants, role assignment, overrides and effective permissions for non-Owner", async () => {
    const { container } = renderView();
    await screen.findByRole("heading", { name: "Authorization management", level: 2 });
    expect(container.querySelectorAll("form")).toHaveLength(0);
    expect(container.querySelector(".admin-role-card .admin-effective-permissions")).toBeInTheDocument();
    expect(container.querySelector(".admin-role-list")?.textContent)
      .toContain("admin.users.blocks.managePrivileged");
    expect(container.querySelector(".admin-user-body")?.textContent).toContain("Reviewer");
    expect(container.querySelector(".admin-override-list")?.textContent).toContain("forum.topic.create");
    expect(container.querySelector(".admin-effective-permissions")?.textContent).toContain("forum.topic.create");
  });

  it("allows the bound owner to edit elevated role and per-user overrides",async()=>{
    const {container}=renderView(undefined,["access.authorization.manage"],true);
    await screen.findByRole("heading",{name:"Authorization management",level:2});
    expect(container.querySelectorAll('input[type="checkbox"][value="admin.users.blocks.managePrivileged"]'))
      .toHaveLength(3);
    const option=container.querySelector(
      'form.admin-override-row input[value="admin.users.blocks.managePrivileged"]');
    expect(option).toBeInTheDocument();
    expect(container.querySelector('form.admin-role-assignment select')).not.toBeDisabled();
  });

  it("shares Overview/History destinations from the actor's effective access", async () => {
    const {container}=renderView(undefined,["access.authorization.manage","admin.history.read","forum.topic.pin"]);
    expect(await screen.findByRole("heading",{name:"Admin panel",level:1})).toBeVisible();
    expect(container.querySelector('.admin-panel-nav a[href="/en/admin"]')).toHaveTextContent("Overview");
    expect(container.querySelector('.admin-panel-nav a[href="/en/admin/history"]')).toHaveTextContent("History");
    expect(container.querySelector('.admin-panel-nav a[href$="/admin/forum"]')).toBeTruthy();
  });

  it("does not expose any role deletion to non-Owner even if elevated flags were supplied", async () => {
    const { container } = renderView(undefined, ["access.authorization.manage"], true, users, false);
    await screen.findByRole("heading", { name: "Authorization management" });
    expect(container.querySelectorAll("form")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Delete role" })).not.toBeInTheDocument();
    expect(container.querySelector(".admin-role-list")?.textContent).toContain("reviewer");
  });

  it("shows Owner-only elevated role deletion and keeps its actual saved grant visible", async () => {
    const { container } = renderView(undefined, ["access.authorization.manage"], true);
    await screen.findByRole("heading", { name: "Authorization management", level: 2 });
    const deletes = [...container.querySelectorAll<HTMLFormElement>("form")].filter(form =>
      form.querySelector<HTMLInputElement>('input[name="intent"]')?.value === "deleteRole");
    expect(deletes.map(form => form.querySelector<HTMLInputElement>('input[name="roleId"]')?.value).sort())
      .toEqual(["role-helper", "role-reviewer"]);
    expect(container.querySelector('form.admin-permissions-form input[value="admin.users.blocks.managePrivileged"]'))
      .toBeInTheDocument();
  });

  it("explains bound Owner permissions without replacing saved role or explicit raw deny", async () => {
    const ownerTarget = [{
      ...users[0]!,
      id: "bound-owner",
      authorization: {
        ...users[0]!.authorization,
        role: systemRole,
        grants: systemRole.grants,
        overrides: { "forum.topic.create": "deny" as const },
        authoritySource: "owner" as const,
        effectivePermissions: [...permissions],
      },
    }];
    const { container } = renderView(undefined, ["access.authorization.manage"], true, ownerTarget);
    await screen.findByRole("heading", { name: "Authorization management", level: 2 });
    expect(screen.getByText(/Owner authority grants all current permissions/)).toBeVisible();
    expect(container.querySelector(".admin-user-card .admin-badge")).toHaveTextContent("User");
    expect(container.querySelector('form.admin-override-row input[value="forum.topic.create"]')
      ?.closest("form")?.querySelector('select[name="effect"]')).toHaveValue("deny");
    expect(container.querySelector(".admin-effective-permissions")).toHaveTextContent("forum.topic.create");
    expect(container.querySelector("input[name='VICO_OWNER_USER_ID']")).toBeNull();
  });

  it("presents success and assigned-role conflict feedback through safe localized messages", async () => {
    const saved = renderView({ ok: true });
    expect(await screen.findByRole("status")).toHaveTextContent("Authorization was updated.");
    saved.unmount();

    renderView({ error: "conflict" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This role is assigned to users and cannot be deleted.",
    );
  });
});
