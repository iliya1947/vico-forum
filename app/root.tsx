import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from "react-router";
import { rootDocumentLocale } from "./root-document";
import { THEME_BOOTSTRAP_SCRIPT } from "./theme";
import "./styles.css";

export function Layout({ children }: { children: ReactNode }) {
  const documentLocale = rootDocumentLocale(useMatches());

  return (
    <html
      lang={documentLocale.lang}
      dir={documentLocale.dir}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
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
