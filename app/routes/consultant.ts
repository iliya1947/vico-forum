import type { RouterContextProvider } from "react-router";
import { requireSameOrigin } from "../forum/mutations.server";
import { consultantDependenciesContext } from "../consultant/dependencies.server";
import { ConsultantInputError, readConsultantRequest } from "../consultant/input.server";
import { navigateConsultant } from "../consultant/navigation.server";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";

const privacy = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function headers() { return privacy; }
function failure(status: number, error: string) {
  return Response.json({ error }, { status, headers: { ...privacy, ...(status === 405 ? { Allow: "POST" } : {}) } });
}
export function loader() { return failure(405, "method"); }

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  if (request.method !== "POST") return failure(405, "method");
  if (!requireSameOrigin(request)) return failure(403, "origin");
  const deps = context.get(consultantDependenciesContext);
  // Worker initializes the canonical Better Auth session once per request;
  // that runtime resolves the current AccountState and suppresses inactive accounts.
  const session = deps.session();
  if (!session || !session.user.id || session.session.userId !== session.user.id ||
    !(session.session.expiresAt instanceof Date) || session.session.expiresAt.getTime() <= Date.now() ||
    !Number.isFinite(session.session.expiresAt.getTime())) return failure(401, "unauthenticated");
  if (!deps.enabled) return failure(503, "unavailable");
  let input;
  try { input = await readConsultantRequest(request); }
  catch (error) {
    if (error instanceof ConsultantInputError) return failure(error.status, "invalid");
    throw error;
  }
  try {
    // The canonical pre-routing session is live. Check AccountState again after
    // reading the bounded request body, before resolving permissions or context.
    if (session.session.expiresAt.getTime() <= Date.now()) return failure(401, "unauthenticated");
    await deps.assertActive(session.user.id);
    const disclosure = await deps.disclosure(session.user.id);
    const result = await navigateConsultant(input, session.user.id, disclosure, deps);
    return Response.json(result, { headers: privacy });
  } catch (error) {
    if (error instanceof AccountInactiveError || error instanceof AccountMissingError) return failure(401, "unauthenticated");
    if (error instanceof AccountStateUnavailableError) return failure(503, "unavailable");
    throw error;
  }
}
