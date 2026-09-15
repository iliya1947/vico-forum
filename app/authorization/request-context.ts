import { createContext, type RouterContextProvider } from "react-router";
import type { AuthorizationCapability } from "../../db/authorization-service";

export const authorizationContext = createContext<AuthorizationCapability>();

export function authorizationForRequest(context: RouterContextProvider): AuthorizationCapability {
  return context.get(authorizationContext);
}
