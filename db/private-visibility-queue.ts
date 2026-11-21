import type { Pool } from "pg";
import type { AuthorizationCapability } from "./authorization-service";

/** Private moderation data. Never merge this reader into the public ForumReader. */
export type HiddenQueueKind = "topic" | "post";
export interface HiddenQueueCursor { changedAt: string; id: string }
export interface HiddenQueueQuery { kind: HiddenQueueKind; before?: HiddenQueueCursor }
export interface HiddenTopicQueueItem {
  kind: "topic";
  id: string;
  topicId: string;
  changedAt: string;
  visibilityVersion: number;
}
export interface HiddenPostQueueItem {
  kind: "post";
  id: string;
  topicId: string;
  changedAt: string;
  visibilityVersion: number;
  parentPostId: string | null;
  /** Effective unavailability of the direct parent (or the whole topic). */
  parentUnavailable: boolean;
  topicHidden: boolean;
}
export type HiddenQueueItem = HiddenTopicQueueItem | HiddenPostQueueItem;
export interface HiddenQueuePage {
  items: HiddenQueueItem[];
  next: HiddenQueueCursor | null;
}

export class HiddenQueueForbiddenError extends Error {
  constructor() { super("Visibility management denied"); this.name = "HiddenQueueForbiddenError"; }
}
export class HiddenQueueUnavailableError extends Error {
  constructor() { super("Private visibility queue unavailable"); this.name = "HiddenQueueUnavailableError"; }
}
export interface HiddenQueueReader {
  /** Performs effective permission + active-account admission afresh for each read. */
  list(actorId: string, query: HiddenQueueQuery): Promise<HiddenQueuePage>;
}

const PAGE_SIZE = 25;

type TopicRow = { id: string; changedAt: string; visibilityVersion: number };
type PostRow = TopicRow & {
  topicId: string; parentPostId: string | null; topicHidden: boolean; parentUnavailable: boolean;
};

/**
 * Isolated private SQL projection: only individually hidden rows can enter
 * this queue. Ancestors' visibility is separately disclosed to the authorized
 * moderator, never by using a public forum reader.
 */
export class PostgresHiddenQueueReader implements HiddenQueueReader {
  constructor(private readonly pool: Pick<Pool, "query">, private readonly authorization: AuthorizationCapability) {}

  async list(actorId: string, query: HiddenQueueQuery): Promise<HiddenQueuePage> {
    if (!actorId || !(await this.authorization.forUser(actorId).has("forum.content.visibility.manage"))) {
      throw new HiddenQueueForbiddenError();
    }
    const active = await this.pool.query<{ id: string }>(
      'select id from "user" where id=$1 and deactivated_at is null', [actorId],
    );
    if (active.rows.length !== 1) throw new HiddenQueueForbiddenError();

    const args = [query.before?.changedAt ?? null, query.before?.id ?? null];
    if (query.kind === "topic") {
      const { rows } = await this.pool.query<TopicRow>(`
        select t.id,
          to_char(t.visibility_changed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "changedAt",
          t.visibility_version as "visibilityVersion"
        from forum_topics t
        where t.is_hidden=true
          and ($1::timestamptz is null or (t.visibility_changed_at,t.id collate "C")
            < ($1::timestamptz,$2::text collate "C"))
        order by t.visibility_changed_at desc,t.id collate "C" desc
        limit 26`, args);
      const items: HiddenTopicQueueItem[] = rows.slice(0, PAGE_SIZE).map(row => ({
        kind: "topic", id: row.id, topicId: row.id,
        changedAt: row.changedAt, visibilityVersion: row.visibilityVersion,
      }));
      const last = items.at(-1);
      return { items, next: rows.length > PAGE_SIZE && last ? { changedAt: last.changedAt, id: last.id } : null };
    }
    const { rows } = await this.pool.query<PostRow>(`
      select p.id,p.topic_id as "topicId",p.parent_post_id as "parentPostId",
        to_char(p.visibility_changed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "changedAt",
        p.visibility_version as "visibilityVersion",t.is_hidden as "topicHidden",
        (t.is_hidden or coalesce(parent.is_hidden,false)) as "parentUnavailable"
      from forum_posts p
      join forum_topics t on t.id=p.topic_id
      left join forum_posts parent on parent.id=p.parent_post_id and parent.topic_id=p.topic_id
      where p.is_hidden=true
        and ($1::timestamptz is null or (p.visibility_changed_at,p.id collate "C")
          < ($1::timestamptz,$2::text collate "C"))
      order by p.visibility_changed_at desc,p.id collate "C" desc
      limit 26`, args);
    const items: HiddenPostQueueItem[] = rows.slice(0, PAGE_SIZE).map(row => ({
      kind: "post", id: row.id, topicId: row.topicId, changedAt: row.changedAt,
      visibilityVersion: row.visibilityVersion, parentPostId: row.parentPostId,
      parentUnavailable: row.parentUnavailable, topicHidden: row.topicHidden,
    }));
    const last = items.at(-1);
    return { items, next: rows.length > PAGE_SIZE && last ? { changedAt: last.changedAt, id: last.id } : null };
  }
}
