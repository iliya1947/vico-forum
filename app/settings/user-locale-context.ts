import { createContext } from "react-router";
import type { UserLocaleWriter } from "../../db/hyperdrive-user-locale";

/** Only the authenticated request actor may be passed to this capability. */
export const userLocaleWriterContext = createContext<UserLocaleWriter>();
