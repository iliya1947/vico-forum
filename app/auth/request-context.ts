import { createContext, type RouterContextProvider } from "react-router";

export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly locale?: string | null;
}

export interface AuthSessionRecord {
  readonly id: string;
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}

export interface AuthSession {
  readonly user: AuthUser;
  readonly session: AuthSessionRecord;
}

export interface AuthSessionResolution {
  readonly session: AuthSession | null;
  readonly headers: Headers;
}

/** Only safe, deliberately selected account/session fields leave the auth runtime. */
export interface AccountSecuritySession {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
  readonly deviceLabel: string;
}

export interface AccountSecuritySnapshot {
  readonly linkedMethods: readonly ("password" | "google")[];
  readonly hasPassword: boolean;
  readonly sessionAccess: "ready" | "not-fresh";
  readonly sessions: readonly AccountSecuritySession[];
}

export interface AccountSecurityIdentity {
  readonly userId: string;
  readonly sessionId: string;
}

export type AccountSecurityErrorCode =
  | "unauthenticated" | "account-changed" | "invalid-password" | "no-password"
  | "not-fresh" | "session-not-found" | "current-session" | "unavailable";

export class AccountSecurityError extends Error {
  constructor(readonly code: AccountSecurityErrorCode) {
    super(code);
    this.name = "AccountSecurityError";
  }
}

/** The production runtime implements this capability; existing isolated auth mocks need not. */
export interface AccountSecurityRuntime {
  read(headers: Headers, identity: AccountSecurityIdentity): Promise<AccountSecuritySnapshot>;
  changePassword(headers: Headers, identity: AccountSecurityIdentity,
    currentPassword: string, newPassword: string): Promise<void>;
  revokeOneOther(headers: Headers, identity: AccountSecurityIdentity, sessionId: string): Promise<void>;
  revokeAllOthers(headers: Headers, identity: AccountSecurityIdentity): Promise<void>;
}

export interface AuthRuntime {
  getSession(headers: Headers): Promise<AuthSessionResolution>;
  handle(request: Request): Promise<Response>;
  readonly security?: AccountSecurityRuntime;
}

export class AuthSessionUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Authentication session storage is unavailable", options);
    this.name = "AuthSessionUnavailableError";
  }
}

export const authRuntimeContext = createContext<AuthRuntime>();
export const authSessionContext = createContext<AuthSession | null>(null);

export function authRuntimeForRequest(context: RouterContextProvider): AuthRuntime {
  return context.get(authRuntimeContext);
}

export function authSessionForRequest(context: RouterContextProvider): AuthSession | null {
  return context.get(authSessionContext);
}
