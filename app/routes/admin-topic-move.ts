import { data, useLoaderData, useParams, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { forumStructureReaderContext, requireStructureRead, structureQuery, structureReadError } from "../admin/structure.server";
import { structureIdentity } from "../../db/structure-browse";
import { adminPrivateHeaders } from "../admin/forum.server";
import { ForumShell, ForumRouteError } from "../forum/ui";
import { TopicMoveForm } from "../forum/topic-move-control";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { Link } from "react-router";
import { forumTopicPath } from "../forum/paths";
import { hiddenInspectionPath } from "../admin/visibility-queue-path";
import { useAdministrativeRouting } from "../administrative-routing/provider";

export function headers(){return adminPrivateHeaders;}
export async function loader({request,params,context}:{
  request:Request;params:{topicId?:string};context:RouterContextProvider;
}){
  const actorId=await requireStructureRead(context,true);
  try {
    structureQuery(request.url,true);
    const result=await context.get(forumStructureReaderContext).readMoveContext(actorId,structureIdentity(params.topicId));
    if(!result)throw new Response("Not found",{status:404,headers:adminPrivateHeaders});
    return data(result,{headers:adminPrivateHeaders});
  }catch(error){return structureReadError(error);}
}

/** Direct/hidden entry renders only F4 private location metadata, never public topic source. */
export default function TopicMoveRoute(){
  const context=useLoaderData<typeof loader>();
  const locale=useParams().locale??"en";
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  if(viewer!==context.actorId)return null;
  return <ForumShell locale={locale} variant="admin">
    <section className="admin-forum topic-move-private">
      <h1>{t("topicMoveTitle")}</h1>
      <p><Link to={context.isHidden
        ?hiddenInspectionPath(locale,{kind:"topic",topicId:context.topicId},routing)
        :forumTopicPath(locale,context.topicId)}>{t("topicMoveCurrent")}</Link></p>
      <TopicMoveForm key={JSON.stringify([context.actorId,context.topicId,context.structureVersion,context.locationVersion])}
        locale={locale} context={context}/>
    </section>
  </ForumShell>;
}
export const ErrorBoundary=ForumRouteError;
