import type { ForumEditorDraftPayload } from "../../db/schema";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "./paths";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-identifiers";

export const DRAFT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export interface LocalEditorDraft {
  ownerId: string;
  contextKey: string;
  draftId: string;
  payload: ForumEditorDraftPayload;
  editedAt: string;
  baseVersion: number;
  syncedEditedAt: string | null;
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

const prefix = "vico:editor:draft:";

export function draftStorageKey(ownerId: string, contextKey: string) {
  return prefix + encodeURIComponent(ownerId) + ":" + encodeURIComponent(contextKey);
}
function validLocalDraft(value: unknown, ownerId: string, contextKey: string): value is LocalEditorDraft {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<LocalEditorDraft>;
  return data.ownerId === ownerId && data.contextKey === contextKey
    && typeof data.editedAt === "string"
    && Number.isFinite(Date.parse(data.editedAt))
    && Date.now() - Date.parse(data.editedAt) < DRAFT_LIFETIME_MS
    && Date.parse(data.editedAt) < Date.now() + 60_000
    && typeof data.draftId === "string" && /^[0-9a-f-]{36}$/iu.test(data.draftId)
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
  if (![200, 409, 410].includes(response.status)) throw new Error("draft mutation unavailable");
  return response.json() as Promise<{
    outcome: "saved" | "conflict" | "gone" | "finished";
    version?: number;
    draft?: DraftRemote;
  }>;
}
export function draftDestination(locale: string, contextKey: string): string | null {
  if (contextKey === "help:new") return forumCategoryPath(locale, HELP_SOLUTIONS_CATEGORY_ID) + "?compose=1";
  const match = /^(section|topic|post):([a-zA-Z0-9_-]+):(new|reply|edit)$/u.exec(contextKey);
  if (!match) return null;
  if (match[1] === "section" && match[3] === "new") return forumSectionPath(locale, match[2]!);
  if (match[1] === "topic" && match[3] === "reply") return forumTopicPath(locale, match[2]!);
  return null; // Post editing is intentionally not routed until the edit workflow exists.
}
