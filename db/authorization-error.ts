export class AuthorizationNotFoundError extends Error {}

export class AuthorizationUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("authorization infrastructure unavailable", options);
    this.name = "AuthorizationUnavailableError";
  }
}
