import { describe, expect, it } from "vitest";
import { mentionProfileLink, mentionTokenAtCaret } from "./mentions";

describe("mention authoring tokens", () => {
  it("finds only a name fragment immediately at the caret", () => {
    expect(mentionTokenAtCaret("Hello @Ada", 10)).toEqual({
      start: 6, end: 10, query: "Ada",
    });
    expect(mentionTokenAtCaret("(@שלו", 5)).toEqual({
      start: 1, end: 5, query: "שלו",
    });
    expect(mentionTokenAtCaret("someone@example.com", 18)).toBeNull();
    expect(mentionTokenAtCaret("Hello @Ada trailing", 19)).toBeNull();
    expect(mentionTokenAtCaret("Hello @Ada", 8)).toEqual({ start: 6, end: 8, query: "A" });
    expect(mentionTokenAtCaret("@", 1)).toBeNull();
  });

  it("serializes the member id as a stable profile URL and escapes Markdown in the label", () => {
    expect(mentionProfileLink("Ada Lovelace", "/ru/users/123")).toBe("[Ada Lovelace](/ru/users/123)");
    expect(mentionProfileLink("A[B]*", "/he/users/abc")).toBe(String.raw`[A\[B\]\*](/he/users/abc)`);
  });
});
