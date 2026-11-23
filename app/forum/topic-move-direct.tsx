import { Link, useLoaderData, useParams } from "react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ForumShell } from "./ui";
import { TopicMoveForm } from "./topic-move-control";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { forumTopicPath } from "./paths";
import { hiddenInspectionPath } from "../admin/visibility-queue-path";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import type { loader } from "../routes/admin-topic-move";

/** Direct/hidden entry renders only F4 private location metadata, never public topic source. */
export default function TopicMoveRoute(){
  const context=useLoaderData<typeof loader>();
  const locale=useParams().locale??"en";
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const viewer=useHeaderAuthUser()?.id??null;
  const lifetime=useRef({snapshot:context,invalidated:false});
  if(lifetime.current.snapshot!==context)lifetime.current={snapshot:context,invalidated:false};
  if(viewer!==context.actorId)lifetime.current.invalidated=true;
  if(lifetime.current.invalidated || "operation" in context)return null;
  return <ForumShell locale={locale} variant="admin">
    <section className="admin-forum topic-move-private">
      <h1>{t("topicMoveTitle")}</h1>
      <p><Link to={context.isHidden
        ?hiddenInspectionPath(locale,{kind:"topic",topicId:context.topicId},routing)
        :forumTopicPath(locale,context.topicId)}>{t("topicMoveCurrent")}</Link></p>
      <TopicMoveForm key={JSON.stringify([context.actorId,context.topicId])}
        locale={locale} context={context}/>
    </section>
  </ForumShell>;
}
