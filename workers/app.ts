import {createHyperdriveOwnerOverview} from "../db/hyperdrive-owner-overview";
import {ownerOverviewMonitoringContext} from "../app/super-admin/request-context";
import {createHyperdriveOwnerIntegrations} from "../db/hyperdrive-owner-integrations";
import {ownerIntegrationsMonitoringContext} from "../app/super-admin/request-context";
import {observeRequiredLocalizationRead,googleParametersPresent} from "../app/observability/integration-runtime";
import {createHyperdriveOwnerData} from "../db/hyperdrive-owner-data";
import {ownerDataMonitoringContext} from "../app/super-admin/request-context";
import {createHyperdriveOperationalRecording} from "../db/hyperdrive-operational-recording";
import {createHyperdriveOwnerFiles} from "../db/hyperdrive-owner-files";
import {ownerFilesMonitoringContext} from "../app/super-admin/request-context";
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
import { RequestAuthFactCollector } from "../app/observability/auth-fact-collector.server";
import { createHyperdriveAuthFactWriter } from "../db/hyperdrive-auth-facts";
import {forumStructureReaderContext} from "../app/admin/structure.server";
import {forumStructureWriterContext} from "../app/admin/structure-actions.server";
import {createHyperdriveForumStructureWriter} from "../db/hyperdrive-forum-structure-writer";
import {createHyperdriveForumStructureReader} from "../db/hyperdrive-forum-structure-reader";
import {adminForumContext} from "../app/admin/forum.server";
import {hiddenQueueContext} from "../app/admin/visibility-queue.server";
import {createHyperdriveHiddenQueue} from "../db/hyperdrive-private-visibility-queue";
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
import { ownerSystemMonitoringContext, ownerSa02MonitoringContext, ownerNativeMonitoringContext } from "../app/super-admin/request-context";
import { createHyperdriveOwnerSystem } from "../db/hyperdrive-owner-system";
import {createHyperdriveOwnerLocalization} from "../db/hyperdrive-owner-localization";
import {ownerLocalizationMonitoringContext} from "../app/super-admin/request-context";
import { ownerAccountLifecycleContext, ownerProfileContext } from "../app/profile/request-context";
import { createHyperdriveOwnerProfile } from "../db/hyperdrive-owner-profile";
import { createHyperdriveOwnerAccountLifecycle } from "../db/hyperdrive-owner-account-lifecycle";
import { isOwnerAccountLifecyclePath, isOwnerMonitoringPath, isPrivateForumReadPath, protectFrameworkFailure } from "./private-failure-response";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

async function applicationFetch(request: Request, env: Env, executionContext?: ExecutionContext): Promise<Response> {
    const requestStarted = performance.now();
    const context = new RouterContextProvider();
    const { localizationConnectionString, webConnectionString } = resolveRuntimeDatabaseConnectionStrings(env);
    const operational=createHyperdriveOperationalRecording(webConnectionString);
    const collector = new RequestAttemptCollector(captureAttemptIngressSource(request),
      () => createHyperdriveAttemptTelemetry(webConnectionString));
    context.set(requestAttemptCollectorContext, collector);
    const facts = new RequestAuthFactCollector(
      () => createHyperdriveAuthFactWriter(webConnectionString),
      count => collector.recordGap("auth", count),
    );
    try {
    const auth = withAttemptObservation(
      createHyperdriveAuthRuntime(
        webConnectionString, env as Env & BetterAuthEnvironment, undefined,
        () => collector.recordRegistrationDenied(), facts,
      ), collector);
    let authHeaders: Headers;
    try {
      authHeaders = await initializeAuthContext(context, request, auth);
      collector.setResolvedActor(authSessionForRequest(context)?.user.id);
      facts.setResolvedActor(authSessionForRequest(context)?.user.id);
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
    context.set(forumWriterContext, createHyperdriveForumWriter(webConnectionString, undefined, undefined, measureAdmission,operational.sink,ownerUserId));
    context.set(forumAttachmentStoreContext, createHyperdriveForumAttachmentStore(webConnectionString, undefined, measureAdmission,operational.sink));
    const attachmentBucket = (env as Env & { ATTACHMENT_R2?: R2Bucket }).ATTACHMENT_R2;
    context.set(privateAttachmentBucketContext, attachmentBucket ? privateAttachmentBucket(attachmentBucket,operational.storageCapture) : null);
    const requiredLocalization=observeRequiredLocalizationRead(createHyperdriveRegistryLoader(localizationConnectionString));
    context.set(registryLoaderContext,requiredLocalization.load);
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
    const ownerMonitoring = createHyperdriveOwnerSystem(webConnectionString, import.meta.env.MODE, ownerUserId);
    context.set(ownerSystemMonitoringContext, ownerMonitoring);
    context.set(ownerSa02MonitoringContext, ownerMonitoring);
    context.set(ownerNativeMonitoringContext, ownerMonitoring);
    context.set(ownerDataMonitoringContext,createHyperdriveOwnerData(webConnectionString,localizationConnectionString,ownerUserId));
    context.set(ownerFilesMonitoringContext,createHyperdriveOwnerFiles(webConnectionString,!!attachmentBucket,ownerUserId));
    context.set(ownerLocalizationMonitoringContext,createHyperdriveOwnerLocalization(webConnectionString,localizationConnectionString,ownerUserId));
    context.set(ownerProfileContext, createHyperdriveOwnerProfile(webConnectionString));
    context.set(ownerAccountLifecycleContext, createHyperdriveOwnerAccountLifecycle(webConnectionString, ownerUserId));
    const authorization = createHyperdriveAuthorization(webConnectionString, undefined, ownerUserId);
    const effectiveAuthorization = withForumAdministrativeRestrictions(
      authorization, webConnectionString, undefined, ownerUserId,
    );
    context.set(authorizationContext, effectiveAuthorization);
    context.set(forumStructureReaderContext,createHyperdriveForumStructureReader(webConnectionString,effectiveAuthorization,ownerUserId));
    context.set(forumStructureWriterContext,createHyperdriveForumStructureWriter(webConnectionString,effectiveAuthorization,ownerUserId));
    context.set(hiddenQueueContext, createHyperdriveHiddenQueue(webConnectionString, effectiveAuthorization));
    context.set(userMeasureContext, createHyperdriveUserMeasures(webConnectionString, ownerUserId));
    context.set(complaintSubmissionContext, createHyperdriveComplaintSubmission(webConnectionString, authorization, undefined, ownerUserId));
    context.set(complaintQueueContext, createHyperdriveComplaintQueue(webConnectionString, effectiveAuthorization, undefined, ownerUserId));
    context.set(complaintReviewContext, createHyperdriveComplaintReview(webConnectionString, effectiveAuthorization, undefined, ownerUserId));
    context.set(complaintAppealContext,createHyperdriveComplaintAppeal(webConnectionString,effectiveAuthorization,undefined,ownerUserId));
    context.set(contentGenerationAdmissionContext, createHyperdriveContentGenerationAdmission(webConnectionString, undefined, ownerUserId));
    context.set(contentGenerationActionContext, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME);
    const integrationRuntimeFacts={
      webBindingPresent:!!webConnectionString,localizationBindingPresent:!!localizationConnectionString,googleParametersPresent:googleParametersPresent(env as Env & BetterAuthEnvironment),bucketBound:!!attachmentBucket,
      generationEnabled:context.get(contentGenerationActionContext).enabled,generationAdmissionWired:context.get(contentGenerationAdmissionContext)!==null,providerWired:false,enqueuerWired:false,consumerWired:false,
    };
    context.set(ownerIntegrationsMonitoringContext,createHyperdriveOwnerIntegrations(webConnectionString,ownerUserId,()=>ownerMonitoring.readSystem(),integrationRuntimeFacts,requiredLocalization.current));
    context.set(ownerOverviewMonitoringContext,createHyperdriveOwnerOverview(webConnectionString,localizationConnectionString,ownerUserId,import.meta.env.MODE,integrationRuntimeFacts,requiredLocalization.current));
    const response = await requestHandler(request, context);
    const finalResponse = protectFrameworkFailure(request, response);
    // Record actual 5xx response outcomes only; never request URLs, bodies or credentials.
    // Passive telemetry is best-effort, not a veto for the regular response.
    if (response.status >= 500 && response.status <= 599 && executionContext?.waitUntil) {
      executionContext.waitUntil(ownerMonitoring.recordRequestFailure(response.status, performance.now() - requestStarted)
        .catch(() => undefined));
    }
    return withAuthSessionCookies(finalResponse, authHeaders);
    } finally {
      // A failure or early 503 still finalizes the bounded collector. Never
      // replace the original HTTP response/exception with telemetry failure.
      const task = facts.flush()
        .catch(() => collector.recordGap("auth"))
        .then(() => collector.flush().catch(() => undefined))
        .then(()=>operational.flush().catch(()=>undefined));
      if (executionContext?.waitUntil) executionContext.waitUntil(task);
      else await task;
    }
}

export default {
  async fetch(request, env, executionContext?: ExecutionContext) {
    const privateBoundary = isOwnerAccountLifecyclePath(new URL(request.url).pathname)
      || isOwnerMonitoringPath(new URL(request.url).pathname)
      || isPrivateForumReadPath(new URL(request.url).pathname);
    try {
      const response = await applicationFetch(request, env, executionContext);
      return privateBoundary ? protectFrameworkFailure(request, response) : response;
    } catch (error) {
      if (!privateBoundary) throw error;
      if (error instanceof Response && error.status < 500) return protectFrameworkFailure(request, error);
      const status = error instanceof Response ? error.status : 500;
      return protectFrameworkFailure(request, new Response(status === 503 ? "Service unavailable" : "Unexpected server failure", {
        status, headers: { "Content-Type": "text/plain; charset=utf-8" },
      }));
    }
  },
} satisfies ExportedHandler<Env>;
