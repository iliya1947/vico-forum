import { createContext, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import type { OwnerUserProfileReader, OwnerUserProfileSnapshot } from "../../db/owner-user-profile";

export const ownerProfileContext = createContext<OwnerUserProfileReader>();

export interface AuthorizedOwnerProfileReader {
  readTarget(targetId: string, before?: string): Promise<OwnerUserProfileSnapshot | null>;
}

/**
 * Optional profile section admission: no reader is resolved and no cursor is parsed for
 * guests, ordinary administrators or a missing/mismatched trusted Owner binding.
 * The actor/session are always taken from this request's Better Auth context.
 */
export function ownerProfileForRequest(context: RouterContextProvider): AuthorizedOwnerProfileReader | null {
  const session = authSessionForRequest(context);
  if (!session || !isBoundOwner(session.user.id, context.get(authorizationOwnerContext))) return null;
  const reader = context.get(ownerProfileContext);
  return {
    readTarget: (targetId, before) => reader.readTarget({
      targetId, viewerUserId: session.user.id, currentSessionId: session.session.id, before,
    }),
  };
}
