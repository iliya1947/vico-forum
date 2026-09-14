import { describe, expect, it } from "vitest";
import routes from "../routes";
import { loader } from "./not-found";

describe("localized route shape", () => {
  it("uses Home only as the locale index and wires a separate catch-all", () => {
    const localeRoute = routes.find((candidate) => candidate.path === ":locale");
    expect(localeRoute?.children).toEqual([
      expect.objectContaining({ index: true, file: "routes/home.tsx" }),
      expect.objectContaining({ path: "categories/:categoryId", file: "routes/category.tsx" }),
      expect.objectContaining({ path: "sections/:sectionId", file: "routes/section.tsx" }),
      expect.objectContaining({ path: "topics/:topicId", file: "routes/topic.tsx" }),
      expect.objectContaining({ path: "*", file: "routes/not-found.ts" }),
    ]);
  });

  it("returns a real HTTP 404 for an unknown localized child path", () => {
    expect(loader).toThrowError(expect.objectContaining({ status: 404 }));
  });
});
