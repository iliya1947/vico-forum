export class ForumStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum storage unavailable", options);
    this.name = "ForumStorageUnavailableError";
  }
}
