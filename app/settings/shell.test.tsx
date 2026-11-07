import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "../admin/access";
import { SettingsShell } from "./shell";
import SettingsForumRoute from "../routes/settings-forum";

afterEach(cleanup);

function runtime(locale: "en" | "ru" | "he" = "en") {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).flatMap(([key, descriptor]) =>
    typeof descriptor.source === "string"
      ? [[key, descriptor.source]]
      : Object.entries(descriptor.source).map(([branch, value]) => [`${key}_${branch}`, value])));
  const localized = locale === "he" ? hebrewCommonValues : locale === "ru" ? russianCommonValues : english;
  return createTranslationRuntime({
    locale: {
      translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"],
      direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" }, nativeName: locale, presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: { en: { common: english }, [locale]: { common: localized } },
    bundleVersions: { en: { common: "test" }, [locale]: { common: "test" } },
    staleKeys: {},
  });
}

const role = { id: "role-helper", slug: "helper", displayName: "Helper", isSystem: false,
  grants: ["forum.topic.create"] };
const ownerState = {
  locale: "en",
  access: adminAccess(new Set(["access.authorization.manage"])),
  permissions: ["forum.topic.create", "forum.reply.create"],
  roles: [role],
  users: [{
    id: "recipient", name: "Recipient", email: "recipient@example.test",
    role, explicitAssignment: true,
    authorization: {
      role, explicitAssignment: true, grants: role.grants, overrides: {},
      effectivePermissions: ["forum.topic.create"],
    },
  }],
  canMutateAuthorization: true,
  canManageElevated: true,
};

describe("SET-02 shared Settings shell and canonical forms", () => {
  it.each(["en", "ru", "he"] as const)(
    "shows only the accessible Forum link while other surfaces remain inert in %s", locale => {
      const router = createMemoryRouter([{ path: "*", element:
        <HeaderAuthProvider initialUser={null}>
          <SettingsShell locale={locale} canViewForum={false}>
            <p>Unavailable</p>
          </SettingsShell>
        </HeaderAuthProvider>,
      }], { initialEntries: [`/${locale}/settings`] });
      const page = render(<I18nextProvider i18n={runtime(locale)}>
        <RouterProvider router={router} />
      </I18nextProvider>);
      expect(page.container.querySelectorAll("main")).toHaveLength(1);
      expect(page.container.querySelectorAll("h1")).toHaveLength(1);
      expect(page.container.querySelector('.settings-panel-nav a[href$="/settings/forum"]')).toBeNull();
      expect(page.container.querySelectorAll(".settings-panel-pending-item")).toHaveLength(4);
      expect(page.container.querySelectorAll(".settings-panel-pending-item a")).toHaveLength(0);
      page.unmount();
      router.dispose();
    },
  );

  it("posts all six existing mutation intents to canonical admin action without leaving Settings", async () => {
    const writes: FormData[] = [];
    const router = createMemoryRouter([
      { path: "/en/settings/forum", loader: () => data(ownerState, {
        headers: { "Cache-Control": "private, no-store" },
      }), element: <SettingsForumRoute /> },
      { path: "/en/admin/authorization", action: async ({ request }) => {
        writes.push(await request.formData());
        return { ok: true };
      }, element: <p>Legacy management page</p> },
    ], { initialEntries: ["/en/settings/forum"] });

    const page = render(<I18nextProvider i18n={runtime()}>
      <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("heading", { name: "Authorization management" });
    expect(page.container.querySelectorAll("main")).toHaveLength(1);
    expect(page.container.querySelectorAll(".admin-panel")).toHaveLength(1);
    expect(page.container.querySelectorAll(".admin-panel-nav")).toHaveLength(1);
    const forms = [...page.container.querySelectorAll<HTMLFormElement>("form")];
    expect(new Set(forms.map(form => form.querySelector<HTMLInputElement>('input[name="intent"]')?.value)))
      .toEqual(new Set(["createRole", "renameRole", "roleGrants", "deleteRole", "assignRole", "override"]));
    for (const form of forms) {
      expect(form.getAttribute("action")).toBe("/en/admin/authorization");
    }
    const create = forms.find(form => form.querySelector<HTMLInputElement>('input[name="intent"]')?.value === "createRole")!;
    await userEvent.type(create.querySelector<HTMLInputElement>('input[name="slug"]')!, "helper-two");
    await userEvent.type(create.querySelector<HTMLInputElement>('input[name="displayName"]')!, "Helper Two");
    await userEvent.click(create.querySelector<HTMLButtonElement>('button[type="submit"]')!);
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]!.get("intent")).toBe("createRole");
    expect(writes[0]!.get("slug")).toBe("helper-two");
    expect(router.state.location.pathname).toBe("/en/settings/forum");
    expect(await screen.findByRole("status")).toHaveTextContent("Authorization was updated.");
    expect(page.container.querySelector(".admin-panel-nav [aria-current='page']"))
      .toHaveAttribute("href", "/en/settings/forum");
    page.unmount();
    router.dispose();
  });
});
