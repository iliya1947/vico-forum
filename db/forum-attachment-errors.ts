/** Runtime-neutral attachment exceptions shared by production and preview. */
export class InvalidForumAttachmentError extends Error {
  constructor() {
    super("invalid forum attachment");
    this.name = "InvalidForumAttachmentError";
  }
}

export class ForumAttachmentDraftConflictError extends Error {
  constructor(readonly reason: "conflict" | "gone" = "conflict") {
    super("attachment draft generation conflict");
    this.name = "ForumAttachmentDraftConflictError";
  }
}

export class ForumAttachmentStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum attachment storage unavailable", options);
    this.name = "ForumAttachmentStorageUnavailableError";
  }
}
