import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, data } from "react-router";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { ComplaintSubmissionForm } from "./submission-form";

let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
async function mount(locale="en",rateLimited=false) {
  const values=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
    Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,value])=>[key,value.source]));
  const i18n=createInstance();await i18n.init({lng:locale,fallbackLng:false,resources:{[locale]:{common:values}},defaultNS:"common",initAsync:false});
  const received: URLSearchParams[]=[];
  const action=vi.fn(async({request}:{request:Request})=>{
    const fields=new URLSearchParams(await request.text());received.push(fields);
    if(rateLimited&&received.length===1)return data({error:"rateLimited",retryAfterSeconds:2},{status:429});
    return data({ok:true,operationId:fields.get("operationId")});
  });
  const path=`/${locale}/topics/topic`;
  const router=createMemoryRouter([
    {path,element:<><ComplaintSubmissionForm locale={locale} topicId="topic" revisionId="title-revision"/>
      <ComplaintSubmissionForm locale={locale} topicId="topic" postId="post" revisionId="post-revision"/></>},
    {path:path+"/complaints",action},
  ],{initialEntries:[path]});
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  dispose=()=>router.dispose();return {action,received,router,i18n};
}
describe("in-topic complaint forms",()=>{
  it.each(["en","ru","he"])("separates title/post targets and confirms without navigation in %s",async locale=>{
    const {received,router,i18n}=await mount(locale);const user=userEvent.setup();
    await user.click(screen.getByRole("button",{name:i18n.t("complaintReportTitle")}));
    await user.selectOptions(screen.getByRole("combobox"),"other");
    const explanation=screen.getByRole("textbox") as HTMLTextAreaElement;expect(explanation.required).toBe(true);
    await user.type(explanation,"Details עברית русский");
    await user.click(screen.getByRole("button",{name:i18n.t("complaintSubmit")}));
    await waitFor(()=>expect(screen.getByRole("status").textContent).toBe(i18n.t("complaintSubmitted")));
    expect(received[0].get("kind")).toBe("topic-title");expect(received[0].get("revisionId")).toBe("title-revision");
    expect(received[0].has("postId")).toBe(false);expect(router.state.location.pathname).toBe(`/${locale}/topics/topic`);
    await user.click(screen.getByRole("button",{name:i18n.t("complaintReportPost")}));
    await user.click(screen.getByRole("button",{name:i18n.t("complaintSubmit")}));
    await waitFor(()=>expect(received).toHaveLength(2));
    expect(received[1].get("kind")).toBe("post");expect(received[1].get("postId")).toBe("post");
    expect(received[1].get("revisionId")).toBe("post-revision");
  });
  it("keeps explanation on 429 and resubmits the same operation nonce",async()=>{
    const {received,i18n}=await mount("en",true);const user=userEvent.setup();
    await user.click(screen.getByRole("button",{name:i18n.t("complaintReportPost")}));
    await user.type(screen.getByRole("textbox"),"Keep these details");
    await user.click(screen.getByRole("button",{name:i18n.t("complaintSubmit")}));
    await screen.findByRole("alert");expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Keep these details");
    await user.click(screen.getByRole("button",{name:i18n.t("complaintSubmit")}));
    await screen.findByRole("status");expect(received[1].get("operationId")).toBe(received[0].get("operationId"));
  });
});
