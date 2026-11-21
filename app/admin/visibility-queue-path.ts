import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import type { HiddenQueueCursor, HiddenQueueKind, HiddenQueueQuery, HiddenInspectionTarget, HiddenRevisionCursor } from "../../db/private-visibility-queue";

const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const APPLICATION_KEYS = new Set(["kind", "beforeChangedAt", "beforeId"]);

/** Strict application query. Router transport metadata is filtered by the route. */
export function hiddenQueueQuery(params: URLSearchParams): HiddenQueueQuery {
  const invalid = (): never => {
    throw new Response("Invalid queue query", {
      status: 400, headers: { "Cache-Control": "private, no-store" },
    });
  };
  if ([...params.keys()].some(key => !APPLICATION_KEYS.has(key))
    || [...APPLICATION_KEYS].some(key => params.getAll(key).length > 1)) return invalid();
  const kind = params.get("kind") ?? "topic";
  if (kind !== "topic" && kind !== "post") return invalid();
  const changedAt = params.get("beforeChangedAt");
  const id = params.get("beforeId");
  if ((changedAt === null) !== (id === null)) return invalid();
  if (changedAt === null || id === null) return { kind };
  const parsed = new Date(changedAt);
  if (!UTC_MILLIS.test(changedAt) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString() !== changedAt
    || !id || id !== id.trim() || new TextEncoder().encode(id).length > 256
    || [...id].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) return invalid();
  return { kind, before: { changedAt, id } };
}

/** Outgoing typed private queue address, using the existing admin forum family. */
export function hiddenQueuePath(
  locale: string, kind: HiddenQueueKind, before?: HiddenQueueCursor,
  routing: AdministrativeRouting = defaultAdministrativeRouting,
): string {
  const params = new URLSearchParams({ kind });
  if (before) {
    params.set("beforeChangedAt", before.changedAt);
    params.set("beforeId", before.id);
  }
  return `${routing.admin.forum(locale)}/content?${params}`;
}

/** This route is a private inspection resource, not an ordinary Admin topic read. */
export function hiddenInspectionPath(
  locale: string, target: HiddenInspectionTarget,
  routing: AdministrativeRouting = defaultAdministrativeRouting,
  revisions?: { before?: HiddenRevisionCursor },
): string {
  const base = routing.admin.topic(locale, target.topicId) + "/inspect";
  const params = new URLSearchParams();
  if(target.kind==="post")params.set("postId",target.postId);
  if(revisions){
    params.set("revisions","1");
    if(revisions.before){
      params.set("beforeRevisionAt",revisions.before.createdAt);
      params.set("beforeRevisionId",revisions.before.id);
    }
  }
  return base + (params.size?"?"+params:"");
}

/** Parse after capability admission to prevent denied actors from using query validation as an oracle. */
export function hiddenInspectionTarget(topicId: string, params: URLSearchParams): HiddenInspectionTarget {
  const invalid = (): never => {
    throw new Response("Invalid inspection query", {
      status: 400, headers: { "Cache-Control": "private, no-store" },
    });
  };
  if ([...params.keys()].some(key => key !== "postId") || params.getAll("postId").length > 1) return invalid();
  const postId = params.get("postId");
  if (postId === null) return { kind: "topic", topicId };
  if (!postId || postId !== postId.trim() || new TextEncoder().encode(postId).length > 2048
    || [...postId].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) return invalid();
  return { kind: "post", topicId, postId };
}

export interface HiddenInspectionQuery {
  target: HiddenInspectionTarget;
  includeRevisions: boolean;
  before?: HiddenRevisionCursor;
}
export function hiddenInspectionQuery(topicId:string,params:URLSearchParams):HiddenInspectionQuery {
  const invalid=():never=>{throw new Response("Invalid inspection query",{
    status:400,headers:{"Cache-Control":"private, no-store"},
  });};
  const keys=["postId","revisions","beforeRevisionAt","beforeRevisionId"];
  if([...params.keys()].some(key=>!keys.includes(key))||keys.some(key=>params.getAll(key).length>1))
    return invalid();
  const targetParams=new URLSearchParams();
  if(params.has("postId"))targetParams.set("postId",params.get("postId")!);
  const target=hiddenInspectionTarget(topicId,targetParams);
  const mode=params.get("revisions");
  if(mode!==null&&mode!=="1")return invalid();
  const at=params.get("beforeRevisionAt"),id=params.get("beforeRevisionId");
  if((at===null)!==(id===null))return invalid();
  if(mode===null&&(at!==null||id!==null))return invalid();
  if(mode!==null&&target.kind!=="post")return invalid();
  if(at===null||id===null)return {target,includeRevisions:mode==="1"};
  const truncated=at.slice(0,-4)+"Z",parsed=new Date(truncated);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u.test(at)
    ||!Number.isFinite(parsed.getTime())||parsed.toISOString()!==truncated
    ||!id||id!==id.trim()||new TextEncoder().encode(id).length>256
    ||[...id].some(char=>char.codePointAt(0)!<32||char.codePointAt(0)===127))return invalid();
  return {target,includeRevisions:true,before:{createdAt:at,id}};
}
