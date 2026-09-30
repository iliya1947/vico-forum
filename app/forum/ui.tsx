import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { forumIndexPath, underDevelopmentPath } from "./paths";
import { AuthControls, useHeaderAuthUser } from "../auth/auth-controls";
import { DARK_THEME_QUERY, THEME_STORAGE_KEY, type Theme } from "../theme";

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const { t } = useTranslation("common");
  const [theme, setTheme] = useState<Theme | null>(null);
  const manualOverride = useRef(false);

  useEffect(() => {
    const media = window.matchMedia?.(DARK_THEME_QUERY);
    const stored = readStoredTheme();
    manualOverride.current = stored !== null;

    const initialTheme = stored ?? (media?.matches ? "dark" : "light");
    applyTheme(initialTheme);
    setTheme(initialTheme);

    if (!media) return undefined;
    const handleSystemTheme = (event: MediaQueryListEvent) => {
      if (manualOverride.current) return;
      const nextTheme = event.matches ? "dark" : "light";
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };
    media.addEventListener("change", handleSystemTheme);
    return () => media.removeEventListener("change", handleSystemTheme);
  }, []);

  const toggleTheme = () => {
    if (!theme) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    manualOverride.current = true;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The current-session choice still applies when storage is unavailable.
    }
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const targetTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      disabled={!theme}
      onClick={toggleTheme}
      aria-label={theme
        ? t(targetTheme === "dark" ? "switchToDarkTheme" : "switchToLightTheme")
        : t("themeLabel")}
    >
      <span className="theme-toggle-mark" aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      <span>{theme === "dark" ? t("lightTheme") : theme === "light" ? t("darkTheme") : t("themeLabel")}</span>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.25 4.25" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v4l1.75 2.25H4.75L6.5 13.5z" />
      <path d="M10 18.25a2.3 2.3 0 0 0 4 0" />
    </svg>
  );
}

export function ForumShell({ locale, children }: { locale: string; children: ReactNode }) {
  const { t } = useTranslation("common");
  const authUser = useHeaderAuthUser();

  return (
    <main className="forum-shell">
      <header className="site-header">
        <div className="site-header-top">
          <div className="brand-lockup">
            <Link className="brand" to={forumIndexPath(locale)}>{t("productName")}</Link>
            <span className="site-tagline">{t("forumTagline")}</span>
          </div>

          <Link
            className="site-search"
            to={underDevelopmentPath(locale, "search")}
            aria-label={t("searchForum")}
          >
            <SearchIcon />
            <span>{t("searchForum")}</span>
          </Link>

          <div className="site-header-actions">
            {authUser ? (
              <Link
                className="header-icon-link"
                to={underDevelopmentPath(locale, "notifications")}
                aria-label={t("notifications")}
              >
                <BellIcon />
              </Link>
            ) : null}
            <ThemeToggle />
            <AuthControls locale={locale} />
          </div>
        </div>
        <nav className="site-primary-nav" aria-label={t("primaryNavigation")}>
          <Link to={forumIndexPath(locale)}>{t("forumHomeNav")}</Link>
        </nav>
      </header>

      <div className="forum-content">
        {children}
      </div>

      <footer className="site-footer">
        <nav aria-label={t("footerNavigation")}>
          <Link to={underDevelopmentPath(locale, "rules")}>{t("rulesNav")}</Link>
          <Link to={underDevelopmentPath(locale, "help")}>{t("helpNav")}</Link>
          <Link to={underDevelopmentPath(locale, "about")}>{t("aboutVicoNav")}</Link>
          <Link to={underDevelopmentPath(locale, "feedback")}>{t("feedbackNav")}</Link>
          <Link to={underDevelopmentPath(locale, "privacy")}>{t("privacyNav")}</Link>
        </nav>
      </footer>
    </main>
  );
}

export function Breadcrumbs({ locale, items }: {
  locale: string;
  items: Array<{ label: string; to?: string }>;
}) {
  const { t } = useTranslation("common");
  return (
    <nav className="breadcrumbs" aria-label={t("breadcrumbsLabel")}>
      <Link to={forumIndexPath(locale)}>{t("forumHomeNav")}</Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          <span aria-hidden="true"> / </span>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function ForumRouteError() {
  const error = useRouteError();
  const { t } = useTranslation("common");
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="route-state" role="alert">
      <h1>{notFound ? t("forumNotFoundHeading") : t("forumErrorHeading")}</h1>
      <p>{notFound ? t("forumNotFoundBody") : t("forumErrorBody")}</p>
    </section>
  );
}
