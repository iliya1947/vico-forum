import type {ReactNode} from "react";
import {Form} from "react-router";
import {useTranslation} from "react-i18next";
import type {ForumTopicPage} from "../../db/forum-repository";
import type {UiKey} from "../localization/catalog";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {forumTopicPath} from "../forum/paths";

export interface TopicQuickActionInput {
  topic:ForumTopicPage;
  canManagePin:boolean;
  canManageAnySolution:boolean;
  canManageHelpDuplicate:boolean;
  canCorrectAnySourceLocale:boolean;
  canModerateHelpSolution:boolean;
  pendingDuplicateAppeal?:{id:string}|null;
}
type TopicIntent = "pinTopic" | "unpinTopic" | "markSolved" | "selectBestAnswer" | "removeHelpDuplicate" | "acceptHelpDuplicateAppeal" | "rejectHelpDuplicateAppeal" | "confirmHelpDuplicate" | "correctTitleSourceLocale" | "markSolutionNeedsReview" | "markSolutionOutdated" | "clearSolutionModeration";
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
  const add=(intent:TopicIntent,label:UiKey<"common">,fields:Record<string,string>={})=>actions.push({key:intent,intent,label,fields});
  if(input.canManagePin)add(topic.isPinned?"unpinTopic":"pinTopic",topic.isPinned?"unpinTopic":"pinTopic");
  if(input.canManageAnySolution&&!topic.isSolved&&!topic.duplicateOf)add("markSolved","markSolved");
  if(input.canManageAnySolution&&!topic.duplicateOf)topic.posts.slice(1).forEach((post,index)=>{
    if(post.id!==topic.bestAnswerPostId)actions.push({key:`selectBestAnswer:${post.id}`,intent:"selectBestAnswer",label:"postNumber",fields:{postId:post.id},postNumber:index+2});
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
export function TopicQuickActions({locale,...input}:TopicQuickActionInput&{locale:string}){
  const {t}=useTranslation("common");
  const {topic}=input;
  const actions=topicQuickActionDescriptors(input);
  const best=topic.posts.find(p=>p.id===topic.bestAnswerPostId);
  if(!actions.length)return null;
  return <QuickActions>{actions.map(action=><Form key={action.intent==="markSolutionOutdated"?[action.key,best?.id,best?.solutionModerationStatus,best?.solutionOutdatedReason].join("\u0000"):action.key}
    method="post" action={forumTopicPath(locale,topic.id)} className={`topic-admin-form ${action.intent==="pinTopic"||action.intent==="unpinTopic"?"pin-topic-form":""} ${action.intent==="correctTitleSourceLocale"?"source-locale-form":""}`}>
    <input type="hidden" name="intent" value={action.intent}/>
    {Object.entries(action.fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
    {action.intent==="selectBestAnswer"?<span>{t("selectBestAnswer")}: </span>:null}
    {action.intent==="confirmHelpDuplicate"?<label>{t("helpDuplicateOriginalIdLabel")}<input name="originalTopicId" required autoComplete="off"/></label>:null}
    {action.intent==="correctTitleSourceLocale"?<>
      <p>{t("sourceLocaleCurrent",{locale:topic.title.sourceLocale})}</p>
      <label>{t("sourceLocaleCorrectionInput")}<input name="sourceLocale" required defaultValue={topic.title.sourceLocale==="und"?"":topic.title.sourceLocale} autoComplete="off"/></label>
    </>:null}
    {action.intent==="markSolutionOutdated"?<label>{t("helpSolutionOutdatedReasonInput")}<textarea name="outdatedReason" required maxLength={1000} rows={3} defaultValue={best?.solutionOutdatedReason??""}/></label>:null}
    <button type="submit">{t(action.label,action.postNumber?{number:action.postNumber}:{})}</button>
  </Form>)}</QuickActions>;
}
