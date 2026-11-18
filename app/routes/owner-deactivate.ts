import type { RouterContextProvider } from "react-router";
import { requireSameOrigin } from "../forum/mutations.server";
import { ownerAccountLifecycleContext } from "../profile/request-context";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import { OwnerAccountLifecycleUnavailableError } from "../../db/hyperdrive-owner-account-lifecycle";
import { OwnerAccountLifecycleCommitUncertainError, OwnerAccountLifecycleConflictError,
  OwnerAccountLifecycleForbiddenError, OwnerAccountLifecycleTargetMissingError,
  OwnerAccountLifecycleValidationError, validateOwnerAccountDeactivationInput } from "../../db/owner-account-lifecycle";

type Args = { request: Request; params: { userId?: string }; context: RouterContextProvider };
const fields = ["intent", "expectedActorId", "targetUserId", "operationId"] as const;
const MAX_FORM_BYTES = 4096;
export function headers() { return superAdminPrivateHeaders; }

function failure(status: number, message: string): Response {
  return new Response(message, { status, headers: { ...superAdminPrivateHeaders,
    ...(status === 405 ? { Allow: "POST" } : {}) } });
}
function httpError(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof AccountInactiveError || error instanceof AccountMissingError) return failure(401, "Unauthenticated");
  if (error instanceof OwnerAccountLifecycleForbiddenError) return failure(403, "Forbidden");
  if (error instanceof OwnerAccountLifecycleValidationError) return failure(400, "Invalid request");
  if (error instanceof OwnerAccountLifecycleConflictError) return failure(409, "Conflict");
  if (error instanceof OwnerAccountLifecycleTargetMissingError) return failure(404, "Not Found");
  // An uncertain acknowledgement is never a claim that the transaction rolled back.
  if (error instanceof OwnerAccountLifecycleUnavailableError || error instanceof AccountStateUnavailableError
    || error instanceof OwnerAccountLifecycleCommitUncertainError) {
    return failure(503, "Service unavailable");
  }
  return failure(500, "Unexpected server failure");
}

async function boundedForm(request: Request): Promise<URLSearchParams> {
  if (request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/x-www-form-urlencoded") {
    throw new OwnerAccountLifecycleValidationError();
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new OwnerAccountLifecycleValidationError();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_FORM_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new OwnerAccountLifecycleValidationError();
        }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const form = new URLSearchParams();
    // URLSearchParams alone replaces malformed percent-encoded UTF-8. Opaque
    // account identities must instead decode exactly, without lossy substitution.
    for (const entry of text.split("&")) {
      const at = entry.indexOf("=");
      const key = at < 0 ? entry : entry.slice(0, at), value = at < 0 ? "" : entry.slice(at + 1);
      form.append(decodeURIComponent(key.replace(/\+/g, " ")), decodeURIComponent(value.replace(/\+/g, " ")));
    }
    if ([...form.keys()].some(key => !(fields as readonly string[]).includes(key))
      || fields.some(key => form.getAll(key).length !== 1) || form.get("intent") !== "deactivate") {
      throw new OwnerAccountLifecycleValidationError();
    }
    return form;
  } catch { throw new OwnerAccountLifecycleValidationError(); }
}

/** This resource has no page; even GET/HEAD check Owner before returning 405. */
export function loader({ context }: Args): Response {
  try { requireSuperAdmin(context); return failure(405, "Method Not Allowed"); }
  catch (error) { return httpError(error); }
}
export async function action({ request, params, context }: Args): Promise<Response> {
  try {
    const actorId = requireSuperAdmin(context);
    if (request.method !== "POST") return failure(405, "Method Not Allowed");
    if (!requireSameOrigin(request)) return failure(403, "Forbidden");
    const form = await boundedForm(request);
    const input = validateOwnerAccountDeactivationInput({ actorId: form.get("expectedActorId")!,
      targetId: form.get("targetUserId")!, operationId: form.get("operationId")! });
    if (input.targetId !== params.userId) return failure(400, "Invalid request");
    if (input.actorId !== actorId) return failure(409, "Conflict");
    const result = await context.get(ownerAccountLifecycleContext).deactivate({
      actorId, targetId: input.targetId, operationId: input.operationId,
    });
    const { targetUserId, state, changed, deactivatedAt, retainAtLeastUntil, eventId } = result;
    return Response.json({ targetUserId, state, changed, deactivatedAt, retainAtLeastUntil, eventId },
      { headers: superAdminPrivateHeaders });
  } catch (error) { return httpError(error); }
}
