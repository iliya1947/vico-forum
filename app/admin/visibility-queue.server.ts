import { createContext, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import {
  HiddenQueueForbiddenError, HiddenQueueUnavailableError,
  type HiddenQueueQuery, type HiddenQueueReader, type HiddenInspectionTarget, type HiddenRevisionCursor,
} from "../../db/private-visibility-queue";

export const hiddenQueueContext = createContext<HiddenQueueReader>();
export const hiddenQueuePrivateHeaders = { "Cache-Control": "private, no-store" };

/**
 * Route-only entrypoint for privileged data. The reader independently checks
 * current effective visibility-management authority and active account state;
 * neither generic admin admission nor public forum readers grant access.
 */
export async function readHiddenQueue(context: RouterContextProvider, query: HiddenQueueQuery) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401, headers: hiddenQueuePrivateHeaders });
  try {
    return await context.get(hiddenQueueContext).list(session.user.id, query);
  } catch (error) {
    if (error instanceof HiddenQueueForbiddenError) {
      throw new Response("Forbidden", { status: 403, headers: hiddenQueuePrivateHeaders });
    }
    if (error instanceof HiddenQueueUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: hiddenQueuePrivateHeaders });
    }
    // Never expose unclassified private reader failures to the renderer.
    throw new Response("Unavailable", { status: 503, headers: hiddenQueuePrivateHeaders });
  }
}

/** Never allow a general Admin/History permission to substitute for this reader. */
export async function readHiddenInspection(context: RouterContextProvider, target: HiddenInspectionTarget) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401, headers: hiddenQueuePrivateHeaders });
  try {
    return await context.get(hiddenQueueContext).inspect(session.user.id, target);
  } catch (error) {
    if (error instanceof HiddenQueueForbiddenError) {
      throw new Response("Forbidden", { status: 403, headers: hiddenQueuePrivateHeaders });
    }
    // Missing History event, SQL errors and unclassified failures are private 503.
    throw new Response("Unavailable", { status: 503, headers: hiddenQueuePrivateHeaders });
  }
}

/** Post revision text never flows through a general Admin/History reader. */
export async function readHiddenPostRevisions(context:RouterContextProvider,
  target:Extract<HiddenInspectionTarget,{kind:"post"}>, before?:HiddenRevisionCursor) {
  const session=authSessionForRequest(context);
  if(!session)throw new Response("Unauthorized",{status:401,headers:hiddenQueuePrivateHeaders});
  try {
    return await context.get(hiddenQueueContext).revisions(session.user.id,target,before);
  } catch(error) {
    if(error instanceof HiddenQueueForbiddenError)
      throw new Response("Forbidden",{status:403,headers:hiddenQueuePrivateHeaders});
    throw new Response("Unavailable",{status:503,headers:hiddenQueuePrivateHeaders});
  }
}
