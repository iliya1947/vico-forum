import { useEffect, useState } from "react";

/**
 * Existing Editor 2.0 device/account-local keys are the only persistence.
 * Nothing here is an account setting, server authority or a cross-device store.
 */
export interface EditorPreferences {
  readonly mode: "simple" | "advanced" | null;
  readonly spellcheck: boolean | null;
  readonly codeWrap: boolean;
  readonly codeLines: boolean;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = Object.freeze({
  mode: null,
  spellcheck: null,
  codeWrap: false,
  codeLines: false,
});

export const EDITOR_PREFERENCES_EVENT = "vico:editor-preferences";
const CODE_PREFERENCES_EVENT = "vico:code-preferences";
const storageSuffix = {
  mode: "mode",
  spellcheck: "spellcheck",
  codeWrap: "code-wrap",
  codeLines: "code-lines",
} as const satisfies Record<keyof EditorPreferences, string>;

// Best-effort same-tab choice if storage access is denied; never claim persistence.
const transient = new Map<string, string | null>();

function storageKey(accountId: string, key: keyof EditorPreferences): string {
  return `vico:editor:${storageSuffix[key]}:${accountId}`;
}

function stored(accountId: string, key: keyof EditorPreferences): string | null {
  const name = storageKey(accountId, key);
  if (transient.has(name)) return transient.get(name) ?? null;
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

export function readEditorPreferences(accountId: string | null): EditorPreferences {
  if (!accountId || typeof window === "undefined") return DEFAULT_EDITOR_PREFERENCES;
  const mode = stored(accountId, "mode");
  const spellcheck = stored(accountId, "spellcheck");
  return {
    mode: mode === "simple" || mode === "advanced" ? mode : null,
    spellcheck: spellcheck === "true" ? true : spellcheck === "false" ? false : null,
    codeWrap: stored(accountId, "codeWrap") === "true",
    codeLines: stored(accountId, "codeLines") === "true",
  };
}

export function writeEditorPreference<Key extends keyof EditorPreferences>(
  accountId: string | null,
  key: Key,
  value: EditorPreferences[Key],
): void {
  if (!accountId || typeof window === "undefined") return;
  const name = storageKey(accountId, key);
  const serialized = value === null ? null : String(value);
  try {
    if (serialized === null) window.localStorage.removeItem(name);
    else window.localStorage.setItem(name, serialized);
    transient.delete(name);
  } catch {
    transient.set(name, serialized);
  }
  window.dispatchEvent(new CustomEvent(EDITOR_PREFERENCES_EVENT, { detail: { accountId } }));
  if (key === "codeWrap" || key === "codeLines") {
    // Retain the established code-block notification for other existing consumers.
    window.dispatchEvent(new Event(CODE_PREFERENCES_EVENT));
  }
}

export function subscribeEditorPreferences(accountId: string | null, listener: () => void): () => void {
  if (!accountId || typeof window === "undefined") return () => {};
  const keys = (Object.keys(storageSuffix) as (keyof EditorPreferences)[])
    .map(key => storageKey(accountId, key));
  const changed = (event: Event) => {
    if ((event as CustomEvent<{ accountId: string }>).detail?.accountId === accountId) listener();
  };
  const fromStorage = (event: StorageEvent) => {
    if (event.key !== null && !keys.includes(event.key)) return;
    if (event.key === null) keys.forEach(key => transient.delete(key));
    else transient.delete(event.key);
    listener();
  };
  window.addEventListener(EDITOR_PREFERENCES_EVENT, changed);
  window.addEventListener("storage", fromStorage);
  return () => {
    window.removeEventListener(EDITOR_PREFERENCES_EVENT, changed);
    window.removeEventListener("storage", fromStorage);
  };
}

/** A live view of the same local keys consumed by MarkdownEditor and ForumCodeBlock. */
export function useEditorPreferences(accountId: string | null): EditorPreferences {
  const [state, setState] = useState<{
    accountId: string | null;
    values: EditorPreferences;
  }>({ accountId: null, values: DEFAULT_EDITOR_PREFERENCES });
  useEffect(() => {
    const update = () => setState({ accountId, values: readEditorPreferences(accountId) });
    const unsubscribe = subscribeEditorPreferences(accountId, update);
    update();
    return unsubscribe;
  }, [accountId]);
  return state.accountId === accountId ? state.values : DEFAULT_EDITOR_PREFERENCES;
}
