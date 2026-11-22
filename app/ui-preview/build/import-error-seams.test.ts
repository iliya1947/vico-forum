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

import { RegistrationSettingsUnavailableError as neutralRegistrationUnavailable } from "../../../db/registration-settings-error";
import { RegistrationSettingsUnavailableError as productionRegistrationUnavailable } from "../../../db/hyperdrive-registration-settings";

describe("shared P1 registration settings error identity", () => {
  it("preserves production instanceof and fail-closed registration behavior", () => {
    expect(neutralRegistrationUnavailable).toBe(productionRegistrationUnavailable);
    const cause = new Error("storage unavailable");
    const error = new productionRegistrationUnavailable("Registration settings unavailable", { cause });
    expect(error).toBeInstanceOf(neutralRegistrationUnavailable);
    expect(error.message).toBe("Registration settings unavailable");
    expect(error.cause).toBe(cause);
  });
});

import {
  RegistrationSettingsForbiddenError as neutralRegistrationForbidden,
  RegistrationSettingsConflictError as neutralRegistrationConflict,
  RegistrationSettingsValidationError as neutralRegistrationValidation,
  RegistrationSettingsInvariantError as neutralRegistrationInvariant,
} from "../../../db/registration-settings-error";
import {
  RegistrationSettingsForbiddenError as productionRegistrationForbidden,
  RegistrationSettingsConflictError as productionRegistrationConflict,
  RegistrationSettingsValidationError as productionRegistrationValidation,
  RegistrationSettingsInvariantError as productionRegistrationInvariant,
} from "../../../db/registration-settings";
import {
  AuthorizationForbiddenError as neutralAuthorizationForbidden,
  AuthorizationRoleAssignedError as neutralAuthorizationAssigned,
  AuthorizationRoleSlugConflictError as neutralAuthorizationSlug,
  InvalidAuthorizationInputError as neutralAuthorizationInvalid,
} from "../../../db/authorization-error";
import {
  AuthorizationForbiddenError as productionAuthorizationForbidden,
  AuthorizationRoleAssignedError as productionAuthorizationAssigned,
  AuthorizationRoleSlugConflictError as productionAuthorizationSlug,
} from "../../../db/authorization-repository";
import { InvalidAuthorizationInputError as productionAuthorizationInvalid } from "../../../db/authorization-service";
import { AdminHistoryUnavailableError as neutralHistoryUnavailable } from "../../../db/admin-history-error";
import { AdminHistoryUnavailableError as productionHistoryUnavailable } from "../../../db/hyperdrive-admin-history";

describe("shared P1 settings-forum import errors", () => {
  it("preserves exact production constructors used by the original routes and handlers", () => {
    const pairs = [
      [neutralRegistrationForbidden, productionRegistrationForbidden],
      [neutralRegistrationConflict, productionRegistrationConflict],
      [neutralRegistrationValidation, productionRegistrationValidation],
      [neutralRegistrationInvariant, productionRegistrationInvariant],
      [neutralAuthorizationForbidden, productionAuthorizationForbidden],
      [neutralAuthorizationAssigned, productionAuthorizationAssigned],
      [neutralAuthorizationSlug, productionAuthorizationSlug],
      [neutralAuthorizationInvalid, productionAuthorizationInvalid],
      [neutralHistoryUnavailable, productionHistoryUnavailable],
    ] as const;
    for (const [neutral, production] of pairs) {
      expect(neutral).toBe(production);
      expect(new production("test")).toBeInstanceOf(neutral);
    }
  });
});

import { UserLocaleUnavailableError as neutralUserLocale } from "../../../db/user-locale-error";
import { UserLocaleUnavailableError as productionUserLocale } from "../../../db/hyperdrive-user-locale";

describe("shared P1 Settings user locale import", () => {
  it("retains the production availability constructor and cause", () => {
    expect(neutralUserLocale).toBe(productionUserLocale);
    const cause = new Error("database temporarily unavailable");
    const error = new productionUserLocale("Account locale storage unavailable", { cause });
    expect(error).toBeInstanceOf(neutralUserLocale);
    expect(error.message).toBe("Account locale storage unavailable");
    expect(error.cause).toBe(cause);
  });
});

import { UserPrivacyUnavailableError as neutralPrivacyUnavailable } from "../../../db/user-privacy-error";
import { UserPrivacyUnavailableError as productionPrivacyUnavailable } from "../../../db/hyperdrive-user-privacy";

describe("shared P1 Settings privacy import", () => {
  it("preserves the production unavailable error constructor, name, message and cause", () => {
    expect(neutralPrivacyUnavailable).toBe(productionPrivacyUnavailable);
    const cause = new Error("database unavailable");
    const error = new productionPrivacyUnavailable({ cause });
    expect(error).toBeInstanceOf(neutralPrivacyUnavailable);
    expect(error.name).toBe("UserPrivacyUnavailableError");
    expect(error.message).toBe("Personal privacy storage unavailable");
    expect(error.cause).toBe(cause);
  });
});

import { AdminUsersUnavailableError as neutralAdminUsers } from "../../../db/admin-users-error";
import { AdminUsersUnavailableError as productionAdminUsers } from "../../../db/hyperdrive-admin-users";
import { AdminForumUnavailableError as neutralAdminForum } from "../../../db/admin-forum-error";
import { AdminForumUnavailableError as productionAdminForum } from "../../../db/hyperdrive-admin-forum";

describe("shared P1 Admin Users import errors", () => {
  it("preserves both production exception constructors and their causes", () => {
    expect(neutralAdminUsers).toBe(productionAdminUsers);
    expect(neutralAdminForum).toBe(productionAdminForum);
    const cause = new Error("database disconnected");
    const users = new productionAdminUsers("Admin Users read unavailable", { cause });
    const forum = new productionAdminForum("Forum administration unavailable", { cause });
    expect(users).toBeInstanceOf(neutralAdminUsers);
    expect(forum).toBeInstanceOf(neutralAdminForum);
    expect(users.message).toBe("Admin Users read unavailable");
    expect(forum.message).toBe("Forum administration unavailable");
    expect(users.cause).toBe(cause);
    expect(forum.cause).toBe(cause);
  });
});

import { OwnerSystemUnavailableError as neutralOwnerSystem } from "../../../db/owner-system-error";
import { OwnerSystemUnavailableError as productionOwnerSystem } from "../../../db/hyperdrive-owner-system";

describe("shared P1 Super-admin import errors", () => {
  it("keeps the Owner monitoring production constructor and cause", () => {
    expect(neutralOwnerSystem).toBe(productionOwnerSystem);
    const cause = new Error("database disconnected");
    const error = new productionOwnerSystem("Owner monitoring unavailable", { cause });
    expect(error).toBeInstanceOf(neutralOwnerSystem);
    expect(error.message).toBe("Owner monitoring unavailable");
    expect(error.cause).toBe(cause);
  });
});
