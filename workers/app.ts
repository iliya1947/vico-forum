import { RouterContextProvider, createRequestHandler } from "react-router";
import { forumReaderContext, forumWriterContext } from "../app/forum/request-context";
import {
  contentTranslationPresentationContext,
  contentGenerationActionContext,
  contentGenerationStatusContext,
  DISABLED_CONTENT_GENERATION_ACTION_RUNTIME,
  registryLoaderContext,
  uiTranslationStoreContext,
} from "../app/localization/request-context";
import { createHyperdriveRegistryLoader } from "../db/hyperdrive-registry";
import { createHyperdriveForumReader, createHyperdriveForumWriter } from "../db/hyperdrive-forum";
import { createHyperdriveUiTranslationStore } from "../db/hyperdrive-ui-translations";
import { ContentTranslationPresentationService } from "../app/localization/content-translation-presentation";
import { createHyperdriveContentTranslationBatchReader } from "../db/hyperdrive-content-translations";
import { createHyperdriveContentGenerationStatusReader } from "../db/hyperdrive-content-generation-status";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../app/auth/auth.server";
import { initializeAuthContext, withAuthSessionCookies } from "../app/auth/session-context";
import { authorizationContext } from "../app/authorization/request-context";
import { createHyperdriveAuthorization } from "../db/hyperdrive-authorization";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    const connectionString = env.HYPERDRIVE.connectionString;
    const auth = createHyperdriveAuthRuntime(connectionString, env as Env & BetterAuthEnvironment);
    const authHeaders = await initializeAuthContext(context, request, auth);
    context.set(forumReaderContext, createHyperdriveForumReader(connectionString));
    context.set(forumWriterContext, createHyperdriveForumWriter(connectionString));
    context.set(registryLoaderContext, createHyperdriveRegistryLoader(connectionString));
    context.set(uiTranslationStoreContext, createHyperdriveUiTranslationStore(connectionString));
    context.set(
      contentTranslationPresentationContext,
      new ContentTranslationPresentationService(
        createHyperdriveContentTranslationBatchReader(connectionString),
      ),
    );
    context.set(authorizationContext, createHyperdriveAuthorization(connectionString));
    context.set(
      contentGenerationStatusContext,
      createHyperdriveContentGenerationStatusReader(connectionString),
    );
    context.set(contentGenerationActionContext, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME);
    const response = await requestHandler(request, context);
    return withAuthSessionCookies(response, authHeaders);
  },
} satisfies ExportedHandler<Env>;
