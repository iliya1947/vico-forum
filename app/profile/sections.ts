import type { AuthorizationUserManagementState } from "../../db/authorization-repository";
import type { PermissionKey } from "../authorization/catalog";
import type { UserMeasureSummary } from "../../db/user-measure-read";
import type { OwnerUserProfileSnapshot } from "../../db/owner-user-profile";
import type { OwnerUserHistoryPage } from "../../db/owner-user-history";

export type ProfileSection<T> = { status: "ready"; value: T } | { status: "unavailable" };
export interface ProfileAuthorizationData {
  actorId: string;
  management: AuthorizationUserManagementState;
  permissions: readonly PermissionKey[];
  canManageElevated: boolean;
  canMutateAuthorization: boolean;
}
export interface ProfileOwnerData {
  viewerId: string;
  account: ProfileSection<OwnerUserProfileSnapshot>;
  history: ProfileSection<OwnerUserHistoryPage>;
}
export interface ProfilePrivilegedSections {
  viewerId?: string;
  measures?: ProfileSection<readonly UserMeasureSummary[]>;
  authorization?: ProfileSection<ProfileAuthorizationData>;
  owner?: ProfileOwnerData;
}
