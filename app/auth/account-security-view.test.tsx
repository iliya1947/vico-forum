import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { AccountLifecycleView } from "./account-security-view";
import { HistoryEntry } from "../super-admin/history-entry";
import type { OwnerHistoryEntry } from "../../db/owner-sa02-history";

afterEach(cleanup);
function mount(locale: "en" | "ru" | "he", phase: "old-address" | "new-address") {
  const common = locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues
    : Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, descriptor]) => [key, descriptor.source]));
  const i18n = createInstance();
  void i18n.init({ lng: locale, fallbackLng: locale, initAsync: false, resources: { [locale]: { common } }, defaultNS: "common" });
  const entry: OwnerHistoryEntry = { origin: "auth-event", id: "fixture-event", occurredAt: "2026-11-26T00:00:00.000Z",
    recordedAt: null, monitorKeys: [], kind: "auth.emailChanged", source: "better-auth", quality: null, values: {} };
  const router = createMemoryRouter([{ path: "*", element: <>
    <AccountLifecycleView locale={locale} userId="fixture" sessionId="fixture-session" email="fixture@example.test"
      verified enabled pending={{ phase, expiresAt: "2026-11-26T01:00:00.000Z" }} />
    <ul><HistoryEntry locale={locale} entry={entry} /></ul>
  </> }]);
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
}

it.each(["en", "ru", "he"] as const)("F03 separates pending state from transport outcomes and committed history from request in %s", locale => {
  const copy = {
    en: ["Awaiting confirmation of your current address.", "Awaiting verification of the new address.", "Email address changed"],
    ru: ["Ожидается подтверждение текущего адреса.", "Ожидается подтверждение нового адреса.", "Адрес email изменён"],
    he: ["ממתינים לאישור הכתובת הנוכחית.", "ממתינים לאימות הכתובת החדשה.", "כתובת הדוא״ל שונתה"],
  }[locale];
  for (const [i, phase] of (["old-address", "new-address"] as const).entries()) {
    mount(locale, phase);
    expect(screen.getByRole("status")).toHaveTextContent(copy[i]);
    expect(screen.getByRole("heading", { name: copy[2] })).toBeVisible();
    cleanup();
  }
});
