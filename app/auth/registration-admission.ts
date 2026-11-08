import type { BetterAuthOptions } from "better-auth";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { forumRegistrationSettings } from "../../db/schema";
import { RegistrationSettingsInvariantError } from "../../db/registration-settings";

type UserInfoValidator = NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]>;

/**
 * Better Auth 1.7.7 invokes this gate only at the actual user-provisioning seam.
 * An OAuth sign-in or explicit account link is not new registration.
 */
export function createRegistrationAdmission(database: NodePgDatabase): UserInfoValidator {
  return async ({ source }) => {
    if (source.action !== "create-user") return;

    const method = source.method === "email-password"
      ? "email" : source.method === "oauth" && source.oauth?.providerId === "google"
        ? "google" : null;
    // Do not silently open unsupported registration methods added by future auth plugins.
    if (!method) {
      return { error: "vico_registration_method_unsupported", errorDescription: "This registration method is unavailable." };
    }

    // No module-level cache: each new-user creation checks the current PostgreSQL singleton.
    const rows = await database.select({
      googleRegistrationEnabled: forumRegistrationSettings.googleRegistrationEnabled,
      emailRegistrationEnabled: forumRegistrationSettings.emailRegistrationEnabled,
    }).from(forumRegistrationSettings).where(eq(forumRegistrationSettings.id, 1));

    if (rows.length !== 1 || typeof rows[0].googleRegistrationEnabled !== "boolean"
      || typeof rows[0].emailRegistrationEnabled !== "boolean") {
      throw new RegistrationSettingsInvariantError("Registration settings singleton is missing or invalid");
    }

    if (method === "google" && !rows[0].googleRegistrationEnabled) {
      return { error: "vico_google_registration_closed", errorDescription: "New Google registrations are closed." };
    }
    if (method === "email" && !rows[0].emailRegistrationEnabled) {
      return { error: "vico_email_registration_closed", errorDescription: "New email registrations are closed." };
    }
  };
}
