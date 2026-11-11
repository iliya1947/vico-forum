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
const semanticPage:OwnerHistoryPage={entries:[
  {origin:"system-observation",id:"security-evidence-sample",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:00.000Z",kind:"monitor.observed",source:"database",
    quality:"measured",monitorKeys:["security.attachments"],values:{total:"1",evidence24h:"1"}},
  {origin:"system-observation",id:"registration-sample",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:00.000Z",kind:"monitor.observed",source:"database",
    quality:"measured",monitorKeys:["accounts.registration"],values:{version:7}},
  {origin:"system-observation",id:"users-sample",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:00.000Z",kind:"monitor.observed",source:"database",
    quality:"measured",monitorKeys:["accounts.users"],values:{total:"9007199254740993"}},
  {origin:"system-observation",id:"system-dependencies-sample",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:00.000Z",kind:"monitor.observed",source:"database",
    quality:"measured",monitorKeys:["system.dependencies"],values:{version:"17.11"}},
  {origin:"auth-event",id:"real-auth-fact-id",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:01.000Z",kind:"account.created",source:"auth",
    quality:null,monitorKeys:["accounts.users"],values:{
      actorUserId:"00012345678901234567890",targetUserId:"00012345678901234567890",
      entityType:"user",entityId:"00012345678901234567890"}},
  {origin:"admin-history",id:"real-admin-history-id",occurredAt:"2026-11-11T08:00:00.000Z",
    recordedAt:"2026-11-11T08:00:01.000Z",kind:"settings.registrationChanged",source:"admin_history",
    quality:null,monitorKeys:["accounts.registration"],values:{
      actorUserId:"0000000033",targetType:"user",targetId:"0000000044"}},
  {origin:"attachment-evidence",id:"real-attachment-evidence-id",
    occurredAt:"2026-11-11T08:00:00.000Z",recordedAt:"2026-11-11T08:00:00.000Z",
    kind:"attachment.securityEvidence",source:"forum_attachment_security_events",
    quality:null,monitorKeys:["security.attachments"],
    values:{uploadId:"000001234567890",uploadedByUserId:"0000000033",declaredByteSize:42}},
  {origin:"attempt-pattern",id:"real-attempt-pattern-id",
    occurredAt:"2026-11-11T08:00:00.000Z",recordedAt:"2026-11-11T08:00:00.000Z",
    kind:"attempt.coalesced",source:"auth",quality:"coalesced",
    monitorKeys:["security.auth"],values:{count:"9007199254740993",actorUserId:"0000000033"}},
],next:null};


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

function mount(locale:"en"|"ru"|"he",area:"events"|"history",routing?:AdministrativeRouting,
  sourcePage:OwnerHistoryPage=page,scope={area:"security",monitorKey:"security.auth"}){
  const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  const i18n=createInstance();
  void i18n.init({lng:locale,fallbackLng:"en",initAsync:false,defaultNS:"common",
    resources:{en:{common:en},ru:{common:russianCommonValues},he:{common:hebrewCommonValues}}});
  const path=area==="events"?`/${locale}/super-admin/events`
    :`/${locale}/super-admin/monitoring/${scope.area}/${scope.monitorKey}/history`;
  router=createMemoryRouter([{path,loader:()=>({
    locale,area:scope.area,monitorKey:scope.monitorKey,page:sourcePage,
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
    expect(container.querySelectorAll('.admin-history-paging a[href^="/en/super-admin/events"]')).toHaveLength(2);
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
    expect(container.querySelector('a[href="https://owner.invalid/en/control/monitoring/security"]'))
      .toHaveTextContent("Security");
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
  it.each(["en","ru","he"] as const)("uses observation monitor semantics in global History (%s)",async locale=>{
    const {container}=mount(locale,"events",undefined,semanticPage);
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(8));
    const tr=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
      Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,d])=>[key,d.source]));
    function displayed(sourceId:string,label:string){
      const entry=[...container.querySelectorAll(".super-admin-timeline li")].find(li=>
        li.textContent?.includes(sourceId));
      expect(entry).toBeDefined();
      return [...entry!.querySelectorAll("dl > div")].find(row=>
        row.querySelector("dt")?.textContent===label)?.querySelector("dd")?.textContent;
    }
    expect(displayed("security-evidence-sample",String(tr.superAdminSa02TotalEvidence))).toBe(
      new Intl.NumberFormat(locale).format(1n));
    expect(displayed("registration-sample",String(tr.superAdminSa02PolicyVersion))).toBe("7");
    expect(displayed("users-sample",String(tr.superAdminSa02TotalUsers))).toBe(
      new Intl.NumberFormat(locale).format(9007199254740993n));
    expect(displayed("system-dependencies-sample",String(tr.superAdminDatabaseVersion))).toBe("17.11");
    expect(displayed("security-evidence-sample",String(tr.superAdminSa02TotalUsers))).toBeUndefined();
    expect(displayed("registration-sample",String(tr.superAdminDatabaseVersion))).toBeUndefined();
  });

  it("renders digit-only opaque refs literally while retaining bigint-safe counts",async()=>{
    const {container}=mount("en","events",undefined,semanticPage);
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(8));
    const auth=container.querySelector('li[data-history-kind="account.created"]')!;
    const ids=[...auth.querySelectorAll("dl dd bdi")].map(el=>el.textContent);
    expect(ids.filter(v=>v==="00012345678901234567890")).toHaveLength(3);
    expect(ids.join(" ")).not.toContain("12,345,678,901,234,567,890");
    const admin=container.querySelector('li[data-history-origin="admin-history"]')!;
    expect(admin.textContent).toContain("0000000033");
    expect(admin.textContent).toContain("0000000044");
    const attachment=container.querySelector('li[data-history-origin="attachment-evidence"]')!;
    expect(attachment.textContent).toContain("000001234567890");
    expect(attachment.textContent).toContain("0000000033");
    const group=container.querySelector('li[data-history-origin="attempt-pattern"]')!;
    expect(group.textContent).toContain("9,007,199,254,740,993");
    expect(group.textContent).toContain("0000000033");
    expect(container.querySelector(".super-admin-timeline a")).toBeNull();
  });

  it.each([
    ["security","security.attachments","security-evidence-sample","Retained evidence events"],
    ["accounts","accounts.registration","registration-sample","Policy version"],
    ["system","system.dependencies","system-dependencies-sample","Database version"],
    ["accounts","accounts.users","users-sample","Persisted users"],
  ] as const)("keeps source-aware labels in scoped %s/%s History",async(area,key,id,label)=>{
    const sourcePage:OwnerHistoryPage={entries:semanticPage.entries.filter(e=>e.id===id),next:null};
    const {container}=mount("en","history",undefined,sourcePage,{area,monitorKey:key});
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(1));
    const item=container.querySelector(".super-admin-timeline li")!;
    expect(item.textContent).toContain(id);
    expect([...item.querySelectorAll("dt")].map(el=>el.textContent)).toContain(label);
  });

});
