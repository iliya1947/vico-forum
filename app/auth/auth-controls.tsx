import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { underDevelopmentPath } from "../forum/paths";
import { authClientActions, type AuthClientActions } from "./auth-client";

export interface HeaderAuthUser {
  readonly name: string;
  readonly canManageAuthorization?: boolean;
  readonly unreadNotificationCount?: number;
}
export type HeaderAuthPresentationState = "idle" | "pending" | "error";

const HeaderAuthContext = createContext<{
  user: HeaderAuthUser | null;
  setUser(user: HeaderAuthUser | null): void;
  initialPresentationState: HeaderAuthPresentationState;
} | null>(null);

export function useHeaderAuthUser(): HeaderAuthUser | null {
  return useContext(HeaderAuthContext)?.user ?? null;
}

export function HeaderAuthProvider({ initialUser, initialPresentationState = "idle", children }: {
  initialUser: HeaderAuthUser | null;
  initialPresentationState?: HeaderAuthPresentationState;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);
  return (
    <HeaderAuthContext value={{ user, setUser, initialPresentationState }}>
      {children}
    </HeaderAuthContext>
  );
}

export function safeForumReturnPath(locale: string, pathname: string, search = ""): string {
  const localeRoot = `/${encodeURIComponent(locale)}`;
  const localPath = pathname.startsWith("/") && !pathname.startsWith("//")
    && (pathname === localeRoot || pathname.startsWith(`${localeRoot}/`));
  return localPath ? `${pathname}${search.startsWith("?") ? search : ""}` : localeRoot;
}

export function AuthControls({ locale, actions = authClientActions }: {
  locale: string;
  actions?: AuthClientActions;
}) {
  const auth = useContext(HeaderAuthContext);
  const location = useLocation();
  const revalidator = useRevalidator();
  const { t } = useTranslation("common");
  const [pending, setPending] = useState(auth?.initialPresentationState === "pending");
  const [error, setError] = useState(auth?.initialPresentationState === "error");
  const user = auth?.user ?? null;

  const run = async (operation: (handlers: { onSuccess(): void; onError(): void }) => Promise<unknown>) => {
    if (pending) return;
    setPending(true);
    setError(false);
    let settled = false;
    const handlers = {
      onSuccess: () => { settled = true; },
      onError: () => { settled = true; setError(true); },
    };
    try {
      await operation(handlers);
      if (!settled) handlers.onSuccess();
    } catch {
      handlers.onError();
    } finally {
      setPending(false);
    }
    return !error;
  };

  const signIn = () => run((handlers) => actions.signInWithGoogle(
    safeForumReturnPath(locale, location.pathname, location.search), handlers,
  ));
  const signOut = async () => {
    let succeeded = false;
    await run((handlers) => actions.signOut({
      onSuccess: () => { succeeded = true; handlers.onSuccess(); },
      onError: handlers.onError,
    }));
    if (succeeded) {
      auth?.setUser(null);
      await revalidator.revalidate();
    }
  };

  const presentationState = pending ? "pending" : error ? "error" : user ? "signed-in" : "guest";

  return (
    <div className="auth-controls" data-state={presentationState} aria-busy={pending || undefined}>
      <div className="auth-controls-main">
        {user ? (
          <Link className="auth-user" to={underDevelopmentPath(locale, "profiles")}>
            <span className="auth-avatar" aria-hidden="true">{user.name.trim().slice(0, 1).toUpperCase()}</span>
            <span>{user.name}</span>
          </Link>
        ) : null}
        {user?.canManageAuthorization ? (
          <Link className="auth-admin-link" to={`/${encodeURIComponent(locale)}/admin/authorization`}>
            {t("authorizationNav")}
          </Link>
        ) : null}
        <button
          className={user ? "auth-action auth-sign-out" : "auth-action auth-sign-in"}
          type="button"
          disabled={pending}
          onClick={user ? signOut : signIn}
        >
          {pending ? <span className="auth-spinner" aria-hidden="true" /> : null}
          <span>{pending ? t("authPending") : user ? t("signOut") : t("signInGoogle")}</span>
        </button>
        {!user ? (
          <Link className="auth-action auth-sign-up" to={underDevelopmentPath(locale, "registration")}>
            {t("signUp")}
          </Link>
        ) : null}
      </div>
      {error ? <span className="auth-feedback" role="alert">{t("authError")}</span> : null}
    </div>
  );
}
