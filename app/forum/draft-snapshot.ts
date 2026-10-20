import type { ForumEditorDraftPayload } from "../../db/schema";

export function sameDraftText(a: ForumEditorDraftPayload, b: ForumEditorDraftPayload): boolean {
  const withoutAttachments = (payload: ForumEditorDraftPayload) => {
    const text = { ...payload };
    delete text.draftAttachmentIds;
    delete text.retainedAttachmentIds;
    return text;
  };
  const left = withoutAttachments(a), right = withoutAttachments(b);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].every((key) =>
    left[key as keyof typeof left] === right[key as keyof typeof right]);
}

/** Only a common authoritative base proves removal vs retention. New, unrelated
 * sets are never unioned; unsynced candidates have no trustworthy time ordering.
 */
export function keptAttachmentSelection(
  a: ForumEditorDraftPayload, b: ForumEditorDraftPayload, base: ForumEditorDraftPayload | undefined,
): string[] | null {
  if (!base?.draftAttachmentIds || !a.draftAttachmentIds || !b.draftAttachmentIds || !sameDraftText(a, b)) return null;
  const original = new Set(base.draftAttachmentIds);
  const left = new Set(a.draftAttachmentIds), right = new Set(b.draftAttachmentIds);
  const different = [...new Set([...left, ...right])].filter((id) => left.has(id) !== right.has(id));
  if (different.some((id) => !original.has(id))) return null;
  return [...new Set([...left, ...right])].sort();
}
