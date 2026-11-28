/** Shared Owner profile read exceptions, independent of PostgreSQL composition. */
export class OwnerProfileUnavailableError extends Error {}

export class InvalidOwnerProfileSessionCursorError extends Error {
  constructor() { super("Invalid Owner profile session cursor"); this.name = "InvalidOwnerProfileSessionCursorError"; }
}

export class InvalidOwnerUserHistoryCursorError extends Error {
  constructor() {
    super("Invalid Owner user history cursor");
    this.name = "InvalidOwnerUserHistoryCursorError";
  }
}
