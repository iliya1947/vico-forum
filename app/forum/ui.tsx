import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { forumIndexPath } from "./paths";
import { AuthControls } from "../auth/auth-controls";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "vico-theme";
const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

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

export function ForumShell({ locale, children }: { locale: string; children: ReactNode }) {
  const { t } = useTranslation("common");
  return (
    <main className="forum-shell">
      <header className="site-header">
        <div className="site-header-top">
          <div className="brand-lockup">
            <Link className="brand" to={forumIndexPath(locale)}>{t("productName")}</Link>
            <span className="site-tagline">{t("forumTagline")}</span>
          </div>
          <div className="site-header-actions">
            <ThemeToggle />
            <AuthControls locale={locale} />
          </div>
        </div>
        <nav className="site-primary-nav" aria-label={t("primaryNavigation")}>
          <Link to={forumIndexPath(locale)}>{t("forumIndex")}</Link>
        </nav>
      </header>
      <div className="forum-content">
        {children}
      </div>
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
      <Link to={forumIndexPath(locale)}>{t("forumIndex")}</Link>
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
