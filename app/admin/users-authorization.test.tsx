import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { ProfileView } from "../forum/profile-view";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { createAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import { ErrorBoundary as ProfileErrorBoundary } from "../routes/profile";
import type { AuthorizationRole, UserAuthorization } from "../../db/authorization-repository";
import type { PermissionKey } from "../authorization/catalog";

function i18n() {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") resources[key] = descriptor.source;
    else for (const [part, value] of Object.entries(descriptor.source))
      resources[key + "_" + part] = value;
  }
  return createTranslationRuntime({
    locale: { translationLocale: "en", direction: "ltr", formatting: { locale: "en", timeZone: "UTC" },
      fallbackLocales: [], nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common: resources } },
    bundleVersions: { en: { common: "test" } }, staleKeys: {},
  });
}
const actorId = "bound-owner";
const userId = "target/עברית";
const roles: AuthorizationRole[] = [
  { id: "builtin-user", slug: "user", displayName: "User", isSystem: true },
  { id: "builtin-moderator", slug: "moderator", displayName: "Moderator", isSystem: true },
];
const permissions: PermissionKey[] = ["forum.reply.create", "forum.topic.pin"];
const profile = {
  id: userId, name: "Target עברית", image: null, joinedAt: "2026-10-01T10:00:00.000Z",
  bio: "Public details", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true },
  messageCount: 0, bestAnswerCount: 0,
};
let router: ReturnType<typeof createMemoryRouter> | undefined;
afterEach(() => { cleanup(); router?.dispose(); router = undefined; });

function mount(options: { denyManagementOnSubmit?: boolean; revokeManagementOnSubmit?: boolean;
  readOnly?: boolean } = {}, routing?: AdministrativeRouting) {
  let currentRole: AuthorizationRole = roles[0]!;
  let override: "allow" | "deny" | undefined;
  let canManage = !options.readOnly;
  const action = vi.fn(async ({ request }: { request: Request }) => {
    const form = await request.formData();
    expect(form.get("userId")).toBe(userId);
    if (options.denyManagementOnSubmit) {
      canManage = false;
      throw new Response("Forbidden", { status: 403 });
    }
    const intent = form.get("intent");
    if (intent === "assignRole") {
      currentRole = roles.find(role => role.id === form.get("roleId"))!;
    } else if (intent === "override") {
      expect(form.get("permission")).toBe("forum.topic.pin");
      const value = form.get("effect");
      override = value === "inherit" ? undefined : value as "allow" | "deny";
    } else throw new Error("unexpected intent");
    if (options.revokeManagementOnSubmit) canManage = false;
    return { ok: true as const };
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
      locale: "en", profile: { ...profile, role: currentRole },
      privileged: canManage ? { authorization: { status: "ready" as const, value: {
        actorId, management: { userId, roles, authorization }, permissions,
        canManageElevated: true, canMutateAuthorization: true,
      } } } : {},
    };
  });
  function Detail() { return <ProfileView {...useLoaderData<typeof loader>()}/>; }
  const path="/en/users/" + encodeURIComponent(userId);
  router = createMemoryRouter([
    { path:"/en/users/:userId",loader,element:<Detail/>,ErrorBoundary:ProfileErrorBoundary },
    { path:"/en/admin/authorization",action,element:<p>Authorization</p> },
    { path:"/en/office/authorization",action,element:<p>Alternate authorization</p> },
  ],{initialEntries:[path]});
  const view=render(<I18nextProvider i18n={i18n()}>
    <AdministrativeRoutingProvider routing={routing}><RouterProvider router={router}/></AdministrativeRoutingProvider>
  </I18nextProvider>);
  return {...view,action,loader,router,grantManagement:()=>{canManage=true;},path};
}
function formFor(container:HTMLElement,intent:string,permission?:string) {
  return [...container.querySelectorAll<HTMLFormElement>("form")].find(form=>
    form.querySelector<HTMLInputElement>('input[name="intent"]')?.value===intent &&
    (permission===undefined ||
      form.querySelector<HTMLInputElement>('input[name="permission"]')?.value===permission));
}

describe("SA03 canonical targeted authorization fetcher",()=>{
  it("reuses the current canonical writer, preserves target and revalidates on successful edits",async()=>{
    const view=mount();
    await screen.findByRole("heading",{name:"Authorization management",level:3});
    expect(view.container.querySelectorAll("main")).toHaveLength(1);
    const assignment=formFor(view.container,"assignRole")!;
    expect(assignment.getAttribute("action")).toBe("/en/admin/authorization");
    expect(assignment.querySelector<HTMLInputElement>('input[name="userId"]')?.value).toBe(userId);
    fireEvent.change(assignment.querySelector('select[name="roleId"]')!,{target:{value:"builtin-moderator"}});
    fireEvent.submit(assignment);
    await waitFor(()=>expect(view.action).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect((formFor(view.container,"assignRole")
      ?.querySelector('select[name="roleId"]') as HTMLSelectElement|null)?.value).toBe("builtin-moderator"));
    const overrideForm=formFor(view.container,"override","forum.topic.pin")!;
    fireEvent.change(overrideForm.querySelector('select[name="effect"]')!,{target:{value:"allow"}});
    fireEvent.submit(overrideForm);
    await waitFor(()=>expect(view.action).toHaveBeenCalledTimes(2));
    await waitFor(()=>expect((formFor(view.container,"override","forum.topic.pin")
      ?.querySelector('select[name="effect"]') as HTMLSelectElement|null)?.value).toBe("allow"));
    expect(view.router.state.location.pathname).toBe(view.path);
    await waitFor(()=>expect(view.container.textContent).toContain("Public details"));
  });
  it("does not show any targeted controls without authorization admission",async()=>{
    const view=mount({readOnly:true});
    await screen.findByText("Public details");
    expect(view.container.querySelector("#authorization")).toBeNull();
    expect(formFor(view.container,"assignRole")).toBeUndefined();
    expect(view.container.querySelectorAll("main")).toHaveLength(1);
  });
  it("drops revoked authorization DOM after success without leaking prior feedback",async()=>{
    const view=mount({revokeManagementOnSubmit:true});
    await screen.findByRole("heading",{name:"Authorization management",level:3});
    fireEvent.submit(formFor(view.container,"assignRole")!);
    await waitFor(()=>expect(view.action).toHaveBeenCalledOnce());
    await waitFor(()=>expect(view.container.querySelector("#authorization")).toBeNull());
    expect(view.container.textContent).not.toContain("Authorization was updated.");
    await waitFor(()=>expect(view.container.textContent).toContain("Public details"));
    expect(view.router.state.location.pathname).toBe(view.path);
  });
  it("recovers thrown 403 by one fresh GET without replaying POST, including a second independent revocation",async()=>{
    const view=mount({denyManagementOnSubmit:true});
    await screen.findByRole("heading",{name:"Authorization management",level:3});
    fireEvent.submit(formFor(view.container,"assignRole")!);
    await waitFor(()=>expect(view.action).toHaveBeenCalledOnce());
    await waitFor(()=>expect(view.container.querySelector("#authorization")).toBeNull());
    await waitFor(()=>expect(view.container.textContent).toContain("Public details"));
    expect(view.router.state.location.pathname).toBe(view.path);
    expect(view.router.state.location.state).toBeNull();

    view.grantManagement();
    view.router.revalidate();
    await screen.findByRole("heading",{name:"Authorization management",level:3});
    fireEvent.submit(formFor(view.container,"assignRole")!);
    await waitFor(()=>expect(view.action).toHaveBeenCalledTimes(2));
    await waitFor(()=>expect(view.container.querySelector("#authorization")).toBeNull());
    await waitFor(()=>expect(view.container.textContent).toContain("Public details"));
    expect(view.router.state.location.pathname).toBe(view.path);
  });
  it("honors alternate Admin outgoing action resolver without coupling Owner destinations",async()=>{
    const routing=createAdministrativeRouting(
      locale=>"/"+locale+"/office",
      locale=>"https://owner.invalid/"+locale+"/control",
    );
    const view=mount({},routing);
    await screen.findByRole("heading",{name:"Authorization management",level:3});
    expect(routing.superAdmin.overview("en")).toBe("https://owner.invalid/en/control");
    expect(formFor(view.container,"assignRole")?.getAttribute("action")).toBe("/en/office/authorization");
    expect(formFor(view.container,"override","forum.topic.pin")?.getAttribute("action"))
      .toBe("/en/office/authorization");
    expect(view.container.querySelector('a[href^="https://owner.invalid"]')).toBeNull();
  });
});
