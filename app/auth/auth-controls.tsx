import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { authClientActions, type AuthClientActions } from "./auth-client";

export interface HeaderAuthUser { readonly name: string; readonly canManageAuthorization?: boolean }

const HeaderAuthContext = createContext<{
  user: HeaderAuthUser | null;
  setUser(user: HeaderAuthUser | null): void;
} | null>(null);

export function HeaderAuthProvider({ initialUser, children }: {
  initialUser: HeaderAuthUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);
  return <HeaderAuthContext value={{ user, setUser }}>{children}</HeaderAuthContext>;
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
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

  return (
    <div className="auth-controls">
      {user ? <span className="auth-user">{user.name}</span> : null}
      {user?.canManageAuthorization ? <Link to={`/${encodeURIComponent(locale)}/admin/authorization`}>{t("authorizationNav")}</Link> : null}
      <button type="button" disabled={pending} onClick={user ? signOut : signIn}>
        {pending ? t("authPending") : user ? t("signOut") : t("signInGoogle")}
      </button>
      {error ? <span role="alert">{t("authError")}</span> : null}
    </div>
  );
}
