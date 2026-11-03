import type { ReviewPages, ReviewCase } from "../app/complaints/review-contract";
import type { AuthorizationCapability } from "./authorization-service";
import type { PermissionKey } from "../app/authorization/catalog";
import type { ComplaintPrioritySettingsCommand, ComplaintPriorityWeights, ComplaintPriorityCommand } from "../app/complaints/queue-contract";
import {
  ComplaintForbiddenError, ComplaintInputError, complaintId, complaintOutcome,
  COMPLAINT_REASONS, complaintReason, complaintText, type ComplaintTarget,
} from "./complaints-domain";
import { DrizzleComplaintsRepository, type AppealComplaint, type DecideComplaint, type ResolveComplaintAppeal, type SubmitComplaint } from "./complaints-repository";

/** Server-only entry point; each call checks fresh effective permissions, not role names. */
export class ComplaintsService {
  constructor(private readonly repository: DrizzleComplaintsRepository, private readonly authorization: AuthorizationCapability) {}
  private async require(actor: string, key: PermissionKey) {
    complaintId(actor);
    if (!(await this.authorization.forUser(actor).has(key))) throw new ComplaintForbiddenError("complaint permission denied");
  }
  private async reviewIdentity(actor: string, key: PermissionKey) {
    complaintId(actor);
    const { effectivePermissions } = await this.authorization.forUser(actor).resolve();
    if (!effectivePermissions.includes(key)) throw new ComplaintForbiddenError("complaint permission denied");
    return effectivePermissions.includes("forum.complaint.reporterIdentity.read");
  }
  async readPrioritySettings(actor: string) {
    await this.require(actor,"forum.complaint.priority.manage");
    return this.repository.readPrioritySettings();
  }
  async savePrioritySettings(actor: string, input: ComplaintPrioritySettingsCommand) {
    await this.require(actor,"forum.complaint.priority.manage");
    if (!input || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1 || input.expectedVersion > 2147483647 ||
      !input.weights || typeof input.weights !== "object" || Array.isArray(input.weights) ||
      Object.keys(input.weights).length !== COMPLAINT_REASONS.length ||
      !COMPLAINT_REASONS.every(reason => Object.hasOwn(input.weights,reason) && [1,2,3].includes(input.weights[reason])))
      throw new ComplaintInputError("invalid priority settings");
    const weights = Object.fromEntries(COMPLAINT_REASONS.map(reason => [reason,input.weights[reason]])) as ComplaintPriorityWeights;
    return this.repository.savePrioritySettings({expectedVersion:input.expectedVersion,weights});
  }
  async readQueue(actor: string, page: number) {
    await this.require(actor,"forum.complaint.review");
    if(!Number.isSafeInteger(page)||page<0||page>10000)throw new ComplaintInputError("invalid page");
    return this.repository.readQueue(actor,page);
  }
  async readResolvedHistory(actor:string,page:number){
    await this.require(actor,"forum.complaint.review");
    if(!Number.isSafeInteger(page)||page<0||page>10000)throw new ComplaintInputError("invalid page");
    return this.repository.readResolvedHistory(page);
  }
  async readHistoryTimeline(actor:string,caseId:string,page:number){
    const identity=await this.reviewIdentity(actor,"forum.complaint.review");
    if(!Number.isSafeInteger(page)||page<0||page>10000)throw new ComplaintInputError("invalid page");
    return this.repository.readHistoryTimeline(complaintId(caseId),page,identity);
  }

  async readTriage(actor: string, caseId: string) {
    await this.require(actor,"forum.complaint.review");
    return this.repository.readTriage(actor,complaintId(caseId));
  }
  async changePriority(actor: string, input: ComplaintPriorityCommand) {
    await this.require(actor,"forum.complaint.review");
    if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1||
      (input.priority!==null&&![1,2,3].includes(input.priority)))throw new ComplaintInputError("invalid priority/version");
    return this.repository.changePriority(actor,{caseId:complaintId(input.caseId),operationId:complaintId(input.operationId),
      expectedVersion:input.expectedVersion,priority:input.priority});
  }
  async activity(actor: string, caseId: string, active: boolean) {
    await this.require(actor,"forum.complaint.review");
    if(typeof active!=="boolean")throw new ComplaintInputError("invalid activity");
    return this.repository.activity(actor,complaintId(caseId),active);
  }
  async submit(actor: string, input: SubmitComplaint) {
    await this.require(actor, "forum.complaint.create");
    const t = input.target;
    if (!t || (t.kind !== "post" && t.kind !== "topic-title")) throw new ComplaintInputError("invalid target");
    const target: ComplaintTarget = t.kind === "post"
      ? { kind: "post", topicId: complaintId(t.topicId), postId: complaintId(t.postId), revisionId: complaintId(t.revisionId) }
      : { kind: "topic-title", topicId: complaintId(t.topicId), revisionId: complaintId(t.revisionId) };
    const reason = complaintReason(input.reason);
    return this.repository.submit(actor, { operationId: complaintId(input.operationId), target, reason,
      explanation: complaintText(input.explanation, 2000, reason === "other") });
  }
  async readCase(actor: string, caseId: string, pages = { reports: 0, notes: 0, events: 0 }) {
    const elevated = await this.reviewIdentity(actor, "forum.complaint.review");
    for (const value of Object.values(pages)) if (!Number.isSafeInteger(value) || value < 0 || value > 10000) throw new ComplaintInputError("invalid page");
    return this.repository.readCase(complaintId(caseId), elevated, pages);
  }

  /** One consistent effective-permission snapshot controls all optional Case projections. */
  async readReview(actor: string, caseId: string, pages: ReviewPages) {
    complaintId(actor);
    for(const n of Object.values(pages))if(!Number.isSafeInteger(n)||n<0||n>10000)throw new ComplaintInputError("invalid page");
    const resolved=await this.authorization.forUser(actor).resolve();
    const has=(key:PermissionKey)=>resolved.effectivePermissions.includes(key);
    if(!has("forum.complaint.review"))throw new ComplaintForbiddenError();
    const permissions:ReviewCase["permissions"]={
      identity:has("forum.complaint.reporterIdentity.read"),
      pin:has("forum.topic.pin"),solution:has("forum.solution.manageAny"),
      duplicate:has("forum.helpDuplicate.manage"),sourceLocale:has("forum.sourceLocale.correctAny"),
      solutionModeration:has("forum.solution.manageAny"),
    };
    return this.repository.readReview(actor,complaintId(caseId),pages,permissions,has("forum.helpDuplicate.manage"));
  }
  async readReviewContext(actor:string,caseId:string,postId:string){
    await this.require(actor,"forum.complaint.review");
    return this.repository.readReviewContext(complaintId(caseId),complaintId(postId));
  }
  async readReviewEvidence(actor:string,caseId:string,attachmentId:string){
    await this.require(actor,"forum.complaint.review");
    return this.repository.readReviewEvidence(complaintId(caseId),complaintId(attachmentId));
  }
  async readAppealCase(actor: string, caseId: string) {
    const elevated = await this.reviewIdentity(actor, "forum.complaint.appeal.review");
    const result = await this.repository.readCase(complaintId(caseId), elevated, { reports: 0, notes: 0, events: 0 });
    if (!result.appeals.length) throw new ComplaintForbiddenError("no appeal in this case");
    return result;
  }
  async readAppealQueue(actor:string,page:number){
    await this.require(actor,"forum.complaint.appeal.review");
    if(!Number.isSafeInteger(page)||page<0||page>10000)throw new ComplaintInputError("invalid page");
    return this.repository.readAppealQueue(actor,page);
  }
  async readAppealCaseForReviewer(actor:string,caseId:string,appealId:string,pages:ReviewPages){
    complaintId(actor);
    for(const n of Object.values(pages))if(!Number.isSafeInteger(n)||n<0||n>10000)
      throw new ComplaintInputError("invalid page");
    const resolved=await this.authorization.forUser(actor).resolve();
    const has=(key:PermissionKey)=>resolved.effectivePermissions.includes(key);
    if(!has("forum.complaint.appeal.review"))throw new ComplaintForbiddenError("appeal review denied");
    const permissions:ReviewCase["permissions"]={
      identity:has("forum.complaint.reporterIdentity.read"),
      pin:has("forum.topic.pin"),solution:has("forum.solution.manageAny"),
      duplicate:has("forum.helpDuplicate.manage"),sourceLocale:has("forum.sourceLocale.correctAny"),
      solutionModeration:has("forum.solution.manageAny"),
    };
    return this.repository.readAppealCaseForReviewer(actor,complaintId(caseId),complaintId(appealId),
      permissions.identity,pages,permissions);
  }
  async readAppealContext(actor:string,caseId:string,appealId:string,postId:string){
    await this.readAppealCaseForReviewer(actor,caseId,appealId,{reports:0,notes:0,evidence:0,context:0});
    return this.repository.readReviewContext(complaintId(caseId),complaintId(postId));
  }
  async readAppealEvidence(actor:string,caseId:string,appealId:string,attachmentId:string){
    await this.readAppealCaseForReviewer(actor,caseId,appealId,{reports:0,notes:0,evidence:0,context:0});
    return this.repository.readReviewEvidence(complaintId(caseId),complaintId(attachmentId));
  }
  async readOwnResult(actor: string, caseId: string) {
    return this.repository.readOwnResult(complaintId(actor), complaintId(caseId));
  }
  async addNote(actor: string, input: { caseId: string; operationId: string; body: string }) {
    await this.require(actor, "forum.complaint.review");
    return this.repository.addNote(actor, { caseId: complaintId(input.caseId), operationId: complaintId(input.operationId), body: complaintText(input.body,10000)! });
  }
  async decide(actor: string, input: DecideComplaint) {
    await this.require(actor, "forum.complaint.review");
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ComplaintInputError("invalid version");
    return this.repository.decide(actor, { caseId: complaintId(input.caseId), operationId: complaintId(input.operationId),
      expectedVersion: input.expectedVersion, outcome: complaintOutcome(input.outcome), reasoning: complaintText(input.reasoning,10000)! });
  }
  async appeal(actor: string, input: AppealComplaint) {
    return this.repository.appeal(complaintId(actor), { caseId: complaintId(input.caseId), decisionId: complaintId(input.decisionId),
      operationId: complaintId(input.operationId), argument: complaintText(input.argument,2000)! });
  }
  async resolveAppeal(actor: string, input: ResolveComplaintAppeal) {
    await this.require(actor, "forum.complaint.appeal.review");
    if (input.outcome !== "upheld" && input.outcome !== "overturned") throw new ComplaintInputError("invalid appeal outcome");
    return this.repository.resolveAppeal(actor, { caseId: complaintId(input.caseId), appealId: complaintId(input.appealId),
      operationId: complaintId(input.operationId), outcome: input.outcome, reasoning: complaintText(input.reasoning,10000)! });
  }
}
