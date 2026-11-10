import { createContext, useContext, type ReactNode } from "react";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "./addresses";

const RoutingContext = createContext<AdministrativeRouting>(defaultAdministrativeRouting);

/** Static current default; test/future integrations can replace it per React tree. */
export function AdministrativeRoutingProvider({ routing = defaultAdministrativeRouting, children }: {
  routing?: AdministrativeRouting; children: ReactNode;
}) {
  return <RoutingContext.Provider value={routing}>{children}</RoutingContext.Provider>;
}
export function useAdministrativeRouting(): AdministrativeRouting {
  return useContext(RoutingContext);
}
