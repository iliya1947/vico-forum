import type { Pool } from "pg";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";

export interface AdminBrowseQuery { search: string; after?: string }
export interface AdminBrowsePage<T> { items: T[]; total: number; next: string | null }
export interface AdminForumCategory {
  id: string; name: string; sectionCount: number; topicCount: number; postCount: number; reserved: boolean;
}
export interface AdminForumSection {
  id: string; name: string; category: { id: string; name: string }; topicCount: number; postCount: number; service: boolean;
}
export interface AdminForumReader {
  listCategories(query: AdminBrowseQuery): Promise<AdminBrowsePage<AdminForumCategory>>;
  readCategory(id: string, query: AdminBrowseQuery): Promise<{ category: AdminForumCategory; sections: AdminBrowsePage<AdminForumSection> } | undefined>;
  readSection(id: string): Promise<AdminForumSection | undefined>;
}
const pageSize = 25;
function pattern(search: string) { return `%${search.replace(/[\\%_]/g, "\\$&")}%`; }
function page<T extends {id:string}>(items:T[], total:number):AdminBrowsePage<T> {
  return {items:items.slice(0,pageSize),total,next:items.length>pageSize?items[pageSize-1].id:null};
}
// Counts are independent aggregates, never reconstructed from bounded discovery lists.
const categoryProjection = `c.id, c.name,
  (select count(*)::int from forum_sections s where s.category_id=c.id) as "sectionCount",
  (select count(*)::int from forum_topics t join forum_sections s on s.id=t.section_id where s.category_id=c.id) as "topicCount",
  (select count(*)::int from forum_posts p join forum_topics t on t.id=p.topic_id join forum_sections s on s.id=t.section_id where s.category_id=c.id) as "postCount",
  (c.id=$4) as reserved`;
const sectionProjection = `s.id, s.name, json_build_object('id',c.id,'name',c.name) as category,
  (select count(*)::int from forum_topics t where t.section_id=s.id) as "topicCount",
  (select count(*)::int from forum_posts p join forum_topics t on t.id=p.topic_id where t.section_id=s.id) as "postCount",
  (s.id=$4) as service`;

/** Protected admin projection only. Public Help location/section readers stay unchanged. */
export class PostgresAdminForumReader implements AdminForumReader {
  constructor(private readonly database:Pick<Pool,"query">) {}
  async listCategories(query:AdminBrowseQuery) {
    const result=await this.database.query<{items:AdminForumCategory[];total:number}>(`
      with matching as (select id from forum_categories where $1='' or name ilike $2 escape '\\' or id ilike $2 escape '\\'),
      paged as (select ${categoryProjection} from forum_categories c join matching m on m.id=c.id
        where ($3::text is null or c.id collate "C">$3 collate "C") order by c.id collate "C" limit 26)
      select coalesce((select json_agg(p order by p.id collate "C") from paged p),'[]') as items,
        (select count(*)::int from matching) as total`,[query.search,pattern(query.search),query.after??null,HELP_SOLUTIONS_CATEGORY_ID]);
    return page(result.rows[0].items,result.rows[0].total);
  }
  async readCategory(id:string,query:AdminBrowseQuery) {
    const result=await this.database.query<{category:AdminForumCategory;items:AdminForumSection[];total:number}>(`
      with root as (select ${categoryProjection} from forum_categories c where c.id=$5),
      matching as (select s.id from forum_sections s where s.category_id=$5 and ($1='' or s.name ilike $2 escape '\\' or s.id ilike $2 escape '\\')),
      paged as (select ${sectionProjection.replace('(s.id=$4)','(s.id=$6)')} from forum_sections s
        join forum_categories c on c.id=s.category_id join matching m on m.id=s.id
        where ($3::text is null or s.id collate "C">$3 collate "C") order by s.id collate "C" limit 26)
      select (select row_to_json(r) from root r) as category,
        coalesce((select json_agg(p order by p.id collate "C") from paged p),'[]') as items,
        (select count(*)::int from matching) as total from root`,
    [query.search,pattern(query.search),query.after??null,HELP_SOLUTIONS_CATEGORY_ID,id,HELP_SOLUTIONS_SERVICE_SECTION_ID]);
    const row=result.rows[0];return row?{category:row.category,sections:page(row.items,row.total)}:undefined;
  }
  async readSection(id:string) {
    const result=await this.database.query<AdminForumSection>(`select ${sectionProjection.replace("$4","$2")}
      from forum_sections s join forum_categories c on c.id=s.category_id where s.id=$1`,
    [id,HELP_SOLUTIONS_SERVICE_SECTION_ID]);
    return result.rows[0];
  }
}
