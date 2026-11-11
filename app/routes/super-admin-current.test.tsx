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
import type { Sa02CurrentMonitor, Sa02CurrentState } from "../../db/owner-sa02-current";
import type { Sa02MonitorKey } from "../../db/owner-sa02-catalog";
import SuperAdminAccountsRoute from "./super-admin-accounts";
import SuperAdminSecurityRoute from "./super-admin-security";

const observedAt="2026-11-11T08:23:00.000Z";
const lastObservedAt="2026-11-11T08:20:00.000Z";
const coverageFrom="2026-11-10T00:00:00.000Z";
const huge="9007199254740993";
function monitor(key:Sa02MonitorKey,values:Record<string,string|number|boolean|null>,
  extras:Partial<Pick<Sa02CurrentMonitor,"coverageFrom"|"lastObservedAt">>={}):Sa02CurrentMonitor {
  return {key,source:"database",quality:"measured",values,
    coverageFrom,lastObservedAt,...extras};
}
const accounts:Sa02CurrentState={
  observedAt,recording:"available",
  monitors:[
    monitor("accounts.users",{total:huge,created24h:"0"},{lastObservedAt:null}),
    monitor("accounts.methods",{passwordUsers:"2",googleUsers:"3",bothUsers:"1"}),
    monitor("accounts.sessions",{active:"3",expiredRetained:"5"}),
    monitor("accounts.registration",{googleEnabled:false,emailEnabled:true,
      version:7,updatedAt:"2026-11-10T06:00:00.000Z"}),
  ],
};
const security:Sa02CurrentState={
  observedAt,recording:"unavailable",
  monitors:[
    monitor("security.auth",{attributedAttempts:huge,rateLimitedAttempts:"0",
      retainedPatterns:"1",unknownAttempts:"2",overflowAttempts:"3",gapAttempts:"4",
      lastSeenAt:"2026-11-11T08:22:00.000Z",
      currentHourAuthenticatedUsed:"128",currentHourAnonymousUsed:"250",hourlyCapacityPerPool:256}),
    monitor("security.access",{attributedAttempts:"0",rateLimitedAttempts:"0",
      retainedPatterns:"0",unknownAttempts:"0",overflowAttempts:"0",gapAttempts:"0",
      lastSeenAt:null,currentHourAuthenticatedUsed:"128",currentHourAnonymousUsed:"250",
      hourlyCapacityPerPool:256},{coverageFrom:null}),
    monitor("security.attachments",{total:"1",evidence24h:"1",
      lastEventAt:"2026-11-11T06:00:00.000Z"}),
  ],
};
let router:ReturnType<typeof createMemoryRouter>|null=null;
afterEach(()=>{cleanup();router?.dispose();router=null;});
function mount(area:"accounts"|"security",routing?:AdministrativeRouting){
  const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  const i18n=createInstance();
  void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",
    resources:{en:{common:en}}});
  const path="/en/super-admin/monitoring/"+area;
  router=createMemoryRouter([{path,loader:()=>({
    locale:"en",area,state:area==="accounts"?accounts:security,
  }),element:area==="accounts"?<SuperAdminAccountsRoute/>:<SuperAdminSecurityRoute/>}],
  {initialEntries:[path]});
  return render(<I18nextProvider i18n={i18n}>
    <AdministrativeRoutingProvider routing={routing}>
      <HeaderAuthProvider initialUser={{id:"owner",name:"Owner",canViewSuperAdmin:true}}>
        <RouterProvider router={router}/>
      </HeaderAuthProvider>
    </AdministrativeRoutingProvider>
  </I18nextProvider>);
}
describe("SA02-D2.2 current monitoring route components",()=>{
  it("renders four semantic Accounts monitors, exact bigint counters, flags and adjacent links",async()=>{
    const {container}=mount("accounts");
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-monitor")).toHaveLength(4));
    expect(screen.getByRole("heading",{name:"Users in database"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Linked sign-in methods"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Retained sessions"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Registration policy"})).toBeInTheDocument();
    expect(container.textContent).toContain("9,007,199,254,740,993");
    expect(container.textContent).not.toContain("9,007,199,254,740,992");
    expect(container.textContent).toContain("New Google registration");
    expect(container.textContent).toContain("Enabled");
    expect(container.textContent).toContain("Disabled");
    expect(container.textContent).toContain("Unexpired sessions do not indicate who is online.");
    const cards=[...container.querySelectorAll(".super-admin-monitor")];
    const scopes=["accounts.users","accounts.methods","accounts.sessions","accounts.registration"];
    const contexts=["/en/admin/users","/en/settings/account","/en/settings/account","/en/settings/forum"];
    for(let i=0;i<cards.length;i++){
      expect(cards[i]).toHaveAttribute("data-monitor-key",scopes[i]);
      expect(cards[i].querySelector('a[href$="/history"]')).toHaveAttribute("href",
        "/en/super-admin/monitoring/accounts/"+scopes[i]+"/history");
      expect(cards[i].querySelector('a[href="/en/super-admin/monitoring/accounts"]')).toBeInTheDocument();
      expect(cards[i].querySelector('a[href="'+contexts[i]+'"]')).toBeInTheDocument();
    }
    expect(cards[0].textContent).toContain("Last retained state sample");
    expect(cards[0].textContent).toContain("Not recorded");
  });

  it("shows cumulative saved attempts, shared current-hour pools, gaps and incomplete recording",async()=>{
    const {container}=mount("security");
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-monitor")).toHaveLength(3));
    expect(screen.getByRole("heading",{name:"Authentication attempts"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Super-admin access denials"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Attachment security evidence"})).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("observation recording is unavailable");
    expect(container.textContent).toContain("9,007,199,254,740,993");
    expect(container.textContent).toContain("Saved overflow attempts");
    expect(container.textContent).toContain("Saved recording gaps");
    expect(container.textContent).toContain("Current-hour authenticated pool used");
    expect(container.textContent).toContain("Current-hour anonymous pool used");
    expect(container.textContent).toContain("Pattern groups allowed per pool per hour");
    expect(container.textContent).toContain("not a complete security audit");
    expect(container.textContent).toContain("zero does not prove no attacks");
    expect(container.textContent).toContain("shared by authentication and access monitoring");
    const cards=[...container.querySelectorAll(".super-admin-monitor")];
    expect(cards[0].querySelectorAll("nav a")).toHaveLength(2);
    expect(cards[1].querySelectorAll("nav a")).toHaveLength(2);
    expect(cards[2].querySelector('a[href="/en/attention?mode=security&group=attachments"]')).toBeInTheDocument();
    expect(cards[1].textContent).toContain("Not recorded");
    expect(cards.every(c=>c.querySelector('a[href$="/history"]'))).toBe(true);
  });

  it("keeps real route component links on separate substituted Owner/Admin origins",async()=>{
    const routing=createAdministrativeRouting(
      locale=>"https://forum.invalid/"+locale+"/office",
      locale=>"https://owner.invalid/"+locale+"/control",
    );
    const {container}=mount("accounts",routing);
    await waitFor(()=>expect(container.querySelectorAll(".super-admin-monitor")).toHaveLength(4));
    expect(container.querySelector('a[href="https://forum.invalid/en/office/users"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="https://owner.invalid/en/control"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="https://owner.invalid/en/control/monitoring"]')).toBeInTheDocument();
    expect(container.querySelectorAll('a[href="https://owner.invalid/en/control/monitoring/accounts"]'))
      .toHaveLength(4);
    expect(container.querySelectorAll('a[href^="https://owner.invalid/en/control/monitoring/accounts/"][href$="/history"]'))
      .toHaveLength(4);
    expect(container.querySelector('a[href="/en/settings/forum"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/en/settings/account"]')).toBeInTheDocument();
  });
});
