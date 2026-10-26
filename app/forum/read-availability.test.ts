import { describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { forumReaderContext } from "./request-context";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { loader as home } from "../routes/home";
import { loader as category } from "../routes/category";
import { loader as section } from "../routes/section";
import { loader as topic } from "../routes/topic";
import { loader as popular } from "../routes/popular";
import { loader as unanswered } from "../routes/unanswered";
import { loader as tags } from "../routes/tags";
import { loader as tag } from "../routes/tag";
import { loader as search } from "../routes/search";
import { loader as edit, ErrorBoundary } from "../routes/post-edit";
import { ForumRouteError } from "./ui";

const routes = { home, category, section, topic, popular, unanswered, tags, tag, search, edit };
describe("primary forum read failures", () => {
  for (const [name, loader] of Object.entries(routes)) {
    it.each([new ForumStorageUnavailableError(), new TypeError("mapper bug"),
      Object.assign(new Error("missing column"), { code: "42703" })])(`${name}: classifies only typed unavailable`, async (failure) => {
      const context = new RouterContextProvider();
      context.set(authSessionContext, { user: { id: "owner" } } as never);
      context.set(forumReaderContext, new Proxy({}, { get: () => async () => { throw failure; } }) as never);
      const promise = loader({ context, request: new Request("https://forum.test/en/search?q=hello"),
        params: { locale: "en", categoryId: "ordinary", sectionId: "section", topicId: "topic", postId: "post", tagKey: "tag" } });
      if (failure instanceof ForumStorageUnavailableError) await expect(promise).rejects.toMatchObject({ status: 503 });
      else await expect(promise).rejects.toBe(failure);
    });
  }
  it("keeps optional online presence unavailable from hiding the home page", async () => {
    const context = new RouterContextProvider();
    context.set(forumReaderContext, { readHomepage: async () => [], readOnlinePresence: async () => { throw new ForumStorageUnavailableError(); } } as never);
    await expect(home({ params: {}, context })).resolves.toMatchObject({ categories: [], onlinePresence: null });
  });
  it("maps protected edit authorization unavailable and supplies its forum boundary", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "owner" } } as never);
    context.set(forumReaderContext, { readPostLocation: async () => ({ authorId: "owner" }) } as never);
    context.set(authorizationContext, { forUser: () => ({ has: async () => { throw new AuthorizationUnavailableError(); } }) } as never);
    await expect(edit({ context, params: { postId: "post" } })).rejects.toMatchObject({ status: 503 });
    expect(ErrorBoundary).toBe(ForumRouteError);
  });
});
