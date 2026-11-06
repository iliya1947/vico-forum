import { createContext, type RouterContextProvider } from "react-router";
import type {
  CreateUserMeasureInput, ChangeUserMeasureInput, LiftUserMeasureInput,
  SubmitUserMeasureAppealInput, ResolveUserMeasureAppealInput,
  MeasureCreateResult, MeasureTransitionResult,
  UserMeasureAppealResolutionResult, UserMeasureAppealSubmissionResult,
} from "../../db/user-measures";
import type { UserMeasureSummary, UserMeasureDetail, UserMeasureTargetView,
  UserMeasurePendingAppealPage } from "../../db/user-measure-read";

export interface UserMeasureCapability {
  ownList(subjectId: string): Promise<UserMeasureSummary[]>;
  activeRestrictions(subjectId: string): Promise<import("../admin/user-measure-restrictions").UserMeasureRestrictionId[]>;
  ownDetail(subjectId: string, measureId: string): Promise<UserMeasureDetail>;
  adminTarget(actorId: string, targetId: string): Promise<UserMeasureTargetView>;
  adminPendingAppeals(actorId: string, page?: number): Promise<UserMeasurePendingAppealPage>;
  adminDetail(actorId: string, measureId: string): Promise<UserMeasureDetail & { targetUserId: string; targetName: string; canMutate: boolean }>;
  create(input: CreateUserMeasureInput): Promise<MeasureCreateResult>;
  change(input: ChangeUserMeasureInput): Promise<MeasureTransitionResult>;
  lift(input: LiftUserMeasureInput): Promise<MeasureTransitionResult>;
  submitAppeal(input: SubmitUserMeasureAppealInput): Promise<UserMeasureAppealSubmissionResult>;
  resolveAppeal(input: ResolveUserMeasureAppealInput): Promise<UserMeasureAppealResolutionResult>;
}
export const userMeasureContext = createContext<UserMeasureCapability>();
export function userMeasuresForRequest(context: RouterContextProvider): UserMeasureCapability {
  return context.get(userMeasureContext);
}
