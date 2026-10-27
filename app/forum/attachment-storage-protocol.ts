/** One physical key is one initialization and one payload attempt; never reuse it. */
export const ATTACHMENT_UPLOAD_PREFIX = "private/fenced-v1/";
export const ATTACHMENT_RESERVATION_KIND = "vico-reservation-v1";
export function isFencedAttachmentKey(key: string): boolean {
  return /^private\/fenced-v1\/[0-9a-f-]{36}$/iu.test(key);
}
