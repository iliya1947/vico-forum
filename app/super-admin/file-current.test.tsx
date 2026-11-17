import "@testing-library/jest-dom/vitest";
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import {createMemoryRouter,RouterProvider} from "react-router";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {afterEach,expect,it} from "vitest";
import {HeaderAuthProvider,type HeaderAuthUser} from "../auth/auth-controls";
import {canonicalEnglishCatalog} from "../localization/catalog";
import type {OwnerFilesCurrent} from "../../db/owner-file-monitoring";
import {SuperAdminFiles} from "./file-current";
const owner={id:"owner",name:"Owner",canViewSuperAdmin:true};
const state:OwnerFilesCurrent={monitors:[{key:"files.assets",schemaVersion:1,source:"database",quality:"measured",observedAt:"2026-11-17T00:00:00.000000Z",values:{assetBytes:"9007199254740993"},recording:"available",coverageFrom:null,lastObservedAt:null}],storageSamples:[],bucketBound:false};
let router:ReturnType<typeof createMemoryRouter>;
afterEach(()=>{cleanup();router?.dispose();});
function mount(){
  router=createMemoryRouter([{path:"*",element:<SuperAdminFiles locale="en" viewerId="owner" state={state}/>}]);
  const i18n=createInstance();void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,d])=>[k,d.source]))}}});
  const tree=(user:HeaderAuthUser|null)=><HeaderAuthProvider initialUser={user}><I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider></HeaderAuthProvider>;
  const root=render(tree(owner));return {...root,show:(user:HeaderAuthUser|null)=>root.rerender(tree(user))};
}
it("renders exact counts, explicit runtime/coverage limits and only canonical read navigation",async()=>{
  const root=mount();expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();expect(screen.getByText(/best effort/)).toBeVisible();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/files/files.assets/history"]')).not.toBeNull();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/files"]')).not.toBeNull();expect(root.container.querySelector("form")).toBeNull();
});
it("known signout purges the task snapshot and signing back in cannot revive the old object",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show(null);
  await waitFor(()=>expect(root.container.querySelector("[data-file-current]")).toBeNull());
  root.show(owner);expect(root.container.querySelector("[data-file-current]")).toBeNull();
});
it("an account switch keeps the old Owner task data out of the new viewer DOM",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show({id:"another",name:"Another"});
  await waitFor(()=>expect(screen.queryByText("9,007,199,254,740,993")).toBeNull());
});
