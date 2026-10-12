import type { ForumEditorDraftPayload } from "../../db/schema";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "./paths";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-identifiers";
import { isEditorDraftContextKey, parseEditorDraftContextKey } from "../../db/editor-draft-context";

export const DRAFT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export interface LocalEditorDraft {
  ownerId: string;
  contextKey: string;
  draftId: string;
  payload: ForumEditorDraftPayload;
  editedAt: string;
  baseVersion: number;
  syncedEditedAt: string | null;
  /** Draft generation used for an attachment operation; retained across text-generation changes until refs are reconciled. */
  attachmentDraftId?: string;
}
export interface DraftMetadata {
  contextKey: string;
  draftId: string;
  version: number;
  status: "active" | "deleted" | "published";
  title: string;
  snippet: string;
  editedAt: string;
  updatedAt: string;
}
export type DraftRemote = DraftMetadata & { payload: ForumEditorDraftPayload };

export class DraftMutationRejectedError extends Error {
  constructor(readonly status: number) {
    super("draft mutation rejected");
    this.name = "DraftMutationRejectedError";
  }
}

/** A local copy wins display priority only while it needs recovery or conflict resolution. */
export function localDraftNeedsAttention(local: LocalEditorDraft, server?: DraftMetadata): boolean {
  if (!server) return true;
  if (server.status !== "active") return local.draftId !== server.draftId;
  return local.draftId !== server.draftId || local.baseVersion !== server.version
    || local.editedAt !== local.syncedEditedAt;
}

const prefix = "vico:editor:draft:";

export function draftStorageKey(ownerId: string, contextKey: string) {
  return prefix + encodeURIComponent(ownerId) + ":" + encodeURIComponent(contextKey);
}
function validLocalDraft(value: unknown, ownerId: string, contextKey: string): value is LocalEditorDraft {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<LocalEditorDraft>;
  return data.ownerId === ownerId && data.contextKey === contextKey
    && isEditorDraftContextKey(contextKey)
    && typeof data.editedAt === "string"
    && Number.isFinite(Date.parse(data.editedAt))
    && Date.now() - Date.parse(data.editedAt) < DRAFT_LIFETIME_MS
    && typeof data.draftId === "string" && /^[0-9a-f-]{36}$/iu.test(data.draftId)
    && (data.attachmentDraftId === undefined
      || (typeof data.attachmentDraftId === "string" && /^[0-9a-f-]{36}$/iu.test(data.attachmentDraftId)))
    && Number.isSafeInteger(data.baseVersion) && data.baseVersion! >= 0
    && !!data.payload && typeof data.payload.body === "string"
    && typeof data.payload.title === "string" && typeof data.payload.tags === "string";
}
export function readLocalEditorDraft(ownerId: string, contextKey: string): LocalEditorDraft | null {
  try {
    const key = draftStorageKey(ownerId, contextKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validLocalDraft(parsed, ownerId, contextKey)) return parsed;
    localStorage.removeItem(key);
  } catch { /* Local storage may be disabled. */ }
  return null;
}
export function writeLocalEditorDraft(draft: LocalEditorDraft): boolean {
  try {
    localStorage.setItem(draftStorageKey(draft.ownerId, draft.contextKey), JSON.stringify(draft));
    return true;
  } catch { return false; }
}
export function clearLocalEditorDraft(ownerId: string, contextKey: string) {
  try { localStorage.removeItem(draftStorageKey(ownerId, contextKey)); } catch { /* no storage */ }
}
export function clearDeviceEditorDrafts(ownerId: string) {
  try {
    const start = prefix + encodeURIComponent(ownerId) + ":";
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) if (key?.startsWith(start)) localStorage.removeItem(key);
  } catch { /* no storage */ }
}
export function clearDeviceEditorData(ownerId: string) {
  clearDeviceEditorDrafts(ownerId);
  // These are the actual existing per-account editor preferences, not unrelated site data.
  try {
    for (const preference of ["mode", "code-wrap", "code-lines"]) {
      localStorage.removeItem("vico:editor:" + preference + ":" + ownerId);
    }
  } catch { /* Local storage may be unavailable. */ }
}
export function listLocalEditorDrafts(ownerId: string): LocalEditorDraft[] {
  try {
    const start = prefix + encodeURIComponent(ownerId) + ":";
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    const result: LocalEditorDraft[] = [];
    for (const key of keys) {
      if (!key?.startsWith(start)) continue;
      const contextKey = decodeURIComponent(key.slice(start.length));
      const draft = readLocalEditorDraft(ownerId, contextKey);
      if (draft) result.push(draft);
    }
    return result.sort((a, b) => b.editedAt.localeCompare(a.editedAt));
  } catch { return []; }
}
export function draftEndpoint(locale: string) {
  return "/" + encodeURIComponent(locale) + "/drafts/data";
}
export async function fetchDraftMetadata(locale: string): Promise<DraftMetadata[]> {
  const response = await fetch(draftEndpoint(locale) + "?mode=metadata", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("draft metadata unavailable");
  const data = await response.json() as { drafts: DraftMetadata[] };
  return data.drafts;
}
export async function fetchDraftContent(locale: string, contextKey: string): Promise<DraftRemote | null> {
  const url = draftEndpoint(locale) + "?mode=content&key=" + encodeURIComponent(contextKey);
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error("draft unavailable");
  const data = await response.json() as { draft: DraftRemote };
  return data.draft;
}
export async function mutateDraft(locale: string, data: Record<string, unknown>) {
  const response = await fetch(draftEndpoint(locale), {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (![200, 409, 410].includes(response.status)) {
    if (response.status >= 400 && response.status < 500) {
      throw new DraftMutationRejectedError(response.status);
    }
    throw new Error("draft mutation unavailable");
  }
  return response.json() as Promise<{
    outcome: "saved" | "conflict" | "gone" | "finished";
    version?: number;
    draft?: DraftRemote;
  }>;
}
export function draftDestination(locale: string, contextKey: string): string | null {
  const context = parseEditorDraftContextKey(contextKey);
  if (!context) return null;
  if (context.kind === "help") {
    return forumCategoryPath(locale, HELP_SOLUTIONS_CATEGORY_ID) + "?compose=1";
  }
  if (context.kind === "section") return forumSectionPath(locale, context.id);
  if (context.kind === "topic") return forumTopicPath(locale, context.id);
  return null; // Post editing is intentionally not routed until the edit workflow exists.
}
