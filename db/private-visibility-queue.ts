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
export type HiddenInspectionTarget =
  | { kind: "topic"; topicId: string }
  | { kind: "post"; topicId: string; postId: string };
export type HiddenVisibilityAction = "topic.hidden" | "topic.restored" | "post.hidden" | "post.restored";
export interface HiddenVisibilityEvent {
  action: HiddenVisibilityAction;
  at: string;
  reason: string;
}
interface HiddenInspectionFields {
  id: string;
  topicId: string;
  isHidden: boolean;
  visibilityVersion: number;
  visibilityChangedAt: string | null;
  currentRevisionId: string;
  lastEvent: HiddenVisibilityEvent | null;
}
export type HiddenInspection =
  | (HiddenInspectionFields & { kind: "topic" })
  | (HiddenInspectionFields & {
    kind: "post"; parentPostId: string | null; parentUnavailable: boolean; topicHidden: boolean;
  });
export interface HiddenQueueReader {
  /** Performs effective permission + active-account admission afresh for each read. */
  list(actorId: string, query: HiddenQueueQuery): Promise<HiddenQueuePage>;
  /** Current target only; never general History, source or revision bodies. */
  inspect(actorId: string, target: HiddenInspectionTarget): Promise<HiddenInspection | undefined>;
}

const PAGE_SIZE = 25;

type TopicRow = { id: string; changedAt: string; visibilityVersion: number };
type InspectionRow = {
  id: string; isHidden: boolean; visibilityVersion: number; visibilityChangedAt: string | null;
  currentRevisionId: string; eventAction: HiddenVisibilityAction | null; eventAt: string | null;
  eventReason: string | null;
};
type PostInspectionRow = InspectionRow & {
  parentPostId: string | null; parentUnavailable: boolean; topicHidden: boolean;
};
/** Missing audit for a committed visibility version is an invariant failure, not a synthetic reason. */
function lastVisibilityEvent(row: InspectionRow, kind: HiddenQueueKind): HiddenVisibilityEvent | null {
  if (row.visibilityVersion === 0) {
    if (row.eventAction !== null || row.visibilityChangedAt !== null) throw new HiddenQueueUnavailableError();
    return null;
  }
  const expected = (kind + (row.isHidden ? ".hidden" : ".restored")) as HiddenVisibilityAction;
  if (row.eventAction !== expected || !row.eventAt || !row.eventReason || !row.visibilityChangedAt) {
    throw new HiddenQueueUnavailableError();
  }
  return { action: expected, at: row.eventAt, reason: row.eventReason };
}
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

  private async admit(actorId: string): Promise<void> {
    if (!actorId || !(await this.authorization.forUser(actorId).has("forum.content.visibility.manage"))) {
      throw new HiddenQueueForbiddenError();
    }
    const active = await this.pool.query<{ id: string }>(
      'select id from "user" where id=$1 and deactivated_at is null', [actorId],
    );
    if (active.rows.length !== 1) throw new HiddenQueueForbiddenError();
  }

  async list(actorId: string, query: HiddenQueueQuery): Promise<HiddenQueuePage> {
    await this.admit(actorId);
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

  async inspect(actorId: string, target: HiddenInspectionTarget): Promise<HiddenInspection | undefined> {
    await this.admit(actorId);
    if (target.kind === "topic") {
      const { rows } = await this.pool.query<InspectionRow>(`
        select t.id,t.is_hidden as "isHidden",t.visibility_version as "visibilityVersion",
          t.current_title_revision_id as "currentRevisionId",
          to_char(t.visibility_changed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "visibilityChangedAt",
          e.action as "eventAction",e.reason as "eventReason",
          to_char(e.occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "eventAt"
        from forum_topics t
        left join lateral (
          select h.action,h.reason,h.occurred_at from admin_history h
          where h.target_type='topic' and h.target_id=t.id
            and h.action in ('topic.hidden','topic.restored')
            and h.context->>'topicId'=t.id
            and h.context->>'version'=t.visibility_version::text
          order by h.position desc limit 1
        ) e on true
        where t.id=$1`, [target.topicId]);
      const row = rows[0];
      if (!row) return undefined;
      return {
        kind: "topic", id: row.id, topicId: row.id, isHidden: row.isHidden,
        visibilityVersion: row.visibilityVersion, visibilityChangedAt: row.visibilityChangedAt,
        currentRevisionId: row.currentRevisionId, lastEvent: lastVisibilityEvent(row, "topic"),
      };
    }
    const { rows } = await this.pool.query<PostInspectionRow>(`
      select p.id,p.is_hidden as "isHidden",p.visibility_version as "visibilityVersion",
        p.current_revision_id as "currentRevisionId",p.parent_post_id as "parentPostId",
        t.is_hidden as "topicHidden",
        (t.is_hidden or coalesce(parent.is_hidden,false)) as "parentUnavailable",
        to_char(p.visibility_changed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "visibilityChangedAt",
        e.action as "eventAction",e.reason as "eventReason",
        to_char(e.occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "eventAt"
      from forum_posts p
      join forum_topics t on t.id=p.topic_id
      left join forum_posts parent on parent.id=p.parent_post_id and parent.topic_id=p.topic_id
      left join lateral (
        select h.action,h.reason,h.occurred_at from admin_history h
        where h.target_type='post' and h.target_id=p.id
          and h.action in ('post.hidden','post.restored')
          and h.context->>'topicId'=p.topic_id
          and h.context->>'postId'=p.id
          and h.context->>'version'=p.visibility_version::text
        order by h.position desc limit 1
      ) e on true
      where p.topic_id=$1 and p.id=$2`, [target.topicId,target.postId]);
    const row = rows[0];
    if (!row) return undefined;
    return {
      kind: "post", id: row.id, topicId: target.topicId,
      isHidden: row.isHidden, visibilityVersion: row.visibilityVersion,
      visibilityChangedAt: row.visibilityChangedAt, currentRevisionId: row.currentRevisionId,
      lastEvent: lastVisibilityEvent(row, "post"),
      parentPostId: row.parentPostId, parentUnavailable: row.parentUnavailable,
      topicHidden: row.topicHidden,
    };
  }
}
