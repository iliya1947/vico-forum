import { useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { Outlet, redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { manualTranslationPacks } from "../localization/manual-packs";
import { localeContext } from "../localization/request-context";
import { localeRegistry } from "../localization/registry";
import { TranslationResourceLoader, type TranslationSnapshot } from "../localization/resource-loader";
import { resolveExplicitLocale } from "../localization/resolver";
import { createTranslationRuntime } from "../localization/runtime";
import { CanonicalEnglishSource, LocalTranslationSource } from "../localization/sources";

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

const resourceLoader = new TranslationResourceLoader([
  new LocalTranslationSource(manualTranslationPacks),
  new CanonicalEnglishSource(),
]);

export async function loader(args: LocaleBoundaryArgs) {
  let locale;
  try {
    locale = args.context.get(localeContext);
  } catch {
    locale = guardLocale(args);
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
