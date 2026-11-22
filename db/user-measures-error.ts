/** Shared error identity for the real measures service and browser-safe request presentation. */
export class UserMeasuresUnavailableError extends Error {}
export class UserMeasureNotFoundError extends Error {}

import type { UserMeasureRestrictionId } from "../app/admin/user-measure-restrictions";

export class UserMeasureRestrictedError extends Error {
  constructor(readonly restriction: UserMeasureRestrictionId) {
    super("user measure prohibits this action");
    this.name = "UserMeasureRestrictedError";
  }
}
