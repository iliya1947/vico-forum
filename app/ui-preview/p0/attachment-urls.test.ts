// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  draftAttachmentReference, parseAttachmentReference, publishedAttachmentReference,
  resolveAttachmentUrl,
} from "../../forum/attachment-url";
import { createPreviewAttachmentUrls } from "./attachment-urls";

const published = publishedAttachmentReference("post-1", "23b93562-0550-4eef-88af-f951d6ea6138");

describe("shared attachment URL presentation mode", () => {
  it("preserves production download, inline and text HTTP URLs", () => {
    const base = "/api/attachments/file/23b93562-0550-4eef-88af-f951d6ea6138?post=post-1";
    expect(resolveAttachmentUrl(published, "download")).toBe(base);
    expect(resolveAttachmentUrl(published, "inline")).toBe(base + "&view=inline");
    expect(resolveAttachmentUrl(published, "text")).toBe(base + "&view=text");
    const draft = draftAttachmentReference("draft-1", "topic:a:reply", "asset-2");
    expect(resolveAttachmentUrl(draft, "download")).toBe(
      "/api/attachments/file/asset-2?operation=draft-1&context=topic%3Aa%3Areply",
    );
    expect(parseAttachmentReference(base)).toEqual(published);
    expect(() => parseAttachmentReference("https://foreign.invalid/api/attachments/file/asset?post=post-1"))
      .toThrow(/Invalid published/);
    expect(() => parseAttachmentReference(base + "&view=inline")).toThrow(/Invalid published/);
  });

  it("serves only known verified bytes, per-mode Blob URL and revokes on dispose", async () => {
    const created: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return "blob:https://preview.test/" + created.length;
    });
    const revokeObjectURL = vi.fn();
    const registry = createPreviewAttachmentUrls([{
      reference: published,
      fileName: "swatch.png",
      detectedType: "png",
      bytes: new Uint8Array([137, 80, 78, 71]),
    }], { createObjectURL, revokeObjectURL });
    const inline = registry.resolve(published, "inline");
    expect(inline).toBe(registry.resolve(published, "inline"));
    expect(await created[0]?.arrayBuffer()).toBeDefined();
    expect(created[0]?.type).toBe("image/png");
    const download = registry.resolve(published, "download");
    expect(download).not.toBe(inline);
    expect(created[1]?.type).toBe("application/octet-stream");
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(() => registry.resolve(published, "text")).toThrow(/cannot be displayed/);
    expect(() => registry.resolve(publishedAttachmentReference("unknown", published.attachmentId), "download"))
      .toThrow(/not found/);
    registry.dispose();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(() => registry.resolve(published, "download")).toThrow(/disposed/);
    registry.dispose();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("keeps inline text inert and rejects unverified binary previews", () => {
    const ref = draftAttachmentReference("draft-2", "topic:b:reply", "text-asset");
    const createObjectURL = vi.fn(() => "blob:https://preview.test/text");
    const registry = createPreviewAttachmentUrls([{
      reference: ref, fileName: "source.html", detectedType: "text",
      bytes: new TextEncoder().encode("<script>unsafe</script>"),
    }], { createObjectURL, revokeObjectURL: vi.fn() });
    expect(registry.resolve(ref, "text")).toContain("blob:");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(() => registry.resolve(ref, "inline")).toThrow(/cannot be displayed/);
    registry.dispose();
  });
});
