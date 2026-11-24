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

/** Unwired standalone adapters remain fail-closed; the preview runtime owns revocation state. */
export class P2AccountSecurityWriteNotConfiguredError extends Error {
  constructor(operation: string) {
    super("P2 AccountSecurity write not configured: " + operation);
    this.name = "P2AccountSecurityWriteNotConfiguredError";
  }
}

export interface P2CredentialMutation {
  readonly passwordFor: (userId: string) => string | null;
  readonly storePassword: (userId: string, value: string) => void;
  /** Same bounded local attempt bucket for Settings and direct Auth HTTP. */
  readonly admitAttempt: () => void;
}

/**
 * Original typed AccountSecurityRuntime, with bounded B7b1/B7b2 local mutations.
 * Identity comes only from the controller-selected AuthSession. Headers/form
 * values never select an account; origin/field admission belongs to routes.
 */
export function createP2AccountSecurityRuntime(
  baseline: PreviewRawBaseline,
  selectedSession: () => AuthSession | null,
  transientAccount: (userId: string) => PreviewRawUser | undefined,
  credentialMutation?: P2CredentialMutation,
  revokedSessionIds?: Set<string>,
): AccountSecurityRuntime {
  function verifyIdentity(identity: AccountSecurityIdentity): { selected: AuthSession; account: PreviewRawUser } {
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
      return { selected, account };
  }

  function verifyLiveSession(selected: AuthSession): { now: number; fresh: boolean } {
    const now = baseline.referenceTime.getTime();
    const created = selected.session.createdAt.getTime();
    const expires = selected.session.expiresAt.getTime();
    if (!Number.isFinite(now) || !Number.isFinite(created) || !Number.isFinite(expires)
      || created > now || expires <= now || revokedSessionIds?.has(selected.session.id)) {
      throw new AccountSecurityError("unauthenticated");
    }
    return { now, fresh: now - created < DEFAULT_FRESH_AGE_MS };
  }

  function ownOtherSessions(userId: string, currentId: string, now: number) {
    return baseline.domains.sessions.filter((entry) =>
      entry.userId === userId && entry.id !== currentId
      && entry.issuedAt.getTime() <= now && entry.expiresAt.getTime() > now
      && !revokedSessionIds?.has(entry.id));
  }

  function authorizeRevocation(identity: AccountSecurityIdentity) {
    if (!revokedSessionIds) throw new P2AccountSecurityWriteNotConfiguredError("session revocation");
    const { selected } = verifyIdentity(identity);
    const { now, fresh } = verifyLiveSession(selected);
    if (!fresh) throw new AccountSecurityError("not-fresh");
    return { selected, now };
  }

  return {
    async read(headers: Headers, identity: AccountSecurityIdentity) {
      void headers; // No request-supplied actor selection in P2.
      const { selected, account } = verifyIdentity(identity);
      const { now, fresh } = verifyLiveSession(selected);
      const linkedMethods = [...new Set(account.methods)];
      const hasPassword = linkedMethods.includes("password");
      if (!fresh) {
        return { linkedMethods, hasPassword, sessionAccess: "not-fresh" as const, sessions: [] };
      }

      // The current auth session may be transient (new email or Google account)
      // and need not be present in raw Better Auth session fixtures.
      const sessions = ownOtherSessions(identity.userId, selected.session.id, now)
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
    async changePassword(headers, identity, currentPassword, newPassword) {
      void headers; // The original Settings route independently checks same-Origin.
      if (!credentialMutation) {
        throw new P2AccountSecurityWriteNotConfiguredError("changePassword");
      }
      const { account } = verifyIdentity(identity);
      if (!account.methods.includes("password") || account.credentialPassword === null) {
        throw new AccountSecurityError("no-password");
      }
      if (currentPassword.length > 128 || newPassword.length < 8 || newPassword.length > 128) {
        throw new AccountSecurityError("invalid-password");
      }
      // The preview's one controller-owned bucket cannot be reset using forged
      // client IP/headers, and is used identically for Settings and direct API.
      credentialMutation.admitAttempt();
      if (credentialMutation.passwordFor(identity.userId) !== currentPassword) {
        throw new AccountSecurityError("invalid-password");
      }
      credentialMutation.storePassword(identity.userId, newPassword);
    },
    async revokeOneOther(headers, identity, sessionId) {
      void headers; // Original Settings action owns Origin and allowlisted form admission.
      const { selected, now } = authorizeRevocation(identity);
      if (sessionId === selected.session.id) throw new AccountSecurityError("current-session");
      const other = ownOtherSessions(identity.userId, selected.session.id, now)
        .find((entry) => entry.id === sessionId);
      if (!other) throw new AccountSecurityError("session-not-found");
      revokedSessionIds!.add(other.id);
    },
    async revokeAllOthers(headers, identity) {
      void headers;
      const { selected, now } = authorizeRevocation(identity);
      // Only the selected user's existing, active, non-current sessions.
      for (const session of ownOtherSessions(identity.userId, selected.session.id, now)) {
        revokedSessionIds!.add(session.id);
      }
    },
  };
}
