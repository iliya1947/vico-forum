import { useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { Outlet, redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { manualTranslationPacks } from "../localization/manual-packs";
import { parseLocaleCandidate } from "../localization/locale";
import {
  localeContext,
  registryForRequest,
  uiTranslationStoreForRequest,
} from "../localization/request-context";
import { TranslationResourceLoader } from "../localization/resource-loader";
import { resolveExplicitLocale } from "../localization/resolver";
import { createTranslationRuntime } from "../localization/runtime";
import {
  DatabaseMachineTranslationSource,
  DatabaseManualTranslationSource,
} from "../localization/persistent-sources";
import { CanonicalEnglishSource, LocalTranslationSource } from "../localization/sources";
import { authSessionForRequest } from "../auth/request-context";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

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
  const candidateIdentity = parseLocaleCandidate(candidate)?.translationTag;
  if (loaded.health.status === "degraded" && candidateIdentity !== loaded.registry.bootstrap.tag) {
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

const localSource = new LocalTranslationSource(manualTranslationPacks);
const canonicalEnglishSource = new CanonicalEnglishSource();

export async function loader(args: LocaleBoundaryArgs) {
  let locale;
  try {
    locale = args.context.get(localeContext);
  } catch {
    locale = await guardLocale(args);
  }

  const store = uiTranslationStoreForRequest(args.context);
  const resourceLoader = new TranslationResourceLoader([
    localSource,
    new DatabaseManualTranslationSource(store),
    new DatabaseMachineTranslationSource(store),
    canonicalEnglishSource,
  ], store);
  const snapshot = await resourceLoader.load(locale, ["common"]);
  const session = authSessionForRequest(args.context);
  let canManageAuthorization = false;
  if (session) {
    try {
      const resolver = authorizationForRequest(args.context).forUser(session.user.id);
      canManageAuthorization = await resolver.has("access.authorization.manage");
    } catch (error) {
      if (!(error instanceof AuthorizationUnavailableError)) throw error;
      // The header link is presentation-only; the protected admin route checks permission independently.
    }
  }
  return { ...snapshot, authUser: session ? { name: session.user.name, canManageAuthorization } : null };
}

export default function LocaleBoundary() {
  const snapshot = useLoaderData<typeof loader>();
  const i18n = useMemo(() => createTranslationRuntime(snapshot), [snapshot]);
  return (
    <I18nextProvider i18n={i18n} defaultNS="common">
      <HeaderAuthProvider initialUser={snapshot.authUser}><Outlet /></HeaderAuthProvider>
    </I18nextProvider>
  );
}
