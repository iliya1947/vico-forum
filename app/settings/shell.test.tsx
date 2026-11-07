import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "../admin/access";
import { SettingsShell } from "./shell";
import SettingsForumRoute from "../routes/settings-forum";

afterEach(cleanup);

function runtime(locale: "en" | "ru" | "he" = "en") {
  const flatten = (values: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(values).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[key, value]]
        : Object.entries(value as Record<string, string>).map(([branch, source]) => [`${key}_${branch}`, source])));
  const english = flatten(Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source])));
  const localized = locale === "he" ? hebrewCommonValues : locale === "ru" ? russianCommonValues : english;
  return createTranslationRuntime({
    locale: {
      translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"],
      direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" }, nativeName: locale, presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: { en: { common: english }, [locale]: { common: flatten(localized) } },
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
  registration: { googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 7 },
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
    const registrationForm = page.container.querySelector<HTMLFormElement>(".settings-registration-form");
    expect(registrationForm).not.toBeNull();
    expect(registrationForm?.getAttribute("action")).toBe("/en/settings/forum");
    const forms = [...page.container.querySelectorAll<HTMLFormElement>("form")]
      .filter(form => form.querySelector('input[name="intent"]'));
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

describe("SET-02 live registration controls in shared Owner Settings", () => {
  it.each(["en", "ru", "he"] as const)(
    "renders both independent method switches and a single owner save action in %s", async locale => {
      const router = createMemoryRouter([{
        path: "/:locale/settings/forum", loader: () => ({ ...ownerState, locale }),
        element: <SettingsForumRoute />,
      }], { initialEntries: [`/${locale}/settings/forum`] });
      const page = render(<I18nextProvider i18n={runtime(locale)}>
        <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}>
          <RouterProvider router={router}/>
        </HeaderAuthProvider>
      </I18nextProvider>);
      await screen.findAllByRole("checkbox");
      expect(page.container.querySelectorAll('.settings-registration-form input[type="checkbox"]')).toHaveLength(2);
      expect(page.container.querySelectorAll(".settings-registration-form")).toHaveLength(1);
      expect(page.container.querySelector('input[name="expectedVersion"]')).toHaveValue("7");
      expect(page.container.querySelectorAll(".settings-panel-nav")).toHaveLength(1);
      page.unmount(); router.dispose();
    },
  );

  it("saves independently without navigation and refreshes the visible CAS version", async () => {
    let registration = { googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 7 };
    const writes: FormData[] = [];
    const router = createMemoryRouter([{
      path: "/en/settings/forum",
      loader: () => ({ ...ownerState, registration }),
      action: async ({ request }) => {
        const body = await request.formData();
        writes.push(body);
        registration = {
          googleRegistrationEnabled: body.get("googleRegistrationEnabled") === "on",
          emailRegistrationEnabled: body.get("emailRegistrationEnabled") === "on",
          version: registration.version + 1,
        };
        return { ok: true };
      },
      element: <SettingsForumRoute />,
    }], { initialEntries: ["/en/settings/forum"] });
    const page = render(<I18nextProvider i18n={runtime()}>
      <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}>
        <RouterProvider router={router}/>
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("heading", { name: "Registration" });
    const google = screen.getByRole("checkbox", { name: "Allow new accounts through Google" });
    expect(google).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allow new accounts through email and password" })).toBeChecked();
    await userEvent.click(google);
    await userEvent.click(screen.getByRole("button", { name: "Save registration settings" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]!.get("expectedVersion")).toBe("7");
    expect(writes[0]!.get("googleRegistrationEnabled")).toBeNull();
    expect(writes[0]!.get("emailRegistrationEnabled")).toBe("on");
    expect(router.state.location.pathname).toBe("/en/settings/forum");
    expect(await screen.findByText("Registration settings updated.")).toBeInTheDocument();
    expect(page.container.querySelector('input[name="expectedVersion"]')).toHaveValue("8");
    expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).not.toBeChecked();
    page.unmount(); router.dispose();
  });
});

describe("SET-02 stale Owner registration policy UI", () => {
  it("refreshes current version and toggles after a 409 without silently replaying the write", async () => {
    let snapshot = { googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 7 };
    const writes: FormData[] = [];
    const router = createMemoryRouter([{
      path: "/en/settings/forum",
      loader: () => ({ ...ownerState, registration: snapshot }),
      action: async ({ request }) => {
        writes.push(await request.formData());
        return data({ ok: false, error: "conflict" }, { status: 409 });
      },
      element: <SettingsForumRoute />,
    }], { initialEntries: ["/en/settings/forum"] });
    const page = render(<I18nextProvider i18n={runtime()}>
      <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    await screen.findByRole("heading", { name: "Registration" });
    snapshot = { googleRegistrationEnabled: false, emailRegistrationEnabled: true, version: 8 };
    await userEvent.click(screen.getByRole("button", { name: "Save registration settings" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    await screen.findByText("Settings changed. Review the current values and try again.");
    await waitFor(() => expect(page.container.querySelector('input[name="expectedVersion"]')).toHaveValue("8"));
    expect(screen.getByRole("checkbox", { name: "Allow new accounts through Google" })).not.toBeChecked();
    expect(writes).toHaveLength(1);
    page.unmount(); router.dispose();
  });
});
