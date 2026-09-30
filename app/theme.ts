export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "vico-theme";
export const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const systemTheme = () => window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  let theme;
  try {
    const stored = window.localStorage.getItem("vico-theme");
    theme = stored === "light" || stored === "dark" ? stored : systemTheme();
  } catch {
    theme = systemTheme();
  }
  document.documentElement.dataset.theme = theme;
})();`;
