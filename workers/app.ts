import { RouterContextProvider, createRequestHandler } from "react-router";
import { forumReaderContext, forumWriterContext } from "../app/forum/request-context";
import {
  contentTranslationPresentationContext,
  contentGenerationActionContext,
  DISABLED_CONTENT_GENERATION_ACTION_RUNTIME,
  registryLoaderContext,
  uiTranslationStoreContext,
} from "../app/localization/request-context";
import { createHyperdriveRegistryLoader } from "../db/hyperdrive-registry";
import { createHyperdriveForumReader, createHyperdriveForumWriter } from "../db/hyperdrive-forum";
import { createHyperdriveUiTranslationStore } from "../db/hyperdrive-ui-translations";
import { ContentTranslationPresentationService } from "../app/localization/content-translation-presentation";
import { createHyperdriveContentTranslationBatchReader } from "../db/hyperdrive-content-translations";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../app/auth/auth.server";
import { initializeAuthContext, withAuthSessionCookies } from "../app/auth/session-context";
import { authorizationContext } from "../app/authorization/request-context";
import { createHyperdriveAuthorization } from "../db/hyperdrive-authorization";
import { resolveRuntimeDatabaseConnectionStrings } from "./database-bindings";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    const { localizationConnectionString, webConnectionString } = resolveRuntimeDatabaseConnectionStrings(env);
    const auth = createHyperdriveAuthRuntime(webConnectionString, env as Env & BetterAuthEnvironment);
    const authHeaders = await initializeAuthContext(context, request, auth);
    context.set(forumReaderContext, createHyperdriveForumReader(webConnectionString));
    context.set(forumWriterContext, createHyperdriveForumWriter(webConnectionString));
    context.set(registryLoaderContext, createHyperdriveRegistryLoader(localizationConnectionString));
    context.set(uiTranslationStoreContext, createHyperdriveUiTranslationStore(localizationConnectionString));
    context.set(
      contentTranslationPresentationContext,
      new ContentTranslationPresentationService(
        createHyperdriveContentTranslationBatchReader(webConnectionString),
      ),
    );
    context.set(authorizationContext, createHyperdriveAuthorization(webConnectionString));
    context.set(contentGenerationActionContext, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME);
    const response = await requestHandler(request, context);
    return withAuthSessionCookies(response, authHeaders);
  },
} satisfies ExportedHandler<Env>;
