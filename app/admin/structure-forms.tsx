import {useCallback,useEffect,useRef,useState} from "react";
import {useFetcher,useRevalidator} from "react-router";
import {useTranslation} from "react-i18next";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import type {DestinationPage,StructureDestination} from "../../db/forum-structure-reader";
import type {StructureChangeResult,StructureIntent} from "./structure-actions.server";
import type {StructureInlineError} from "./structure-inline.server";

type Intent=Exclude<StructureIntent,"createCategory">;
interface FormProps {
  locale:string;path:string;actorId:string;version:string;targetId:string;operation:Intent;
  initialName?:string;currentCategoryId?:string;
}
function CategoryPicker({locale,actorId,selected,onChange}:{
  locale:string;actorId:string;selected:string;onChange:(value:string)=>void;
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const fetcher=useFetcher<(DestinationPage&{readId:string})|StructureInlineError>();
  const [query,setQuery]=useState("");
  const [activeQuery,setActiveQuery]=useState("");
  const [items,setItems]=useState<StructureDestination[]>([]);
  const [next,setNext]=useState<string|null>(null);
  const [total,setTotal]=useState<number|null>(null);
  const [currentItem,setCurrentItem]=useState<StructureDestination|null>(null);
  const mode=useRef<"replace"|"append">("replace");
  const lastResponse=useRef<unknown>(null);
  const sequence=useRef(0);
  const [readId,setReadId]=useState("");
  const url=routing.admin.destinations(locale);
  const load=useCallback((search:string,after?:string)=>{
    const id=String(++sequence.current);
    setReadId(id);
    const params=new URLSearchParams({kind:"categories",inlineMove:"1",readId:id});
    if(search)params.set("q",search);
    if(after)params.set("after",after);
    fetcher.load(url+"?"+params.toString());
  },[fetcher.load,url]);
  useEffect(()=>{
    mode.current="replace";
    load("");
    // One read per mounted actor/form lifetime, not for each fetched result.
  },[actorId,load]);
  useEffect(()=>{
    const data=fetcher.data;
    if(fetcher.state!=="idle"||!data||data===lastResponse.current||data.readId!==readId)return;
    lastResponse.current=data;
    if("error" in data)return;
    if(data.actorId!==actorId)return;
    const received=data.items.filter(item=>!item.category);
    setItems(previous=>mode.current==="append"
      ? Array.from(new Map([...previous,...received].map(item=>[item.id,item])).values()) : received);
    setNext(data.next);
    setTotal(data.total);
  },[fetcher.state,fetcher.data,actorId,readId]);
  const error=fetcher.state==="idle"&&fetcher.data?.readId===readId&&"error" in fetcher.data?fetcher.data.error:null;
  const valid=items.find(item=>item.id===selected)??(currentItem?.id===selected?currentItem:null);
  return <fieldset className="admin-forum-picker">
    <legend>{t("structureDestinationCategory")}</legend>
    <label>{t("structureCategorySearch")}
      <input type="search" maxLength={400} value={query}
        onChange={event=>setQuery(Array.from(event.currentTarget.value).slice(0,200).join(""))} dir="auto"/>
    </label>
    <button type="button" disabled={fetcher.state!=="idle"} onClick={()=>{
      setActiveQuery(query);mode.current="replace";load(query);
    }}>{t("structureCategorySearchSubmit")}</button>
    <label>{t("structureDestinationCategory")}
      <select name="targetCategoryId" value={selected} dir="auto" required onChange={event=>{
        const id=event.currentTarget.value;
        setCurrentItem(items.find(item=>item.id===id)??null);
        onChange(id);
      }}>
        <option value="">{t("structureDestinationCategory")}</option>
        {valid&&!items.some(item=>item.id===valid.id)
          ?<option value={valid.id}>{valid.name} ({valid.id})</option>:null}
        {items.map(item=><option value={item.id} key={item.id}>{item.name} ({item.id})</option>)}
      </select>
    </label>
    {total===0?<p>{t("structureNoDestinations")}</p>:null}
    {error?<><p role="alert">{t(error==="invalid"?"structureActionInvalid"
      :error==="unavailable"?"structureActionUnconfirmed":"structureActionDenied")}</p>
      <button type="button" onClick={()=>{mode.current="replace";load(activeQuery);}}>{t("structureActionReload")}</button></>:null}
    {next?<button type="button" disabled={fetcher.state!=="idle"} onClick={()=>{
      mode.current="append";load(activeQuery,next);
    }}>{t("structureCategoryNext")}</button>:null}
  </fieldset>;
}

/** Isolated actor/object/intent fetcher. No optimistic writes or automatic POST retries. */
export function StructureChangeForm({locale,path,actorId,version,targetId,operation,initialName="",currentCategoryId}:FormProps){
  const {t}=useTranslation("common");
  const fetcher=useFetcher<StructureChangeResult>();
  const revalidator=useRevalidator();
  const [name,setName]=useState(initialName);
  const [destination,setDestination]=useState("");
  const [unknown,setUnknown]=useState(false);
  const [attempted,setAttempted]=useState(false);
  const acknowledged=useRef<unknown>(null);
  const result=fetcher.state==="idle"&&fetcher.data&&(fetcher.data.operation===operation
    ||fetcher.data.operation==="structure"&&"error" in fetcher.data)?fetcher.data:null;
  useEffect(()=>{
    if(fetcher.state==="submitting")setAttempted(true);
    if(fetcher.state==="idle"&&attempted&&!fetcher.data)setUnknown(true);
  },[fetcher.state,fetcher.data,attempted]);
  useEffect(()=>{
    if(!result||acknowledged.current===result)return;
    acknowledged.current=result;
    if("ok" in result&&result.ok&&result.actorId===actorId&&result.targetId===targetId){
      setUnknown(false);
      if(operation==="createSection")setName("");
      if(operation==="moveSection")setDestination("");
    }
  },[result,actorId,targetId,operation]);
  const matchesSuccess=result&&"ok" in result&&result.ok&&result.actorId===actorId&&result.targetId===targetId;
  const error=result&&"error" in result?result.error:null;
  const blocked=unknown||error==="conflict"||error==="unavailable"||error==="unauthenticated"||error==="forbidden"||error==="notFound";
  const busy=fetcher.state!=="idle"||revalidator.state!=="idle";
  const errorKey=unknown||error==="unavailable"?"structureActionUnconfirmed":error==="conflict"?"structureActionConflict"
    :error==="forbidden"||error==="unauthenticated"||error==="notFound"?"structureActionDenied":"structureActionInvalid";
  const named=operation==="renameCategory"||operation==="renameSection"||operation==="createSection";
  const ordered=operation==="reorderCategory"||operation==="reorderSection";
  const moved=operation==="moveSection";
  const label=operation==="createSection"?"structureCreateSection"
    :operation==="renameCategory"?"structureRenameCategory"
    :operation==="renameSection"?"structureRenameSection"
    :operation==="reorderCategory"?"structureReorderCategory"
    :operation==="reorderSection"?"structureReorderSection":"structureMoveSection";
  const canSubmit=(!named||!!name.trim())&&(!moved||!!destination);
  return <div className="admin-forum-structure-form">
    <h3>{t(label)}</h3>
    <fetcher.Form method="post" action={path} aria-busy={busy} onSubmit={event=>{
      if(busy||blocked||!canSubmit)event.preventDefault();
    }}>
      <input type="hidden" name="intent" value={operation}/>
      <input type="hidden" name="editorActorId" value={actorId}/>
      <input type="hidden" name="expectedStructureVersion" value={version}/>
      {named?<label>{t(operation==="renameCategory"?"structureCategoryName":"structureSectionName")}
        <input type="text" name="name" value={name} autoComplete="off" maxLength={400}
          onChange={event=>setName(event.currentTarget.value)} dir="auto" required/>
      </label>:null}
      {moved?<><input type="hidden" name="expectedCategoryId" value={currentCategoryId??""}/>
        <CategoryPicker locale={locale} actorId={actorId} selected={destination} onChange={setDestination}/>
      </>:null}
      {ordered?<div className="admin-forum-order-actions">
        <button type="submit" name="direction" value="up" disabled={busy||!!blocked}>{t("structureUp")}</button>
        <button type="submit" name="direction" value="down" disabled={busy||!!blocked}>{t("structureDown")}</button>
      </div>:<button type="submit" disabled={busy||!!blocked||!canSubmit}>{t(busy?"structureActionPending":label)}</button>}
    </fetcher.Form>
    {matchesSuccess?<p role="status">{t("structureActionSaved")}</p>:null}
    {blocked||error?<p role="alert">{t(errorKey)}</p>:null}
    {blocked?<button type="button" disabled={busy} onClick={()=>{
      fetcher.reset();setUnknown(false);setAttempted(false);
      void revalidator.revalidate();
    }}>{t("structureActionReload")}</button>:null}
  </div>;
}
