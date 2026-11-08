import type { Pool, PoolClient } from "pg";
import { isBoundOwner } from "../app/authorization/owner";
import { appendRegistrationSettingsHistory } from "./admin-history";

export interface RegistrationFlags {
  googleRegistrationEnabled: boolean;
  emailRegistrationEnabled: boolean;
}
export interface RegistrationSettings extends RegistrationFlags {
  version: number;
  updatedAt: string;
}
export interface RegistrationSettingsUpdate extends RegistrationFlags {
  expectedVersion: number;
}
export class RegistrationSettingsForbiddenError extends Error {}
export class RegistrationSettingsConflictError extends Error {}
export class RegistrationSettingsValidationError extends Error {}
export class RegistrationSettingsInvariantError extends Error {}

interface RegistrationRow {
  google_registration_enabled: boolean;
  email_registration_enabled: boolean;
  version: number;
  updated_at: Date;
}
const settingsSelect = `select google_registration_enabled, email_registration_enabled, version, updated_at
  from forum_registration_settings where id = 1`;
function parseRegistrationSettings(rows: RegistrationRow[]): RegistrationSettings {
  if (rows.length !== 1) throw new RegistrationSettingsInvariantError("Registration settings singleton is missing");
  const row = rows[0];
  if (typeof row.google_registration_enabled !== "boolean" || typeof row.email_registration_enabled !== "boolean"
    || !Number.isSafeInteger(row.version) || row.version < 1 || !(row.updated_at instanceof Date)
    || !Number.isFinite(row.updated_at.valueOf())) {
    throw new RegistrationSettingsInvariantError("Invalid registration settings singleton");
  }
  return {
    googleRegistrationEnabled: row.google_registration_enabled,
    emailRegistrationEnabled: row.email_registration_enabled,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}
function validateUpdate(input: RegistrationSettingsUpdate): void {
  if (typeof input.googleRegistrationEnabled !== "boolean" || typeof input.emailRegistrationEnabled !== "boolean"
    || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1 || input.expectedVersion > 2147483647) {
    throw new RegistrationSettingsValidationError("Invalid registration settings update");
  }
}

/** Reads current DB policy every time. Never uses missing-row defaults. */
export class PostgresRegistrationSettingsRepository {
  constructor(private readonly database: Pick<Pool, "query" | "connect">) {}

  async read(): Promise<RegistrationSettings> {
    const result = await this.database.query<RegistrationRow>(settingsSelect);
    return parseRegistrationSettings(result.rows);
  }

  /** Actor/binding must come from the authenticated trusted request context. */
  async update(actorId: string, ownerBinding: unknown, input: RegistrationSettingsUpdate): Promise<RegistrationSettings> {
    validateUpdate(input);
    if (!isBoundOwner(actorId, ownerBinding)) {
      throw new RegistrationSettingsForbiddenError("Only the bound Owner may update registration");
    }
    const client: PoolClient = await this.database.connect();
    try {
      await client.query("begin");
      const user = await client.query('select id from "user" where id = $1', [actorId]);
      if (user.rowCount !== 1) throw new RegistrationSettingsForbiddenError("Owner account does not exist");
      const locked = await client.query<RegistrationRow>(settingsSelect + " for update");
      const before = parseRegistrationSettings(locked.rows);
      if (before.version !== input.expectedVersion) throw new RegistrationSettingsConflictError("Stale registration settings version");
      if (before.googleRegistrationEnabled === input.googleRegistrationEnabled
        && before.emailRegistrationEnabled === input.emailRegistrationEnabled) {
        await client.query("commit");
        return before;
      }
      if (before.version >= 2147483647) throw new RegistrationSettingsConflictError("Registration settings version exhausted");
      const saved = await client.query<RegistrationRow>(
        `update forum_registration_settings set google_registration_enabled=$1, email_registration_enabled=$2,
          version=version+1, updated_at=clock_timestamp() where id=1
          returning google_registration_enabled, email_registration_enabled, version, updated_at`,
        [input.googleRegistrationEnabled, input.emailRegistrationEnabled]);
      const after = parseRegistrationSettings(saved.rows);
      await appendRegistrationSettingsHistory(client, actorId, {
        action: "settings.registrationChanged", targetType: "forum-settings", targetId: "registration",
        targetLabel: "Registration",
        context: {
          before: { googleRegistrationEnabled: before.googleRegistrationEnabled,
            emailRegistrationEnabled: before.emailRegistrationEnabled, version: before.version },
          after: { googleRegistrationEnabled: after.googleRegistrationEnabled,
            emailRegistrationEnabled: after.emailRegistrationEnabled, version: after.version },
        },
      });
      await client.query("commit");
      return after;
    } catch (error) {
      try { await client.query("rollback"); } catch { /* Preserve original error. */ }
      throw error;
    } finally {
      client.release();
    }
  }
}
