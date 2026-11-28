import { getSessionFromCtx } from "better-auth/api";

/** Native signed-cookie validation with an authoritative, non-refreshing read.
 * Pinned getSessionFromCtx swallows adapter failures; preserve their original
 * cause so own commands distinguish unavailable storage from a missing session.
 */
export async function readOwnSession(ctx: Parameters<typeof getSessionFromCtx>[0]) {
  let readFailure: { error: unknown } | undefined;
  const adapter = ctx.context.internalAdapter;
  const current = await getSessionFromCtx({ ...ctx, context: { ...ctx.context, session: null,
    internalAdapter: { ...adapter, async findSession(...args) {
      try { return await adapter.findSession(...args); }
      catch (error) { readFailure = { error }; throw error; }
    } },
  } }, { disableCookieCache: true, disableRefresh: true });
  if (readFailure) throw readFailure.error;
  return current;
}
