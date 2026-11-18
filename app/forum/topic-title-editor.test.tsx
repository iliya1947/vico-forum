import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { TopicTitleEditor } from "./topic-title-editor";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) =>
  canonicalEnglishCatalog.common[key as keyof typeof canonicalEnglishCatalog.common]?.source ?? key }) }));
const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => { cleanup(); routers.splice(0).forEach(router => router.dispose()); });

function setup() {
  let title = { id: "r1", originalContent: "Original title" };
  let actorId = "author", canEdit = true, rejected = false;
  const action = vi.fn(async ({ request }: { request: Request }) => {
    const form = await request.formData();
    if (rejected) return data({ error: "forbidden" }, { status: 403 });
    if (form.get("expectedRevisionId") !== title.id) return data({ operation: "topicTitleEdit", error: "conflict", currentTitle: title }, { status: 409 });
    title = { id: "r3", originalContent: String(form.get("title")) };
    return { operation: "topicTitleEdit", ok: true, revisionId: title.id };
  });
  function View() {
    const props = useLoaderData() as { title: typeof title; actorId: string; canEdit: boolean };
    return <><h1>Displayed translation</h1><TopicTitleEditor key={props.actorId}
      {...props} topicId="topic" locale="en" /></>;
  }
  const router = createMemoryRouter([{ path: "/en/topics/topic", Component: View,
    loader: () => ({ title, actorId, canEdit }), action }], { initialEntries: ["/en/topics/topic"] });
  routers.push(router);
  render(<RouterProvider router={router} />);
  return { router, action,
    update: (value: typeof title) => { title = value; },
    reject: () => { rejected = true; canEdit = false; },
    changeActor: () => { actorId = "another-author"; },
  };
}

describe("topic title form", () => {
  it("edits original text, keeps its frozen revision across revalidation, and rebases only explicitly", async () => {
    const { router, action, update } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Edit topic title" }));
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Original title");
    fireEvent.change(input, { target: { value: "My title שלום" } });
    update({ id: "r2", originalContent: "Concurrent title" });
    await act(async () => { await router.revalidate(); });
    expect(input).toHaveValue("My title שלום");
    expect(document.querySelector('input[name="expectedRevisionId"]')).toHaveValue("r1");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");
    expect(input).toHaveValue("My title שלום");
    expect(screen.getByText("Concurrent title")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Use current title version" }));
    expect(document.querySelector('input[name="expectedRevisionId"]')).toHaveValue("r2");
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("preserves an open buffer on permission loss, blocks Save and retains Cancel", async () => {
    const { reject, action } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Edit topic title" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Unsaved text" } });
    reject();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled());
    expect(screen.getByRole("textbox")).toHaveValue("Unsaved text");
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("isolates an unsaved form when the authoritative account changes", async () => {
    const { router, changeActor } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Edit topic title" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private buffer" } });
    changeActor();
    await act(async () => { await router.revalidate(); });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit topic title" }));
    expect(screen.getByRole("textbox")).toHaveValue("Original title");
  });
});
