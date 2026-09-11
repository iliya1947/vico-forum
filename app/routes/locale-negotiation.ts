import { redirect } from "react-router";
import { registryForRequest } from "../localization/request-context";
import { negotiateLocale } from "../localization/resolver";

export async function loader({ request, context }: { request: Request; context?: Parameters<typeof registryForRequest>[0] }) {
  const loaded = await registryForRequest(context);
  const locale = negotiateLocale(request, loaded.registry);
  if (!locale) throw new Response("Not Found", { status: 404 });
  const search = new URL(request.url).search;

  throw redirect(`/${encodeURIComponent(locale.translationLocale)}/${search}`, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
