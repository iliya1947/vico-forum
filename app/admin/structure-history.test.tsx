import {cleanup,render} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {I18nextProvider} from "react-i18next";
import {createInstance} from "i18next";
import {afterEach,expect,it} from "vitest";
import {HistoryEvents,RecentHistory} from "./history";
import type {AdminHistoryEvent,StructureHistoryChange} from "../../db/admin-history";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {russianCommonValues,hebrewCommonValues} from "../localization/manual-values";
import {AdministrativeRoutingProvider} from "../administrative-routing/provider";
import {createAdministrativeRouting} from "../administrative-routing/addresses";

afterEach(cleanup);
const version={previousVersion:"9007199254740993",version:"9007199254740994"};
const category={name:"Old category עברית",sortPosition:"9007199254740993"};
const nextCategory={name:"New category Русский",sortPosition:"9007199254740994"};
const section={...category,categoryId:"old-parent"},nextSection={...nextCategory,categoryId:"new-parent"};
const neighbor={neighborId:"neighbor/שלום",neighborBeforePosition:"8",neighborAfterPosition:"9"};
const categoryTarget={targetType:"category" as const,targetId:"category/א",targetLabel:"Stored category label"};
const sectionTarget={targetType:"section" as const,targetId:"section/я",targetLabel:"Stored section label"};
const changes:StructureHistoryChange[]=[
  {...categoryTarget,action:"category.created",context:{...version,before:null,after:nextCategory}},
  {...categoryTarget,action:"category.renamed",context:{...version,before:category,after:nextCategory}},
  {...categoryTarget,action:"category.reordered",context:{...version,...neighbor,before:category,after:nextCategory}},
  {...sectionTarget,action:"section.created",context:{...version,before:null,after:nextSection}},
  {...sectionTarget,action:"section.renamed",context:{...version,before:section,after:nextSection}},
  {...sectionTarget,action:"section.moved",context:{...version,before:section,after:nextSection}},
  {...sectionTarget,action:"section.reordered",context:{...version,...neighbor,before:section,after:nextSection}},
  {targetType:"topic",targetId:"hidden/topic",targetLabel:"topic:hidden/topic",action:"topic.moved",context:{...version,
    before:{categoryId:"old-parent",categoryName:"Old category",sectionId:"old-section",sectionName:"Old section"},
    after:{categoryId:"new-parent",categoryName:"New category",sectionId:"new-section",sectionName:"New section"}}},
];
it.each(["en","ru","he"] as const)("R4b-01 shows all eight stored structural facts/targets in full and recent History (%s)",async locale=>{
  const common:Record<string,string>={};
  for(const [key,{source}] of Object.entries(canonicalEnglishCatalog.common))if(typeof source==="string")common[key]=source;
  const translations=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:common;
  const i18n=createInstance();await i18n.init({lng:locale,defaultNS:"common",resources:{[locale]:{common:{...common,...translations}}}});
  const events:AdminHistoryEvent[]=changes.map((change,index)=>({id:"original-"+index,at:"2026-11-23T00:00:00.000Z",
    actorId:"actor",actorLabel:"Manager",reason:null,change:{...change,context:{...change.context,unexpected:"PRIVATE SOURCE MUST NOT RENDER"}} as unknown as StructureHistoryChange}));
  const routing=createAdministrativeRouting(l=>"/private/"+l,l=>"/owner/"+l);
  const f=render(<I18nextProvider i18n={i18n}><AdministrativeRoutingProvider routing={routing}><MemoryRouter>
    <HistoryEvents locale={locale} events={events}/><RecentHistory locale={locale} recent={{events,next:null}}/>
  </MemoryRouter></AdministrativeRoutingProvider></I18nextProvider>);
  const lists=f.container.querySelectorAll(".admin-history-events");expect(lists).toHaveLength(2);
  for(const list of lists){
    const rows=[...list.querySelectorAll(":scope > li")];expect(rows).toHaveLength(8);
    rows.forEach((row,index)=>{
      const change=changes[index];
      expect(row.querySelector("dl")?.textContent).toContain("9007199254740993");
      expect(row.querySelector("dl")?.textContent).toContain("9007199254740994");
      expect(row.querySelector("dt")?.textContent).toBe(translations.historyStructureBeforeVersion);
      const link=row.querySelector("a")!;
      expect(link.getAttribute("href")).toBe(change.targetType==="category"?routing.admin.category(locale,change.targetId)
        :change.targetType==="section"?routing.admin.section(locale,change.targetId):routing.admin.topic(locale,change.targetId));
      expect(link.textContent).toBe(change.targetLabel);
    });
    expect(rows[0].textContent).toContain(translations.historyNoValue);
    expect(rows[1].textContent).toContain(category.name);
    expect(rows[2].textContent).toContain(neighbor.neighborId);
    expect(rows[5].textContent).toContain("old-parent");expect(rows[5].textContent).toContain("new-parent");
    expect(rows[6].textContent).toContain(neighbor.neighborId);
    for(const part of ["Old category","New category","old-section","new-section","Old section","New section"])
      expect(rows[7].textContent).toContain(part);
  }
  expect(f.container.textContent).not.toMatch(/PRIVATE SOURCE|unexpected|author|revision/);
});
