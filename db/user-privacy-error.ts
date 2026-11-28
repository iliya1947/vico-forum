export class UserPrivacyAccountMissingError extends Error {
  constructor(message = "Authenticated account no longer exists") {
    super(message);
    this.name = "UserPrivacyAccountMissingError";
  }
}

