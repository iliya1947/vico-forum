import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { forumTopicPath } from "./paths";
import type { TopicMoveContext, DestinationPage, StructureDestination } from "../../db/forum-structure-reader";
import type { TopicMoveActionResult } from "./topic-move.server";

/** One source-free form shared by public/Admin Quick actions and private direct Move. */
export function TopicMoveForm({locale,context,onRefresh}:{
  locale:string;context:TopicMoveContext;onRefresh?:()=>void;
}) {
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const destinationFetcher=useFetcher<DestinationPage>();
  const moveFetcher=useFetcher<TopicMoveActionResult>();
  const revalidator=useRevalidator();
  const [query,setQuery]=useState("");
  const [searched,setSearched]=useState("");
  const [selected,setSelected]=useState("");
  const [retained,setRetained]=useState<StructureDestination|null>(null);
  const [items,setItems]=useState<StructureDestination[]>([]);
  const [next,setNext]=useState<string|null>(null);
  const [empty,setEmpty]=useState(false);
  const [attempted,setAttempted]=useState(false);
  const [unknown,setUnknown]=useState(false);
  const lastPage=useRef<unknown>(null);
  const pageMode=useRef<"replace"|"append">("replace");
  const lastReceipt=useRef<unknown>(null);
  const destinationUrl=routing.admin.destinations(locale);
  const load=useCallback((search:string,after?:string)=>{
    const params=new URLSearchParams({kind:"sections"});
    if(search)params.set("q",search);
    if(after)params.set("after",after);
    destinationFetcher.load(destinationUrl+"?"+params);
  },[destinationFetcher.load,destinationUrl]);
  useEffect(()=>{
    pageMode.current="replace";
    load("");
  },[context.actorId,context.topicId,load]);
  useEffect(()=>{
    const page=destinationFetcher.data;
    if(destinationFetcher.state!=="idle"||!page||page===lastPage.current)return;
    lastPage.current=page;
    if(page.actorId!==context.actorId)return;
    const received=page.items.filter(item=>Boolean(item.category));
    setItems(previous=>pageMode.current==="append"
      ? Array.from(new Map([...previous,...received].map(item=>[item.id,item])).values()) : received);
    setNext(page.next);
    setEmpty(page.total===0);
  },[destinationFetcher.state,destinationFetcher.data,context.actorId]);
  useEffect(()=>{
    if(moveFetcher.state==="submitting")setAttempted(true);
    if(moveFetcher.state==="idle"&&attempted&&!moveFetcher.data)setUnknown(true);
  },[moveFetcher.state,moveFetcher.data,attempted]);
  const receipt=moveFetcher.state==="idle"&&moveFetcher.data?.operation==="topicMove"
    ? moveFetcher.data:null;
  const success=Boolean(receipt&&"ok" in receipt&&receipt.ok
    &&receipt.actorId===context.actorId&&receipt.topicId===context.topicId);
  useEffect(()=>{
    if(!success||lastReceipt.current===receipt)return;
    lastReceipt.current=receipt;
    void revalidator.revalidate();
  },[success,receipt,revalidator]);
  const failure=receipt&&"error" in receipt?receipt.error:null;
  const denied=failure==="forbidden"||failure==="unauthenticated"||failure==="notFound";
  const uncertain=unknown||failure==="unavailable";
  const conflict=failure==="conflict";
  const invalid=failure==="invalid";
  const pageFresh=destinationFetcher.data?.actorId===context.actorId
    &&destinationFetcher.data.structureVersion===context.structureVersion;
  const matchingViewer=viewer!==null&&viewer===context.actorId;
  const busy=destinationFetcher.state!=="idle"||moveFetcher.state!=="idle";
  const valid=items.find(item=>item.id===selected)??(retained?.id===selected?retained:null);
  const blocked=denied||uncertain||conflict||invalid||success;
  const ready=matchingViewer&&pageFresh&&valid&&!busy&&!blocked;
  const message=uncertain?"topicMoveUnconfirmed":conflict?"topicMoveConflict":
    denied?"topicMoveDenied":invalid?"topicMoveInvalid":null;
  // Returning to a previous signed-in actor never authenticates an old private snapshot.
  const lifetime=useRef({actorId:context.actorId,topicId:context.topicId,invalidated:false});
  if(lifetime.current.actorId!==context.actorId||lifetime.current.topicId!==context.topicId)
    lifetime.current={actorId:context.actorId,topicId:context.topicId,invalidated:false};
  if(!matchingViewer)lifetime.current.invalidated=true;
  if(lifetime.current.invalidated)return null;
  return <div className="admin-forum-structure-form topic-move-form">
    <h3>{t("topicMoveTitle")}</h3>
    <p>{t("topicMoveCurrent")}: <bdi dir="auto">{context.currentSection.name} ({context.currentSection.id})</bdi></p>
    <moveFetcher.Form method="post" action={forumTopicPath(locale,context.topicId)+"?moveAction=1"} aria-busy={busy}>
      <input type="hidden" name="intent" value="moveTopic"/>
      <input type="hidden" name="editorActorId" value={context.actorId}/>
      <input type="hidden" name="expectedStructureVersion" value={context.structureVersion}/>
      <input type="hidden" name="expectedSectionId" value={context.currentSection.id}/>
      <input type="hidden" name="expectedLocationVersion" value={context.locationVersion}/>
      <fieldset className="admin-forum-picker">
        <legend>{t("topicMoveDestination")}</legend>
        <label>{t("topicMoveSearch")}
          <input type="search" value={query} maxLength={400} dir="auto"
            onChange={e=>setQuery(e.currentTarget.value)}/>
        </label>
        <button type="button" disabled={busy} onClick={()=>{
          setSearched(query);pageMode.current="replace";load(query);
        }}>{t("topicMoveFind")}</button>
        <label>{t("topicMoveDestination")}
          <select name="targetSectionId" required dir="auto" value={selected} disabled={!pageFresh||busy}
            onChange={e=>{
              const value=e.currentTarget.value;
              setRetained(items.find(item=>item.id===value)??null);
              setSelected(value);
            }}>
            <option value="">{t("topicMoveDestination")}</option>
            {valid&&!items.some(item=>item.id===valid.id)
              ?<option value={valid.id}>{valid.name} ({valid.id}) — {valid.category?.name}</option>:null}
            {items.map(item=><option key={item.id} value={item.id}>
              {item.name} ({item.id}) — {item.category?.name}
            </option>)}
          </select>
        </label>
        {empty?<p>{t("topicMoveEmpty")}</p>:null}
        {next?<button type="button" disabled={busy} onClick={()=>{
          pageMode.current="append";load(searched,next);
        }}>{t("topicMoveMore")}</button>:null}
      </fieldset>
      <button type="submit" disabled={!ready}>{t(busy?"topicMoveLoading":"topicMoveSubmit")}</button>
    </moveFetcher.Form>
    {success?<p role="status">{t("topicMoveSaved")}</p>:null}
    {message?<p role="alert">{t(message)}</p>:null}
    {!pageFresh&&destinationFetcher.state==="idle"?<p role="alert">{t("topicMoveConflict")}</p>:null}
    {(blocked||!pageFresh)&&onRefresh?<button type="button" disabled={busy} onClick={onRefresh}>
      {t("topicMoveRefresh")}
    </button>:null}
  </div>;
}

/** Inline entry does not navigate away from mounted title/post/reply editors. */
export function TopicMoveControl({locale,topicId,actorId}:{
  locale:string;topicId:string;actorId:string;
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const [opened,setOpened]=useState(false);
  const fetcher=useFetcher<TopicMoveContext>();
  const url=routing.admin.topicMove(locale,topicId);
  const lifetime=useRef({actorId,topicId,invalidated:false});
  if(lifetime.current.actorId!==actorId||lifetime.current.topicId!==topicId)
    lifetime.current={actorId,topicId,invalidated:false};
  if(viewer!==actorId)lifetime.current.invalidated=true;
  const valid=fetcher.state==="idle"&&fetcher.data?.actorId===actorId
    &&fetcher.data.topicId===topicId?fetcher.data:null;
  if(lifetime.current.invalidated)return null;
  return <div className="topic-move-control">
    <button type="button" disabled={fetcher.state!=="idle"} aria-expanded={opened}
      onClick={()=>{
        if(opened){setOpened(false);return;}
        setOpened(true);fetcher.load(url);
      }}>{t("topicMoveTitle")}</button>
    {opened?(valid?<TopicMoveForm key={JSON.stringify([actorId,topicId,valid.structureVersion,valid.locationVersion])}
      locale={locale} context={valid} onRefresh={()=>{
        fetcher.load(url);
      }}/>:<p role="status">{t("topicMoveLoading")}</p>):null}
  </div>;
}
