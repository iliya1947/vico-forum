import { createContext, type RouterContextProvider } from "react-router";
import type { ForumDraftStore } from "../../db/hyperdrive-editor-drafts";

export const forumDraftStoreContext = createContext<ForumDraftStore>();

export function draftStoreForRequest(context: RouterContextProvider): ForumDraftStore {
  return context.get(forumDraftStoreContext);
}
