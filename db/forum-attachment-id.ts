/** Browser-safe attachment UUID check, reused by production storage. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export function isForumAttachmentUuid(value: string): boolean {
  return uuid.test(value);
}
