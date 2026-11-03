import type {ComplaintOutcome} from "./complaints-domain";

export type AppealSide="author"|"reporter";
export type AppealResult="upheld"|"overturned";
export interface AppealState {ordinal:number;status:"pending"|"resolved";outcome:AppealResult|null}
export interface AppealPolicy {
 initialOutcome:ComplaintOutcome;effectiveOutcome:ComplaintOutcome;
 eligibleSide:AppealSide;used:number;remaining:number;pending:boolean;
}
/** Initial Decision stays immutable; each resolved overturned reverses current effective outcome. */
export function deriveAppealPolicy(initialOutcome:ComplaintOutcome, appeals:readonly AppealState[]):AppealPolicy{
 if(initialOutcome!=="confirmed"&&initialOutcome!=="not-confirmed")throw new Error("invalid initial Decision");
 if(appeals.length>3)throw new Error("invalid Appeal quota");
 let effectiveOutcome=initialOutcome;
 let pending=false;
 for(let i=0;i<appeals.length;i++){
  const appeal=appeals[i]!;
  if(appeal.ordinal!==i+1)throw new Error("invalid Appeal ordinal sequence");
  if(appeal.status==="pending"){
   if(appeal.outcome!==null||i!==appeals.length-1)throw new Error("invalid pending Appeal sequence");
   pending=true;
  }else if(appeal.status==="resolved"){
   if(appeal.outcome!=="upheld"&&appeal.outcome!=="overturned")throw new Error("invalid Appeal result");
   if(appeal.outcome==="overturned")
    effectiveOutcome=effectiveOutcome==="confirmed"?"not-confirmed":"confirmed";
  }else throw new Error("invalid Appeal status");
 }
 return {initialOutcome,effectiveOutcome,eligibleSide:effectiveOutcome==="confirmed"?"author":"reporter",
  used:appeals.length,remaining:3-appeals.length,pending};
}
