import { RouterContextProvider, createRequestHandler } from "react-router";
import { forumReaderContext, forumWriterContext } from "../app/forum/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../app/forum/attachment-request-context";
import { privateAttachmentBucket } from "./attachment-storage";
import { createHyperdriveForumAttachmentStore } from "../db/hyperdrive-forum-attachments";
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
import { AuthSessionUnavailableError } from "../app/auth/request-context";
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
    let authHeaders: Headers;
    try {
      authHeaders = await initializeAuthContext(context, request, auth);
    } catch (error) {
      if (!(error instanceof AuthSessionUnavailableError)) throw error;
      return new Response("Service unavailable. Please try again.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    context.set(forumReaderContext, createHyperdriveForumReader(webConnectionString));
    context.set(forumWriterContext, createHyperdriveForumWriter(webConnectionString));
    context.set(forumAttachmentStoreContext, createHyperdriveForumAttachmentStore(webConnectionString));
    const attachmentBucket = (env as Env & { ATTACHMENT_R2?: R2Bucket }).ATTACHMENT_R2;
    context.set(privateAttachmentBucketContext, attachmentBucket ? privateAttachmentBucket(attachmentBucket) : null);
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
