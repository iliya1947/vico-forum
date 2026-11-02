import {render,cleanup} from "@testing-library/react";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider} from "react-router";
import {afterEach,describe,expect,it} from "vitest";
import {createTranslationRuntime} from "../localization/runtime";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {AdminForumView,AdminCategoryView,AdminSectionView} from "./forum";
import {adminAccess} from "./access";
import {adminCategoryPath,adminSectionPath} from "./forum-paths";
const access=adminAccess(new Set(["forum.post.history.read"]));
const category={id:"c/slash עברית",name:"Category עברית",sectionCount:2,topicCount:3,postCount:4,reserved:false};
const section={id:"help-solutions-questions",name:"Internal Help",category,topicCount:1,postCount:1,service:true};
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
async function mount(locale:string,kind:"index"|"category"|"section",empty=false){
  const resources=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
  const flatten=(values:Record<string,unknown>):Record<string,string>=>Object.fromEntries(Object.entries(values).flatMap(([key,value])=>
    typeof value === "string" ? [[key,value]] : Object.entries(value as Record<string,string>).map(([branch,text])=>[`${key}_${branch}`,text])));
  const common=flatten(Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,value])=>[key,value.source])));
  const i18n=createTranslationRuntime({locale:{translationLocale:locale,direction:locale==="he"?"rtl":"ltr",formatting:{locale,timeZone:"UTC"},fallbackLocales:locale==="en"?[]:["en"],nativeName:locale,presentationMetadata:{}},
    fallbackLocales:locale==="en"?[]:["en"],resourcesByLocale:{en:{common},[locale]:{common:flatten(resources)}},bundleVersions:{en:{common:"test"},[locale]:{common:"test"}},staleKeys:{}});
  const page={items:empty?[]:[category],total:empty?0:26,next:empty?null:"cursor/slash"};const query={search:"%_ עברית",after:"previous"};
  const element=kind==="index"?<AdminForumView locale={locale} access={access} page={page} query={query}/>:kind==="category"?<AdminCategoryView locale={locale} access={access} category={category} sections={{...page,items:empty?[]:[section]}} query={query}/>:<AdminSectionView locale={locale} access={access} section={section}/>;
  const router=createMemoryRouter([{path:"*",element}],{initialEntries:[`/${locale}/admin/forum`]});dispose=()=>router.dispose();
  return render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>).container;
}
describe("localized protected browsing presentation",()=>{
 it.each(["en","ru","he"])("shares shell, hierarchy and usable links in %s",async locale=>{
  const node=await mount(locale,"index");expect(node.querySelectorAll("main")).toHaveLength(1);expect(node.querySelectorAll("h1")).toHaveLength(1);
  expect(node.querySelector('.admin-panel-nav [aria-current="page"]')?.getAttribute("href")).toBe(`/${locale}/admin/forum`);
  expect(node.querySelector('.admin-forum-objects a')?.getAttribute("href")).toBe(adminCategoryPath(locale,category.id));
  expect(node.querySelector('label[for="admin-forum-query"]')?.textContent).not.toBe("adminForumSearch");
  expect(node.querySelector('form')?.getAttribute("method")).toBe("get");expect(node.querySelector('input')?.value).toBe("%_ עברית");
  const next=node.querySelector('.admin-forum-paging a:last-child')!;const url=new URL(next.getAttribute("href")!,"https://vico.test");expect(url.searchParams.get("q")).toBe("%_ עברית");expect(url.searchParams.get("after")).toBe("cursor/slash");
 });
 it("shows service section only with explicit internal badge and public category link",async()=>{
  let node=await mount("he","category");expect(node.querySelector('.admin-forum-objects a')?.getAttribute("href")).toBe(adminSectionPath("he",section.id));expect(node.querySelector('.admin-forum-reserved')).toBeTruthy();
  cleanup();dispose();node=await mount("he","section");expect(node.querySelector('.admin-forum > a')?.getAttribute("href")).toBe("/he/categories/help-solutions");expect(node.querySelector('a[href*="/sections/help-solutions-questions"]')).toBeNull();
 });
 it("renders truthful empty results with no fabricated objects or next page",async()=>{
  const node=await mount("ru","category",true);expect(node.querySelector('.admin-forum-objects')).toBeNull();expect(node.textContent).toContain("Подходящих объектов нет.");expect(node.querySelectorAll('.admin-forum-paging a')).toHaveLength(1);
 });
});
