import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, isRouteErrorResponse, useLocation, useNavigate, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { forumIndexPath, underDevelopmentPath } from "./paths";
import { AuthControls, useHeaderAuthUser } from "../auth/auth-controls";
import { DARK_THEME_QUERY, THEME_STORAGE_KEY, type Theme } from "../theme";
import { useLocaleNavigation } from "../localization/locale-navigation";
import vicoForumLogoLight from "../assets/vico-forum-logo-light.webp";
import vicoForumLogoDark from "../assets/vico-forum-logo-dark.webp";

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


function GlobeIcon() {
  return (
    <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.5c2.4 2.2 3.8 5.2 3.8 8.5S14.4 18.3 12 20.5" />
      <path d="M12 3.5C9.6 5.7 8.2 8.7 8.2 12s1.4 6.3 3.8 8.5" />
    </svg>
  );
}

export function LanguageSwitcher({ locale }: { locale: string }) {
  const { locales, onLocaleChange } = useLocaleNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const current = locales.find((candidate) => candidate.tag === locale);

  if (locales.length < 2) return null;

  const changeLocale = (targetLocale: string) => {
    if (targetLocale === locale || !locales.some((candidate) => candidate.tag === targetLocale)) return;
    if (onLocaleChange) {
      onLocaleChange(targetLocale);
      return;
    }

    const segments = location.pathname.split("/");
    if (segments.length < 2) return;
    segments[1] = targetLocale;
    navigate(`${segments.join("/")}${location.search}${location.hash}`);
  };

  return (
    <label className="language-switcher">
      <GlobeIcon />
      <select
        value={locale}
        aria-label={current?.nativeName ?? locale}
        onChange={(event) => changeLocale(event.currentTarget.value)}
      >
        {locales.map((candidate) => (
          <option key={candidate.tag} value={candidate.tag} dir={candidate.direction}>
            {candidate.nativeName}
          </option>
        ))}
      </select>
    </label>
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

function DiscoveryIcon({ kind }: {
  kind: "unanswered" | "tags" | "popular" | "unread";
}) {
  if (kind === "unanswered") {
    return (
      <svg className="discovery-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 5.5h16v11H9l-5 3z" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1-1 1.7" />
        <path d="M12 15.6h.01" />
      </svg>
    );
  }

  if (kind === "tags") {
    return (
      <svg className="discovery-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4.5 5.5h8.2l6.8 6.8-7.2 7.2-6.8-6.8z" />
        <circle cx="9" cy="9" r="1.2" />
      </svg>
    );
  }

  if (kind === "popular") {
    return (
      <svg className="discovery-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="m4 16 5-5 4 4 7-8" />
        <path d="M15 7h5v5" />
      </svg>
    );
  }

  return (
    <svg className="discovery-icon" aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

export function ForumShell({
  locale,
  children,
  variant,
}: {
  locale: string;
  children: ReactNode;
  variant?: "home" | "category" | "section" | "topic";
}) {
  const { t } = useTranslation("common");
  const authUser = useHeaderAuthUser();
  const useApprovedHeader = variant === "home" || variant === "category" || variant === "section" || variant === "topic";

  return (
    <main className={
      variant === "home"
        ? "forum-shell home-shell"
        : variant === "category"
          ? "forum-shell home-shell category-shell"
          : variant === "section"
            ? "forum-shell home-shell section-shell"
            : variant === "topic"
              ? "forum-shell home-shell topic-shell"
              : "forum-shell"
    }>
      <header className="site-header">
        <div className="site-header-top">
          <div className="brand-lockup">
            <Link className="brand" to={forumIndexPath(locale)} aria-label={t("productName")}>
              {useApprovedHeader ? (
                <>
                  <span className="brand-mark" aria-hidden="true">
                    <img className="brand-mark-image brand-mark-light" src={vicoForumLogoLight} alt="" />
                    <img className="brand-mark-image brand-mark-dark" src={vicoForumLogoDark} alt="" />
                  </span>
                  <span className="brand-wordmark">
                    <span className="brand-primary">Vico</span>
                    <span className="brand-accent"> Forum</span>
                  </span>
                </>
              ) : t("productName")}
            </Link>
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
            <LanguageSwitcher locale={locale} />
            <ThemeToggle />
            <AuthControls locale={locale} />
          </div>
        </div>
        <nav className="site-primary-nav" aria-label={t("primaryNavigation")}>
          {useApprovedHeader ? (
            <>
              <Link className="home-discovery-link" to={underDevelopmentPath(locale, "unanswered-filter")}>
                <DiscoveryIcon kind="unanswered" />
                <span>{t("unansweredNav")}</span>
              </Link>
              <Link className="home-discovery-link" to={underDevelopmentPath(locale, "technology-tags")}>
                <DiscoveryIcon kind="tags" />
                <span>{t("tagsNav")}</span>
              </Link>
              <Link className="home-discovery-link" to={underDevelopmentPath(locale, "popular")}>
                <DiscoveryIcon kind="popular" />
                <span>{t("popularNav")}</span>
              </Link>
              {authUser ? (
                <Link className="home-discovery-link" to={underDevelopmentPath(locale, "unread")}>
                  <DiscoveryIcon kind="unread" />
                  <span>{t("unreadNav")}</span>
                </Link>
              ) : null}
            </>
          ) : (
            <Link to={forumIndexPath(locale)}>{t("forumHomeNav")}</Link>
          )}
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
