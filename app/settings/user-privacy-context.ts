import { createContext } from "react-router";
import type { UserPrivacyCapability } from "../../db/hyperdrive-user-privacy";

/** Own-account privacy state; routes must supply the authenticated session ID. */
export const userPrivacyContext = createContext<UserPrivacyCapability>();
