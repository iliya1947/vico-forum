import type { ReactNode } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { forumIndexPath } from "./paths";

export function ForumShell({ locale, children }: { locale: string; children: ReactNode }) {
  const { t } = useTranslation("common");
  return (
    <main className="forum-shell">
      <header className="site-header">
        <Link className="brand" to={forumIndexPath(locale)}>{t("productName")}</Link>
        <span className="site-tagline">{t("forumTagline")}</span>
      </header>
      {children}
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
