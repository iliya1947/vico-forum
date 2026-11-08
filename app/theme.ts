export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "vico-theme";
export const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const systemTheme = () => window.matchMedia?.("${DARK_THEME_QUERY}")?.matches ? "dark" : "light";
  let theme;
  try {
    const stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    theme = stored === "light" || stored === "dark" ? stored : systemTheme();
  } catch {
    theme = systemTheme();
  }
  document.documentElement.dataset.theme = theme;
})();`;

/** Theme choice is browser-wide. An absent override follows the operating system. */
export type ThemePreference = Theme | "system";
export const THEME_PREFERENCE_EVENT = "vico:theme-preference";
let transientPreference: ThemePreference | null = null;

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  if (transientPreference !== null) return transientPreference;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolvedTheme(preference: ThemePreference = readThemePreference()): Theme {
  if (preference !== "system") return preference;
  return typeof window !== "undefined" && window.matchMedia?.(DARK_THEME_QUERY)?.matches ? "dark" : "light";
}

export function applyThemePreference(): Theme {
  const theme = resolvedTheme();
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
  return theme;
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    transientPreference = null;
  } catch {
    // In private/denied storage, still apply this session's choice.
    transientPreference = preference;
  }
  applyThemePreference();
  window.dispatchEvent(new Event(THEME_PREFERENCE_EVENT));
}

export function subscribeThemePreference(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const update = () => { applyThemePreference(); listener(); };
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    transientPreference = null;
    update();
  };
  const media = window.matchMedia?.(DARK_THEME_QUERY);
  window.addEventListener(THEME_PREFERENCE_EVENT, update);
  window.addEventListener("storage", storage);
  media?.addEventListener?.("change", update);
  return () => {
    window.removeEventListener(THEME_PREFERENCE_EVENT, update);
    window.removeEventListener("storage", storage);
    media?.removeEventListener?.("change", update);
  };
}
