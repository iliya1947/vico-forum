import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EDITOR_PREFERENCES, readEditorPreferences, subscribeEditorPreferences,
  writeEditorPreference,
} from "./editor-preferences";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("SET-03 existing per-account device-local Editor preferences", () => {
  it("reuses exactly the four Editor/code keys and preserves unset defaults", () => {
    const id = "set03-editor-store-a";
    const other = "set03-editor-store-b";
    expect(readEditorPreferences(id)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    writeEditorPreference(id, "mode", "advanced");
    writeEditorPreference(id, "spellcheck", false);
    writeEditorPreference(id, "codeWrap", true);
    writeEditorPreference(id, "codeLines", true);
    expect(localStorage.getItem("vico:editor:mode:" + id)).toBe("advanced");
    expect(localStorage.getItem("vico:editor:spellcheck:" + id)).toBe("false");
    expect(localStorage.getItem("vico:editor:code-wrap:" + id)).toBe("true");
    expect(localStorage.getItem("vico:editor:code-lines:" + id)).toBe("true");
    expect(readEditorPreferences(id)).toEqual({
      mode: "advanced", spellcheck: false, codeWrap: true, codeLines: true,
    });
    expect(readEditorPreferences(other)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    writeEditorPreference(id, "mode", null);
    writeEditorPreference(id, "spellcheck", null);
    expect(localStorage.getItem("vico:editor:mode:" + id)).toBeNull();
    expect(localStorage.getItem("vico:editor:spellcheck:" + id)).toBeNull();
    expect(readEditorPreferences(id)).toEqual({
      mode: null, spellcheck: null, codeWrap: true, codeLines: true,
    });
    expect(readEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    writeEditorPreference(null, "codeWrap", true);
    expect(localStorage.getItem("vico:editor:code-wrap:null")).toBeNull();
  });

  it("rejects corrupted values and recognizes native cross-tab storage notifications only for the current account", () => {
    const id = "set03-editor-corrupt-a";
    localStorage.setItem("vico:editor:mode:" + id, "<script>");
    localStorage.setItem("vico:editor:spellcheck:" + id, "yes");
    localStorage.setItem("vico:editor:code-wrap:" + id, "1");
    expect(readEditorPreferences(id)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    const notify = vi.fn();
    const unrelated = vi.fn();
    const unsubscribe = subscribeEditorPreferences(id, notify);
    const unsubscribeOther = subscribeEditorPreferences("set03-editor-corrupt-b", unrelated);
    writeEditorPreference(id, "mode", "simple");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(unrelated).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:spellcheck:" + id }));
    expect(notify).toHaveBeenCalledTimes(2);
    expect(unrelated).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:spellcheck:unrelated" }));
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    unsubscribeOther();
    writeEditorPreference(id, "mode", "advanced");
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("applies same-session preferences without falsely persisting when localStorage is denied", () => {
    const id = "set03-editor-denied-storage";
    const notify = vi.fn();
    const unsubscribe = subscribeEditorPreferences(id, notify);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    writeEditorPreference(id, "mode", "advanced");
    writeEditorPreference(id, "spellcheck", true);
    writeEditorPreference(id, "codeWrap", true);
    expect(notify).toHaveBeenCalledTimes(3);
    expect(readEditorPreferences(id)).toEqual({
      mode: "advanced", spellcheck: true, codeWrap: true, codeLines: false,
    });
    unsubscribe();
    vi.restoreAllMocks();
    expect(localStorage.getItem("vico:editor:mode:" + id)).toBeNull();
  });
});
