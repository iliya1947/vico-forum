import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { ForumAttachmentDisplay } from "./attachment-presentation";

afterEach(() => cleanup());

describe("attachment presentation shared between the editor and posts", () => {
  const path = "/api/attachments/file/id?post=post";
  const file = { id: "id", fileName: "Photo עברית.png", byteSize: 1234, detectedType: "png" };
  it("renders a verified raster in a published post without changing Markdown", () => {
    render(<ForumAttachmentDisplay attachment={file} url={path} />);
    expect(screen.getByAltText(file.fileName)).toHaveAttribute("src", path + "&view=inline");
    expect(screen.getByRole("link", { name: file.fileName })).toHaveAttribute("download", file.fileName);
    expect(screen.getByText(/1,234 B/u)).toBeInTheDocument();
  });
  it("does not automatically request preview bytes while a draft list is restored", () => {
    render(<section dir="rtl"><ForumAttachmentDisplay attachment={file} url={path} deferImage /></section>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "editorModePreview" }));
    expect(screen.getByAltText(file.fileName)).toHaveAttribute("src", path + "&view=inline");
  });
  it("offers only explicit inert previews for source and keeps unknown types downloadable", () => {
    const view = render(<ForumAttachmentDisplay
      attachment={{ ...file, fileName: "source.html", detectedType: "text" }} url={path} />);
    expect(screen.getByRole("link", { name: "editorModePreview" })).toHaveAttribute(
      "href", path + "&view=text",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    view.rerender(<ForumAttachmentDisplay attachment={{ ...file, detectedType: "zip" }} url={path} />);
    expect(screen.queryByRole("link", { name: "editorModePreview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: file.fileName })).toHaveAttribute("download");
  });
});
