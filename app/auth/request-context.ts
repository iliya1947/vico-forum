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

export interface AuthRuntime {
  getSession(headers: Headers): Promise<AuthSessionResolution>;
  handle(request: Request): Promise<Response>;
}

export const authRuntimeContext = createContext<AuthRuntime>();
export const authSessionContext = createContext<AuthSession | null>(null);

export function authRuntimeForRequest(context: RouterContextProvider): AuthRuntime {
  return context.get(authRuntimeContext);
}

export function authSessionForRequest(context: RouterContextProvider): AuthSession | null {
  return context.get(authSessionContext);
}
