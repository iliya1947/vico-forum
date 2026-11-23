import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useFetcher, useMatches, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { forumTopicPath, forumSectionPath } from "./paths";
import type { TopicMoveContext, DestinationPage, StructureDestination } from "../../db/forum-structure-reader";
import type { StructureInlineError } from "../admin/structure-inline.server";
import type { TopicMoveActionResult } from "./topic-move.server";

type InlineContext=TopicMoveContext&{readId?:string};
type InlinePage=DestinationPage&{readId:string};
type InlineRead<T>=T|StructureInlineError;
const isReadError=(value:unknown):value is StructureInlineError=>
  Boolean(value&&typeof value==="object"&&"operation" in value&&value.operation==="structureInlineRead");
const readMessage=(error:StructureInlineError["error"])=>error==="unavailable"?"topicMoveUnconfirmed":
  error==="conflict"?"topicMoveConflict":error==="invalid"?"topicMoveInvalid":"topicMoveDenied";
type Attempt={actorId:string;topicId:string;sectionId:string;structureVersion:string;locationVersion:string;targetId:string};

/** One source-free Move form, used both inside an open topic and by the private direct route. */
export function TopicMoveForm({locale,context,onRefresh}:{
  locale:string;context:TopicMoveContext;onRefresh?:()=>void;
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const destinationFetcher=useFetcher<InlineRead<InlinePage>>();
  const moveFetcher=useFetcher<TopicMoveActionResult>();
  const revalidator=useRevalidator();
  const [query,setQuery]=useState("");
  const [searched,setSearched]=useState("");
  const [selected,setSelected]=useState("");
  const [retained,setRetained]=useState<StructureDestination|null>(null);
  const [items,setItems]=useState<StructureDestination[]>([]);
  const [next,setNext]=useState<string|null>(null);
  const [empty,setEmpty]=useState(false);
  const [appliedRead,setAppliedRead]=useState("");
  const [requestedRead,setRequestedRead]=useState("");
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [unknown,setUnknown]=useState(false);
  const [sawSubmission,setSawSubmission]=useState(false);
  const lastPage=useRef<unknown>(null);
  const seq=useRef(0);
  const pageMode=useRef<"replace"|"append">("replace");
  const destinationUrl=routing.admin.destinations(locale);
  const load=useCallback((search:string,mode:"replace"|"append",after?:string)=>{
    const readId=String(++seq.current);
    setRequestedRead(readId);
    pageMode.current=mode;
    if(mode==="replace"){setItems([]);setNext(null);setEmpty(false);setAppliedRead("");}
    const params=new URLSearchParams({kind:"sections",inlineMove:"1",readId});
    if(search)params.set("q",search);
    if(after)params.set("after",after);
    destinationFetcher.load(destinationUrl+"?"+params);
  },[destinationFetcher.load,destinationUrl]);
  // A fresh private snapshot is the only event that resets a stale/uncertain
  // submission. Never overwrite a pending POST with a newer expected version.
  useEffect(()=>{
    if(moveFetcher.state==="idle")moveFetcher.reset();
    setAttempt(null);setUnknown(false);setSawSubmission(false);
    load(searched,"replace");
    // The snapshot itself, rather than a numeric version, establishes freshness.
  },[context,load]);
  useEffect(()=>{
    const page=destinationFetcher.data;
    if(destinationFetcher.state!=="idle"||!page||page===lastPage.current
      ||page.readId!==requestedRead)return;
    lastPage.current=page;
    if(isReadError(page))return;
    if(page.actorId!==context.actorId)return;
    const received=page.items.filter(item=>Boolean(item.category));
    setItems(previous=>pageMode.current==="append"
      ?Array.from(new Map([...previous,...received].map(item=>[item.id,item])).values()):received);
    setAppliedRead(page.readId);
    setNext(page.next);
    setEmpty(page.total===0);
  },[destinationFetcher.state,destinationFetcher.data,requestedRead,context.actorId]);
  useEffect(()=>{
    if(moveFetcher.state==="submitting")setSawSubmission(true);
    if(moveFetcher.state==="idle"&&attempt&&sawSubmission&&!moveFetcher.data)setUnknown(true);
  },[moveFetcher.state,moveFetcher.data,attempt,sawSubmission]);
  const receipt=moveFetcher.state==="idle"&&attempt&&moveFetcher.data?.operation==="topicMove"
    ?moveFetcher.data:null;
  const stillSame=Boolean(attempt&&attempt.actorId===context.actorId
    &&attempt.topicId===context.topicId&&attempt.sectionId===context.currentSection.id
    &&attempt.structureVersion===context.structureVersion
    &&attempt.locationVersion===context.locationVersion);
  const success=Boolean(stillSame&&receipt&&"ok" in receipt&&receipt.ok
    &&receipt.actorId===attempt?.actorId&&receipt.topicId===attempt?.topicId
    &&receipt.currentSectionId===attempt?.targetId);
  const failure=stillSame&&receipt&&"error" in receipt?receipt.error:null;
  const page=destinationFetcher.state==="idle"&&destinationFetcher.data?.readId===requestedRead
    ?destinationFetcher.data:null;
  const pageError=isReadError(page)?page.error:null;
  const pageFresh=Boolean(page&&!isReadError(page)&&page.actorId===context.actorId
    &&page.structureVersion===context.structureVersion&&appliedRead===requestedRead);
  const denied=failure==="forbidden"||failure==="unauthenticated"||failure==="notFound";
  const uncertain=unknown||failure==="unavailable";
  const conflict=failure==="conflict";
  const invalid=failure==="invalid";
  const matchingViewer=Boolean(viewer&&viewer===context.actorId);
  const busy=destinationFetcher.state!=="idle"||moveFetcher.state!=="idle"||revalidator.state!=="idle";
  const valid=items.find(item=>item.id===selected)??null;
  // Retained labels are for display, not post-refresh authorization/selection.
  const shown=valid??(retained?.id===selected?retained:null);
  const blocked=Boolean(denied||uncertain||conflict||invalid||success||pageError||!pageFresh);
  const ready=Boolean(matchingViewer&&pageFresh&&valid&&!busy&&!blocked);
  const errorKey=pageError?readMessage(pageError):uncertain?"topicMoveUnconfirmed":
    conflict?"topicMoveConflict":denied?"topicMoveDenied":invalid?"topicMoveInvalid":null;
  const lifetime=useRef({snapshot:context,invalidated:false});
  if(lifetime.current.snapshot!==context)lifetime.current={snapshot:context,invalidated:false};
  if(!matchingViewer)lifetime.current.invalidated=true;
  if(lifetime.current.invalidated)return null;
  const refresh=()=>{
    if(moveFetcher.state!=="idle")return;
    if(onRefresh)onRefresh();
    else void revalidator.revalidate(); // private direct route reloads F4 guarded context
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    if(!ready){event.preventDefault();return;}
    setUnknown(false);
    setAttempt({actorId:context.actorId,topicId:context.topicId,
      sectionId:context.currentSection.id,structureVersion:context.structureVersion,
      locationVersion:context.locationVersion,targetId:selected});
  };
  return <div className="admin-forum-structure-form topic-move-form">
    <h3>{t("topicMoveTitle")}</h3>
    <p>{t("topicMoveCurrent")}: <bdi dir="auto">{context.currentSection.name} ({context.currentSection.id})</bdi></p>
    {!context.isHidden?<p><Link to={forumSectionPath(locale,context.currentSection.id)}>{t("topicMoveCurrent")}</Link></p>:null}
    <moveFetcher.Form method="post" action={forumTopicPath(locale,context.topicId)+"?moveAction=1"}
      aria-busy={busy} onSubmit={submit}>
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
          setSearched(query);load(query,"replace");
        }}>{t("topicMoveFind")}</button>
        <label>{t("topicMoveDestination")}
          <select name="targetSectionId" required dir="auto" value={selected}
            disabled={!pageFresh||busy||Boolean(pageError)}
            onChange={e=>{
              const value=e.currentTarget.value;
              setRetained(items.find(item=>item.id===value)??null);
              setSelected(value);
            }}>
            <option value="">{t("topicMoveDestination")}</option>
            {shown&&!items.some(item=>item.id===shown.id)
              ?<option value={shown.id}>{shown.name} ({shown.id}) — {shown.category?.name}</option>:null}
            {items.map(item=><option key={item.id} value={item.id}>
              {item.name} ({item.id}) — {item.category?.name}
            </option>)}
          </select>
        </label>
        {empty?<p>{t("topicMoveEmpty")}</p>:null}
        {next?<button type="button" disabled={busy} onClick={()=>{
          load(searched,"append",next);
        }}>{t("topicMoveMore")}</button>:null}
      </fieldset>
      <button type="submit" disabled={!ready}>{t(busy?"topicMoveLoading":"topicMoveSubmit")}</button>
    </moveFetcher.Form>
    {success?<p role="status">{t("topicMoveSaved")}</p>:null}
    {errorKey?<p role="alert">{t(errorKey)}</p>:null}
    {!pageFresh&&!pageError&&destinationFetcher.state==="idle"
      ?<p role="alert">{t("topicMoveConflict")}</p>:null}
    {blocked?<button type="button" disabled={busy} onClick={refresh}>
      {t("topicMoveRefresh")}
    </button>:null}
  </div>;
}

/** Inline GET/POST fetchers do not navigate away from mounted editors. */
export function TopicMoveControl({locale,topicId,actorId}:{locale:string;topicId:string;actorId:string;}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const loaderSnapshot=useMatches().at(-1)?.loaderData;
  const lifetime=useRef({snapshot:loaderSnapshot,invalidated:false});
  if(lifetime.current.snapshot!==loaderSnapshot)
    lifetime.current={snapshot:loaderSnapshot,invalidated:false};
  if(viewer!==actorId)lifetime.current.invalidated=true;
  const [opened,setOpened]=useState(false);
  const fetcher=useFetcher<InlineRead<InlineContext>>();
  const [readId,setReadId]=useState("");
  const seq=useRef(0);
  const url=routing.admin.topicMove(locale,topicId);
  const refresh=()=>{
    const id=String(++seq.current);
    setReadId(id);
    fetcher.load(url+"?"+new URLSearchParams({inlineMove:"1",readId:id}));
  };
  const result=fetcher.state==="idle"&&fetcher.data?.readId===readId?fetcher.data:null;
  const valid=result&&!isReadError(result)&&result.actorId===actorId&&result.topicId===topicId?result:null;
  const error=result&&isReadError(result)?result.error:null;
  if(lifetime.current.invalidated)return null;
  return <div className="topic-move-control">
    <button type="button" disabled={fetcher.state!=="idle"} aria-expanded={opened}
      onClick={()=>{
        if(opened){setOpened(false);return;}
        setOpened(true);refresh();
      }}>{t("topicMoveTitle")}</button>
    {opened?(valid?<TopicMoveForm key={JSON.stringify([actorId,topicId])}
      locale={locale} context={valid} onRefresh={refresh}/>:<>
        {error?<p role="alert">{t(readMessage(error))}</p>:<p role="status">{t("topicMoveLoading")}</p>}
        {error?<button type="button" onClick={refresh}>{t("topicMoveRefresh")}</button>:null}
      </>):null}
  </div>;
}
