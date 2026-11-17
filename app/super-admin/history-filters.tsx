import {useState} from "react";
import {Form,Link,useSubmit} from "react-router";
import {useTranslation} from "react-i18next";
import type {OwnerHistoryOptions} from "../../db/owner-sa02-history";
import type {HistoryFilterCatalog} from "./history-filter-types";
import {ownerAreaLabels} from "./area-navigation";
/** The current validated URL owns applied filters; editable state resets on navigation. */
export function HistoryFilters({path,filters,catalog,scoped=false}:{path:string;filters:OwnerHistoryOptions;catalog:HistoryFilterCatalog;scoped?:boolean}){
  const {t}=useTranslation("common"),submit=useSubmit();
  const [area,setArea]=useState(filters.area??""),[monitor,setMonitor]=useState(filters.monitorKey??""),[origin,setOrigin]=useState(filters.origin??""),[kind,setKind]=useState(filters.kind??"");
  const choices=catalog.scopes[monitor?"monitor:"+monitor:area?"area:"+area:"*"]??[];
  const kinds=[...new Set(choices.filter(c=>!origin||c.origin===origin).flatMap(c=>c.kinds))];
  return <Form method="get" action={path} className="super-admin-history-filters" data-history-filters onSubmit={event=>{
    event.preventDefault();const data=new FormData(event.currentTarget);
    for(const [key,value]of [...data])if(value==="")data.delete(key);
    void submit(data,{method:"get",action:path});
  }}>
    <fieldset><legend>{t("sa08Filters")}</legend><p>{t("sa08FilterNote")}</p>
      {!scoped?<>
        <label>{t("sa08Area")}<select name="area" value={area} onChange={event=>{setArea(event.target.value as typeof area);setMonitor("");setOrigin("");setKind("");}}>
          <option value="">{t("sa08All")}</option>{Object.keys(catalog.areas).map(key=><option key={key} value={key}>{t(ownerAreaLabels[key as keyof typeof ownerAreaLabels])}</option>)}
        </select></label>
        <label>{t("sa08Monitor")}<select name="monitor" value={monitor} onChange={event=>{setMonitor(event.target.value as typeof monitor);setOrigin("");setKind("");}}>
          <option value="">{t("sa08All")}</option>{(area?catalog.areas[area]??[]:Object.values(catalog.areas).flat()).map(key=><option key={key} value={key}>{key}</option>)}
        </select></label>
      </>:null}
      <label>{t("sa08Origin")}<select name="origin" value={origin} onChange={event=>{setOrigin(event.target.value as typeof origin);setKind("");}}>
        <option value="">{t("sa08All")}</option>{choices.map(choice=><option key={choice.origin} value={choice.origin}>{choice.origin}</option>)}
      </select></label>
      <label>{t("sa08Kind")}<select name="kind" value={kind} onChange={event=>setKind(event.target.value)}>
        <option value="">{t("sa08All")}</option>{kinds.map(value=><option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>{t("sa08From")}<input name="from" defaultValue={filters.from??""} placeholder="2026-11-17T00:00:00.000000Z" type="text" dir="ltr" spellCheck={false}/></label>
      <label>{t("sa08Until")}<input name="until" defaultValue={filters.until??""} placeholder="2026-11-18T00:00:00.000000Z" type="text" dir="ltr" spellCheck={false}/></label>
      <button type="submit">{t("sa08Apply")}</button>{" "}<Link to={path}>{t("sa08Clear")}</Link>
    </fieldset>
  </Form>;
}
