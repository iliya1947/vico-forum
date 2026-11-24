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
  error==="invalid"?"topicMoveInvalid":"topicMoveDenied";
type Attempt={actorId:string;topicId:string;sectionId:string;structureVersion:string;locationVersion:string;targetId:string};

/** One source-free Move form, used both inside an open topic and by the private direct route. */
export function TopicMoveForm({locale,context,onRefresh,suspended=false}:{
  locale:string;context:TopicMoveContext;onRefresh?:()=>void;suspended?:boolean;
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const destinationFetcher=useFetcher<InlineRead<InlinePage>>();
  const moveFetcher=useFetcher<TopicMoveActionResult>();
  const revalidator=useRevalidator();
  const revalidatedReceipt=useRef<unknown>(null);
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
  useEffect(()=>{
    if(!success||!receipt||revalidatedReceipt.current===receipt)return;
    revalidatedReceipt.current=receipt;
    void revalidator.revalidate();
    onRefresh?.();
  },[success,receipt,revalidator,onRefresh]);
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
  const busy=suspended||destinationFetcher.state!=="idle"||moveFetcher.state!=="idle"||revalidator.state!=="idle";
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
    {/* Only a confirmed receipt above or explicit refresh may replace frozen expectations. */}
    <moveFetcher.Form defaultShouldRevalidate={false} method="post" action={forumTopicPath(locale,context.topicId)+"?moveAction=1"}
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

/** Accept one snapshot per deliberate read, never its background revalidation.
 * Fresh denials still invalidate private data immediately. */
function useMoveContext(locale:string,topicId:string,actorId:string,initial?:TopicMoveContext){
  const routing=useAdministrativeRouting();
  const fetcher=useFetcher<InlineRead<InlineContext>>();
  const [readId,setReadId]=useState("");
  const [accepted,setAccepted]=useState<{readId:string;context:TopicMoveContext}|null>(
    initial?{readId:"",context:initial}:null);
  const [error,setError]=useState<StructureInlineError["error"]|null>(null);
  const applied=useRef("");
  const seq=useRef(0);
  const url=routing.admin.topicMove(locale,topicId);
  const refresh=useCallback(()=>{
    const id=String(++seq.current);
    setReadId(id);
    void fetcher.load(url+"?"+new URLSearchParams({inlineMove:"1",readId:id}));
  },[fetcher.load,url]);
  const result=fetcher.state==="idle"&&fetcher.data?.readId===readId?fetcher.data:null;
  useEffect(()=>{
    if(!result)return;
    if(isReadError(result)){
      applied.current=readId;setError(result.error);setAccepted(null);return;
    }
    if(applied.current===readId)return;
    applied.current=readId;
    if(result.actorId===actorId&&result.topicId===topicId){
      setError(null);setAccepted({readId,context:result});
    }
  },[result,readId,actorId,topicId]);
  const valid=!error&&accepted?.context.actorId===actorId
    &&accepted.context.topicId===topicId?accepted.context:null;
  return {valid,error,refresh,pending:fetcher.state!=="idle"||accepted?.readId!==readId};
}

/** Direct entry keeps the same explicit-read fence as the inline control. */
export function TopicMoveDirectForm({locale,context}:{locale:string;context:TopicMoveContext}){
  const {t}=useTranslation("common");
  const {valid,error,pending,refresh}=useMoveContext(locale,context.topicId,context.actorId,context);
  return valid?<TopicMoveForm locale={locale} context={valid} suspended={pending} onRefresh={refresh}/>
    :<><p role="alert">{t(error?readMessage(error):"topicMoveLoading")}</p>
      <button type="button" disabled={pending&&!error} onClick={refresh}>{t("topicMoveRefresh")}</button></>;
}

/** Inline GET/POST fetchers do not navigate away from mounted editors. */
export function TopicMoveControl({locale,topicId,actorId}:{locale:string;topicId:string;actorId:string;}){
  const {t}=useTranslation("common");
  const viewer=useHeaderAuthUser()?.id??null;
  const loaderSnapshot=useMatches().at(-1)?.loaderData;
  const lifetime=useRef({snapshot:loaderSnapshot,invalidated:false});
  if(lifetime.current.snapshot!==loaderSnapshot)
    lifetime.current={snapshot:loaderSnapshot,invalidated:false};
  if(viewer!==actorId)lifetime.current.invalidated=true;
  const [opened,setOpened]=useState(false);
  const {valid,error,pending,refresh}=useMoveContext(locale,topicId,actorId);
  if(lifetime.current.invalidated)return null;
  return <div className="topic-move-control">
    <button type="button" disabled={pending&&opened&&!error} aria-expanded={opened}
      onClick={()=>{
        if(opened){setOpened(false);return;}
        setOpened(true);refresh();
      }}>{t("topicMoveTitle")}</button>
    {opened?(valid?<><TopicMoveForm key={JSON.stringify([actorId,topicId])}
      locale={locale} context={valid} suspended={pending} onRefresh={refresh}/>
      {pending?<p role="status">{t("topicMoveLoading")}</p>:null}
    </>:<>
      {error?<p role="alert">{t(readMessage(error))}</p>:<p role="status">{t("topicMoveLoading")}</p>}
      {error?<button type="button" onClick={refresh}>{t("topicMoveRefresh")}</button>:null}
    </>):null}
  </div>;
}
