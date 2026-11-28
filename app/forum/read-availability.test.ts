import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { forumReaderContext } from "./request-context";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { loader as home, headers as homeHeaders } from "../routes/home";
import { loader as category } from "../routes/category";
import { loader as section } from "../routes/section";
import { loader as topic } from "../routes/topic";
import { loader as popular } from "../routes/popular";
import { loader as unanswered } from "../routes/unanswered";
import { loader as tags } from "../routes/tags";
import { loader as tag } from "../routes/tag";
import { loader as search } from "../routes/search";
import { loader as edit, ErrorBoundary, headers as editHeaders } from "../routes/post-edit";
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
    const result = await home({ params: {}, context });
    expect(result.data).toMatchObject({ categories: [], onlinePresence: null });
    expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect(homeHeaders()["Cache-Control"]).toBe("private, no-store");
  });
  it("keeps available online membership uncacheable in home data and document", async () => {
    const context = new RouterContextProvider();
    context.set(forumReaderContext, { readHomepage: async () => [], readOnlinePresence: async () => ({ count: 1,
      members: [{ id: "member", name: "Member", image: null }] }) } as never);
    const result = await home({ params: { locale: "en" }, context });
    expect(result.data.onlinePresence?.count).toBe(1);
    expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect(homeHeaders()["Cache-Control"]).toBe("private, no-store");
  });
  it("maps protected edit authorization unavailable and supplies its forum boundary", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "owner" } } as never);
    context.set(forumReaderContext, { readPostLocation: async () => ({ authorId: "owner" }) } as never);
    context.set(authorizationContext, { forUser: () => ({ has: async () => { throw new AuthorizationUnavailableError(); } }) } as never);
    await expect(edit({ context, params: { postId: "post" } })).rejects.toMatchObject({ status: 503 });
    expect(ErrorBoundary).toBe(ForumRouteError);
  });
  it("makes hidden and missing legacy edit links identical private 404s before authorization", async () => {
    for (const id of ["hidden-post", "post-in-hidden-topic", "absent-post"]) {
      const context = new RouterContextProvider();
      const readPostLocation = vi.fn(async () => undefined);
      const has = vi.fn(async () => true);
      context.set(authSessionContext, { user: { id: "owner" } } as never);
      context.set(forumReaderContext, { readPostLocation } as never);
      context.set(authorizationContext, { forUser: () => ({ has }) } as never);
      const result = await edit({ context, params: { locale: "en", postId: id } }).catch(error => error);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(404);
      expect(await (result as Response).text()).toBe("Not Found");
      expect((result as Response).headers.get("Cache-Control")).toBe("private, no-store");
      expect((result as Response).headers.get("Location")).toBeNull();
      expect(readPostLocation).toHaveBeenCalledWith(id);
      expect(has).not.toHaveBeenCalled();
    }
    const routeHeaders = editHeaders({
      parentHeaders: new Headers({ "Cache-Control": "public, max-age=3600" }),
      loaderHeaders: new Headers(),
      actionHeaders: new Headers(),
      errorHeaders: new Headers({ "Cache-Control": "public, max-age=3600" }),
    });
    expect(routeHeaders.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps the visible legacy own-edit redirect private and scoped to the post", async () => {
    const context = new RouterContextProvider();
    const has = vi.fn(async () => true);
    context.set(authSessionContext, { user: { id: "owner" } } as never);
    context.set(forumReaderContext, { readPostLocation: async () => ({ topicId: "visible-topic", authorId: "owner" }) } as never);
    context.set(authorizationContext, { forUser: () => ({ has }) } as never);
    const response = await edit({ context, params: { locale: "en", postId: "visible-post" } });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/en/topics/visible-topic?editPost=visible-post#post-visible-post");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(has).toHaveBeenCalledWith("forum.post.editOwn");
  });
});
