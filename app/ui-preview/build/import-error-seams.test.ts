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
