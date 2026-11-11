import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider, createMemoryRouter } from "react-router";
import { createInstance } from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { ProfileView } from "./profile-view";
import { AuthControls, HeaderAuthProvider } from "../auth/auth-controls";
import type { AuthClientActions } from "../auth/auth-client";

afterEach(cleanup);

const profile = { id: "owner", name: "Owner", image: "javascript:alert(1)", joinedAt: "2026-09-01T00:00:00.000Z", bio: "<script>alert(1)</script>", githubUrl: "https://github.com/octocat", websiteUrl: "javascript:alert(1)", role: { slug: "user", displayName: "User", isSystem: true }, messageCount: 12, bestAnswerCount: 3 };
function show(props: Partial<Parameters<typeof ProfileView>[0]> = {}, viewerId: string | null = "owner", actions?: AuthClientActions) {
  const i18n = createInstance();
  void i18n.init({ lng: "en", initAsync: false, resources: { en: { common: Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, value]) => [key, value.source])) } }, defaultNS: "common" });
  const router = createMemoryRouter([{ path: "*", element:
    <HeaderAuthProvider initialUser={viewerId ? { id: viewerId, name: viewerId } : null}>
      {actions ? <AuthControls locale="en" actions={actions} /> : null}
      <ProfileView locale="en" profile={profile} {...props} />
    </HeaderAuthProvider>,
  }], { initialEntries: ["/en/users/owner"] });
  return render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
}
describe("profile presentation", () => {
  it("keeps an LTR display name at the layout start edge in RTL without reversing its text", () => {
    const originalDirection = document.documentElement.dir;
    document.documentElement.dir = "rtl";
    try {
      const preview = show({ locale: "he", profile: { ...profile, name: "Maya Cohen" } });
      try {
        const heading = screen.getByRole("heading", { level: 1, name: "Maya Cohen" });
        expect(heading).not.toHaveAttribute("dir");
        expect(heading.querySelector("bdi")).toHaveAttribute("dir", "auto");
      } finally {
        preview.unmount();
      }
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
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
    expect(container.querySelector("script, .profile-avatar img")).toBeNull();
  });
  it("shows the owner edit link and only owner editable fields", () => {
    show({ isSelf: true, editing: true, feedback: { error: "invalid", draft: { bio: "My unsaved draft", githubUrl: "", websiteUrl: "" } } });
    expect(screen.getByLabelText("About")).toHaveValue("My unsaved draft");
    expect(screen.getByRole("alert")).toHaveTextContent("Use up to 500 characters");
    expect(screen.queryByLabelText(/role|name|email/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/en/users/owner");
    expect(screen.getByRole("link", { name: "Account & security" })).toHaveAttribute("href", "/en/settings/account");
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
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


describe("SA03 canonical profile protected sections", () => {
  const account = {
    targetUserId:"owner",email:"owner-private@example.test",emailVerified:true,
    createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-10-01T00:00:00.000Z",
    linkedMethods:["password","google"],hasPassword:true,observedAt:"2026-11-10T12:00:00.000Z",
    sessionCounts:{active:"1",expiredRetained:"1"},
    sessions:[{
      id:"session-001",createdAt:"2026-11-01T00:00:00.000000Z",
      expiresAt:"2026-11-30T00:00:00.000000Z",
      status:"active",current:false,deviceLabel:"Mobile browser",recordedIp:"2001:db8::5",
    }],nextSessionsCursor:"v1.opaque",
  };
  const history = {entries:[{
    origin:"auth-event",id:"11111111-1111-4111-8111-111111111111",
    occurredAt:"2026-11-10T00:00:00.000000Z",
    recordedAt:"2026-11-10T00:00:00.000000Z",
    monitorKeys:["accounts.users"],kind:"account.created",source:"auth",
    quality:null,values:{targetUserId:"owner"},
  }],next:"v1.history"};
  const auth = {
    actorId:"exact-owner",
    management:{
      userId:"owner",roles:[{id:"builtin",slug:"user",displayName:"User",isSystem:true}],
      authorization:{role:{id:"builtin",slug:"user",displayName:"User",isSystem:true},
        explicitAssignment:false,grants:[],overrides:{},effectivePermissions:[]},
    },
    permissions:["forum.reply.create"],canManageElevated:true,canMutateAuthorization:true,
  };
  it("retains one ForumShell and renders Owner safe session/History with preserved opaque pagination", () => {
    const root=show({privileged:{viewerId:"exact-owner",owner:{
      viewerId:"exact-owner",account:{status:"ready",value:account},
      history:{status:"ready",value:history},
    }} as never}, "exact-owner");
    expect(root.container.querySelectorAll("main")).toHaveLength(1);
    expect(root.container.querySelectorAll("#owner-account")).toHaveLength(1);
    expect(root.container.querySelectorAll("#owner-history")).toHaveLength(1);
    expect(screen.getByText("owner-private@example.test")).toBeInTheDocument();
    expect(screen.getByText("2001:db8::5")).toBeInTheDocument();
    expect(screen.getByText("Mobile browser")).toBeInTheDocument();
    expect(root.container.querySelectorAll('[data-history-origin="auth-event"]')).toHaveLength(1);
    expect(root.container.querySelector("#owner-sessions a")?.getAttribute("href"))
      .toBe("/en/users/owner?sessionsBefore=v1.opaque#owner-sessions");
    expect(root.container.querySelector("#owner-history a")?.getAttribute("href"))
      .toBe("/en/users/owner?historyBefore=v1.history#owner-history");
    expect(root.container.textContent).not.toContain("private-bearer-token");
    root.unmount();
  });
  it("drops loaded private Owner and authorization DOM on actual sign-out before router revalidation", async () => {
    const actions: AuthClientActions = {
      signInWithGoogle: async () => null,
      signOut: async ({ onSuccess }) => { onSuccess(); },
    };
    const root=show({privileged:{
      viewerId:"exact-owner",
      authorization:{status:"ready",value:auth},
      owner:{viewerId:"exact-owner",account:{status:"ready",value:account},
        history:{status:"ready",value:history}},
    } as never}, "exact-owner", actions);
    expect(root.container.querySelector("#owner-account")).toHaveTextContent("owner-private@example.test");
    expect(root.container.querySelectorAll("#authorization form").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(root.container.querySelector('.auth-controls[data-state="guest"]')).toBeTruthy());
    expect(root.container.querySelector("#authorization,#owner-account,#owner-history,#measures")).toBeNull();
    expect(root.container).toHaveTextContent("Owner");
    expect(root.container.textContent).not.toContain("owner-private@example.test");
    root.unmount();
  });
  it("does not keep the old private edit draft or feedback on viewer mismatch", () => {
    const root=show({
      isSelf:true,editing:true,saved:true,
      feedback:{error:"invalid",draft:{bio:"private unsaved draft",githubUrl:"",websiteUrl:""}},
    }, "different-viewer");
    expect(root.container.querySelector("form.profile-form")).toBeNull();
    expect(root.container).toHaveTextContent("<script>alert(1)</script>");
    expect(root.container.textContent).not.toContain("private unsaved draft");
    expect(root.container.querySelector(".profile-feedback")).toBeNull();
    root.unmount();
  });
  it("keeps unadmitted privileged sections entirely absent, not merely CSS-hidden", () => {
    const root=show();
    expect(root.container.querySelector("#measures,#authorization,#owner-account,#owner-history")).toBeNull();
    expect(root.container.textContent).not.toContain("owner-private@example.test");
    root.unmount();
  });
  it("renders AP10 measure links and original role/override writer within canonical shell", () => {
    const root=show({privileged:{viewerId:"exact-owner",
      measures:{status:"ready",value:[]},
      authorization:{status:"ready",value:auth},
    } as never}, "exact-owner");
    expect(root.container.querySelector("#measures")).toBeTruthy();
    expect(root.container.querySelector("#authorization")).toBeTruthy();
    expect(root.container.querySelectorAll("main")).toHaveLength(1);
    expect(root.container.querySelector("#measures a")?.getAttribute("href"))
      .toBe("/en/admin/measures?target=owner");
    const forms=[...root.container.querySelectorAll<HTMLFormElement>("#authorization form")];
    expect(forms.length).toBeGreaterThan(0);
    expect(forms.every(form=>form.getAttribute("action")==="/en/admin/authorization")).toBe(true);
    expect(forms.every(form=>form.querySelector<HTMLInputElement>('input[name="userId"]')?.value==="owner"))
      .toBe(true);
    root.unmount();
  });
  it("renders typed private reader outages as distinct recovery sections", () => {
    const root=show({privileged:{viewerId:"exact-owner",
      measures:{status:"unavailable"},authorization:{status:"unavailable"},
      owner:{viewerId:"exact-owner",account:{status:"unavailable"},history:{status:"unavailable"}},
    }}, "exact-owner");
    expect(root.container.querySelector("#measures")).toBeTruthy();
    expect(root.container.querySelector("#authorization")).toBeTruthy();
    expect(root.container.querySelector("#owner-account")).toBeTruthy();
    expect(root.container.querySelector("#owner-history")).toBeTruthy();
    expect(root.container.querySelectorAll("[role=status]").length).toBeGreaterThanOrEqual(4);
    expect(root.container.textContent).not.toContain("owner-private@example.test");
    root.unmount();
  });
});
