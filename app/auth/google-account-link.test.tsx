import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { GoogleAccountLink } from "./google-account-link";

afterEach(cleanup);

it("uses explicit authenticated linking with pending and safe error feedback", async () => {
  const i18n = createInstance();
  await i18n.init({ lng: "en", resources: { en: { common: Object.fromEntries(
    Object.entries(canonicalEnglishCatalog.common).map(([key, value]) => [key, value.source]),
  ) } } });
  let finish!: (result: boolean) => void;
  const link = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  render(<I18nextProvider i18n={i18n}><MemoryRouter>
    <GoogleAccountLink callbackURL="/en/users/owner" link={link} />
  </MemoryRouter></I18nextProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Connect Google" }));
  expect(link).toHaveBeenCalledExactlyOnceWith("/en/users/owner");
  expect(screen.getByRole("button")).toBeDisabled();
  finish(false);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(String(canonicalEnglishCatalog.common.authError.source)));
  expect(screen.getByRole("button")).toBeEnabled();
});
