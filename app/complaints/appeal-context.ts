import {createContext} from "react-router";
import type {PendingAppealsPage,AppealReviewPage} from "../../db/complaint-appeal-read";
import type {ReviewPages,ReviewFullPost} from "./review-contract";
import type {ComplaintOutcome} from "../../db/complaints-domain";

export interface ParticipantAppealResult {
 caseId:string;decisionId:string;outcome:ComplaintOutcome;reasoning:string;decidedAt:Date;
 affectedAuthor:boolean;reporter:boolean;
 initialOutcome:ComplaintOutcome;effectiveOutcome:ComplaintOutcome;eligibleSide:"author"|"reporter";
 used:number;remaining:number;pending:boolean;canAppeal:boolean;
 appeals:Array<{id:string;ordinal:number;side:"author"|"reporter";
  status:"pending"|"resolved";outcome:"upheld"|"overturned"|null;
  reasoning:string|null;resolvedAt:Date|null;ownArgument:string|null}>;
}
export interface ComplaintAppeal {
 ownResult(actor:string,caseId:string):Promise<ParticipantAppealResult>;
 submit(actor:string,input:{caseId:string;decisionId:string;operationId:string;argument:string}):Promise<string>;
 pendingQueue(actor:string,page:number):Promise<PendingAppealsPage>;
 review(actor:string,caseId:string,appealId:string,pages:ReviewPages):Promise<AppealReviewPage>;
 resolve(actor:string,input:{caseId:string;appealId:string;operationId:string;outcome:"upheld"|"overturned";reasoning:string}):Promise<string>;
 context(actor:string,caseId:string,appealId:string,postId:string):Promise<ReviewFullPost>;
 evidence(actor:string,caseId:string,appealId:string,attachmentId:string):Promise<{objectKey:string;fileName:string;byteSize:number}>;
}
export const complaintAppealContext=createContext<ComplaintAppeal>();
