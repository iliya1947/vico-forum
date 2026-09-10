import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from "react-router";
import type { ResolvedLocaleContext } from "./localization/locale";
import type { TranslationSnapshot } from "./localization/resource-loader";
import "./styles.css";

function isLocaleContext(value: unknown): value is ResolvedLocaleContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResolvedLocaleContext>;
  return (
    typeof candidate.translationLocale === "string" &&
    (candidate.direction === "ltr" || candidate.direction === "rtl")
  );
}

function localeFromLoaderData(value: unknown): ResolvedLocaleContext | undefined {
  if (isLocaleContext(value)) return value;
  if (value && typeof value === "object" && "locale" in value) {
    const locale = (value as Partial<TranslationSnapshot>).locale;
    if (isLocaleContext(locale)) return locale;
  }
  return undefined;
}

export function Layout({ children }: { children: ReactNode }) {
  const locale = useMatches()
    .map((match) => localeFromLoaderData(match.loaderData))
    .find((candidate) => candidate !== undefined);

  return (
    <html lang={locale?.translationLocale ?? "en"} dir={locale?.direction ?? "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
