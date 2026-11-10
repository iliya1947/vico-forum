import { RouterContextProvider, createRequestHandler } from "react-router";
import { forumReaderContext, forumWriterContext } from "../app/forum/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../app/forum/attachment-request-context";
import { privateAttachmentBucket } from "./attachment-storage";
import { createHyperdriveForumAttachmentStore } from "../db/hyperdrive-forum-attachments";
import {
  contentTranslationPresentationContext,
  contentGenerationActionContext,
  contentGenerationAdmissionContext,
  DISABLED_CONTENT_GENERATION_ACTION_RUNTIME,
  registryLoaderContext,
  uiTranslationStoreContext,
} from "../app/localization/request-context";
import { createHyperdriveRegistryLoader } from "../db/hyperdrive-registry";
import { createHyperdriveForumReader, createHyperdriveForumWriter } from "../db/hyperdrive-forum";
import { createHyperdriveUiTranslationStore } from "../db/hyperdrive-ui-translations";
import { ContentTranslationPresentationService } from "../app/localization/content-translation-presentation";
import { createHyperdriveContentTranslationBatchReader } from "../db/hyperdrive-content-translations";
import { createHyperdriveContentGenerationAdmission } from "../db/hyperdrive-content-generation-admission";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../app/auth/auth.server";
import { initializeAuthContext, withAuthSessionCookies } from "../app/auth/session-context";
import { AuthSessionUnavailableError, authSessionForRequest } from "../app/auth/request-context";
import { captureAttemptIngressSource } from "../app/observability/attempt-source";
import {
  RequestAttemptCollector, requestAttemptCollectorContext, withAttemptObservation,
} from "../app/observability/attempt-collector.server";
import { createHyperdriveAttemptTelemetry } from "../db/hyperdrive-attempt-telemetry";
import {adminForumContext} from "../app/admin/forum.server";
import {createHyperdriveAdminForum} from "../db/hyperdrive-admin-forum";
import { adminUsersContext } from "../app/admin/users.server";
import { createHyperdriveAdminUsers } from "../db/hyperdrive-admin-users";
import { userMeasureContext } from "../app/measures/request-context";
import { createHyperdriveUserMeasures } from "../db/hyperdrive-user-measures";
import { adminHistoryContext } from "../app/admin/history.server";
import { createHyperdriveAdminHistory } from "../db/hyperdrive-admin-history";
import { authorizationContext, authorizationOwnerContext } from "../app/authorization/request-context";
import { createHyperdriveAuthorization } from "../db/hyperdrive-authorization";
import { registrationSettingsContext } from "../app/settings/request-context";
import { createHyperdriveRegistrationSettings } from "../db/hyperdrive-registration-settings";
import { userLocaleWriterContext } from "../app/settings/user-locale-context";
import { createHyperdriveUserLocale } from "../db/hyperdrive-user-locale";
import { userPrivacyContext } from "../app/settings/user-privacy-context";
import { createHyperdriveUserPrivacy } from "../db/hyperdrive-user-privacy";
import { validOwnerUserId } from "../app/authorization/owner";
import { withForumAdministrativeRestrictions } from "../db/user-measure-admin-forum";
import { withOwnerUserMeasureAdmission } from "../db/user-measure-policy";
import { createHyperdriveComplaintSubmission } from "../db/hyperdrive-complaints";
import { complaintSubmissionContext } from "../app/complaints/request-context";
import { complaintQueueContext } from "../app/complaints/queue-context";
import { createHyperdriveComplaintQueue } from "../db/hyperdrive-complaint-queue";
import { complaintReviewContext } from "../app/complaints/review-context";
import { createHyperdriveComplaintReview } from "../db/hyperdrive-complaint-review";
import {complaintAppealContext} from "../app/complaints/appeal-context";
import {createHyperdriveComplaintAppeal} from "../db/hyperdrive-complaint-appeal";
import { resolveRuntimeDatabaseConnectionStrings } from "./database-bindings";
import { ownerSystemMonitoringContext } from "../app/super-admin/request-context";
import { createHyperdriveOwnerSystem } from "../db/hyperdrive-owner-system";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, executionContext?: ExecutionContext) {
    const requestStarted = performance.now();
    const context = new RouterContextProvider();
    const { localizationConnectionString, webConnectionString } = resolveRuntimeDatabaseConnectionStrings(env);
    const collector = new RequestAttemptCollector(captureAttemptIngressSource(request),
      () => createHyperdriveAttemptTelemetry(webConnectionString));
    context.set(requestAttemptCollectorContext, collector);
    try {
    const auth = withAttemptObservation(
      createHyperdriveAuthRuntime(
        webConnectionString, env as Env & BetterAuthEnvironment, undefined,
        () => collector.recordRegistrationDenied(),
      ), collector);
    let authHeaders: Headers;
    try {
      authHeaders = await initializeAuthContext(context, request, auth);
      collector.setResolvedActor(authSessionForRequest(context)?.user.id);
    } catch (error) {
      if (!(error instanceof AuthSessionUnavailableError)) throw error;
      return new Response("Service unavailable. Please try again.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    const ownerUserId = validOwnerUserId((env as Env & { VICO_OWNER_USER_ID?: string }).VICO_OWNER_USER_ID);
    const measureAdmission = withOwnerUserMeasureAdmission(ownerUserId);
    context.set(forumReaderContext, createHyperdriveForumReader(webConnectionString));
    context.set(forumWriterContext, createHyperdriveForumWriter(webConnectionString, undefined, undefined, measureAdmission));
    context.set(forumAttachmentStoreContext, createHyperdriveForumAttachmentStore(webConnectionString, undefined, measureAdmission));
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
    context.set(adminForumContext,createHyperdriveAdminForum(webConnectionString));
    context.set(adminUsersContext, createHyperdriveAdminUsers(webConnectionString));
    context.set(adminHistoryContext, createHyperdriveAdminHistory(webConnectionString));
    context.set(authorizationOwnerContext, ownerUserId);
    context.set(registrationSettingsContext, createHyperdriveRegistrationSettings(webConnectionString, ownerUserId));
    context.set(userLocaleWriterContext, createHyperdriveUserLocale(webConnectionString));
    context.set(userPrivacyContext, createHyperdriveUserPrivacy(webConnectionString));
    const ownerMonitoring = createHyperdriveOwnerSystem(webConnectionString, import.meta.env.MODE);
    context.set(ownerSystemMonitoringContext, ownerMonitoring);
    const authorization = createHyperdriveAuthorization(webConnectionString, undefined, ownerUserId);
    const effectiveAuthorization = withForumAdministrativeRestrictions(
      authorization, webConnectionString, undefined, ownerUserId,
    );
    context.set(authorizationContext, effectiveAuthorization);
    context.set(userMeasureContext, createHyperdriveUserMeasures(webConnectionString, ownerUserId));
    context.set(complaintSubmissionContext, createHyperdriveComplaintSubmission(webConnectionString, authorization, undefined, ownerUserId));
    context.set(complaintQueueContext, createHyperdriveComplaintQueue(webConnectionString, effectiveAuthorization, undefined, ownerUserId));
    context.set(complaintReviewContext, createHyperdriveComplaintReview(webConnectionString, effectiveAuthorization, undefined, ownerUserId));
    context.set(complaintAppealContext,createHyperdriveComplaintAppeal(webConnectionString,effectiveAuthorization,undefined,ownerUserId));
    context.set(contentGenerationAdmissionContext, createHyperdriveContentGenerationAdmission(webConnectionString, undefined, ownerUserId));
    context.set(contentGenerationActionContext, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME);
    const response = await requestHandler(request, context);
    // Record actual 5xx response outcomes only; never request URLs, bodies or credentials.
    // Passive telemetry is best-effort, not a veto for the regular response.
    if (response.status >= 500 && response.status <= 599 && executionContext?.waitUntil) {
      executionContext.waitUntil(ownerMonitoring.recordRequestFailure(response.status, performance.now() - requestStarted)
        .catch(() => undefined));
    }
    return withAuthSessionCookies(response, authHeaders);
    } finally {
      // A failure or early 503 still finalizes the bounded collector. Never
      // replace the original HTTP response/exception with telemetry failure.
      const task = collector.flush().catch(() => undefined);
      if (executionContext?.waitUntil) executionContext.waitUntil(task);
      else await task;
    }
  },
} satisfies ExportedHandler<Env>;
