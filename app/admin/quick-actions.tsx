import {useEffect,useRef,type ReactNode} from "react";
import {Form,useFetcher,useRevalidator} from "react-router";
import {useTranslation} from "react-i18next";
import type {ForumTopicPage} from "../../db/forum-repository";
import {useHeaderAuthUser} from "../auth/auth-controls";
type QuickTopic=Pick<ForumTopicPage,"id"|"isPinned"|"isSolved"|"isClosed"|"closureVersion"|"duplicateRelationshipId"|"bestAnswerPostId"|"title"> & {
  duplicateOf:{id:string;title?:string}|null;
  section:Pick<ForumTopicPage["section"],"id">;
  posts:Array<Pick<ForumTopicPage["posts"][number],"id"|"solutionModerationStatus"|"solutionOutdatedReason">>;
};
import type {UiKey} from "../localization/catalog";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {forumTopicPath} from "../forum/paths";

export interface TopicQuickActionInput {
  topic:QuickTopic;
  postCandidates?:ReadonlyArray<{id:string;number:number}>;
  canManagePin:boolean;
  canManageClosure?:boolean;
  actorId?:string|null;
  canManageAnySolution:boolean;
  canManageHelpDuplicate:boolean;
  canCorrectAnySourceLocale:boolean;
  canModerateHelpSolution:boolean;
  pendingDuplicateAppeal?:{id:string}|null;
}
type TopicIntent = "closeTopic" | "reopenTopic" | "pinTopic" | "unpinTopic" | "markSolved" | "selectBestAnswer" | "removeHelpDuplicate" | "acceptHelpDuplicateAppeal" | "rejectHelpDuplicateAppeal" | "confirmHelpDuplicate" | "correctTitleSourceLocale" | "markSolutionNeedsReview" | "markSolutionOutdated" | "clearSolutionModeration";
export interface TopicQuickActionDescriptor {
  key:string;
  intent:TopicIntent;
  label:UiKey<"common">;
  fields:Readonly<Record<string,string>>;
  postNumber?:number;
}
/** Presentation only: consumes server-resolved capabilities and current object state. */
export function topicQuickActionDescriptors(input:TopicQuickActionInput):TopicQuickActionDescriptor[]{
  const {topic,pendingDuplicateAppeal}=input;
  const actions:TopicQuickActionDescriptor[]=[];
  const add=(intent:TopicIntent,label:UiKey<"common">,fields:Record<string,string>={})=>actions.push({key:intent,intent,label,fields:{...(intent==="markSolved"||intent==="correctTitleSourceLocale"?{operationScope:"any"}:{}),...fields}});
  if(input.canManagePin)add(topic.isPinned?"unpinTopic":"pinTopic",topic.isPinned?"unpinTopic":"pinTopic");
  if(input.canManageClosure&&input.actorId){
    add(topic.isClosed?"reopenTopic":"closeTopic",topic.isClosed?"topicReopen":"topicClose",{
      expectedClosureVersion:String(topic.closureVersion),editorActorId:input.actorId,
    });
  }
  if(input.canManageAnySolution&&!topic.isSolved&&!topic.duplicateOf)add("markSolved","markSolved");
  if(input.canManageAnySolution&&!topic.duplicateOf)(input.postCandidates??topic.posts.slice(1).map((post,index)=>({id:post.id,number:index+2}))).forEach(post=>{
    if(post.id!==topic.bestAnswerPostId&&post.number>1)actions.push({key:`selectBestAnswer:${post.id}`,intent:"selectBestAnswer",label:"postNumber",fields:{postId:post.id,operationScope:"any"},postNumber:post.number});
  });
  if(input.canManageHelpDuplicate&&topic.section.id===HELP_SOLUTIONS_SERVICE_SECTION_ID){
    if(topic.duplicateOf){
      add("removeHelpDuplicate","helpDuplicateRemove",{expectedRelationshipId:topic.duplicateRelationshipId??""});
      if(pendingDuplicateAppeal){
        add("acceptHelpDuplicateAppeal","helpDuplicateAppealAccept",{expectedAppealId:pendingDuplicateAppeal.id});
        add("rejectHelpDuplicateAppeal","helpDuplicateAppealReject",{expectedAppealId:pendingDuplicateAppeal.id});
      }
    }else if(!topic.isSolved&&!topic.bestAnswerPostId)add("confirmHelpDuplicate","helpDuplicateConfirm");
  }
  if(input.canCorrectAnySourceLocale)add("correctTitleSourceLocale","sourceLocaleCorrectionSubmit",{expectedRevisionId:topic.title.id});
  const best=topic.posts.find(p=>p.id===topic.bestAnswerPostId);
  if(input.canModerateHelpSolution&&topic.section.id===HELP_SOLUTIONS_SERVICE_SECTION_ID&&topic.isSolved&&best){
    const fields={expectedBestAnswerPostId:topic.bestAnswerPostId??""};
    if(best?.solutionModerationStatus!=="needs-review")add("markSolutionNeedsReview","helpSolutionMarkNeedsReview",fields);
    add("markSolutionOutdated","helpSolutionMarkOutdated",fields);
    if(best?.solutionModerationStatus)add("clearSolutionModeration","helpSolutionClearModeration",fields);
  }
  return actions;
}

export function QuickActions({children}: {children:ReactNode}){
  const {t}=useTranslation("common");
  return <details className="topic-admin-tools"><summary>{t("quickActions")}</summary><div className="topic-admin-panel">{children}</div></details>;
}

/** All consumers submit existing intents to the canonical topic endpoint, never an admin-only API. */

function TopicQuickActionForm({locale,topic,action,best,inline}:{locale:string;topic:QuickTopic;
 action:TopicQuickActionDescriptor;best:QuickTopic["posts"][number]|undefined;inline:boolean}){
 const {t}=useTranslation("common");
 const fetcher=useFetcher<{ok?:boolean;error?:string}>();
 const FormComponent=inline?fetcher.Form:Form;
 return <div>
  <FormComponent method="post" action={forumTopicPath(locale,topic.id)}
    className={`topic-admin-form ${action.intent==="pinTopic"||action.intent==="unpinTopic"?"pin-topic-form":""} ${action.intent==="correctTitleSourceLocale"?"source-locale-form":""}`}>
   <input type="hidden" name="intent" value={action.intent}/>
   {inline?<input type="hidden" name="inlineQuickAction" value="1"/>:null}
   {Object.entries(action.fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
   {action.intent==="selectBestAnswer"?<span>{t("selectBestAnswer")}: </span>:null}
   {action.intent==="confirmHelpDuplicate"?<label>{t("helpDuplicateOriginalIdLabel")}<input name="originalTopicId" required autoComplete="off"/></label>:null}
   {action.intent==="correctTitleSourceLocale"?<>
     <p>{t("sourceLocaleCurrent",{locale:topic.title.sourceLocale})}</p>
     <label>{t("sourceLocaleCorrectionInput")}<input name="sourceLocale" required defaultValue={topic.title.sourceLocale==="und"?"":topic.title.sourceLocale} autoComplete="off"/></label>
   </>:null}
   {action.intent==="markSolutionOutdated"?<label>{t("helpSolutionOutdatedReasonInput")}<textarea name="outdatedReason" required maxLength={1000} rows={3} defaultValue={best?.solutionOutdatedReason??""}/></label>:null}
   <button type="submit" disabled={inline&&fetcher.state!=="idle"}>{t(action.label,action.postNumber?{number:action.postNumber}:{})}</button>
  </FormComponent>
  {inline&&fetcher.data?.ok?<p role="status">{t("complaintReviewActionSaved")}</p>:null}
  {inline&&fetcher.data?.error?<p role="alert">{t("complaintReviewActionFailed")}</p>:null}
 </div>;
}
type ClosureResponse={ok?:boolean;error?:string};

/** Closure fetchers have their own actor/topic/grant/version lifetime; 409 and denial refresh once. */
function TopicClosureQuickActionForm({locale,topic,action}:{
 locale:string;topic:QuickTopic;action:TopicQuickActionDescriptor;
}){
 const {t}=useTranslation("common");
 const fetcher=useFetcher<ClosureResponse>();
 const revalidator=useRevalidator();
 const refreshed=useRef<unknown>(null);
 useEffect(()=>{
  if(fetcher.state!=="idle"||!fetcher.data?.error||refreshed.current===fetcher.data)return;
  if(!["conflict","forbidden","unauthenticated"].includes(fetcher.data.error))return;
  refreshed.current=fetcher.data;
  void revalidator.revalidate();
 },[fetcher.state,fetcher.data,revalidator]);
 const errorKey=fetcher.data?.error==="conflict"?"topicClosureConflict"
  :fetcher.data?.error==="forbidden"||fetcher.data?.error==="unauthenticated"?"topicClosureDenied"
  :"topicClosureFailed";
 return <div>
  <fetcher.Form method="post" action={forumTopicPath(locale,topic.id)}
   className="topic-admin-form topic-closure-form" aria-busy={fetcher.state!=="idle"}>
   <input type="hidden" name="intent" value={action.intent}/>
   <input type="hidden" name="inlineQuickAction" value="1"/>
   {Object.entries(action.fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
   <button type="submit" disabled={fetcher.state!=="idle"}>{t(action.label)}</button>
  </fetcher.Form>
  {fetcher.state==="idle"&&fetcher.data?.ok?<p role="status">{t("topicClosureSaved")}</p>:null}
  {fetcher.state==="idle"&&fetcher.data?.error?<p role="alert">{t(errorKey)}</p>:null}
 </div>;
}

/** All forms retain the existing canonical topic action; closure uses an isolated inline fetcher. */
export function TopicQuickActions({locale,inline=false,...input}:TopicQuickActionInput&{locale:string;inline?:boolean}){
 const headerActorId=useHeaderAuthUser()?.id??null;
 if(input.actorId&&input.actorId!==headerActorId)return null;
 const actorId=input.actorId??headerActorId;
 const {topic}=input;
 const actions=topicQuickActionDescriptors({...input,actorId});
 const best=topic.posts.find(p=>p.id===topic.bestAnswerPostId);
 if(!actions.length)return null;
 return <QuickActions>{actions.map(action=>
  action.intent==="closeTopic"||action.intent==="reopenTopic"
   ? <TopicClosureQuickActionForm
      key={JSON.stringify([locale,topic.id,actorId,input.canManageClosure,topic.closureVersion])}
      locale={locale} topic={topic} action={action}/>
   : <TopicQuickActionForm
      key={action.intent==="markSolutionOutdated"?[action.key,best?.id,best?.solutionModerationStatus,best?.solutionOutdatedReason].join("\u0000"):action.key}
      locale={locale} topic={topic} action={action} best={best} inline={inline}/>
 )}</QuickActions>;
}
