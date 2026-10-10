import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumAvatar } from "../forum/avatar";
import { forumProfilePath } from "../forum/paths";
import { credentialPagePath, safeForumReturnPath } from "./credential-path";
export { safeForumReturnPath } from "./credential-path";
import { authClientActions, type AuthClientActions } from "./auth-client";

export interface HeaderAuthUser {
  readonly id: string;
  readonly image?: string | null;
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
          <Link className="auth-user" to={forumProfilePath(locale, user.id)}>
            <ForumAvatar name={user.name} image={user.image} className="auth-avatar" />
            <span>{user.name}</span>
          </Link>
        ) : null}
        {user?.canManageAuthorization ? (
          <Link className="auth-admin-link" to={`/${encodeURIComponent(locale)}/admin/authorization`}>
            {t("authorizationNav")}
          </Link>
        ) : null}
        {user || pending ? (
          <button className={user ? "auth-action auth-sign-out" : "auth-action auth-sign-in"}
            type="button" disabled={pending} onClick={user ? signOut : undefined}>
            {pending ? <span className="auth-spinner" aria-hidden="true" /> : null}
            <span>{pending ? t("authPending") : t("signOut")}</span>
          </button>
        ) : (
          <Link className="auth-action auth-sign-in"
            to={credentialPagePath(locale, "sign-in", safeForumReturnPath(locale, location.pathname, location.search))}>
            {t("signInGoogle")}
          </Link>
        )}
        {!user ? (
          <Link className="auth-action auth-sign-up"
            to={credentialPagePath(locale, "sign-up", safeForumReturnPath(locale, location.pathname, location.search))}>
            {t("signUp")}
          </Link>
        ) : null}
      </div>
      {error ? <span className="auth-feedback" role="alert">{t("authError")}</span> : null}
    </div>
  );
}
