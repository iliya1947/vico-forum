import {describe,it,expect} from "vitest";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {ComplaintResolvedHistoryList,ComplaintTimelineEventItem} from "./history-view";
import type {ComplaintTimelineEvent} from "../../db/complaint-history-read";

async function html(view:React.ReactNode,locale:"en"|"ru"|"he"="en"){
 const i18n=createInstance();
 const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
 await i18n.init({lng:locale,defaultNS:"common",fallbackLng:"en",initAsync:false,
  resources:{en:{common:en},ru:{common:russianCommonValues},he:{common:hebrewCommonValues}}});
 return renderToStaticMarkup(
  <I18nextProvider i18n={i18n}><MemoryRouter>{view}</MemoryRouter></I18nextProvider>
 );
}
const base:ComplaintTimelineEvent={
 id:"appeal-one",kind:"appealed",createdAt:new Date("2026-11-02T13:00:00.000Z"),
 moderatorName:null,reason:null,explanation:null,noteBody:null,decisionOutcome:null,
 reasoning:null,priorityOverride:null,appealArgument:"An earlier appeal",appealSide:"author",
 appealOrdinal:2,appealOutcome:null,appealReasoning:null,
 reporterName:null,reporterId:null,appellantName:null,appellantId:null
};
describe("Package 5 readonly History labels",()=>{
 it("uses resolved totals, not open Queue wording, in three locales",async()=>{
  for(const [locale,expected] of [["en","Resolved cases: 7"],["ru","Закрытых дел: 7"],["he","מקרים שטופלו: 7"]] as const){
   const result=await html(<ComplaintResolvedHistoryList locale={locale}
    history={{cases:[],page:0,total:7,hasMore:false}}/>,locale);
   expect(result).toContain(expected);
   expect(result).not.toContain("Open cases");
  }
 });
 it("shows persisted Appeal side and ordinal in both immutable lifecycle events",async()=>{
  const author=await html(<ComplaintTimelineEventItem event={base}/>);
  expect(author).toContain("Content author");
  expect(author).toContain("Appeal #2");
  expect(author).toContain("An earlier appeal");
  const reporter=await html(<ComplaintTimelineEventItem event={{...base,id:"appeal-review",
   kind:"appeal-resolved",appealSide:"reporter",appealOrdinal:3,appealOutcome:"upheld"}}/>,"en");
  expect(reporter).toContain("Reporter");
  expect(reporter).toContain("Appeal #3");
  expect(reporter).toContain("upheld");
  expect(reporter).not.toContain("<form");
 });
});
