import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, RouterContextProvider, type ClientActionFunctionArgs } from "react-router";
import { I18nextProvider } from "react-i18next";
import TopicRoute, { loader, clientAction, ErrorBoundary } from "../routes/topic";
import { topicAction } from "./actions.server";
import { authSessionContext } from "../auth/request-context";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext, forumWriterContext } from "./request-context";
import { localeContext, registryLoaderContext, contentTranslationPresentationContext } from "../localization/request-context";
import { ContentTranslationPresentationService } from "../localization/content-translation-presentation";
import { localeRegistry } from "../localization/registry";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStateConflictError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => { cleanup(); routers.splice(0).forEach((router) => router.dispose()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const revision = (id: string, originalContent: string) => ({ id, originalContent, sourceLocale: "en" });
const post = { id: "p1", topicId: "topic", authorId: "owner", authorName: "Owner", parentPostId: null,
  createdAt: new Date("2026-01-01"), body: revision("r1", "Initial message") };
const initialTopic = { id: "topic", sectionId: "section", authorId: "owner", authorName: "Owner", createdAt: new Date("2026-01-01"),
  isPinned: false, isSolved: false, bestAnswerPostId: null, needsDetails: false, duplicateOf: null, duplicateDisputed: false,
  title: revision("title", "Recovery"), section: { id: "section", name: "Section", category: { id: "category", name: "Category" } }, tags: [], posts: [post] };
function i18n() {
  const common: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") common[key] = descriptor.source;
    else for (const [branch, value] of Object.entries(descriptor.source)) common[key + "_" + branch] = value;
  }
  return createTranslationRuntime({ locale: { translationLocale: "en", fallbackLocales: [], direction: "ltr", formatting: { locale: "en", timeZone: "UTC" }, nativeName: "English", presentationMetadata: {} },
    fallbackLocales: [], resourcesByLocale: { en: { common } }, bundleVersions: { en: { common: "test" } }, staleKeys: {} });
}
function setup() {
  localStorage.clear();
  const context = new RouterContextProvider();
  context.set(authSessionContext, { user: { id: "owner" } } as never);
  context.set(localeContext, { translationLocale: "en", direction: "ltr" } as never);
  context.set(registryLoaderContext, async () => ({ registry: localeRegistry, semanticIdentity: "test", health: { status: "healthy" } }));
  context.set(contentTranslationPresentationContext, new ContentTranslationPresentationService({ readBatch: async () => ({ translations: [] }) }));
  const readTopicPage = vi.fn(async () => structuredClone(initialTopic));
  const has = vi.fn(async (permission: string) => ["forum.post.editOwn", "forum.reply.create"].includes(permission));
  const editPublishedPost = vi.fn<(_input: { body: string; expectedRevisionId: string }) => Promise<void>>(async () => {});
  const createReply = vi.fn(async () => ({ postId: "new" }));
  context.set(forumReaderContext, { readTopicPage, readTopicReadState: async () => null } as never);
  context.set(authorizationContext, { forUser: () => ({ has }) } as never);
  context.set(forumWriterContext, { editPublishedPost, createReply } as never);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ attachments: [] }), { headers: { "Content-Type": "application/json" } })));
  const router = createMemoryRouter([{ path: "/:locale/topics/:topicId", Component: TopicRoute, ErrorBoundary,
    loader: (args) => loader({ ...args, context }),
    action: (args) => clientAction({ ...args, serverAction: (async () => topicAction({ ...args, context,
      request: new Request(args.request, { headers: new Headers([...args.request.headers, ["Origin", "http://localhost"]]) }),
    })) as ClientActionFunctionArgs["serverAction"] }),
  }], { initialEntries: ["/en/topics/topic?editPost=p1"] });
  routers.push(router);
  render(<I18nextProvider i18n={i18n()}><HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}><RouterProvider router={router} /></HeaderAuthProvider></I18nextProvider>);
  return { context, router, readTopicPage, has, editPublishedPost, createReply };
}
async function editBuffer() {
  const form = await screen.findByRole("form", { name: "Edit published message" });
  fireEvent.click(within(form).getByRole("button", { name: "Advanced" }));
  const field = form.querySelector("textarea")!;
  fireEvent.change(field, { target: { value: "Unsaved private edit" } });
  await waitFor(() => expect(within(form).getByRole("button", { name: "Save changes" })).toBeEnabled());
  return { form: form as HTMLFormElement, field };
}
async function submit(router: ReturnType<typeof createMemoryRouter>, form: HTMLFormElement, intent = "editPost") {
  const fields = new FormData(form); fields.set("intent", intent);
  await act(async () => { await router.navigate("/en/topics/topic?editPost=p1", { formMethod: "post", formData: fields }); });
}
describe("real topic action and mounted editor recovery", () => {
  it.each(["authorization-unavailable", "unexpected-authorization", "storage-unavailable", "unexpected-writer", "transport"])("retains edit text after %s", async (kind) => {
    const state = setup(); const { form, field } = await editBuffer();
    if (kind === "authorization-unavailable") state.has.mockRejectedValue(new AuthorizationUnavailableError());
    if (kind === "unexpected-authorization") state.has.mockRejectedValue(new TypeError("permission bug"));
    if (kind === "storage-unavailable") state.editPublishedPost.mockRejectedValue(new ForumStorageUnavailableError());
    if (kind === "unexpected-writer" || kind === "transport") state.editPublishedPost.mockRejectedValue(new TypeError(kind === "transport" ? "Failed to fetch" : "writer bug"));
    await submit(state.router, form);
    expect(state.router.state.errors).toBeNull();
    expect(screen.getByRole("form", { name: "Edit published message" })).toBe(form);
    expect(field).toHaveValue("Unsaved private edit");
    expect(field).toBeEnabled();
    expect(state.readTopicPage).toHaveBeenCalledTimes(1);
    if (kind.includes("authorization")) expect(state.editPublishedPost).not.toHaveBeenCalled();
    expect(screen.getByText(kind.includes("unavailable")
      ? "Your message could not be saved. Please try again."
      : "An unexpected error prevented saving. Your text remains in this editor. Please try again.")).toBeVisible();
  });
  it("refreshes a stale published revision, explicitly rebases, and retries with the same buffer", async () => {
    const state = setup(); const { form, field } = await editBuffer();
    state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r2", "Concurrent public edit") }] });
    state.editPublishedPost.mockRejectedValueOnce(new ForumStateConflictError());
    await submit(state.router, form);
    expect(state.readTopicPage).toHaveBeenCalledTimes(2);
    expect(field).toHaveValue("Unsaved private edit");
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r1");
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByText("That solution cannot be selected for this topic.")).not.toBeInTheDocument();
    expect(screen.getByText("Concurrent public edit")).toBeVisible();
    fireEvent.click(within(form).getByRole("button", { name: "Apply my edit to the current revision" }));
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r2");
    expect(field).toHaveValue("Unsaved private edit");
    // A later failed Save keeps the refreshed baseline and the same in-memory form.
    state.editPublishedPost.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await submit(state.router, form);
    expect(state.editPublishedPost).toHaveBeenLastCalledWith(expect.objectContaining({ body: "Unsaved private edit", expectedRevisionId: "r2" }));
    expect(field).toHaveValue("Unsaved private edit");
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeEnabled();
    state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r3", "Newer public edit") }] });
    await act(async () => { await state.router.revalidate(); });
    expect(screen.getByText("Newer public edit")).toBeVisible();
    expect(screen.queryByText("Concurrent public edit")).not.toBeInTheDocument();
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r2");
    expect(field).toHaveValue("Unsaved private edit");
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
  it.each([new ForumStorageUnavailableError(), new TypeError("refresh bug")])("keeps the editor when reading the conflict baseline also fails", async (error) => {
    const state = setup(); const { form, field } = await editBuffer();
    state.editPublishedPost.mockRejectedValue(new ForumStateConflictError());
    state.readTopicPage.mockRejectedValue(error);
    await submit(state.router, form);
    expect(state.router.state.errors).toBeNull();
    expect(field).toHaveValue("Unsaved private edit");
    expect(field.isConnected).toBe(true);
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r1");
  });
});
