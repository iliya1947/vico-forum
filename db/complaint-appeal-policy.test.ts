import {describe,it,expect} from "vitest";
import {deriveAppealPolicy} from "./complaint-appeal-policy";
describe("Complaints Package 6 effective outcome",()=>{
 it("follows every flip and preserves upheld",()=>{
  for(const initial of ["confirmed","not-confirmed"] as const){
   const opposite=initial==="confirmed"?"not-confirmed":"confirmed";
   const resolved=(ordinal:number,outcome:"upheld"|"overturned")=>({ordinal,status:"resolved" as const,outcome});
   expect(deriveAppealPolicy(initial,[])).toMatchObject({effectiveOutcome:initial,remaining:3,pending:false});
   expect(deriveAppealPolicy(initial,[resolved(1,"overturned")])).toMatchObject({effectiveOutcome:opposite,remaining:2,eligibleSide:opposite==="confirmed"?"author":"reporter"});
   expect(deriveAppealPolicy(initial,[resolved(1,"overturned"),resolved(2,"upheld")])).toMatchObject({effectiveOutcome:opposite,remaining:1});
   expect(deriveAppealPolicy(initial,[resolved(1,"overturned"),resolved(2,"overturned")])).toMatchObject({effectiveOutcome:initial,remaining:1});
   expect(deriveAppealPolicy(initial,[resolved(1,"overturned"),resolved(2,"overturned"),resolved(3,"overturned")])).toMatchObject({effectiveOutcome:opposite,remaining:0});
   expect(deriveAppealPolicy(initial,[resolved(1,"overturned"),{ordinal:2,status:"pending",outcome:null}])).toMatchObject({effectiveOutcome:opposite,pending:true,used:2,remaining:1});
  }
 });
 it("refuses corrupted ordinals, multiple pending and missing results",()=>{
  const bad=[
   [{ordinal:2,status:"resolved",outcome:"upheld"}],
   [{ordinal:1,status:"pending",outcome:null},{ordinal:2,status:"resolved",outcome:"overturned"}],
   [{ordinal:1,status:"resolved",outcome:null}],
   [{ordinal:1,status:"pending",outcome:"upheld"}],
   [{ordinal:1,status:"resolved",outcome:"upheld"},{ordinal:2,status:"resolved",outcome:"upheld"},{ordinal:3,status:"resolved",outcome:"upheld"},{ordinal:4,status:"pending",outcome:null}],
  ];
  for(const seq of bad)expect(()=>deriveAppealPolicy("confirmed",seq as never)).toThrow();
 });
});
