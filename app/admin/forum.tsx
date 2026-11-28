import { useAdministrativeRouting } from "../administrative-routing/provider";
import {Form,Link,useFetcher,useRevalidator,isRouteErrorResponse,useRouteError,useLocation,useParams} from "react-router";
import {useEffect,useRef,useState} from "react";
import type {CategoryCreateResult} from "./structure-actions.server";
import {ForumRouteError} from "../forum/ui";
import {useTranslation} from "react-i18next";
import type {AdminBrowseQuery,AdminBrowsePage,AdminStructurePage,AdminForumCategory,AdminForumSection,AdminForumTopic} from "../../db/admin-forum";
import {HELP_SOLUTIONS_CATEGORY_ID} from "../../db/forum-identifiers";
import {forumCategoryPath,forumSectionPath} from "../forum/paths";
import {AdminShell} from "./shell";
import type {AdminAccess} from "./access";
import {adminForumPath,adminCategoryPath,adminSectionPath,adminTopicPath,adminBrowsePath} from "./forum-paths";
import {hiddenQueuePath} from "./visibility-queue-path";
import {StructureChangeForm} from "./structure-forms";

function Counts({locale,category,section}:{locale:string;category?:AdminForumCategory;section?:AdminForumSection}) {
  const {t}=useTranslation("common");const number=new Intl.NumberFormat(locale);
  return <dl className="admin-forum-counts">
    {category?<div><dt>{t("adminForumSectionCount")}</dt><dd>{number.format(category.sectionCount)}</dd></div>:null}
    <div><dt>{t("adminTopicCount")}</dt><dd>{number.format((category??section)!.topicCount)}</dd></div>
    <div><dt>{t("adminPostCount")}</dt><dd>{number.format((category??section)!.postCount)}</dd></div>
  </dl>;
}
function BrowseControls({path,query,page,locale}:{path:string;query:AdminBrowseQuery;page:AdminBrowsePage<unknown>;locale:string}) {
  const {t}=useTranslation("common");
  return <>
    <Form method="get" action={path} className="admin-forum-search">
      <label htmlFor="admin-forum-query">{t("adminForumSearch")}</label>
      <div><input id="admin-forum-query" type="search" name="q" defaultValue={query.search} key={query.search} maxLength={400}/><button type="submit">{t("adminForumSearchSubmit")}</button></div>
    </Form>
    <p>{t("adminForumMatches")}: {new Intl.NumberFormat(locale).format(page.total)}</p>
  </>;
}
function Paging({path,query,next}:{path:string;query:AdminBrowseQuery;next:string|null}) {
  const {t}=useTranslation("common");
  return <nav className="admin-forum-paging" aria-label={t("adminForumPaging")}>
    {query.after?<Link to={adminBrowsePath(path,{search:query.search})}>{t("adminForumFirst")}</Link>:null}
    {next?<Link to={adminBrowsePath(path,{search:query.search,after:next})}>{t("adminForumNext")}</Link>:null}
  </nav>;
}
function SectionRows({locale,items}:{locale:string;items:AdminForumSection[]}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  return <ul className="admin-forum-objects">{items.map(section=><li key={section.id}>
    <h4><Link to={adminSectionPath(locale,section.id,routing)}><bdi>{section.name}</bdi></Link></h4>
    {section.service?<span className="admin-forum-reserved">{t("adminForumServiceSection")}</span>:null}
    <Counts locale={locale} section={section}/>
  </li>)}</ul>;
}
function CreateCategoryForm({actorId,version,path}:{actorId:string;version:string;path:string}){
  const {t}=useTranslation("common");
  const fetcher=useFetcher<CategoryCreateResult>();
  const revalidator=useRevalidator();
  const [name,setName]=useState("");
  const [attempted,setAttempted]=useState(false);
  const acknowledged=useRef<unknown>(null);
  const response=fetcher.state==="idle"&&fetcher.data?.operation==="createCategory"?fetcher.data:null;
  const success=Boolean(response&&"ok" in response&&response.ok&&response.actorId===actorId);
  const acknowledgedResponse=Boolean(response&&("error" in response||success));
  const unknown=attempted&&fetcher.state==="idle"&&!acknowledgedResponse;
  useEffect(()=>{
    if(!response||acknowledged.current===response)return;
    acknowledged.current=response;
    if("ok" in response&&response.ok&&response.actorId===actorId){
      setName("");setAttempted(false);
      void revalidator.revalidate();
    }
  },[response,actorId,revalidator]);
  const blocked=unknown||response&&"error" in response&&["conflict","unavailable","unauthenticated","forbidden"].includes(response.error);
  const busy=fetcher.state!=="idle"||revalidator.state!=="idle";
  const error=response&&"error" in response?response.error:null;
  const errorKey=unknown||error==="unavailable"?"structureActionUnconfirmed":error==="conflict"?"structureActionConflict"
    :error==="forbidden"||error==="unauthenticated"?"structureActionDenied"
    :"structureActionInvalid";
  return <div className="admin-forum-search">
    {/* A missing receipt keeps the attempt fenced until explicit verification. */}
    <fetcher.Form defaultShouldRevalidate={false} method="post" action={path} aria-busy={busy}
      onSubmit={event=>{
        if(busy||blocked||!name.trim()){event.preventDefault();return;}
        setAttempted(true);
      }}>
      <input type="hidden" name="intent" value="createCategory"/>
      <input type="hidden" name="editorActorId" value={actorId}/>
      <input type="hidden" name="expectedStructureVersion" value={version}/>
      <label>{t("structureCategoryName")}
        <input name="name" autoComplete="off" required maxLength={400} value={name}
          onChange={event=>setName(event.currentTarget.value)} dir="auto"/>
      </label>
      <button type="submit" disabled={busy||!!blocked||!name.trim()}>{t(busy?"structureActionPending":"structureCreateCategory")}</button>
    </fetcher.Form>
    {response&&"ok" in response&&response.ok&&response.actorId===actorId
      ?<p role="status">{t("structureActionSaved")}</p>:null}
    {unknown||error?<p role="alert">{t(errorKey)}</p>:null}
    {blocked?<button type="button" disabled={busy} onClick={()=>{
      fetcher.reset();setAttempted(false);
      void revalidator.revalidate();
    }}>{t("structureActionReload")}</button>:null}
  </div>;
}
export function AdminForumView({locale,access,page,query}:{locale:string;access:AdminAccess;page:AdminStructurePage<AdminForumCategory>;query:AdminBrowseQuery}) {
  const {t}=useTranslation("common");const routing = useAdministrativeRouting();const path=adminForumPath(locale,routing);
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-forum-heading"><h2 id="admin-forum-heading">{t("adminForum")}</h2>
      {access.canManageVisibility
        ? <p><Link to={hiddenQueuePath(locale,"topic",undefined,routing)}>{t("adminHiddenQueueTitle")}</Link></p>
        : null}
      <h3>{t("adminForumCategories")}</h3>
      {access.canManageStructure&&access.actorId?<CreateCategoryForm key={access.actorId} actorId={access.actorId} version={page.structureVersion} path={path}/>:null}
      <BrowseControls path={path} query={query} page={page} locale={locale}/>
      {page.items.length?<ul className="admin-forum-objects">{page.items.map(category=><li key={category.id}>
        <h4><Link to={adminCategoryPath(locale,category.id,routing)}><bdi>{category.name}</bdi></Link></h4>
        {category.reserved?<span className="admin-forum-reserved">{t("adminForumReservedCategory")}</span>:null}
        <Counts locale={locale} category={category}/>
      </li>)}</ul>:<p>{t("adminForumEmpty")}</p>}
      <Paging path={path} query={query} next={page.next}/>
    </section>
  </AdminShell>;
}
export function AdminCategoryView({locale,access,category,sections,query,structureVersion}:{locale:string;access:AdminAccess;category:AdminForumCategory;sections:AdminBrowsePage<AdminForumSection>;query:AdminBrowseQuery;structureVersion:string}) {
  const {t}=useTranslation("common");const routing = useAdministrativeRouting();const path=adminCategoryPath(locale,category.id,routing);
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-category-heading">
      <nav className="admin-forum-trail" aria-label={t("adminForumLocation")}><Link to={adminForumPath(locale,routing)}>{t("adminForum")}</Link><span aria-current="page"><bdi>{category.name}</bdi></span></nav>
      <h2 id="admin-category-heading"><bdi>{category.name}</bdi></h2>
      {category.reserved?<p className="admin-forum-reserved">{t("adminForumReservedCategory")}</p>:null}
      <Counts locale={locale} category={category}/>
      <Link to={forumCategoryPath(locale,category.id)}>{t("adminForumPublicCategory")}</Link>
      {access.canManageStructure&&access.actorId&&!category.reserved?<div className="admin-forum-structure-actions">
        <StructureChangeForm key={access.actorId+category.id+"renameCategory"} locale={locale} path={path}
          actorId={access.actorId} targetId={category.id} version={structureVersion}
          initialName={category.name} operation="renameCategory"/>
        <StructureChangeForm key={access.actorId+category.id+"reorderCategory"} locale={locale} path={path}
          actorId={access.actorId} targetId={category.id} version={structureVersion} operation="reorderCategory"/>
        <StructureChangeForm key={access.actorId+category.id+"createSection"} locale={locale} path={path}
          actorId={access.actorId} targetId={category.id} version={structureVersion} operation="createSection"/>
      </div>:null}
      <h3>{t("adminForumSections")}</h3><BrowseControls path={path} query={query} page={sections} locale={locale}/>
      {sections.items.length?<SectionRows locale={locale} items={sections.items}/>:<p>{t("adminForumEmpty")}</p>}
      <Paging path={path} query={query} next={sections.next}/>
    </section>
  </AdminShell>;
}
export function AdminSectionView({locale,access,section,topics,query,structureVersion}:{locale:string;access:AdminAccess;section:AdminForumSection;topics:AdminBrowsePage<AdminForumTopic>;query:AdminBrowseQuery;structureVersion:string}) {
  const {t}=useTranslation("common");const routing = useAdministrativeRouting();const path=adminSectionPath(locale,section.id,routing);
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-section-heading">
      <nav className="admin-forum-trail" aria-label={t("adminForumLocation")}>
        <Link to={adminForumPath(locale,routing)}>{t("adminForum")}</Link>
        <Link to={adminCategoryPath(locale,section.category.id,routing)}><bdi>{section.category.name}</bdi></Link>
        <span aria-current="page"><bdi>{section.name}</bdi></span>
      </nav>
      <h2 id="admin-section-heading"><bdi>{section.name}</bdi></h2>
      {section.service?<p className="admin-forum-reserved">{t("adminForumServiceSection")}</p>:null}
      <Counts locale={locale} section={section}/>
      {access.canManageStructure&&access.actorId&&!section.service?<div className="admin-forum-structure-actions">
        <StructureChangeForm key={access.actorId+section.id+"renameSection"} locale={locale} path={path}
          actorId={access.actorId} targetId={section.id} version={structureVersion}
          initialName={section.name} operation="renameSection"/>
        <StructureChangeForm key={access.actorId+section.id+"reorderSection"} locale={locale} path={path}
          actorId={access.actorId} targetId={section.id} version={structureVersion} operation="reorderSection"/>
        <StructureChangeForm key={access.actorId+section.id+"moveSection"} locale={locale} path={path}
          actorId={access.actorId} targetId={section.id} version={structureVersion}
          currentCategoryId={section.category.id} operation="moveSection"/>
      </div>:null}
      <Link to={section.service?forumCategoryPath(locale,HELP_SOLUTIONS_CATEGORY_ID):forumSectionPath(locale,section.id)}>
        {t(section.service?"adminForumPublicCategory":"adminForumPublicSection")}
      </Link>
      <h3>{t("topicsHeading")}</h3>
      <BrowseControls path={path} query={query} page={topics} locale={locale}/>
      {topics.items.length?<ul className="admin-forum-objects">{topics.items.map(topic=><li key={topic.id}>
        <h4><Link to={adminTopicPath(locale,topic.id,routing)}><bdi lang={topic.sourceLocale==="und"?undefined:topic.sourceLocale} dir="auto">{topic.title}</bdi></Link></h4>
        <dl className="admin-forum-counts"><div><dt>{t("adminPostCount")}</dt><dd>{new Intl.NumberFormat(locale).format(topic.postCount)}</dd></div></dl>
      </li>)}</ul>:<p>{t("adminForumEmpty")}</p>}
      <Paging path={path} query={query} next={topics.next}/>
    </section>
  </AdminShell>;
}

/** Old/malformed container cursors can be discarded without losing the literal filter. */
export function AdminForumBrowseError() {
  const error=useRouteError(),location=useLocation(),params=useParams();
  const {t}=useTranslation("common"),routing=useAdministrativeRouting();
  const query=new URLSearchParams(location.search),search=(query.get("q")??"").trim();
  const locale=params.locale??"en";
  const path=params.categoryId?adminCategoryPath(locale,params.categoryId,routing):adminForumPath(locale,routing);
  const recovery=isRouteErrorResponse(error)&&error.status===400&&query.has("after")
    ? <Link className="system-state-action" to={adminBrowsePath(path,{search:Array.from(search).length<=200&&!/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(search)?search:""})}>{t("adminForumFirst")}</Link>
    : undefined;
  return <ForumRouteError recoveryAction={recovery}/>;
}
