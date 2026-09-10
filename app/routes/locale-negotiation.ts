import { redirect } from "react-router";
import { localeRegistry } from "../localization/registry";
import { negotiateLocale } from "../localization/resolver";

export function loader({ request }: { request: Request }) {
  const locale = negotiateLocale(request, localeRegistry);
  if (!locale) throw new Response("Not Found", { status: 404 });
  const search = new URL(request.url).search;

  throw redirect(`/${encodeURIComponent(locale.translationLocale)}/${search}`, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
