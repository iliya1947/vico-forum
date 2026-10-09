import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter } from "react-router";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { ProfileView } from "./profile-view";

const profile = { id: "owner", name: "Owner", image: "javascript:alert(1)", joinedAt: "2026-09-01T00:00:00.000Z", bio: "<script>alert(1)</script>", githubUrl: "https://github.com/octocat", websiteUrl: "javascript:alert(1)", role: { slug: "user", displayName: "User", isSystem: true }, messageCount: 12, bestAnswerCount: 3 };
function show(props: Partial<Parameters<typeof ProfileView>[0]> = {}) {
  const i18n = createInstance();
  void i18n.init({ lng: "en", initAsync: false, resources: { en: { common: Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, value]) => [key, value.source])) } }, defaultNS: "common" });
  const router = createMemoryRouter([{ path: "*", element: <ProfileView locale="en" profile={profile} {...props} /> }], { initialEntries: ["/en/users/owner"] });
  return render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
}
describe("profile presentation", () => {
  it("keeps an LTR display name at the layout start edge in RTL without reversing its text", () => {
    const originalDirection = document.documentElement.dir;
    document.documentElement.dir = "rtl";
    try {
      show({ locale: "he", profile: { ...profile, name: "Maya Cohen" } });
      const heading = screen.getByRole("heading", { level: 1, name: "Maya Cohen" });
      expect(heading).not.toHaveAttribute("dir");
      expect(heading.querySelector("bdi")).toHaveAttribute("dir", "auto");
    } finally {
      document.documentElement.dir = originalDirection;
    }
  });
  it("renders public identity, statistics, escaped biography and safe links", () => {
    const { container } = show();
    expect(screen.getByRole("heading", { level: 1, name: "Owner" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/octocat");
    expect(screen.queryByRole("link", { name: /Website/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit profile" })).not.toBeInTheDocument();
    expect(container.querySelector("script, .profile-avatar img")).toBeNull();
  });
  it("shows the owner edit link and only owner editable fields", () => {
    show({ isOwner: true, editing: true, feedback: { error: "invalid", draft: { bio: "My unsaved draft", githubUrl: "", websiteUrl: "" } } });
    expect(screen.getByLabelText("About")).toHaveValue("My unsaved draft");
    expect(screen.getByRole("alert")).toHaveTextContent("Use up to 500 characters");
    expect(screen.queryByLabelText(/role|name|email/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/en/users/owner");
  });
  it("provides truthful empty fields and broken-image fallback", () => {
    const { container } = show({ profile: { ...profile, bio: "", image: "https://example.com/avatar.png", githubUrl: null, websiteUrl: null } });
    expect(screen.getByText("No description yet.")).toBeInTheDocument();
    const image = container.querySelector(".profile-avatar img")!;
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    fireEvent.error(image);
    expect(container.querySelector(".profile-avatar")).toHaveTextContent("O");
  });
});
