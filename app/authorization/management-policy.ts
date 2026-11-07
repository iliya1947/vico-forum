import { isBoundOwner } from "./owner";

/** Current-release policy for authorization writes; delegation needs an explicit future decision. */
export function canMutateAuthorization(actorId: string, serverOwnerUserId: unknown): boolean {
  return isBoundOwner(actorId, serverOwnerUserId);
}
