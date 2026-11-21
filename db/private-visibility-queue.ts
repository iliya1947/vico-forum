import type { Pool } from "pg";
import type { AuthorizationCapability } from "./authorization-service";
import type { ForumAttachmentMetadata } from "./forum-attachments";

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
export interface HiddenRevisionCursor { createdAt: string; id: string }
export interface HiddenPostRevision { id:string; createdAt:string; sourceLocale:string; originalContent:string }
export interface HiddenPostRevisionPage {items:HiddenPostRevision[];next:HiddenRevisionCursor|null}
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
  revisions(actorId: string, target: Extract<HiddenInspectionTarget,{kind:"post"}>, before?: HiddenRevisionCursor): Promise<HiddenPostRevisionPage>;
  /** Exact private published membership; only effectively hidden content is admitted. */
  attachment(actorId: string, topicId: string, postId: string, attachmentId: string): Promise<ForumAttachmentMetadata | null>;
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

  /** Extra permission is checked after fresh visibility admission, before revision text retrieval. */
  async revisions(actorId: string, target: Extract<HiddenInspectionTarget,{kind:"post"}>,
    before?: HiddenRevisionCursor): Promise<HiddenPostRevisionPage> {
    await this.admit(actorId);
    if (!(await this.authorization.forUser(actorId).has("forum.post.history.read"))) {
      throw new HiddenQueueForbiddenError();
    }
    const {rows}=await this.pool.query<HiddenPostRevision>(`
      select r.id,r.source_locale as "sourceLocale",r.original_content as "originalContent",
        to_char(r.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt"
      from forum_post_revisions r
      join forum_posts p on p.id=r.post_id
      join forum_topics t on t.id=p.topic_id
      where p.topic_id=$1 and p.id=$2
        and ($3::timestamptz is null or (r.created_at,r.id collate "C")
          < ($3::timestamptz,$4::text collate "C"))
      order by r.created_at desc,r.id collate "C" desc limit 26`,
      [target.topicId,target.postId,before?.createdAt??null,before?.id??null]);
    const items=rows.slice(0,25),last=items.at(-1);
    return {items,next:rows.length>25&&last?{createdAt:last.createdAt,id:last.id}:null};
  }

  async attachment(
    actorId: string, topicId: string, postId: string, attachmentId: string,
  ): Promise<ForumAttachmentMetadata | null> {
    await this.admit(actorId);
    const {rows}=await this.pool.query<ForumAttachmentMetadata>(`
      select a.id,a.object_key as "objectKey",a.file_name as "fileName",
        a.declared_mime as "declaredMime",a.detected_type as "detectedType",
        a.response_mime as "responseMime",a.byte_size as "byteSize",
        a.verification_status as "verificationStatus",
        to_char(a.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
      from forum_post_attachments r
      join forum_posts p on p.id=r.post_id
      join forum_topics t on t.id=p.topic_id
      join forum_attachments a on a.id=r.attachment_id
      where t.id=$1 and p.topic_id=$1 and p.id=$2 and r.post_id=$2
        and r.attachment_id=$3 and a.verification_status='type-checked'
        and (t.is_hidden or p.is_hidden)
      limit 1`,[topicId,postId,attachmentId]);
    return rows[0]??null;
  }
}
