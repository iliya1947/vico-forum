import type { Pool } from "pg";
import type { AuthorizationCapability } from "./authorization-service";
import { effectivePermission } from "./authorization-repository";
import { assertActiveAccountForMutation } from "./account-state";
import { assertNoActiveUserMeasureRestrictionPg } from "./user-measure-policy";
import { appendStructureHistory, historyLabel, type TopicLocationHistoryState } from "./admin-history";
import {
  parseStructureCounter, StructureConflictError, StructureForbiddenError,
  StructureInvariantError, StructureNotFoundError, StructureValidationError,
} from "./forum-structure";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";

export const TOPIC_MOVE_PERMISSION = "forum.topic.move" as const;
const VISIBILITY_PERMISSION = "forum.content.visibility.manage" as const;
export interface TopicMoveInput {
  expectedStructureVersion: string;
  expectedSectionId: string;
  targetSectionId: string;
  expectedLocationVersion: string;
}
export interface TopicMoveResult {
  topicId: string; currentSectionId: string; locationVersion: string;
  structureVersion: string; changed: boolean;
}
export interface TopicMoveWriter {
  moveTopic(actorId: string, topicId: string, input: TopicMoveInput): Promise<TopicMoveResult>;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || !value || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new StructureValidationError("Invalid move identity");
  }
  return value;
}
function counter(value: unknown): string {
  try { return parseStructureCounter(value).toString(); }
  catch { throw new StructureInvariantError("Invalid persisted move counter"); }
}
const missing = () => new StructureNotFoundError("Movable topic or destination not found");
type SectionRow = { id: string; name: string; category_id: string };

/** Server-only operation; actor and authorization come from the trusted request context.
 * No public reader/includeHidden switch, content read, actor-author inference or UI hints. */
export class PostgresTopicMoveWriter implements TopicMoveWriter {
  constructor(
    private readonly pool: Pick<Pool, "connect">,
    private readonly authorization: AuthorizationCapability,
    private readonly ownerUserId?: string,
  ) {}

  async moveTopic(actorId: string, topicId: string, input: TopicMoveInput): Promise<TopicMoveResult> {
    identity(actorId); identity(topicId);
    const expectedSectionId = identity(input.expectedSectionId), targetSectionId = identity(input.targetSectionId);
    const expectedStructure = parseStructureCounter(input.expectedStructureVersion).toString();
    const expectedLocation = parseStructureCounter(input.expectedLocationVersion).toString();
    if (!await this.authorization.forUser(actorId).has(TOPIC_MOVE_PERMISSION)) {
      throw new StructureForbiddenError("Topic move permission required");
    }
    const client = await this.pool.connect();
    try {
      await client.query("begin isolation level read committed");
      const structure = await client.query<{ version: string }>("select version::text from forum_structure_state where id=1 for update");
      if (structure.rowCount !== 1) throw new StructureInvariantError("Structure singleton is missing");
      const structureVersion = counter(structure.rows[0].version);
      const result = await client.query<{ id: string; section_id: string; location_version: string; is_hidden: boolean }>(
        "select id,section_id,location_version::text,is_hidden from forum_topics where id=$1 for no key update", [topicId]);
      const topic = result.rows[0];
      if (!topic) throw missing();
      // Hidden applicability is decided under the actual topic lock, BEFORE any CAS/location/destination result.
      if (topic.is_hidden && (!await effectivePermission(client,actorId,TOPIC_MOVE_PERMISSION,this.ownerUserId)
        || !await effectivePermission(client,actorId,VISIBILITY_PERMISSION,this.ownerUserId))) throw missing();
      const locationVersion = counter(topic.location_version);
      if (structureVersion !== expectedStructure || topic.section_id !== expectedSectionId || locationVersion !== expectedLocation) {
        throw new StructureConflictError("stale");
      }
      const ids = [...new Set([topic.section_id, targetSectionId])];
      if (ids.includes(HELP_SOLUTIONS_SERVICE_SECTION_ID)) throw missing();
      const initial = await client.query<SectionRow>("select id,name,category_id from forum_sections where id=any($1::text[])",[ids]);
      if (initial.rows.length !== ids.length || initial.rows.some(r => r.category_id === HELP_SOLUTIONS_CATEGORY_ID)) throw missing();
      const parents = [...new Set(initial.rows.map(r => r.category_id))];
      const categories = await client.query<{ id: string; name: string }>(`select id,name from forum_categories
        where id=any($1::text[]) order by id collate "C" for no key update`, [parents]);
      if (categories.rows.length !== parents.length) throw missing();
      const sections = await client.query<SectionRow>(`select id,name,category_id from forum_sections
        where id=any($1::text[]) order by id collate "C" for no key update`, [ids]);
      if (sections.rows.length !== ids.length) throw missing();
      const categoryMap = new Map(categories.rows.map(r => [r.id,r.name]));
      const sectionMap = new Map(sections.rows.map(r => [r.id,r]));
      for (const r of sections.rows) {
        if (r.category_id === HELP_SOLUTIONS_CATEGORY_ID) throw missing();
        if (r.category_id !== initial.rows.find(old => old.id === r.id)?.category_id) throw new StructureConflictError("parent-changed");
      }
      await assertActiveAccountForMutation(client,actorId);
      await assertNoActiveUserMeasureRestrictionPg(client,actorId,"admin.forum",this.ownerUserId);
      if (!await effectivePermission(client,actorId,TOPIC_MOVE_PERMISSION,this.ownerUserId)) {
        if (topic.is_hidden) throw missing();
        throw new StructureForbiddenError("Topic move permission required");
      }
      if (topic.is_hidden && !await effectivePermission(client,actorId,VISIBILITY_PERMISSION,this.ownerUserId)) throw missing();
      const response = { topicId, currentSectionId: targetSectionId, structureVersion, locationVersion, changed: false };
      if (topic.section_id === targetSectionId) {
        await client.query("commit"); return response;
      }
      if (locationVersion === "9223372036854775807") throw new StructureConflictError("version-exhausted");
      const next = (BigInt(locationVersion) + 1n).toString();
      const saved = await client.query(`update forum_topics set section_id=$2,location_version=$3::bigint
        where id=$1 and section_id=$4 and location_version=$5::bigint returning id`, [topicId,targetSectionId,next,expectedSectionId,locationVersion]);
      if (saved.rowCount !== 1) throw new StructureConflictError("stale");
      const location = (id: string): TopicLocationHistoryState => {
        const row = sectionMap.get(id)!;
        return { sectionId: row.id, sectionName: historyLabel(row.name), categoryId: row.category_id,
          categoryName: historyLabel(categoryMap.get(row.category_id)!) };
      };
      await appendStructureHistory(client,actorId,{
        action:"topic.moved",targetType:"topic",targetId:topicId,targetLabel:"topic:"+topicId,
        context:{ previousVersion:locationVersion,version:next,before:location(topic.section_id),after:location(targetSectionId) },
      });
      await client.query("commit");
      return { ...response, locationVersion: next, changed: true };
    } catch (error) {
      try { await client.query("rollback"); } catch { /* Preserve the original failure. */ }
      throw error;
    } finally { client.release(); }
  }
}
