import type { Pool, PoolClient } from "pg";
import type { AuthorizationCapability } from "./authorization-service";
import { effectivePermission } from "./authorization-repository";
import { assertActiveAccount } from "./account-state";
import { assertNoActiveUserMeasureRestrictionPg } from "./user-measure-policy";
import { StructureForbiddenError, StructureInvariantError, StructureValidationError } from "./forum-structure";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";
import { decodeStructureCursor, encodeStructureCursor, literalPattern, structureIdentity, type StructureBrowseScope } from "./structure-browse";

export interface TopicMoveContext {
  actorId:string; topicId:string; currentSection:{id:string;name:string;category:{id:string;name:string}};
  locationVersion:string; structureVersion:string; isHidden:boolean;
}
export interface DestinationQuery { kind:"categories"|"sections"; search:string; parent?:string; after?:string }
export interface StructureDestination { id:string;name:string;category?:{id:string;name:string} }
export interface DestinationPage { items:StructureDestination[];total:number;next:string|null;structureVersion:string;actorId:string }
export interface TopicMoveContextReader { readMoveContext(actorId:string,topicId:string):Promise<TopicMoveContext|undefined> }
export interface ForumStructureReader extends TopicMoveContextReader { listDestinations(actorId:string,query:DestinationQuery):Promise<DestinationPage> }

/** Separate source-free read capability. No topic title/body/revision/author is selected. */
export class PostgresForumStructureReader implements ForumStructureReader {
  constructor(private readonly pool:Pick<Pool,"connect">,private readonly authorization:AuthorizationCapability,private readonly ownerUserId?:string) {}
  private async snapshot<T>(actorId:string,moveOnly:boolean,read:(client:PoolClient)=>Promise<T>):Promise<T> {
    structureIdentity(actorId);
    const resolver=this.authorization.forUser(actorId);
    if (!await resolver.has("forum.topic.move") && (moveOnly || !await resolver.has("forum.structure.manage")))
      throw new StructureForbiddenError("Structure read permission required");
    const client=await this.pool.connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      await assertActiveAccount(client,actorId);
      await assertNoActiveUserMeasureRestrictionPg(client,actorId,"admin.forum",this.ownerUserId);
      if (!await effectivePermission(client,actorId,"forum.topic.move",this.ownerUserId)
        && (moveOnly || !await effectivePermission(client,actorId,"forum.structure.manage",this.ownerUserId)))
        throw new StructureForbiddenError("Structure read permission required");
      const value=await read(client);
      await client.query("commit");return value;
    } catch(error) { await client.query("rollback");throw error; }
    finally { client.release(); }
  }
  async readMoveContext(actorId:string,topicId:string) {
    structureIdentity(topicId);
    return this.snapshot(actorId,true,async client=>{
      const result=await client.query<Omit<TopicMoveContext,"actorId">>(`select t.id as "topicId",t.location_version::text as "locationVersion",
        v.version::text as "structureVersion",t.is_hidden as "isHidden",
        json_build_object('id',s.id,'name',s.name,'category',json_build_object('id',c.id,'name',c.name)) as "currentSection"
        from forum_topics t join forum_sections s on s.id=t.section_id join forum_categories c on c.id=s.category_id
        cross join forum_structure_state v where v.id=1 and t.id=$1 and s.id<>$2 and c.id<>$3`,
        [topicId,HELP_SOLUTIONS_SERVICE_SECTION_ID,HELP_SOLUTIONS_CATEGORY_ID]);
      const row=result.rows[0];
      if (!row || (row.isHidden && !await effectivePermission(client,actorId,"forum.content.visibility.manage",this.ownerUserId))) return undefined;
      return {actorId,...row};
    });
  }
  async listDestinations(actorId:string,query:DestinationQuery) {
    if(query.kind!=="categories"&&query.kind!=="sections")throw new StructureValidationError("Unknown destination kind");
    const scope:StructureBrowseScope={kind:query.kind,parent:query.parent??null,search:query.search};
    // Category selection has no parent; this is a closed query contract.
    if(scope.kind==="categories"&&scope.parent!==null)throw new StructureValidationError("Categories cannot have a parent");
    const after=decodeStructureCursor(scope,query.after);
    return this.snapshot(actorId,false,async client=>{
      type Item=StructureDestination & {categoryPosition:string;position:string;categoryId?:string};
      const section=query.kind==="sections";
      const sql=`
        with input as (select $1::text as help_category,$2::text as help_section,$3::text as parent,
          $4::text as search,$5::text as pattern,$6::bigint as p1,$7::text as id1,$8::bigint as p2,$9::text as id2), matching as (
          select ${section?"s.id,s.name,json_build_object('id',c.id,'name',c.name) as category,c.id as \"categoryId\",s.sort_position::text as position":"c.id,c.name,c.sort_position::text as position"},
            c.sort_position::text as "categoryPosition"
          from forum_categories c ${section?"join forum_sections s on s.category_id=c.id":""} cross join input i
          where c.id<>i.help_category ${section?"and s.id<>i.help_section and (i.parent is null or c.id=i.parent)":""}
            and (i.search='' or ${section?"s.name ilike i.pattern escape '\\' or s.id ilike i.pattern escape '\\' or":""} c.name ilike i.pattern escape '\\' or c.id ilike i.pattern escape '\\')
        ), paged as (select m.* from matching m cross join input i where (i.p1 is null or ${section?
          '(m."categoryPosition"::bigint,m."categoryId" collate "C",m.position::bigint,m.id collate "C")>(i.p1,i.id1 collate "C",i.p2,i.id2 collate "C")':
          '(m.position::bigint,m.id collate "C")>(i.p1,i.id1 collate "C")'} )
          order by ${section?'m."categoryPosition"::bigint,m."categoryId" collate "C",':''}m.position::bigint,m.id collate "C" limit 26)
        select coalesce((select json_agg(p order by ${section?'p."categoryPosition"::bigint,p."categoryId" collate "C",':''}p.position::bigint,p.id collate "C") from paged p),'[]') as items,
          (select count(*)::int from matching) as total,(select version::text from forum_structure_state where id=1) as "structureVersion"`;
      const result=await client.query<{items:Item[];total:number;structureVersion:string}>(sql,
        [HELP_SOLUTIONS_CATEGORY_ID,HELP_SOLUTIONS_SERVICE_SECTION_ID,scope.parent,scope.search,literalPattern(scope.search),
          after?.[0]??null,after?.[1]??null,after?.[2]??null,after?.[3]??null]);
      const row=result.rows[0];
      if(row.structureVersion===null)throw new StructureInvariantError("Structure singleton missing");
      const last=row.items[24];
      return {actorId,items:row.items.slice(0,25).map(item=>({id:item.id,name:item.name,...(item.category?{category:item.category}:{})})),total:row.total,structureVersion:row.structureVersion,
        next:row.items.length>25?encodeStructureCursor(scope,section?[last.categoryPosition,last.categoryId!,last.position,last.id]:[last.position,last.id]):null};
    });
  }
}
