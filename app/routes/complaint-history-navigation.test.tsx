import {afterEach,describe,it,expect,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterContextProvider,RouterProvider} from "react-router";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {authSessionContext,type AuthSession} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintQueueContext} from "../complaints/queue-context";
import ComplaintHistoryRoute,{loader} from "./complaint-history";

afterEach(cleanup);
const session={
 user:{id:"reviewer",name:"Reviewer",email:"reviewer@example.test",emailVerified:true,
 createdAt:new Date(),updatedAt:new Date()},
 session:{id:"session",token:"token",userId:"reviewer",expiresAt:new Date(),
 createdAt:new Date(),updatedAt:new Date()},
} satisfies AuthSession;

describe("Package 5 timeline navigation",()=>{
 it("opens the 8 remaining notes through the actual Next link after 50 events",async()=>{
  const context=new RouterContextProvider();
  context.set(authSessionContext,session);
  context.set(authorizationContext,{forUser:()=>({has:async()=>true})} as never);
  const readHistoryTimeline=vi.fn(async(_actor:string,_caseId:string,page:number)=>({
    caseId:"case-1",outcome:"confirmed" as const,
    resolvedAt:new Date("2026-11-02T11:00:00.000Z"),page,total:58,hasMore:page===0,
    events:Array.from({length:page===0?50:8},(_,i)=>({
      id:"event-"+(page*50+i),kind:"noted",createdAt:new Date("2026-11-02T10:00:00.000Z"),
      moderatorName:"Reviewer",reason:null,explanation:null,
      noteBody:page===1&&i===7?"LAST_PRIVATE_NOTE":"note-"+(page*50+i),
      decisionOutcome:null,reasoning:null,priorityOverride:null,appealArgument:null,
      appealSide:null,appealOrdinal:null,appealOutcome:null,appealReasoning:null,
      reporterName:null,reporterId:null,appellantName:null,appellantId:null
    })),
  }));
  context.set(complaintQueueContext,{readHistoryTimeline} as never);
  const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  const i18n=createInstance();
  await i18n.init({lng:"en",defaultNS:"common",fallbackLng:"en",initAsync:false,
    resources:{en:{common:en}}});
  const router=createMemoryRouter([{
    path:"/:locale/attention/complaints/:caseId/history",
    loader:({request,params})=>loader({params,context,url:new URL(request.url)}),
    element:<ComplaintHistoryRoute/>
  }],{initialEntries:["/en/attention/complaints/case-1/history"]});
  try{
    render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
    expect(await screen.findByText("note-0")).toBeTruthy();
    fireEvent.click(screen.getByRole("link",{name:i18n.t("attentionCaseNext")}));
    expect(await screen.findByText("LAST_PRIVATE_NOTE")).toBeTruthy();
    await waitFor(()=>expect(router.state.location.search).toBe("?page=1"));
    expect(readHistoryTimeline).toHaveBeenCalledWith("reviewer","case-1",1);
  }finally{router.dispose();}
 });
});
