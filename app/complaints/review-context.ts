import {createContext} from "react-router";
import type {ReviewCase,ReviewPages,ReviewFullPost} from "./review-contract";
export interface ComplaintReview {
  read(actor:string,id:string,pages:ReviewPages):Promise<ReviewCase>;
  context(actor:string,id:string,postId:string):Promise<ReviewFullPost>;
  evidence(actor:string,id:string,attachmentId:string):Promise<{objectKey:string;fileName:string;byteSize:number}>;
  ownResult(actor:string,caseId:string):Promise<{caseId:string;decisionId:string;outcome:"confirmed"|"not-confirmed";reasoning:string;decidedAt:Date;affectedAuthor:boolean;reporter:boolean}>;
  addNote(actor:string,input:{caseId:string;operationId:string;body:string}):Promise<string>;
  decide(actor:string,input:{caseId:string;operationId:string;expectedVersion:number;outcome:"confirmed"|"not-confirmed";reasoning:string}):Promise<string>;
}
export const complaintReviewContext=createContext<ComplaintReview>();
