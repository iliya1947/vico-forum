import { createContext } from "react-router";
import type { RegistrationSettings, RegistrationSettingsUpdate } from "../../db/registration-settings";

/** Request-local registration policy capability. The DB repository independently checks Owner binding on writes. */
export interface RegistrationSettingsCapability {
  read(): Promise<RegistrationSettings>;
  update(actorId: string, input: RegistrationSettingsUpdate): Promise<RegistrationSettings>;
}
export const registrationSettingsContext = createContext<RegistrationSettingsCapability>();
