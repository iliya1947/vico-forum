import "@testing-library/jest-dom/vitest";
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import {createMemoryRouter,RouterProvider} from "react-router";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {afterEach,expect,it} from "vitest";
import {HeaderAuthProvider,type HeaderAuthUser} from "../auth/auth-controls";
import {canonicalEnglishCatalog} from "../localization/catalog";
import type {OwnerIntegrationsCurrent} from "../../db/owner-integration-catalog";
import {SuperAdminIntegrations} from "./integration-current";
const owner={id:"owner",name:"Owner",canViewSuperAdmin:true};
const state:OwnerIntegrationsCurrent={monitors:[{key:"integrations.authentication",schemaVersion:1,source:"application",quality:"measured",observedAt:"2026-11-17T00:00:00.000000Z",values:{googleParametersPresent:true,googleCallbackCoverageMeasured:false,genericSessionProviderKnown:false},recording:"available",coverageFrom:null,lastObservedAt:null}],database:{source:"existing-system-dependency-reader",observedAt:"2026-11-17T00:00:00.000000Z",quality:"measured",recording:"available",values:{},retainedSample:null},requiredLocalizationRead:null,storageSamples:[],translation:{taskOutcome:null,providerExecution:null},authentication:{source:"database",observedAt:"2026-11-17T00:00:00.000000Z",values:{googleMethodLinkFacts:"9007199254740993"},googleMethodLink:null,genericSession:null}};
let router:ReturnType<typeof createMemoryRouter>;
afterEach(()=>{cleanup();router?.dispose();});
function mount(snapshot=state){
  router=createMemoryRouter([{path:"*",element:<SuperAdminIntegrations locale="en" viewerId="owner" state={snapshot}/>}]);
  const i18n=createInstance();void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,d])=>[k,d.source]))}}});
  const tree=(user:HeaderAuthUser|null)=><HeaderAuthProvider initialUser={user}><I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider></HeaderAuthProvider>;
  const root=render(tree(owner));return {...root,show:(user:HeaderAuthUser|null)=>root.rerender(tree(user))};
}
it("labels both email-change purposes independently of rejected or uncertain transport",async()=>{
  const fact=(mailPurpose:string,mailOutcome:string)=>({id:mailPurpose,occurredAt:"2026-11-26T00:00:00Z",kind:"integration.authMailOutcome",source:"auth-mail",values:{mailPurpose,mailOutcome,mailTransport:"fake"}});
  mount({...state,authentication:{...state.authentication,emailChangeOldMail:fact("email-change-confirmation","rejected"),emailChangeNewMail:fact("email-change-verification","uncertain")}});
  expect(await screen.findByRole("heading",{name:"Email change confirmation mail"})).toBeVisible();
  expect(screen.getByRole("heading",{name:"New address verification mail"})).toBeVisible();
  expect(screen.getByText("rejected")).toBeVisible();expect(screen.getByText("uncertain")).toBeVisible();
  expect(screen.queryByText(/link sent/)).toBeNull();
});
it("renders exact retained method facts, explicit generic-session limits and canonical read-only navigation",async()=>{
  const root=mount();expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();expect(screen.getByText(/may sign in by password/)).toBeVisible();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/integrations/integrations.authentication/history"]')).not.toBeNull();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/integrations"]')).not.toBeNull();expect(root.container.querySelector("form")).toBeNull();
});
it("known signout purges the Integrations snapshot and signing back in cannot revive the old object",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show(null);
  await waitFor(()=>expect(root.container.querySelector("[data-integration-current]")).toBeNull());
  root.show(owner);expect(root.container.querySelector("[data-integration-current]")).toBeNull();
});
it("an account switch keeps the old Owner Integrations data out of the new viewer DOM",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show({id:"another",name:"Another"});
  await waitFor(()=>expect(screen.queryByText("9,007,199,254,740,993")).toBeNull());
});
