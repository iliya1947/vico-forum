import { data, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { requireSameOrigin } from "../forum/mutations.server";
import { complaintSubmissionContext } from "../complaints/request-context";
import type { ComplaintSubmissionResponse } from "../complaints/response";
import { ComplaintConflictError, ComplaintForbiddenError, ComplaintInputError, ComplaintNotFoundError,
  ComplaintRateLimitError } from "../../db/complaints-domain";
import { complaintId, complaintReason } from "../../db/complaints-domain";
import { ComplaintStorageUnavailableError } from "../../db/hyperdrive-complaints";

const privateHeaders = { "Cache-Control": "private, no-store" };
export function headers({ actionHeaders }: { actionHeaders: Headers }): Headers {
  const result = new Headers(privateHeaders);
  const retry = actionHeaders.get("Retry-After");
  if (retry) result.set("Retry-After", retry);
  return result;
}
export function loader() { throw new Response("Method Not Allowed", { status:405, headers:{ ...privateHeaders, Allow:"POST" } }); }

function failure(error: Exclude<ComplaintSubmissionResponse, { ok: true }>["error"], status: number, retryAfterSeconds?: number) {
  return data<ComplaintSubmissionResponse>({ error, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) }, {
    status, headers:{ ...privateHeaders, ...(retryAfterSeconds ? { "Retry-After":String(retryAfterSeconds) } : {}) },
  });
}

export async function action({ request, params, context }: {
  request: Request; params: { topicId?: string }; context: RouterContextProvider;
}): Promise<Response | ReturnType<typeof failure>> {
  if (request.method !== "POST") return new Response(null, { status:405, headers:{ ...privateHeaders, Allow:"POST" } });
  const session = authSessionForRequest(context);
  if (!session) return failure("unauthenticated",401);
  if (!requireSameOrigin(request)) return failure("forbidden",403);
  try {
    if (!(await authorizationForRequest(context).forUser(session.user.id).has("forum.complaint.create"))) return failure("forbidden",403);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return failure("invalid",400);
    const reader = request.body?.getReader();
    if (!reader) return failure("invalid",400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 32_768) { await reader.cancel(); return failure("invalid",413); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
    let form: URLSearchParams;
    try { form = new URLSearchParams(new TextDecoder("utf-8", { fatal:true }).decode(bytes)); }
    catch { return failure("invalid",400); }
    for (const name of ["kind","postId","revisionId","reason","explanation","operationId"]) {
      if (form.getAll(name).length > 1) return failure("invalid",400);
    }
    const kind = form.get("kind");
    if (kind !== "post" && kind !== "topic-title") return failure("invalid",400);
    const topicId = complaintId(params.topicId), revisionId = complaintId(form.get("revisionId"));
    const operationId = complaintId(form.get("operationId"));
    await context.get(complaintSubmissionContext).submit(session.user.id, {
      target:kind === "post"
        ? { kind,topicId,postId:complaintId(form.get("postId")),revisionId }
        : { kind,topicId,revisionId },
      operationId, reason:complaintReason(form.get("reason")),
      explanation:form.get("explanation"),
    });
    return data<ComplaintSubmissionResponse>({ ok:true, operationId }, { headers:privateHeaders });
  } catch (error) {
    if (error instanceof ComplaintInputError) return failure("invalid",400);
    if (error instanceof ComplaintForbiddenError) return failure("forbidden",403);
    if (error instanceof ComplaintNotFoundError) return failure("notFound",404);
    if (error instanceof ComplaintConflictError) return failure("conflict",409);
    if (error instanceof ComplaintRateLimitError) return failure("rateLimited",429,Math.max(1,Math.ceil(error.retryAfterMs/1000)));
    if (error instanceof ComplaintStorageUnavailableError || error instanceof AuthorizationUnavailableError) return failure("unavailable",503);
    throw error;
  }
}
