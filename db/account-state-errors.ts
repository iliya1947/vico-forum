/** Shared AccountState exceptions independent of PostgreSQL. */
export class AccountStateUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account state storage unavailable", options);
    this.name = "AccountStateUnavailableError";
  }
}

export class AccountStateUnexpectedError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unexpected account state storage failure", options);
    this.name = "AccountStateUnexpectedError";
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super("Account is inactive");
    this.name = "AccountInactiveError";
  }
}

export class AccountMissingError extends Error {
  constructor() {
    super("Account does not exist");
    this.name = "AccountMissingError";
  }
}
