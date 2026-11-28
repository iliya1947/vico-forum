import { createContext, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest, authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { AuthorizationNotFoundError } from "../../db/authorization-repository";
import { AccountMissingError } from "../../db/account-state";
import { forumReaderForRequest } from "../forum/request-context";
import { measureRestrictionsForPresentation } from "../measures/presentation.server";
import { localeContext } from "../localization/request-context";
import { administrativeRoutingForRequest } from "../administrative-routing/request-context";
import { projectDisclosure } from "./disclosure.server";

/** Only request-local canonical dependencies; no model, network provider or write capability. */
export function createConsultantDependencies(context: RouterContextProvider,
  assertActive: (actorId: string) => Promise<void>, enabled: boolean) {
  return {
    enabled, assertActive,
    session: () => authSessionForRequest(context),
    locale: () => context.get(localeContext).translationLocale,
    routing: () => administrativeRoutingForRequest(context),
    reader: () => forumReaderForRequest(context),
    restrictions: (actor: string) => measureRestrictionsForPresentation(context, actor),
    async disclosure(actor: string) {
      try {
        const snapshot = await authorizationForRequest(context).forUser(actor).resolve();
        return projectDisclosure(snapshot, isBoundOwner(actor, context.get(authorizationOwnerContext)));
      } catch (error) {
        if (error instanceof AuthorizationUnavailableError) return projectDisclosure(null, false);
        // A missing actor after the AccountState read is not an admitted user.
        // Missing role/catalog invariants remain unexpected errors, not permission denials.
        if (error instanceof AuthorizationNotFoundError && error.message === "user does not exist") {
          throw new AccountMissingError();
        }
        throw error;
      }
    },
  };
}
export type ConsultantDependencies = ReturnType<typeof createConsultantDependencies>;
export const consultantDependenciesContext = createContext<ConsultantDependencies>();
