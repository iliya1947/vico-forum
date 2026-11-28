/** Shared authorization errors independent of PostgreSQL. */
export class AuthorizationNotFoundError extends Error {}
export class AuthorizationForbiddenError extends Error {}
export class AuthorizationRoleAssignedError extends Error {}
export class AuthorizationRoleSlugConflictError extends Error {}
export class InvalidAuthorizationInputError extends Error {}

export class AuthorizationUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("authorization infrastructure unavailable", options);
    this.name = "AuthorizationUnavailableError";
  }
}
