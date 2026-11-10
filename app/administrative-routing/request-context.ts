import { createContext, type RouterContextProvider } from "react-router";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "./addresses";

/** Request isolation: no module-global mutable routing state. */
export const administrativeRoutingContext = createContext<AdministrativeRouting | null>(null);
export function administrativeRoutingForRequest(context: RouterContextProvider): AdministrativeRouting {
  return context.get(administrativeRoutingContext) ?? defaultAdministrativeRouting;
}
