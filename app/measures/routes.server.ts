import { data, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { requireSameOrigin } from "../forum/mutations.server";
import { InvalidUserMeasureInputError, UserMeasureConflictError, UserMeasureNotFoundError } from "../../db/user-measures";
import { UserMeasureConfigurationUnavailableError, UserMeasureForbiddenError } from "../../db/user-measure-authority";
import { UserMeasuresUnavailableError } from "../../db/hyperdrive-user-measures";

export const measurePrivateHeaders = { "Cache-Control": "private, no-store" } as const;
export type MeasureActionError = "invalid" | "unauthenticated" | "forbidden" | "notFound" | "conflict" | "unavailable";
export function measureFailure(error: MeasureActionError, status: number) {
  return data({ error }, { status, headers: measurePrivateHeaders });
}
function mappedMeasureError(error: unknown): [MeasureActionError, number] {
  if (error instanceof Response) throw error;
  if (error instanceof InvalidUserMeasureInputError) return ["invalid",400];
  if (error instanceof UserMeasureForbiddenError) return ["forbidden",403];
  if (error instanceof UserMeasureNotFoundError) return ["notFound",404];
  if (error instanceof UserMeasureConflictError) return ["conflict",409];
  if (error instanceof UserMeasuresUnavailableError || error instanceof AuthorizationUnavailableError ||
      error instanceof UserMeasureConfigurationUnavailableError) return ["unavailable",503];
  throw error;
}
export function measureResponseError(error: unknown): Response {
  const [message,status]=mappedMeasureError(error);
  return new Response(message,{status,headers:measurePrivateHeaders});
}
export function measureActionError(error: unknown) {
  const [message,status]=mappedMeasureError(error);
  return measureFailure(message,status);
}
export function requireMeasureSession(context: RouterContextProvider): string {
  const id = authSessionForRequest(context)?.user.id;
  if (!id) throw new Response("unauthenticated", { status:401, headers:measurePrivateHeaders });
  return id;
}
export async function requireMeasureManager(context: RouterContextProvider): Promise<string> {
  const actorId = requireMeasureSession(context);
  try {
    if (!(await authorizationForRequest(context).forUser(actorId).has("admin.users.blocks.manage"))) {
      throw new UserMeasureForbiddenError();
    }
    return actorId;
  } catch (error) {
    throw measureResponseError(error);
  }
}
export function measureUuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidUserMeasureInputError("expected UUID");
  }
  return value.toLowerCase();
}
export function measureTargetId(value: unknown): string {
  if (typeof value !== "string" || !value || value.trim() !== value ||
      value.includes("\0") || new TextEncoder().encode(value).length > 2048) {
    throw new InvalidUserMeasureInputError("invalid target ID");
  }
  return value;
}
export function measureFormText(form: FormData, key: string): string {
  const value = form.getAll(key);
  if (value.length !== 1 || typeof value[0] !== "string") throw new InvalidUserMeasureInputError("invalid form");
  return value[0];
}
export function measureOptionalInstant(form: FormData) {
  const value = measureFormText(form,"expiresAt");
  return value.trim() === "" ? null : value;
}
export async function readMeasureForm(request: Request, allowed: readonly string[]): Promise<FormData> {
  if (request.method !== "POST") throw new Response("Method not allowed", { status:405,
    headers:{...measurePrivateHeaders,Allow:"POST"} });
  if (!requireSameOrigin(request)) throw new UserMeasureForbiddenError();
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    throw new InvalidUserMeasureInputError("invalid content type");
  }
  if (Number(request.headers.get("Content-Length") ?? 0) > 32768) {
    throw new InvalidUserMeasureInputError("form too large");
  }
  const form = await request.formData();
  const keys = new Set(allowed);
  for (const key of form.keys()) {
    if (!keys.has(key)) throw new InvalidUserMeasureInputError("unexpected field");
  }
  // No ambiguous duplicate form fields except the explicit restriction checkbox group.
  for (const key of keys) {
    if (key !== "restriction" && form.getAll(key).length > 1) {
      throw new InvalidUserMeasureInputError("duplicate field");
    }
  }
  return form;
}
export function measureFormRestrictions(form: FormData): unknown {
  const selected = form.getAll("restriction");
  if (selected.some(value => typeof value !== "string")) throw new InvalidUserMeasureInputError("invalid restriction");
  return selected;
}
