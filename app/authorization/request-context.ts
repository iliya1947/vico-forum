import { createContext, type RouterContextProvider } from "react-router";
import type { AuthorizationManagementCapability } from "../../db/authorization-service";

export const authorizationContext = createContext<AuthorizationManagementCapability>();
/** Server-bound owner ID, never supplied by a request or authorization snapshot. */
export const authorizationOwnerContext = createContext<string | undefined>(undefined);

export function authorizationForRequest(context: RouterContextProvider): AuthorizationManagementCapability {
  return context.get(authorizationContext);
}
