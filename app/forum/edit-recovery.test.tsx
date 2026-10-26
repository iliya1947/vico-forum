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
import { ForumStateConflictError, ForumPublicationReplayConflictError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { ForumMarkdown, ForumInlineAttachmentProvider } from "./markdown";

class UploadRequest {
  static all: UploadRequest[] = [];
  headers = new Map<string, string>();
  upload = {}; status = 0; responseText = ""; body: unknown;
  onload?: () => void; onabort?: () => void;
  constructor() { UploadRequest.all.push(this); }
  open() {}
  setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
  send(body: unknown) { this.body = body; }
  abort() { this.onabort?.(); }
  async complete(status: number, payload: unknown) {
    this.status = status; this.responseText = JSON.stringify(payload);
    await act(async () => { this.onload?.(); });
  }
}

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
  const has = vi.fn(async (permission: string) => ["forum.post.editOwn", "forum.reply.create", "forum.solution.manageOwn"].includes(permission));
  const editPublishedPost = vi.fn<(_input: { body: string; expectedRevisionId: string; draftId: string }) => Promise<void>>(async () => {});
  const markTopicSolved = vi.fn(async () => { throw new ForumStateConflictError(); });
  const createReply = vi.fn(async () => ({ postId: "new" }));
  context.set(forumReaderContext, { readTopicPage, readTopicReadState: async () => null } as never);
  context.set(authorizationContext, { forUser: () => ({ has }) } as never);
  context.set(forumWriterContext, { editPublishedPost, createReply, markTopicSolved } as never);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ attachments: [] }), { headers: { "Content-Type": "application/json" } })));
  const router = createMemoryRouter([{ path: "/:locale/topics/:topicId", Component: TopicRoute, ErrorBoundary,
    loader: (args) => loader({ ...args, context }),
    action: (args) => clientAction({ ...args, serverAction: (async () => topicAction({ ...args, context,
      request: new Request(args.request, { headers: new Headers([...args.request.headers, ["Origin", "http://localhost"]]) }),
    })) as ClientActionFunctionArgs["serverAction"] }),
  }], { initialEntries: ["/en/topics/topic?editPost=p1"] });
  routers.push(router);
  render(<I18nextProvider i18n={i18n()}><HeaderAuthProvider initialUser={{ id: "owner", name: "Owner" }}><RouterProvider router={router} /></HeaderAuthProvider></I18nextProvider>);
  return { context, router, readTopicPage, has, editPublishedPost, createReply, markTopicSolved };
}
async function editBuffer() {
  const form = await screen.findByRole("form", { name: "Edit published message" }, { timeout: 3_000 });
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
  it.each(["bare-reference", "destination-like-label"])("keeps the inline image and history through terminal recovery: %s", async (variant) => {
    const state = setup(); const { form, field } = await editBuffer();
    UploadRequest.all = []; vi.stubGlobal("XMLHttpRequest", UploadRequest);
    state.editPublishedPost.mockImplementationOnce(async () => {
      state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r2", "Committed before lost ACK") }] });
      throw new TypeError("response lost after commit");
    });
    await submit(state.router, form);
    const file = new File(["verified image fixture"], "image.png", { type: "image/png" });
    fireEvent.change(within(form).getByLabelText("Attach"), { target: { files: [file] } });
    const upload = UploadRequest.all.at(-1)!, old = upload.headers.get("X-Vico-Attachment-Id")!;
    const oldUrl = "vico-attachment:" + old;
    const source = variant === "bare-reference" ? `![screenshot][file]\n\n[file]: ${oldUrl}`
      : "![`x](" + oldUrl + ")`](" + oldUrl + ")";
    fireEvent.change(field, { target: { value: source } });
    fireEvent.change(field, { target: { value: source + "\n\nExtra note" } });
    fireEvent.keyDown(field, { key: "z", ctrlKey: true });
    expect(field).toHaveValue(source);
    await upload.complete(410, { error: "gone" });
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.click(within(form).getByRole("button", { name: "Retry" }));
    const retry = UploadRequest.all.at(-1)!, next = retry.headers.get("X-Vico-Attachment-Id")!;
    expect(retry.body).toBe(file);
    expect(next).not.toBe(old);
    const destinationAt = source.lastIndexOf(oldUrl);
    const expected = source.slice(0, destinationAt) + "vico-attachment:" + next + source.slice(destinationAt + oldUrl.length);
    expect(field).toHaveValue(expected);
    fireEvent.keyDown(field, { key: "z", ctrlKey: true, shiftKey: true });
    expect(field).toHaveValue(expected + "\n\nExtra note");
    fireEvent.keyDown(field, { key: "z", ctrlKey: true });
    expect(field).toHaveValue(expected);
    await retry.complete(201, { outcome: "stored", attachment: { id: next, fileName: file.name,
      detectedType: "png", responseMime: "image/png", byteSize: file.size, verificationStatus: "type-checked" } });
    state.editPublishedPost.mockRejectedValueOnce(new ForumStateConflictError());
    await submit(state.router, form);
    fireEvent.click(within(form).getByRole("button", { name: "Apply my edit to the current revision" }));
    await waitFor(() => expect(within(form).getByRole("button", { name: "Save changes" })).toBeEnabled());
    let finish!: () => void;
    const completed = new Promise<void>((resolve) => { finish = resolve; });
    state.editPublishedPost.mockImplementationOnce(async (input) => {
      await completed;
      state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r3", input.body),
        attachments: [{ id: next, fileName: file.name, byteSize: file.size, detectedType: "png" }] }] } as never);
    });
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(state.router.state.navigation.state).toBe("submitting"));
    await act(async () => { finish(); });
    await waitFor(() => expect(form.isConnected).toBe(false));
    expect(state.editPublishedPost).toHaveBeenLastCalledWith(expect.objectContaining({
      body: expected, attachmentIds: [next], expectedRevisionId: "r2",
    }));
    // Both authored forms are supported before recovery; after Save the same
    // real renderer must resolve the new selected ref at the inline position.
    const before = render(<I18nextProvider i18n={i18n()}><div data-testid="image-before">
      <ForumInlineAttachmentProvider attachments={[{ id: old, fileName: file.name, byteSize: file.size, detectedType: "png", url: "/file?post=p1" }]}>
        <ForumMarkdown>{source}</ForumMarkdown>
      </ForumInlineAttachmentProvider></div></I18nextProvider>);
    expect(within(before.getByTestId("image-before")).getByRole("img")).toBeInTheDocument();
    before.unmount();
    const after = render(<I18nextProvider i18n={i18n()}><div data-testid="image-after">
      <ForumInlineAttachmentProvider attachments={[{ id: next, fileName: file.name, byteSize: file.size, detectedType: "png", url: "/file?post=p1" }]}>
        <ForumMarkdown>{expected}</ForumMarkdown>
      </ForumInlineAttachmentProvider></div></I18nextProvider>);
    expect(within(after.getByTestId("image-after")).getByRole("img")).toBeInTheDocument();
  });

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
  it("keeps solution feedback for an unrelated 409 while the post editor stays open", async () => {
    const state = setup(); const { form, field } = await editBuffer();
    await submit(state.router, form, "markSolved");
    expect(state.markTopicSolved).toHaveBeenCalledOnce();
    expect(state.editPublishedPost).not.toHaveBeenCalled();
    expect(screen.getByText("That solution cannot be selected for this topic.")).toBeVisible();
    expect(screen.queryByText(String(canonicalEnglishCatalog.common.postEditConflict.source))).not.toBeInTheDocument();
    expect(field).toHaveValue("Unsaved private edit");
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Apply my edit to the current revision" })).not.toBeInTheDocument();
  });
  it("recovers commit/lost ACK/new upload before retry without losing text, history or File", async () => {
    const state = setup(); const { form, field } = await editBuffer();
    UploadRequest.all = []; vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const originalOperation = form.querySelector<HTMLInputElement>('[name="editorOperationId"]')!.value;
    state.editPublishedPost.mockImplementationOnce(async () => {
      state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r2", "Unsaved private edit") }] });
      throw new TypeError("response lost after commit");
    });
    await submit(state.router, form);
    fireEvent.change(field, { target: { value: "Changed after lost ACK" } });
    const file = new File(["file retained"], "new-file.txt", { type: "text/plain" });
    fireEvent.change(within(form).getByLabelText("Attach"), { target: { files: [file] } });
    const first = UploadRequest.all.at(-1)!;
    await first.complete(410, { error: "gone" });
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeDisabled();
    const nextOperation = form.querySelector<HTMLInputElement>('[name="editorOperationId"]')!.value;
    expect(nextOperation).not.toBe(originalOperation);
    fireEvent.keyDown(field, { key: "z", ctrlKey: true });
    expect(field).toHaveValue("Unsaved private edit");
    fireEvent.keyDown(field, { key: "z", ctrlKey: true, shiftKey: true });
    expect(field).toHaveValue("Changed after lost ACK");
    fireEvent.click(within(form).getByRole("button", { name: "Retry" }));
    const retried = UploadRequest.all.at(-1)!;
    expect(retried.body).toBe(file);
    expect(retried.headers.get("X-Vico-Operation-Id")).toBe(nextOperation);
    const attachmentId = retried.headers.get("X-Vico-Attachment-Id")!;
    await retried.complete(201, { outcome: "stored", attachment: { id: attachmentId, fileName: file.name,
      detectedType: "text", responseMime: "text/plain", byteSize: file.size, verificationStatus: "type-checked" } });
    await waitFor(() => expect(within(form).getByRole("button", { name: "Save changes" })).toBeEnabled());
    state.editPublishedPost.mockRejectedValueOnce(new ForumStateConflictError());
    await submit(state.router, form);
    fireEvent.click(within(form).getByRole("button", { name: "Apply my edit to the current revision" }));
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r2");
    expect(form.querySelector('[name="editorOperationId"]')).toHaveValue(nextOperation);
    expect(field).toHaveValue("Changed after lost ACK");
    let finishSave!: () => void;
    const saved = new Promise<void>((resolve) => { finishSave = resolve; });
    state.editPublishedPost.mockImplementationOnce(async () => {
      await saved;
      state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r3", "Changed after lost ACK") }] });
    });
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(state.router.state.navigation.state).toBe("submitting"));
    await act(async () => { finishSave(); });
    expect(state.editPublishedPost).toHaveBeenLastCalledWith(expect.objectContaining({ draftId: nextOperation,
      expectedRevisionId: "r2", body: "Changed after lost ACK", attachmentIds: [attachmentId] }));
    await waitFor(() => expect(form.isConnected).toBe(false));
  });

  it("restarts only a completed edit operation when accepting a conflict baseline", async () => {
    const state = setup(); const { form, field } = await editBuffer();
    const old = form.querySelector<HTMLInputElement>('[name="editorOperationId"]')!.value;
    state.readTopicPage.mockResolvedValue({ ...initialTopic, posts: [{ ...post, body: revision("r2", "Already committed") }] });
    state.editPublishedPost.mockRejectedValueOnce(new ForumPublicationReplayConflictError());
    await submit(state.router, form);
    expect(form.querySelector('[name="editorOperationId"]')).toHaveValue(old);
    expect(screen.getByText(String(canonicalEnglishCatalog.common.postEditConflict.source))).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(within(form).getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r1");
    expect(form.querySelector('[name="editorOperationId"]')).toHaveValue(old);
    fireEvent.click(within(form).getByRole("button", { name: "Apply my edit to the current revision" }));
    const next = form.querySelector<HTMLInputElement>('[name="editorOperationId"]')!.value;
    expect(next).not.toBe(old);
    expect(form.querySelector('[name="expectedRevisionId"]')).toHaveValue("r2");
    expect(field).toHaveValue("Unsaved private edit");
    state.editPublishedPost.mockRejectedValueOnce(new ForumStorageUnavailableError());
    await submit(state.router, form);
    expect(state.editPublishedPost).toHaveBeenLastCalledWith(expect.objectContaining({ draftId: next, body: "Unsaved private edit", expectedRevisionId: "r2" }));
  });
  it("keeps edit-specific feedback for the actual stale-account edit guard", async () => {
    const state = setup(); const { form, field } = await editBuffer();
    state.context.set(authSessionContext, { user: { id: "different" } } as never);
    await submit(state.router, form);
    expect(screen.getByText(String(canonicalEnglishCatalog.common.postEditConflict.source))).toBeVisible();
    expect(state.editPublishedPost).not.toHaveBeenCalled();
    expect(field).toHaveValue("Unsaved private edit");
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
