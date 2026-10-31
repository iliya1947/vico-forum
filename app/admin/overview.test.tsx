import {render,cleanup as cleanupViews} from "@testing-library/react";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider} from "react-router";
import {afterEach,describe,expect,it} from "vitest";
import {createTranslationRuntime} from "../localization/runtime";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {AdminOverview} from "./overview";
import {adminAccess} from "./access";

const counts={categories:0,sections:0,topics:101,posts:1200};
let cleanup=()=>{};
afterEach(()=>cleanup());
async function mount(locale="en",permissions:readonly ("forum.topic.pin"|"access.authorization.manage")[]=["forum.topic.pin"],stats: typeof counts|null=counts){
  const resources=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
  const flatten=(values:Record<string,unknown>):Record<string,string>=>Object.fromEntries(Object.entries(values).flatMap(([key,value])=>
    typeof value === "string" ? [[key,value]] : Object.entries(value as Record<string,string>).map(([branch,text])=>[`${key}_${branch}`,text])));
  const common=flatten(Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,value])=>[key,value.source])));
  const i18n=createTranslationRuntime({locale:{translationLocale:locale,direction:locale==="he"?"rtl":"ltr",formatting:{locale,timeZone:"UTC"},fallbackLocales:locale==="en"?[]:["en"],nativeName:locale,presentationMetadata:{}},
    fallbackLocales:locale==="en"?[]:["en"],resourcesByLocale:{en:{common},[locale]:{common:flatten(resources)}},bundleVersions:{en:{common:"test"},[locale]:{common:"test"}},staleKeys:{}});
  const access=adminAccess(new Set(permissions));
  const router=createMemoryRouter([
    {path:"/:locale/admin",element:<AdminOverview locale={locale} access={access} counts={stats}/>},
  ],{initialEntries:[`/${locale}/admin`]});
  const {container:node}=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  cleanup=()=>{cleanupViews();router.dispose();};
  return {node,router};
}
describe("admin shell and truthful Overview",()=>{
  it.each(["en","ru","he"])("renders actual localized navigation and formatted counts in %s",async locale=>{
    const {node}=await mount(locale,["forum.topic.pin","access.authorization.manage"]);
    const labels=locale==="he"?hebrewCommonValues:locale==="ru"?russianCommonValues:null;
    expect(node.querySelector("h1")?.textContent).toBe(labels?.adminPanelTitle??"Admin panel");
    expect(node.querySelector('.admin-panel-nav [aria-current="page"]')?.textContent).toBe(labels?.adminOverview??"Overview");
    expect([...node.querySelectorAll(".admin-stat-list dd")].map(n=>n.textContent)).toEqual(["0","0","101",new Intl.NumberFormat(locale).format(1200)]);
    const roleLinks=[...node.querySelectorAll<HTMLAnchorElement>('a[href$="/admin/authorization"]')];expect(roleLinks).toHaveLength(2);
    expect(node.querySelector('a[href*="/attention"]')).toBeNull();
  });
  it("filters actual authorization destination independently and keeps unfinished sections honest",async()=>{
    const {node}=await mount();
    expect(node.querySelector('a[href$="/admin/authorization"]')).toBeNull();
    const forum=node.querySelector<HTMLAnchorElement>('.admin-destination[href="/en/admin/forum"]')!;
    expect(forum).toBeTruthy();expect(forum.textContent).toBe("Forum");
    expect(node.querySelector('.admin-destination[href*="admin-settings"]')?.textContent).toContain("Under development");
  });
  it("shows unavailable rather than fabricated zero statistics with a locale-safe retry",async()=>{
    const {node}=await mount("he",["forum.topic.pin"],null);
    expect(node.querySelector(".admin-stat-list")).toBeNull();
    expect(node.querySelector('[role="status"]')?.textContent).toContain(hebrewCommonValues.adminStatsUnavailable);
    expect(node.querySelector('.admin-stats-unavailable a')?.getAttribute("href")).toBe("/he/admin");
  });
});
