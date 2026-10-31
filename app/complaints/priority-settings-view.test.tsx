import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider,useLoaderData} from "react-router";
import {render,screen,cleanup,fireEvent,waitFor} from "@testing-library/react";
import {afterEach,it,expect,vi} from "vitest";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {ComplaintPrioritySettingsView} from "./priority-settings-view";
import {DEFAULT_COMPLAINT_REASON_PRIORITY} from "./queue-contract";
afterEach(cleanup);
it.each(["en","ru","he"])("renders and submits all eight settings with version in %s",async locale=>{
  const i18n=createInstance();const common=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
    Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
  await i18n.init({lng:locale,resources:{[locale]:{common}},defaultNS:"common",initAsync:false});
  let version=1;const action=vi.fn(async({request}:{request:Request})=>{const f=await request.formData();expect(f.get("spam")).toBe("3");expect(f.get("expectedVersion")).toBe("1");expect([...f.keys()]).toHaveLength(9);version++;return {ok:true};});
  function View(){const settings=useLoaderData();return <ComplaintPrioritySettingsView locale={locale} settings={settings} canReview={false}/>;}
  const router=createMemoryRouter([{path:"/",loader:()=>({version,weights:DEFAULT_COMPLAINT_REASON_PRIORITY}),action,Component:View}]);
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  const select=await screen.findByRole("combobox",{name:i18n.t("complaintReason_spam")});
  expect(screen.getAllByRole("combobox")).toHaveLength(8);
  expect(screen.queryByRole("link",{name:i18n.t("complaintQueueHeading")})).toBeNull();
  fireEvent.change(select,{target:{value:"3"}});fireEvent.click(screen.getByRole("button",{name:i18n.t("complaintPrioritySave")}));
  await waitFor(()=>expect(action).toHaveBeenCalledTimes(1));
  await screen.findByText(i18n.t("complaintPrioritySettingsSaved"));
});
