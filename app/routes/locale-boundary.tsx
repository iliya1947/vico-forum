import { useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { Outlet, redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { manualTranslationPacks } from "../localization/manual-packs";
import { localeContext, registryForRequest } from "../localization/request-context";
import { TranslationResourceLoader, type TranslationSnapshot } from "../localization/resource-loader";
import { resolveExplicitLocale } from "../localization/resolver";
import { createTranslationRuntime } from "../localization/runtime";
import { CanonicalEnglishSource, LocalTranslationSource } from "../localization/sources";

interface LocaleBoundaryArgs {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}

async function guardLocale({ request, params, context }: LocaleBoundaryArgs) {
  const candidate = params.locale;
  if (!candidate) throw new Response("Not Found", { status: 404 });

  const loaded = await registryForRequest(context);
  const resolution = resolveExplicitLocale(request, candidate, loaded.registry);
  if (loaded.health.status === "degraded" && candidate.toLowerCase() !== "en") {
    if (request.method !== "GET" && request.method !== "HEAD") throw new Response("Not Found", { status: 404 });
    const url = new URL(request.url);
    const suffix = url.pathname.split("/").slice(2).join("/");
    throw redirect(`/en/${suffix}${url.search}`, {
      status: 307,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (resolution.type === "not-found") throw new Response("Not Found", { status: 404 });
  if (resolution.type === "redirect") throw redirect(resolution.location, resolution.status);

  context.set(localeContext, resolution.context);
  return resolution.context;
}

export const middleware = [
  async (args: LocaleBoundaryArgs, next: () => Promise<Response>) => {
    await guardLocale(args);
    return next();
  },
];

const resourceLoader = new TranslationResourceLoader([
  new LocalTranslationSource(manualTranslationPacks),
  new CanonicalEnglishSource(),
]);

export async function loader(args: LocaleBoundaryArgs) {
  let locale;
  try {
    locale = args.context.get(localeContext);
  } catch {
    locale = await guardLocale(args);
  }
  return resourceLoader.load(locale, ["common"]);
}

export default function LocaleBoundary() {
  const snapshot = useLoaderData<TranslationSnapshot>();
  const i18n = useMemo(() => createTranslationRuntime(snapshot), [snapshot]);
  return (
    <I18nextProvider i18n={i18n} defaultNS="common">
      <Outlet />
    </I18nextProvider>
  );
}
