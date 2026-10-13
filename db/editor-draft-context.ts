export type EditorDraftContext =
  | { kind: "help"; id: null }
  | { kind: "section"; id: string }
  | { kind: "topic"; id: string }
  | { kind: "post"; id: string };

function wrappedId(value: string, prefix: string, suffix: string): string | null {
  if (!value.startsWith(prefix) || !value.endsWith(suffix)) return null;
  const id = value.slice(prefix.length, value.length - suffix.length);
  return id.length > 0 ? id : null;
}

export function parseEditorDraftContextKey(value: string): EditorDraftContext | null {
  if (value === "help:new") return { kind: "help", id: null };

  const sectionId = wrappedId(value, "section:", ":new");
  if (sectionId !== null) return { kind: "section", id: sectionId };

  const topicId = wrappedId(value, "topic:", ":reply");
  if (topicId !== null) return { kind: "topic", id: topicId };

  const postId = wrappedId(value, "post:", ":edit");
  if (postId !== null) return { kind: "post", id: postId };

  return null;
}

export function isEditorDraftContextKey(value: string): boolean {
  return parseEditorDraftContextKey(value) !== null;
}
