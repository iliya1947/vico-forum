import {render,cleanup,waitFor} from "@testing-library/react";
import {createMemoryRouter,RouterProvider} from "react-router";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {afterEach,it,expect} from "vitest";
import {AdminForumBrowseError} from "./forum";
import {canonicalEnglishCatalog} from "../localization/catalog";
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
async function mount(path:string,status=400){
 const i18n=createInstance();await i18n.init({lng:"en",defaultNS:"common",resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,value])=>[key,value.source]))}}});
 const router=createMemoryRouter([{path:"/:locale/admin/forum",loader:()=>{throw new Response("Invalid cursor",{status});},errorElement:<AdminForumBrowseError/>},
  {path:"/:locale/admin/forum/categories/:categoryId",loader:()=>{throw new Response("Invalid cursor",{status});},errorElement:<AdminForumBrowseError/>}],{initialEntries:[path]});
 dispose=()=>router.dispose();const view=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
 await waitFor(()=>expect(view.container.querySelector(".system-state-action")).not.toBeNull());return view.container;
}
it.each(["/en/admin/forum","/he/admin/forum/categories/c%2Fa"])("offers First for legacy/malformed cursor on %s",async path=>{
 const node=await mount(path+"?q=literal+%25_&after=legacy-id");
 expect(node.querySelector('.system-state')?.getAttribute("data-status")).toBe("400");
 expect(node.querySelector('.system-state-action')?.getAttribute("href")).toBe(path+"?q=literal+%25_");
});
it.each([401,403,404,500,503])("keeps the ordinary %s error action without reflecting a private filter",async status=>{
 const node=await mount("/ru/admin/forum?after=legacy&q=PRIVATE_FILTER",status);
 expect(node.querySelector('.system-state-action')?.getAttribute("href")).toBe("/ru");
 expect(node.textContent).not.toContain("PRIVATE_FILTER");
});
