import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OwnerLifecycleControl } from "./lifecycle-control";
import type { OwnerUserProfileSnapshot } from "../../db/owner-user-profile";
import { canonicalEnglishCatalog } from "../localization/catalog";

const active: OwnerUserProfileSnapshot = { targetUserId:"target/משתמש", lifecycle:{status:"active"},
  email:"private-target@test.invalid",emailVerified:false,createdAt:"2026-11-16T00:00:00Z",updatedAt:"2026-11-16T00:00:00Z",
  linkedMethods:[],hasPassword:false,observedAt:"2026-11-16T00:00:00Z",sessionCounts:{active:"0",expiredRetained:"0"},
  sessions:[],nextSessionsCursor:null };
const inactive: OwnerUserProfileSnapshot = {...active,lifecycle:{status:"deactivated",deactivatedAt:"2026-11-16T12:00:00.123Z",
  deactivatedByUserId:"owner",retainAtLeastUntil:"2027-11-16T12:00:00.123Z"}};
let router:ReturnType<typeof createMemoryRouter>;
let value=active,loads=0;
const fetcher=vi.fn<typeof fetch>();
function Detail(){return <OwnerLifecycleControl locale="en" viewerId="owner" account={useLoaderData<OwnerUserProfileSnapshot>()}/>;}
beforeEach(()=>{
  value=active;loads=0;fetcher.mockReset();vi.stubGlobal("fetch",fetcher);
  // jsdom does not implement native modal focus/top-layer behavior. Chromium
  // acceptance covers that actual browser boundary separately.
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
});
afterEach(()=>{cleanup();router?.dispose();vi.unstubAllGlobals();});
function mount(initial=active){
  value=initial;
  const i18n=createInstance();void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",
    resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,d])=>[key,d.source]))}}});
  router=createMemoryRouter([{path:"*",loader:()=>{loads++;return value;},element:<Detail/>}],{initialEntries:["/en/users/target"]});
  return render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
}
async function open(){
  fireEvent.click(await screen.findByRole("button",{name:"Deactivate account"}));
  const dialog=await screen.findByRole("dialog");expect(dialog).toHaveAttribute("open");return dialog;
}
function deferred(){let resolve!:(r:Response)=>void;const promise=new Promise<Response>(r=>{resolve=r;});return{promise,resolve};}

it("opening/cancelling is mutation-free; confirmation uses authorized identity, exact four fields and a stable operation UUID",async()=>{
  mount();const dialog=await open();
  expect(dialog).toHaveTextContent(active.email);expect(dialog).toHaveTextContent(active.targetUserId);
  const form=dialog.querySelector("form")!,before=new FormData(form),op=before.get("operationId");
  expect([...before.keys()].sort()).toEqual(["expectedActorId","intent","operationId","targetUserId"]);
  expect(before.get("expectedActorId")).toBe("owner");expect(before.get("targetUserId")).toBe(active.targetUserId);
  expect(op).toMatch(/^[a-f0-9-]{36}$/);expect(form.action).toContain("target%2F");
  expect(new FormData(form).get("operationId")).toBe(op);expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
  expect(screen.queryByRole("dialog")).toBeNull();expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Deactivate account"})).toHaveFocus();
});
it("Escape before submission closes confirmation without a request",async()=>{
  mount();const dialog=await open();fireEvent(dialog,new Event("cancel",{bubbles:false,cancelable:true}));
  expect(screen.queryByRole("dialog")).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it.each([inactive,{...active,targetUserId:"owner"}])("never offers another action for an inactive or exact-Owner target",async account=>{
  mount(account);await waitFor(()=>expect(loads).toBe(1));expect(screen.queryByRole("button")).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it("one explicit submit disables duplicate work, preserves its operation and revalidates the canonical profile after typed200",async()=>{
  const reply=deferred();fetcher.mockReturnValue(reply.promise);mount();const dialog=await open(),form=dialog.querySelector("form")!;
  const op=new FormData(form).get("operationId");fireEvent.submit(form);fireEvent.submit(form);
  expect(fetcher).toHaveBeenCalledTimes(1);expect(screen.getByRole("button",{name:"Deactivating…"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"Cancel"})).toBeDisabled();
  const [path,init]=fetcher.mock.calls[0];expect(path).toBe("/en/users/target%2F%D7%9E%D7%A9%D7%AA%D7%9E%D7%A9/owner/deactivate");
  expect(init).toMatchObject({method:"POST",credentials:"same-origin",redirect:"error"});
  expect(Object.fromEntries(init!.body as URLSearchParams)).toEqual({intent:"deactivate",expectedActorId:"owner",targetUserId:active.targetUserId,operationId:op});
  value=inactive;reply.resolve(Response.json({targetUserId:active.targetUserId,state:"deactivated",changed:true,eventId:null,
    deactivatedAt:"2026-11-16T12:00:00.123Z",retainAtLeastUntil:"2027-11-16T12:00:00.123Z"}));
  await waitFor(()=>expect(loads).toBe(2));expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button",{name:"Deactivate account"})).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([400,401,403,404,409,500,503])("HTTP%s is sanitized, never replayed and Refresh only revalidates",async status=>{
  fetcher.mockResolvedValue(new Response("PRIVATE_SQL_STACK",{status}));mount();const form=(await open()).querySelector("form")!;
  fireEvent.submit(form);const error=await screen.findByRole("alert");expect(error).not.toHaveTextContent("PRIVATE_");
  expect(screen.getByRole("button",{name:"Confirm deactivation"})).toBeDisabled();expect(fetcher).toHaveBeenCalledTimes(1);
  const before=loads;fireEvent.click(screen.getByRole("button",{name:"Refresh this profile"}));
  await waitFor(()=>expect(loads).toBeGreaterThan(before));expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.submit(form);expect(fetcher).toHaveBeenCalledTimes(1);
});
it("a lost response claims no outcome; explicit Refresh may observe the committed inactive state without a second POST",async()=>{
  fetcher.mockRejectedValue(new Error("PRIVATE_NETWORK_ACK"));mount();fireEvent.submit((await open()).querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("result could not be confirmed");
  expect(screen.queryByText("Account deactivated.")).toBeNull();value=inactive;
  fireEvent.click(screen.getByRole("button",{name:"Refresh this profile"}));
  await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());expect(fetcher).toHaveBeenCalledTimes(1);
});
it("unmounting an old viewer/target aborts its request and ignores a late acknowledgement",async()=>{
  const reply=deferred();fetcher.mockReturnValue(reply.promise);const root=mount();fireEvent.submit((await open()).querySelector("form")!);
  const signal=fetcher.mock.calls[0][1]!.signal as AbortSignal;root.unmount();expect(signal.aborted).toBe(true);
  reply.resolve(Response.json({targetUserId:active.targetUserId,state:"deactivated",changed:true}));
  await Promise.resolve();expect(loads).toBe(1);expect(fetcher).toHaveBeenCalledTimes(1);
});
it("an invalid success body cannot invent confirmation or trigger a retry",async()=>{
  fetcher.mockResolvedValue(Response.json({targetUserId:"another-user",state:"deactivated",changed:true}));
  mount();fireEvent.submit((await open()).querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("result could not be confirmed");
  expect(screen.queryByText("Account deactivated.")).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);expect(loads).toBe(1);
});
