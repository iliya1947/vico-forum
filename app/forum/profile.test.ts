import { describe, expect, it } from "vitest";
import { InvalidProfileError, safeHttpUrl, validateProfileFields } from "./profile";
import { forumProfilePath } from "./paths";

describe("profile fields", () => {
  it("normalizes public links and supports empty fields and Unicode bios", () => {
    expect(validateProfileFields({ bio: "  שלום 🧑‍💻  ", githubUrl: "http://github.com/octocat/", websiteUrl: " https://example.com " })).toEqual({
      bio: "שלום 🧑‍💻", githubUrl: "https://github.com/octocat", websiteUrl: "https://example.com/",
    });
    expect(validateProfileFields({ bio: "", githubUrl: " ", websiteUrl: null })).toEqual({ bio: "", githubUrl: null, websiteUrl: null });
    expect(validateProfileFields({ bio: "🙂".repeat(500), githubUrl: null, websiteUrl: null }).bio).toHaveLength(1000);
    expect(() => validateProfileFields({ bio: "🙂".repeat(501), githubUrl: null, websiteUrl: null })).toThrow(InvalidProfileError);
  });
  it.each(["javascript:alert(1)", "data:image/svg+xml,<svg/>", "//example.com", "https://user:password@example.com", "https://example.com/\n", "https://example.com/" + "a".repeat(2048)])("rejects unsafe URLs %s", (websiteUrl) => {
    expect(safeHttpUrl(websiteUrl)).toBeNull();
    expect(() => validateProfileFields({ bio: "", githubUrl: null, websiteUrl: websiteUrl === "https://example.com/\n" ? "https://example.com/a\nb" : websiteUrl })).toThrow(InvalidProfileError);
  });
  it.each(["https://github.com/octocat/repo", "https://github.com.evil.test/octocat", "https://github.com/octocat?tab=repositories", "https://github.com:444/octocat"])('rejects non-profile GitHub links %s', (githubUrl) => {
    expect(() => validateProfileFields({ bio: "", githubUrl, websiteUrl: null })).toThrow(InvalidProfileError);
  });
  it("encodes locale and opaque text identity as single path segments", () => {
    expect(forumProfilePath("zh-Hant", "user/with ?#%" )).toBe("/zh-Hant/users/user%2Fwith%20%3F%23%25");
  });
});
