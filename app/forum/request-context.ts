import { createContext, type RouterContextProvider } from "react-router";
import type { ForumReader } from "../../db/forum-repository";

export const forumReaderContext = createContext<ForumReader>();

export class ForumReaderConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum reader is not configured", options);
    this.name = "ForumReaderConfigurationError";
  }
}

export function forumReaderForRequest(context: RouterContextProvider): ForumReader {
  try {
    return context.get(forumReaderContext);
  } catch (error) {
    throw new ForumReaderConfigurationError({ cause: error });
  }
}
