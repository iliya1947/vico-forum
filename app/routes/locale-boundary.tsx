import { Outlet, redirect, type RouterContextProvider } from "react-router";
import { localeContext } from "../localization/request-context";
import { localeRegistry } from "../localization/registry";
import { resolveExplicitLocale } from "../localization/resolver";

interface LocaleBoundaryArgs {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}

function guardLocale({ request, params, context }: LocaleBoundaryArgs) {
  const candidate = params.locale;
  if (!candidate) throw new Response("Not Found", { status: 404 });

  const resolution = resolveExplicitLocale(request, candidate, localeRegistry);
  if (resolution.type === "not-found") throw new Response("Not Found", { status: 404 });
  if (resolution.type === "redirect") throw redirect(resolution.location, resolution.status);

  context.set(localeContext, resolution.context);
  return resolution.context;
}

export const middleware = [
  async (args: LocaleBoundaryArgs, next: () => Promise<Response>) => {
    guardLocale(args);
    return next();
  },
];

export function loader(args: LocaleBoundaryArgs) {
  try {
    return args.context.get(localeContext);
  } catch {
    return guardLocale(args);
  }
}

export default function LocaleBoundary() {
  return <Outlet />;
}
