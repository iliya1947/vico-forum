import { CONSULTANT_MAX_BODY_BYTES, CONSULTANT_MAX_QUESTION_LENGTH, isConsultantFeature, type ConsultantPage, type ConsultantRequest } from "./contract";

export class ConsultantInputError extends Error {
  constructor(readonly status: 400 | 413 | 415 = 400) { super("Invalid consultant request"); }
}
type RecordValue = Record<string, unknown>;
function record(value: unknown, allowed: readonly string[]): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key))) throw new ConsultantInputError();
  return value as RecordValue;
}
function string(value: unknown, limit: number, blank = false): string {
  if (typeof value !== "string" || value.length > limit || (!blank && !value.trim()) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new ConsultantInputError();
  return value;
}
function id(value: unknown): string {
  const parsed = string(value, 200);
  if (parsed.trim() !== parsed || parsed === "." || parsed === ".." || /[\r\n\t]/u.test(parsed)) throw new ConsultantInputError();
  return parsed;
}
function randomId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ConsultantInputError();
  return value;
}
function page(value: unknown): ConsultantPage {
  const kind = record(value, ["kind", "term", "topicId", "postId", "categoryId", "sectionId", "destination", "tagIds"]).kind;
  switch (kind) {
    case "none": record(value, ["kind"]); return { kind };
    case "search": return { kind, term: string(record(value, ["kind", "term"]).term, 200, true) };
    case "topic": {
      const p = record(value, ["kind", "topicId", "postId"]);
      return { kind, topicId: id(p.topicId), ...(p.postId === undefined ? {} : { postId: id(p.postId) }) };
    }
    case "category": return { kind, categoryId: id(record(value, ["kind", "categoryId"]).categoryId) };
    case "section": return { kind, sectionId: id(record(value, ["kind", "sectionId"]).sectionId) };
    case "editor": {
      const p = record(value, ["kind", "destination", "sectionId", "tagIds"]);
      if (p.destination !== "help" && p.destination !== "section") throw new ConsultantInputError();
      if (p.destination === "help" && p.sectionId !== undefined) throw new ConsultantInputError();
      if (p.tagIds !== undefined && (!Array.isArray(p.tagIds) || p.tagIds.length > 8)) throw new ConsultantInputError();
      const tags = Array.isArray(p.tagIds) ? { tagIds: p.tagIds.map(id) } : {};
      return p.destination === "section" ? { kind, destination: "section", sectionId: id(p.sectionId), ...tags }
        : { kind, destination: "help", ...tags };
    }
    default: throw new ConsultantInputError();
  }
}
export function parseConsultantRequest(value: unknown): ConsultantRequest {
  const input = record(value, ["consultationId", "turnId", "question", "page", "continuation"]);
  const c = input.continuation === undefined ? undefined : record(input.continuation, ["selectedFeature", "selectedTopicId"]);
  const selectedFeature = c?.selectedFeature;
  if (selectedFeature !== undefined && !isConsultantFeature(selectedFeature)) throw new ConsultantInputError();
  return {
    consultationId: randomId(input.consultationId), turnId: randomId(input.turnId),
    question: string(input.question, CONSULTANT_MAX_QUESTION_LENGTH).trim(),
    page: page(input.page),
    ...(c === undefined ? {} : { continuation: {
      ...(selectedFeature === undefined ? {} : { selectedFeature }),
      ...(c.selectedTopicId === undefined ? {} : { selectedTopicId: id(c.selectedTopicId) }),
    } }),
  };
}

export async function readConsultantRequest(request: Request): Promise<ConsultantRequest> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ConsultantInputError(415);
  const length = request.headers.get("Content-Length");
  if (length !== null && Number(length) > CONSULTANT_MAX_BODY_BYTES) throw new ConsultantInputError(413);
  if (!request.body) throw new ConsultantInputError();
  const reader = request.body.getReader();
  const buffer = new Uint8Array(CONSULTANT_MAX_BODY_BYTES);
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > buffer.byteLength) {
        await reader.cancel().catch(() => undefined);
        throw new ConsultantInputError(413);
      }
      buffer.set(value, offset);
      offset += value.byteLength;
    }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset))); }
    catch { throw new ConsultantInputError(); }
    return parseConsultantRequest(input);
  } finally { reader.releaseLock(); }
}
