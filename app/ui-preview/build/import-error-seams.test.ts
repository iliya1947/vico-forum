// @vitest-environment node
import { describe, expect, it } from "vitest";
import { UserMeasuresUnavailableError as neutralMeasures } from "../../../db/user-measures-error";
import { UserMeasuresUnavailableError as productionMeasures } from "../../../db/hyperdrive-user-measures";
import { ForumStorageUnavailableError as neutralForum } from "../../../db/forum-storage-error";
import { ForumStorageUnavailableError as productionForum } from "../../../db/hyperdrive-forum";
import { AuthorizationUnavailableError as neutralAuthorization } from "../../../db/authorization-error";
import { AuthorizationUnavailableError as productionAuthorization } from "../../../db/authorization-service";
import { ContentGenerationPlanningUnavailableError as neutralGeneration } from "../../localization/content-generation-error";
import { ContentGenerationPlanningUnavailableError as productionGeneration } from "../../localization/content-generation-action.server";

describe("shared browser-safe error identity", () => {
  it("retains the exact production instanceof classes", () => {
    expect(neutralForum).toBe(productionForum);
    expect(neutralAuthorization).toBe(productionAuthorization);
    expect(neutralGeneration).toBe(productionGeneration);
    expect(neutralMeasures).toBe(productionMeasures);
    for (const ErrorClass of [neutralForum, neutralAuthorization, neutralGeneration, neutralMeasures]) {
      const error = new ErrorClass();
      expect(error).toBeInstanceOf(ErrorClass);
      expect(error).toBeInstanceOf(Error);
    }
  });
});

import * as neutralForumErrors from "../../../db/forum-errors";
import * as productionForumErrors from "../../../db/forum-repository";
import { InvalidForumContentError as productionContentError } from "../../../db/forum-service";
import * as neutralAccountErrors from "../../../db/account-state-errors";
import * as productionAccountErrors from "../../../db/account-state";
import { UserMeasureRestrictedError as productionRestricted } from "../../../db/user-measure-policy";
import { UserMeasureRestrictedError as neutralRestricted } from "../../../db/user-measures-error";
import { isForumAttachmentUuid as neutralAttachmentId } from "../../../db/forum-attachment-id";
import { isForumAttachmentUuid as productionAttachmentId } from "../../../db/forum-attachments";
import { UserPrivacyAccountMissingError as neutralPrivacyMissing } from "../../../db/user-privacy-error";
import { UserPrivacyAccountMissingError as productionPrivacyMissing } from "../../../db/user-privacy";

describe("topic action import barriers", () => {
  it("preserves identical production and neutral exception constructors", () => {
    const forumNames = [
      "ConcurrentRevisionError", "ForumEntityNotFoundError",
      "ForumAuthorizationError", "ForumStateConflictError",
      "ForumTopicClosedError", "ForumPublicationReplayConflictError",
    ] as const;
    for (const key of forumNames) expect(neutralForumErrors[key]).toBe(productionForumErrors[key]);
    expect(neutralForumErrors.InvalidForumContentError).toBe(productionContentError);
    const accountNames = [
      "AccountStateUnavailableError", "AccountStateUnexpectedError",
      "AccountInactiveError", "AccountMissingError",
    ] as const;
    for (const key of accountNames) expect(neutralAccountErrors[key]).toBe(productionAccountErrors[key]);
    expect(neutralRestricted).toBe(productionRestricted);
    expect(neutralPrivacyMissing).toBe(productionPrivacyMissing);
    expect(neutralAttachmentId).toBe(productionAttachmentId);
    expect(neutralAttachmentId("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(neutralAttachmentId("invalid-id")).toBe(false);
  });
});

import {
  InvalidForumAttachmentError as neutralInvalidAttachment,
  ForumAttachmentDraftConflictError as neutralDraftConflict,
  ForumAttachmentStorageUnavailableError as neutralAttachmentUnavailable,
} from "../../../db/forum-attachment-errors";
import {
  InvalidForumAttachmentError as productionInvalidAttachment,
  ForumAttachmentDraftConflictError as productionDraftConflict,
} from "../../../db/forum-attachments";
import { ForumAttachmentDraftConflictError as generationDraftConflict } from "../../../db/attachment-draft-generation";
import { ForumAttachmentStorageUnavailableError as productionAttachmentUnavailable } from "../../../db/hyperdrive-forum-attachments";

describe("shared P1 attachment error identity", () => {
  it("keeps original production exception constructors through neutral module exports", () => {
    expect(neutralInvalidAttachment).toBe(productionInvalidAttachment);
    expect(neutralDraftConflict).toBe(productionDraftConflict);
    expect(neutralDraftConflict).toBe(generationDraftConflict);
    expect(neutralAttachmentUnavailable).toBe(productionAttachmentUnavailable);
    expect(new neutralInvalidAttachment()).toBeInstanceOf(productionInvalidAttachment);
    expect(new productionDraftConflict("gone")).toBeInstanceOf(neutralDraftConflict);
    expect(new neutralDraftConflict("gone").reason).toBe("gone");
    expect(new productionAttachmentUnavailable()).toBeInstanceOf(neutralAttachmentUnavailable);
  });
});

import { ComplaintStorageUnavailableError as neutralComplaintStorage } from "../../../db/complaint-storage-error";
import { ComplaintStorageUnavailableError as productionComplaintStorage } from "../../../db/hyperdrive-complaints";

describe("shared P1 complaints storage error identity", () => {
  it("preserves the original production class and cause for complaint submission handlers", () => {
    expect(neutralComplaintStorage).toBe(productionComplaintStorage);
    const cause = new Error("database unavailable");
    const error = new productionComplaintStorage("complaint storage unavailable", { cause });
    expect(error).toBeInstanceOf(neutralComplaintStorage);
    expect(error.cause).toBe(cause);
  });
});

import { UserMeasureNotFoundError as neutralMeasureNotFound } from "../../../db/user-measures-error";
import { UserMeasureNotFoundError as productionMeasureNotFound } from "../../../db/user-measures";
import { AuthorizationNotFoundError as neutralAuthorizationNotFound } from "../../../db/authorization-error";
import { AuthorizationNotFoundError as productionAuthorizationNotFound } from "../../../db/authorization-repository";
import {
  OwnerProfileUnavailableError as neutralOwnerUnavailable,
  InvalidOwnerProfileSessionCursorError as neutralOwnerSessions,
  InvalidOwnerUserHistoryCursorError as neutralOwnerHistory,
} from "../../../db/owner-profile-errors";
import { OwnerProfileUnavailableError as productionOwnerUnavailable } from "../../../db/hyperdrive-owner-profile";
import { InvalidOwnerProfileSessionCursorError as productionOwnerSessions } from "../../../db/owner-user-profile";
import { InvalidOwnerUserHistoryCursorError as productionOwnerHistory } from "../../../db/owner-user-history";

describe("shared P1 profile section error identity", () => {
  it("keeps one production constructor per profile error across neutral imports", () => {
    expect(neutralMeasureNotFound).toBe(productionMeasureNotFound);
    expect(neutralAuthorizationNotFound).toBe(productionAuthorizationNotFound);
    expect(neutralOwnerUnavailable).toBe(productionOwnerUnavailable);
    expect(neutralOwnerSessions).toBe(productionOwnerSessions);
    expect(neutralOwnerHistory).toBe(productionOwnerHistory);
    expect(new productionMeasureNotFound()).toBeInstanceOf(neutralMeasureNotFound);
    expect(new productionAuthorizationNotFound()).toBeInstanceOf(neutralAuthorizationNotFound);
    expect(new productionOwnerUnavailable()).toBeInstanceOf(neutralOwnerUnavailable);
    expect(new productionOwnerSessions()).toBeInstanceOf(neutralOwnerSessions);
    expect(new productionOwnerHistory()).toBeInstanceOf(neutralOwnerHistory);
    expect(new neutralOwnerSessions().message).toBe("Invalid Owner profile session cursor");
    expect(new neutralOwnerHistory().message).toBe("Invalid Owner user history cursor");
  });
});

import * as neutralOwnerLifecycle from "../../../db/owner-account-lifecycle-contract";
import * as productionOwnerLifecycle from "../../../db/owner-account-lifecycle";
import { OwnerAccountLifecycleUnavailableError as productionLifecycleUnavailable } from "../../../db/hyperdrive-owner-account-lifecycle";
import { AccountInactiveError as neutralAccountInactive, AccountStateUnavailableError as neutralAccountUnavailable } from "../../../db/account-state-errors";
import { AccountInactiveError as productionAccountInactive, AccountStateUnavailableError as productionAccountUnavailable } from "../../../db/account-state";

describe("shared P1 Owner lifecycle contract identity", () => {
  it("preserves production error constructors and validation semantics", () => {
    for (const name of [
      "OwnerAccountLifecycleForbiddenError", "OwnerAccountLifecycleValidationError",
      "OwnerAccountLifecycleTargetMissingError", "OwnerAccountLifecycleConflictError",
      "OwnerAccountLifecycleInvariantError", "OwnerAccountLifecycleCommitUncertainError",
      "OwnerAccountLifecycleUnavailableError",
    ] as const) {
      expect(neutralOwnerLifecycle[name]).toBe(productionOwnerLifecycle[name]);
    }
    expect(neutralOwnerLifecycle.OwnerAccountLifecycleUnavailableError).toBe(productionLifecycleUnavailable);
    expect(neutralAccountInactive).toBe(productionAccountInactive);
    expect(neutralAccountUnavailable).toBe(productionAccountUnavailable);
    expect(neutralOwnerLifecycle.validateOwnerAccountDeactivationInput)
      .toBe(productionOwnerLifecycle.validateOwnerAccountDeactivationInput);
    const valid = { actorId: "owner", targetId: "target", operationId: "ABCDEF12-1234-4321-ABCD-123456789ABC" };
    expect(neutralOwnerLifecycle.validateOwnerAccountDeactivationInput(valid)).toEqual({
      ...valid, operationId: valid.operationId.toLowerCase(),
    });
    expect(() => neutralOwnerLifecycle.validateOwnerAccountDeactivationInput({ ...valid, targetId: "" }))
      .toThrow(neutralOwnerLifecycle.OwnerAccountLifecycleValidationError);
    const cause = new Error("storage failure");
    expect(new productionLifecycleUnavailable({ cause }).cause).toBe(cause);
  });
});

import {
  InvalidUserMeasureInputError as neutralMeasureInvalid,
  UserMeasureConflictError as neutralMeasureConflict,
} from "../../../db/user-measures-error";
import {
  InvalidUserMeasureInputError as productionMeasureInvalid,
  UserMeasureConflictError as productionMeasureConflict,
} from "../../../db/user-measures";
import { measureResponseError, measureUuid } from "../../measures/routes.server";

describe("shared P1 measure route error identity", () => {
  it("preserves production constructors and original HTTP mapping", () => {
    expect(neutralMeasureInvalid).toBe(productionMeasureInvalid);
    expect(neutralMeasureConflict).toBe(productionMeasureConflict);
    expect(new productionMeasureInvalid("invalid")).toBeInstanceOf(neutralMeasureInvalid);
    expect(new productionMeasureConflict("conflict")).toBeInstanceOf(neutralMeasureConflict);
    expect(measureResponseError(new productionMeasureInvalid()).status).toBe(400);
    expect(measureResponseError(new productionMeasureConflict()).status).toBe(409);
    expect(() => measureUuid("invalid")).toThrow(neutralMeasureInvalid);
  });
});
