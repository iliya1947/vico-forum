import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { createAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { hebrewCommonValues, russianCommonValues } from "../localization/manual-values";
import type { OwnerHistoryPage } from "../../db/owner-sa02-history";
import SuperAdminEventsRoute from "./super-admin-events";
import SuperAdminMonitorHistoryRoute from "./super-admin-monitor-history";

const at="2026-11-11T08:00:00.000Z";
const page:OwnerHistoryPage={entries:[
  {origin:"auth-event",id:"fact/1",occurredAt:at,recordedAt:"2026-11-11T08:01:00.000Z",
    kind:"auth.sessionCreated",monitorKeys:["accounts.sessions","security.auth"],
    source:"auth",quality:null,values:{
      actorUserId:null,targetUserId:"target<safe",entityType:"session",entityId:"sess-1",
    }},
  {origin:"system-observation",id:"sample/1",occurredAt:at,recordedAt:at,
    kind:"monitor.observed",monitorKeys:["security.auth"],source:"database",quality:"measured",
    values:{attributedAttempts:"5",overflowAttempts:"2"}},
  {origin:"attempt-pattern",id:"pattern/1",occurredAt:at,recordedAt:at,
    kind:"attempt.coalesced",monitorKeys:["security.auth"],source:"auth",quality:"coalesced",
    values:{recordingEpochStart:"2026-11-11T08:00:00.000000Z",actorUserId:null,
      networkIp:"2001:db8::1",networkQuality:"trusted",
      operation:"sign-in",outcome:"denied",httpStatus:401,directCode:null,
      firstOccurredAt:"2026-11-11T08:02:00.123456Z",
      lastOccurredAt:"2026-11-11T08:45:00.123457Z",
      count:"9007199254740993",saturated:false}},
  {origin:"attempt-state",id:"2026-11-11T08:00:00.000000Z/overflow.authenticated.auth",
    occurredAt:at,recordedAt:at,kind:"attempt.overflow",
    monitorKeys:["security.auth"],source:"attempt_state",quality:"coalesced",
    values:{slot:"overflow.authenticated.auth",recordingEpochStart:"2026-11-11T08:00:00.000000Z",
      firstOccurredAt:null,lastOccurredAt:at,count:"7",saturated:false}},
  {origin:"attachment-evidence",id:"evidence/1",occurredAt:at,recordedAt:at,
    kind:"attachment.securityEvidence",monitorKeys:["security.attachments"],
    source:"forum_attachment_security_events",quality:null,
    values:{uploadId:"upload-1",uploadedByUserId:"uploader-1",detectedType:"unknown",
      reason:"file-type-mismatch",declaredByteSize:42}},
],next:"v1.test-cursor"};
let router:ReturnType<typeof createMemoryRouter>|undefined;
afterEach(()=>{cleanup();router?.dispose();router=undefined;});

function mount(locale:"en"|"ru"|"he",area:"events"|"history",routing?:AdministrativeRouting){
  const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  const i18n=createInstance();
  void i18n.init({lng:locale,fallbackLng:"en",initAsync:false,defaultNS:"common",
    resources:{en:{common:en},ru:{common:russianCommonValues},he:{common:hebrewCommonValues}}});
  const path=area==="events"?`/${locale}/super-admin/events`
    :`/${locale}/super-admin/monitoring/security/security.auth/history`;
  router=createMemoryRouter([{path,loader:()=>({
    locale,area:"security",monitorKey:"security.auth",page,
  }),element:area==="events"?<SuperAdminEventsRoute/>:<SuperAdminMonitorHistoryRoute/>}],
  {initialEntries:[path]});
  return render(<I18nextProvider i18n={i18n}>
    <AdministrativeRoutingProvider routing={routing}>
      <HeaderAuthProvider initialUser={{id:"owner",name:"Owner",canViewSuperAdmin:true}}>
        <RouterProvider router={router}/>
      </HeaderAuthProvider>
    </AdministrativeRoutingProvider>
  </I18nextProvider>);
}

describe("SA02-D3.1 source-aware original History route presentation",()=>{
  it("renders exact facts, measured observations, hourly groups, overflow and original evidence",async()=>{
    const {container}=mount("en","events");
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(5));
    const entries=[...container.querySelectorAll(".super-admin-timeline li")];
    expect(entries.map(item=>item.getAttribute("data-history-origin"))).toEqual([
      "auth-event","system-observation","attempt-pattern","attempt-state","attachment-evidence",
    ]);
    expect(screen.getByRole("heading",{name:"Session created"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"State observation"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Coalesced authentication/access attempts"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Pattern capacity exceeded"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Attachment security evidence"})).toBeInTheDocument();
    expect(entries[0].textContent).toContain("fact/1");
    expect(entries[0].textContent).toContain("target<safe");
    expect(entries[0].textContent).toContain("Not known from this source");
    expect(entries[0].textContent).toContain("Occurred at");
    expect(entries[0].textContent).toContain("Recorded at");
    expect(entries[1].textContent).toContain("Measured state sample");
    expect(entries[1].textContent).toContain("Measured");
    expect(entries[2].textContent).toContain("9,007,199,254,740,993");
    expect(entries[2].textContent).toContain("2001:db8::1");
    expect(entries[2].textContent).toContain("2026-11-11T08:02:00.123456Z");
    expect(entries[2].textContent).toContain("2026-11-11T08:45:00.123457Z");
    expect(entries[2].textContent).toContain("not one request");
    expect(entries[3].textContent).toContain("overflow.authenticated.auth");
    expect(entries[3].textContent).toContain("Not known from this source");
    expect(entries[4].textContent).toContain("Original attachment evidence");
    expect(entries[4].textContent).toContain("file-type-mismatch");
    expect(container.querySelector(".super-admin-timeline a")).toBeNull();
    expect(container.innerHTML).not.toContain("href=\"https://");
    expect(container.innerHTML).not.toContain("&lt;unsafe</a>");
    expect(container.textContent).not.toContain("undefined");
    expect(container.textContent).not.toContain("null");
    expect(container.querySelectorAll('a[href^="/en/super-admin/events"]')).toHaveLength(2);
  });

  it("uses substituted Owner origin for real scoped History paging, preserving v1 cursor",async()=>{
    const routing=createAdministrativeRouting(
      locale=>`https://forum.invalid/${locale}/office`,
      locale=>`https://owner.invalid/${locale}/control`,
    );
    const {container}=mount("en","history",routing);
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(5));
    const links=[...container.querySelectorAll(".admin-history-paging a")].map(x=>x.getAttribute("href"));
    expect(links).toEqual([
      "https://owner.invalid/en/control/monitoring/security/security.auth/history",
      "https://owner.invalid/en/control/monitoring/security/security.auth/history?before=v1.test-cursor",
    ]);
    expect(container.querySelector('nav.admin-panel-nav a[aria-current="page"]')).toHaveAttribute("href",
      "https://owner.invalid/en/control/monitoring");
    expect(container.textContent).not.toContain("forum.invalid");
  });

  it.each(["ru","he"] as const)("renders localized History categories and values in %s",async locale=>{
    const {container}=mount(locale,"events");
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(5));
    const expected=locale==="ru"?russianCommonValues:hebrewCommonValues;
    expect(container.textContent).toContain(expected.superAdminHistoryOriginAuth);
    expect(container.textContent).toContain(expected.superAdminHistoryOriginGroup);
    expect(container.textContent).toContain(expected.superAdminHistoryGroupNote);
    expect(container.textContent).toContain(expected.superAdminHistoryUnknown);
    expect(container.textContent).not.toContain("Coalesced attempt group");
  });
});
