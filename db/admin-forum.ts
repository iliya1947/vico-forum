import type { Pool } from "pg";
import { decodeStructureCursor, encodeStructureCursor, literalPattern, type StructureBrowseScope } from "./structure-browse";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";

export interface AdminBrowseQuery { search: string; after?: string }
export interface AdminBrowsePage<T> { items: T[]; total: number; next: string | null }
export interface AdminStructurePage<T> extends AdminBrowsePage<T> { structureVersion:string }
export interface AdminForumCategory {
  id: string; name: string; sectionCount: number; topicCount: number; postCount: number; reserved: boolean;
}
export interface AdminForumSection {
  id: string; name: string; category: { id: string; name: string }; topicCount: number; postCount: number; service: boolean;
}
export interface AdminForumTopic {
  id: string; title: string; sourceLocale: string; postCount: number; isSolved: boolean;
}
export interface AdminForumReader {
  listCategories(query: AdminBrowseQuery): Promise<AdminStructurePage<AdminForumCategory>>;
  readCategory(id: string, query: AdminBrowseQuery): Promise<{ structureVersion:string; category: AdminForumCategory; sections: AdminBrowsePage<AdminForumSection> } | undefined>;
  readSection(id: string): Promise<(AdminForumSection & {structureVersion:string}) | undefined>;
  readSectionTopics(id: string, query: AdminBrowseQuery): Promise<{ structureVersion:string; section: AdminForumSection; topics: AdminBrowsePage<AdminForumTopic> } | undefined>;
}
const pageSize = 25;
const pattern = literalPattern;
function page<T extends {id:string}>(items:T[], total:number):AdminBrowsePage<T> {
  return {items:items.slice(0,pageSize),total,next:items.length>pageSize?items[pageSize-1].id:null};
}
// Counts are independent aggregates, never reconstructed from bounded discovery lists.
const categoryProjection = `c.id, c.name,
  (select count(*)::int from forum_sections s where s.category_id=c.id) as "sectionCount",
  (select count(*)::int from forum_topics t join forum_sections s on s.id=t.section_id where s.category_id=c.id and not t.is_hidden) as "topicCount",
  (select count(*)::int from forum_posts p join forum_topics t on t.id=p.topic_id join forum_sections s on s.id=t.section_id where s.category_id=c.id and not t.is_hidden and not p.is_hidden) as "postCount",
  (c.id=$4) as reserved`;
const sectionProjection = `s.id, s.name, json_build_object('id',c.id,'name',c.name) as category,
  (select count(*)::int from forum_topics t where t.section_id=s.id and not t.is_hidden) as "topicCount",
  (select count(*)::int from forum_posts p join forum_topics t on t.id=p.topic_id where t.section_id=s.id and not t.is_hidden and not p.is_hidden) as "postCount",
  (s.id=$4) as service`;

/** Protected admin projection only. Public Help location/section readers stay unchanged. */
export class PostgresAdminForumReader implements AdminForumReader {
  constructor(private readonly database:Pick<Pool,"query">) {}
  async listCategories(query:AdminBrowseQuery) {
    const scope:StructureBrowseScope={kind:"admin-categories",parent:null,search:query.search};
    const after=decodeStructureCursor(scope,query.after);
    const result=await this.database.query<{items:(AdminForumCategory & {position:string;rank:string})[];total:number;structureVersion:string}>(`
      with matching as (select id from forum_categories where $1='' or name ilike $2 escape '\\' or id ilike $2 escape '\\'),
      paged as (select ${categoryProjection}, c.sort_position::text as position, (case when c.id=$4 then 0 else 1 end)::text as rank
        from forum_categories c join matching m on m.id=c.id
        where ($3::int is null or (case when c.id=$4 then 0 else 1 end,c.sort_position,c.id collate "C")>($3,$5::bigint,$6 collate "C"))
        order by case when c.id=$4 then 0 else 1 end,c.sort_position,c.id collate "C" limit 26)
      select coalesce((select json_agg(p order by p.rank,p.position::bigint,p.id collate "C") from paged p),'[]') as items,
        (select count(*)::int from matching) as total,(select version::text from forum_structure_state where id=1) as "structureVersion"`,
      [query.search,pattern(query.search),after?.[0]??null,HELP_SOLUTIONS_CATEGORY_ID,after?.[1]??null,after?.[2]??null]);
    const row=result.rows[0],last=row.items[pageSize-1];
    return {items:row.items.slice(0,pageSize).map(item=>({id:item.id,name:item.name,sectionCount:item.sectionCount,topicCount:item.topicCount,postCount:item.postCount,reserved:item.reserved})),total:row.total,
      next:row.items.length>pageSize?encodeStructureCursor(scope,[last.rank,last.position,last.id]):null,structureVersion:row.structureVersion};
  }
  async readCategory(id:string,query:AdminBrowseQuery) {
    const scope:StructureBrowseScope={kind:"admin-sections",parent:id,search:query.search};
    const after=decodeStructureCursor(scope,query.after);
    const result=await this.database.query<{category:AdminForumCategory;items:(AdminForumSection & {position:string})[];total:number;structureVersion:string}>(`
      with root as (select ${categoryProjection} from forum_categories c where c.id=$5),
      matching as (select s.id from forum_sections s where s.category_id=$5 and ($1='' or s.name ilike $2 escape '\\' or s.id ilike $2 escape '\\')),
      paged as (select ${sectionProjection.replace('(s.id=$4)','(s.id=$6)')},s.sort_position::text as position from forum_sections s
        join forum_categories c on c.id=s.category_id join matching m on m.id=s.id
        where ($3::bigint is null or (s.sort_position,s.id collate "C")>($3,$7 collate "C"))
        order by s.sort_position,s.id collate "C" limit 26)
      select (select row_to_json(r) from root r) as category,
        coalesce((select json_agg(p order by p.position::bigint,p.id collate "C") from paged p),'[]') as items,
        (select count(*)::int from matching) as total,(select version::text from forum_structure_state where id=1) as "structureVersion" from root`,
      [query.search,pattern(query.search),after?.[0]??null,HELP_SOLUTIONS_CATEGORY_ID,id,HELP_SOLUTIONS_SERVICE_SECTION_ID,after?.[1]??null]);
    const row=result.rows[0];if(!row)return undefined;
    const last=row.items[pageSize-1];
    return {category:row.category,structureVersion:row.structureVersion,sections:{items:row.items.slice(0,pageSize).map(item=>({id:item.id,name:item.name,category:item.category,topicCount:item.topicCount,postCount:item.postCount,service:item.service})),total:row.total,
      next:row.items.length>pageSize?encodeStructureCursor(scope,[last.position,last.id]):null}};
  }

  async readSectionTopics(id:string,query:AdminBrowseQuery) {
    const result=await this.database.query<{section:AdminForumSection;items:AdminForumTopic[];total:number;structureVersion:string}>(`
      with root as (select ${sectionProjection} from forum_sections s
        join forum_categories c on c.id=s.category_id where s.id=$5),
      matching as (select t.id from forum_topics t
        join forum_topic_title_revisions r on r.topic_id=t.id and r.id=t.current_title_revision_id
        where t.section_id=$5 and not t.is_hidden and ($1='' or r.original_content ilike $2 escape '\\' or t.id ilike $2 escape '\\')),
      paged as (select t.id, r.original_content as title, r.source_locale as "sourceLocale",
          t.is_solved as "isSolved",
          (select count(*)::int from forum_posts p where p.topic_id=t.id and not p.is_hidden) as "postCount"
        from forum_topics t
        join forum_topic_title_revisions r on r.topic_id=t.id and r.id=t.current_title_revision_id
        join matching m on m.id=t.id
        where not t.is_hidden and ($3::text is null or t.id collate "C">$3 collate "C")
        order by t.id collate "C" limit 26)
      select (select row_to_json(r) from root r) as section,
        coalesce((select json_agg(p order by p.id collate "C") from paged p),'[]') as items,
        (select count(*)::int from matching) as total,(select version::text from forum_structure_state where id=1) as "structureVersion" from root`,
    [query.search,pattern(query.search),query.after??null,HELP_SOLUTIONS_SERVICE_SECTION_ID,id]);
    const row=result.rows[0];return row?{structureVersion:row.structureVersion,section:row.section,topics:page(row.items,row.total)}:undefined;
  }
  async readSection(id:string) {
    const result=await this.database.query<AdminForumSection & {structureVersion:string}>(`select ${sectionProjection.replace("$4","$2")},
      (select version::text from forum_structure_state where id=1) as "structureVersion"
      from forum_sections s join forum_categories c on c.id=s.category_id where s.id=$1`,
    [id,HELP_SOLUTIONS_SERVICE_SECTION_ID]);
    return result.rows[0];
  }
}
