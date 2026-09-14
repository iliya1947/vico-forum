import { createContext, type RouterContextProvider } from "react-router";
import type { ForumReader } from "../../db/forum-repository";
import type { ForumWriter } from "../../db/hyperdrive-forum";

export const forumReaderContext = createContext<ForumReader>();
export const forumWriterContext = createContext<ForumWriter>();

export class ForumReaderConfigurationError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum reader is not configured", options);
    this.name = "ForumReaderConfigurationError";
  }
}

export function forumWriterForRequest(context: RouterContextProvider): ForumWriter {
  return context.get(forumWriterContext);
}

export function forumReaderForRequest(context: RouterContextProvider): ForumReader {
  try {
    return context.get(forumReaderContext);
  } catch (error) {
    throw new ForumReaderConfigurationError({ cause: error });
  }
}
