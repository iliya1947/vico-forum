import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from "react-router";
import type { ResolvedLocaleContext } from "./localization/locale";
import "./styles.css";

function isLocaleContext(value: unknown): value is ResolvedLocaleContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResolvedLocaleContext>;
  return (
    typeof candidate.translationLocale === "string" &&
    (candidate.direction === "ltr" || candidate.direction === "rtl")
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const locale = useMatches()
    .map((match) => match.loaderData)
    .find(isLocaleContext);

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
