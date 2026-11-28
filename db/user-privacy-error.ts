export class UserPrivacyAccountMissingError extends Error {
  constructor(message = "Authenticated account no longer exists") {
    super(message);
    this.name = "UserPrivacyAccountMissingError";
  }
}

/** Shared privacy storage failure independent of PostgreSQL. */
export class UserPrivacyUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Personal privacy storage unavailable", options);
    this.name = "UserPrivacyUnavailableError";
  }
}
