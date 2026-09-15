import { createContext, type RouterContextProvider } from "react-router";
import type { AuthorizationManagementCapability } from "../../db/authorization-service";

export const authorizationContext = createContext<AuthorizationManagementCapability>();

export function authorizationForRequest(context: RouterContextProvider): AuthorizationManagementCapability {
  return context.get(authorizationContext);
}
