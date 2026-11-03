import {act,type ReactElement} from "react";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider} from "react-router";
import {renderToString} from "react-dom/server";
import {hydrateRoot,type Root} from "react-dom/client";
import {describe,expect,it} from "vitest";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {ComplaintResolvedHistoryList} from "./history-view";
import ComplaintResultRoute from "../routes/complaint-result";
import {NotificationsView} from "../forum/views";

const decisionTime="2026-11-03T18:00:00.000Z";
const nextDayTime="2026-11-04T00:30:00.000Z";
type Locale="en"|"ru"|"he";
type Surface="history"|"result"|"notifications";
const samples=(["en","ru","he"] as const).flatMap(locale=>
  (["history","result","notifications"] as const).map(surface=>({locale,surface})));

async function resources(locale:Locale){
  const i18n=createInstance();
  const english=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,entry])=>[key,entry.source]));
  await i18n.init({lng:locale,defaultNS:"common",fallbackLng:"en",initAsync:false,
    resources:{en:{common:english},ru:{common:russianCommonValues},he:{common:hebrewCommonValues}}});
  return i18n;
}

function utcText(surface:Surface,locale:Locale,value:string){
  const date=new Date(value);
  return surface==="notifications"
    ? new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(date)
    : date.toLocaleString(locale,{timeZone:"UTC"});
}

function buildSurface(surface:Surface,locale:Locale){
  if(surface==="history"){
    return {
      path:`/${locale}/attention`,
      stamps:[decisionTime],
      loaderData:null,
      element:<ComplaintResolvedHistoryList locale={locale} history={{
        page:0,total:1,hasMore:false,
        cases:[{id:"history-case",kind:"post",text:"Reported source",sourceLocale:"en",
          outcome:"not-confirmed",resolvedAt:new Date(decisionTime),independentReporterCount:1}]
      }}/>
    };
  }
  if(surface==="notifications"){
    const base={actorName:null,topicId:null,topicTitle:null,postId:null,readAt:null};
    return {
      path:`/${locale}/notifications`,
      stamps:[decisionTime,nextDayTime],
      loaderData:null,
      element:<NotificationsView locale={locale} notifications={[
        {...base,id:"decision",kind:"complaint-decision" as const,caseId:"history-case",createdAt:decisionTime},
        {...base,id:"appeal",kind:"complaint-appeal-result" as const,caseId:"history-case",
          appealId:"appeal-one",createdAt:nextDayTime},
        {...base,id:"legacy",kind:"reply" as const,actorName:"Member",topicId:"topic",
          topicTitle:"Topic",postId:"post",createdAt:decisionTime}
      ]}/>
    };
  }
  const result={caseId:"history-case",decisionId:"decision-one",outcome:"not-confirmed" as const,
    reasoning:"Public result",decidedAt:decisionTime,effectiveOutcome:"not-confirmed" as const,
    remaining:2,pending:false,canAppeal:false,
    appeals:[{id:"appeal-one",ordinal:1,side:"reporter" as const,status:"resolved" as const,
      outcome:"upheld" as const,reasoning:"Appeal result",resolvedAt:nextDayTime,
      ownArgument:"The participant's appeal"}]};
  return {
    path:`/${locale}/complaints/history-case/result`,
    stamps:[decisionTime,nextDayTime],
    element:<ComplaintResultRoute/>,
    loaderData:{locale,result}
  };
}

describe("Complaints deterministic SSR/hydration timestamps",()=>{
  it.each(samples)("$surface in $locale uses the same UTC text across host timezones",async({locale,surface})=>{
    const i18n=await resources(locale);
    const fixture=buildSurface(surface,locale);
    const routers:Array<ReturnType<typeof createMemoryRouter>>=[];
    const view=():ReactElement=>{
      const route=fixture.loaderData
        ? {id:"target",path:fixture.path,element:fixture.element,loader:()=>fixture.loaderData}
        : {id:"target",path:fixture.path,element:fixture.element};
      const router=createMemoryRouter([route],{
        initialEntries:[fixture.path],
        ...(fixture.loaderData?{hydrationData:{loaderData:{target:fixture.loaderData}}}:{})
      });
      routers.push(router);
      return <I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>;
    };
    const previousZone=process.env.TZ;
    const element=document.createElement("div");
    let hydrated:Root|undefined;
    document.body.append(element);
    try{
      process.env.TZ="UTC";
      const rawUtc=new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"})
        .format(new Date(decisionTime));
      const server=renderToString(view());
      element.innerHTML=server;
      const serverTimes=Array.from(element.querySelectorAll("time"));
      expect(serverTimes).toHaveLength(surface==="notifications"?3:fixture.stamps.length);

      process.env.TZ="Asia/Jerusalem";
      const rawJerusalem=new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"})
        .format(new Date(decisionTime));
      expect(rawJerusalem).not.toBe(rawUtc);

      const recoverable:string[]=[];
      await act(async()=>{
        hydrated=hydrateRoot(element,view(),{onRecoverableError:error=>recoverable.push(String(error))});
      });
      expect(recoverable).toEqual([]);
      const hydratedTimes=Array.from(element.querySelectorAll("time"));
      expect(hydratedTimes).toHaveLength(serverTimes.length);
      for(const [index,stamp] of fixture.stamps.entries()){
        const matching=hydratedTimes.filter(node=>node.getAttribute("datetime")===stamp);
        expect(matching.length).toBe(surface==="notifications"&&index===0?2:1);
        for(const node of matching)expect(node.textContent).toBe(utcText(surface,locale,stamp));
      }
    }finally{
      if(hydrated)await act(async()=>hydrated?.unmount());
      routers.forEach(router=>router.dispose());
      element.remove();
      if(previousZone===undefined)delete process.env.TZ;
      else process.env.TZ=previousZone;
    }
  });
});
