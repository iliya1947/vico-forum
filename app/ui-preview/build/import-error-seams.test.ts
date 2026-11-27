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
      "ForumTopicClosedError", "ForumPublicationReplayConflictError", "ForumVisibilityReasonError",
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

import * as neutralStructure from "../../../db/forum-structure-contract";
import * as productionStructure from "../../../db/forum-structure";
import { TopicMoveWriteUnavailableError as neutralMove } from "../../../db/topic-move-error";
import { TopicMoveWriteUnavailableError as productionMove } from "../../../db/hyperdrive-topic-move";

describe("current topic visibility and move import seams", () => {
  it("shares the production structure error classes and counter validation", () => {
    for (const key of ["StructureValidationError", "StructureForbiddenError", "StructureNotFoundError", "StructureInvariantError", "StructureConflictError", "parseStructureCounter"] as const) {
      expect(neutralStructure[key]).toBe(productionStructure[key]);
    }
    expect(neutralStructure.parseStructureCounter("9223372036854775807")).toBe(9223372036854775807n);
    expect(() => neutralStructure.parseStructureCounter("9223372036854775808"))
      .toThrow(productionStructure.StructureValidationError);
    expect(neutralMove).toBe(productionMove);
  });
});
