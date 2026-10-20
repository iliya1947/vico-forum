import { describe, expect, it } from "vitest";
import { keptAttachmentSelection } from "./draft-snapshot";
const text = { title: "Title", body: "Body", tags: "tag" };
describe("selection conflicts with a common server base", () => {
  it("keeps a file when one candidate retained it and the other removed it", () => {
    expect(keptAttachmentSelection({ ...text, draftAttachmentIds: [] },
      { ...text, draftAttachmentIds: ["a"] }, { ...text, draftAttachmentIds: ["a"] })).toEqual(["a"]);
  });
  it("requires a common base and identical text, title, tags and reply target", () => {
    const a = { ...text, draftAttachmentIds: [] }, b = { ...text, draftAttachmentIds: ["a"] };
    expect(keptAttachmentSelection(a, b, undefined)).toBeNull();
    for (const patch of [{body: "changed"}, {title: "changed"}, {tags: "changed"}, {parentPostId: "changed"}]) {
      expect(keptAttachmentSelection(a, {...b, ...patch}, b)).toBeNull();
    }
  });
  it("does not union unrelated additions, including offline selections", () => {
    expect(keptAttachmentSelection({...text, draftAttachmentIds: ["a"]},
      {...text, draftAttachmentIds: ["b"]}, {...text, draftAttachmentIds: []})).toBeNull();
  });
});
