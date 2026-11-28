import type { RouterContextProvider } from "react-router";
import { createAuthMailRuntime, type AuthMailEnvironment, type AuthMailDependencies } from "../app/auth/auth-mail.server";
import { registryForRequest, uiTranslationStoreForRequest, uiGenerationPolicyContext } from "../app/localization/request-context";
import { manualTranslationPacks } from "../app/localization/manual-packs";
import { TranslationResourceLoader } from "../app/localization/resource-loader";
import { DatabaseMachineTranslationSource, DatabaseManualTranslationSource } from "../app/localization/persistent-sources";
import { CanonicalEnglishSource, LocalTranslationSource } from "../app/localization/sources";

/** Request-local and lazy: AUTH-01 does not connect mail to any auth callback. */
export function createRequestAuthMailRuntime(
  env: AuthMailEnvironment, context: RouterContextProvider,
  execution: AuthMailDependencies["execution"],
  fixtures: Pick<AuthMailDependencies, "fakeTransport" | "providerFetch"> = {},
) {
  return createAuthMailRuntime(env, {
    execution, ...fixtures,
    localization: async () => {
      const { registry } = await registryForRequest(context);
      const store = uiTranslationStoreForRequest(context);
      const policy = context.get(uiGenerationPolicyContext);
      const resources = new TranslationResourceLoader([
        new LocalTranslationSource(manualTranslationPacks),
        new DatabaseManualTranslationSource(store),
        ...(policy === null ? [] : [new DatabaseMachineTranslationSource(store, undefined, policy)]),
        new CanonicalEnglishSource(),
      ], store, policy);
      return { registry, resources };
    },
  });
}
