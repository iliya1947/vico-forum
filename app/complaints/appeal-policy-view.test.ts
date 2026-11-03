import {describe,it,expect} from "vitest";
import {deriveAppealPolicy} from "../../db/complaint-appeal-policy";
describe("Package 6 notification anchor and effective policy",()=>{
 it("keeps initial decision immutable even when current outcome flips",()=>{
  const policy=deriveAppealPolicy("confirmed",[{ordinal:1,status:"resolved",outcome:"overturned"},{ordinal:2,status:"pending",outcome:null}]);
  expect(policy).toMatchObject({initialOutcome:"confirmed",effectiveOutcome:"not-confirmed",pending:true,used:2,remaining:1,eligibleSide:"reporter"});
 });
});
