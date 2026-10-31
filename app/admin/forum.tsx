import {Form,Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {AdminBrowseQuery,AdminBrowsePage,AdminForumCategory,AdminForumSection} from "../../db/admin-forum";
import {HELP_SOLUTIONS_CATEGORY_ID} from "../../db/forum-identifiers";
import {forumCategoryPath,forumSectionPath} from "../forum/paths";
import {AdminShell} from "./shell";
import type {AdminAccess} from "./access";
import {adminForumPath,adminCategoryPath,adminSectionPath,adminBrowsePath} from "./forum-paths";

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
  return <ul className="admin-forum-objects">{items.map(section=><li key={section.id}>
    <h4><Link to={adminSectionPath(locale,section.id)}><bdi>{section.name}</bdi></Link></h4>
    {section.service?<span className="admin-forum-reserved">{t("adminForumServiceSection")}</span>:null}
    <Counts locale={locale} section={section}/>
  </li>)}</ul>;
}
export function AdminForumView({locale,access,page,query}:{locale:string;access:AdminAccess;page:AdminBrowsePage<AdminForumCategory>;query:AdminBrowseQuery}) {
  const {t}=useTranslation("common");const path=adminForumPath(locale);
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-forum-heading"><h2 id="admin-forum-heading">{t("adminForum")}</h2>
      <h3>{t("adminForumCategories")}</h3><BrowseControls path={path} query={query} page={page} locale={locale}/>
      {page.items.length?<ul className="admin-forum-objects">{page.items.map(category=><li key={category.id}>
        <h4><Link to={adminCategoryPath(locale,category.id)}><bdi>{category.name}</bdi></Link></h4>
        {category.reserved?<span className="admin-forum-reserved">{t("adminForumReservedCategory")}</span>:null}
        <Counts locale={locale} category={category}/>
      </li>)}</ul>:<p>{t("adminForumEmpty")}</p>}
      <Paging path={path} query={query} next={page.next}/>
    </section>
  </AdminShell>;
}
export function AdminCategoryView({locale,access,category,sections,query}:{locale:string;access:AdminAccess;category:AdminForumCategory;sections:AdminBrowsePage<AdminForumSection>;query:AdminBrowseQuery}) {
  const {t}=useTranslation("common");const path=adminCategoryPath(locale,category.id);
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-category-heading">
      <nav className="admin-forum-trail" aria-label={t("adminForumLocation")}><Link to={adminForumPath(locale)}>{t("adminForum")}</Link><span aria-current="page"><bdi>{category.name}</bdi></span></nav>
      <h2 id="admin-category-heading"><bdi>{category.name}</bdi></h2>
      {category.reserved?<p className="admin-forum-reserved">{t("adminForumReservedCategory")}</p>:null}
      <Counts locale={locale} category={category}/>
      <Link to={forumCategoryPath(locale,category.id)}>{t("adminForumPublicCategory")}</Link>
      <h3>{t("adminForumSections")}</h3><BrowseControls path={path} query={query} page={sections} locale={locale}/>
      {sections.items.length?<SectionRows locale={locale} items={sections.items}/>:<p>{t("adminForumEmpty")}</p>}
      <Paging path={path} query={query} next={sections.next}/>
    </section>
  </AdminShell>;
}
export function AdminSectionView({locale,access,section}:{locale:string;access:AdminAccess;section:AdminForumSection}) {
  const {t}=useTranslation("common");
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-section-heading">
      <nav className="admin-forum-trail" aria-label={t("adminForumLocation")}>
        <Link to={adminForumPath(locale)}>{t("adminForum")}</Link>
        <Link to={adminCategoryPath(locale,section.category.id)}><bdi>{section.category.name}</bdi></Link>
        <span aria-current="page"><bdi>{section.name}</bdi></span>
      </nav>
      <h2 id="admin-section-heading"><bdi>{section.name}</bdi></h2>
      {section.service?<p className="admin-forum-reserved">{t("adminForumServiceSection")}</p>:null}
      <Counts locale={locale} section={section}/>
      <Link to={section.service?forumCategoryPath(locale,HELP_SOLUTIONS_CATEGORY_ID):forumSectionPath(locale,section.id)}>
        {t(section.service?"adminForumPublicCategory":"adminForumPublicSection")}
      </Link>
    </section>
  </AdminShell>;
}
