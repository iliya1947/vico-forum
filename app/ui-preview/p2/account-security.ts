import {
  AccountSecurityError,
  type AccountSecurityIdentity,
  type AccountSecurityRuntime,
  type AuthSession,
} from "../../auth/request-context";
import { safeDeviceLabel } from "../../auth/session-label";
import type { PreviewRawBaseline, PreviewRawUser } from "./raw-baseline";

/** Better Auth 1.7.7 default freshAge is 24 hours, in seconds. */
const DEFAULT_FRESH_AGE_MS = 24 * 60 * 60 * 1000;

/** B7a deliberately has no write adapter. B7b will implement mutations separately. */
export class P2AccountSecurityWriteNotConfiguredError extends Error {
  constructor(operation: string) {
    super("P2 AccountSecurity write not configured: " + operation);
    this.name = "P2AccountSecurityWriteNotConfiguredError";
  }
}

/**
 * Read-only projection through the original production AccountSecurityRuntime.
 * The selected identity is resolved from the request's trusted AuthRuntime,
 * never from Cookie, User-Agent, role, Owner or form fields.
 */
export function createP2AccountSecurityRuntime(
  baseline: PreviewRawBaseline,
  selectedSession: () => AuthSession | null,
  transientAccount: (userId: string) => PreviewRawUser | undefined,
): AccountSecurityRuntime {
  return {
    async read(headers: Headers, identity: AccountSecurityIdentity) {
      void headers; // A preview request cannot override its controller-selected actor.
      const selected = selectedSession();
      if (!selected) throw new AccountSecurityError("unauthenticated");
      if (identity.userId !== selected.user.id || identity.sessionId !== selected.session.id) {
        throw new AccountSecurityError("account-changed");
      }
      if (selected.session.userId !== selected.user.id) {
        throw new AccountSecurityError("account-changed");
      }
      const account = baseline.users.find((item) => item.identity.id === identity.userId)
        ?? transientAccount(identity.userId);
      if (!account || account.state.userId !== identity.userId || account.state.status !== "active") {
        throw new AccountSecurityError("unauthenticated");
      }

      const now = baseline.referenceTime.getTime();
      const created = selected.session.createdAt.getTime();
      const expires = selected.session.expiresAt.getTime();
      if (!Number.isFinite(now) || !Number.isFinite(created) || !Number.isFinite(expires)
        || created > now || expires <= now) {
        throw new AccountSecurityError("unauthenticated");
      }
      const linkedMethods = [...new Set(account.methods)];
      const hasPassword = linkedMethods.includes("password");
      const fresh = now - created < DEFAULT_FRESH_AGE_MS;
      if (!fresh) {
        return { linkedMethods, hasPassword, sessionAccess: "not-fresh" as const, sessions: [] };
      }

      // The current auth session may be transient (new email or Google account)
      // and need not be present in raw Better Auth session fixtures.
      const sessions = baseline.domains.sessions
        .filter((entry) => entry.userId === identity.userId
          && entry.issuedAt.getTime() <= now && entry.expiresAt.getTime() > now
          && entry.id !== selected.session.id)
        .map((entry) => ({
          id: entry.id,
          createdAt: entry.issuedAt.toISOString(),
          expiresAt: entry.expiresAt.toISOString(),
          current: false,
          deviceLabel: safeDeviceLabel(undefined),
        }));
      sessions.push({
        id: selected.session.id,
        createdAt: selected.session.createdAt.toISOString(),
        expiresAt: selected.session.expiresAt.toISOString(),
        current: true,
        deviceLabel: safeDeviceLabel(selected.session.userAgent),
      });
      sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
      return { linkedMethods, hasPassword, sessionAccess: "ready" as const, sessions };
    },
    async changePassword() {
      throw new P2AccountSecurityWriteNotConfiguredError("changePassword");
    },
    async revokeOneOther() {
      throw new P2AccountSecurityWriteNotConfiguredError("revokeOneOther");
    },
    async revokeAllOthers() {
      throw new P2AccountSecurityWriteNotConfiguredError("revokeAllOthers");
    },
  };
}
