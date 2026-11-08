import { useEffect, useState } from "react";
import {
  applyThemePreference, readThemePreference, setThemePreference,
  subscribeThemePreference, type Theme, type ThemePreference,
} from "./theme";

/** Settings and header observe one browser preference without a second store. */
export function useThemePreference() {
  const [snapshot, setSnapshot] = useState<{ preference: ThemePreference; theme: Theme } | null>(null);

  useEffect(() => {
    const update = () => {
      const preference = readThemePreference();
      const theme = applyThemePreference();
      setSnapshot(previous =>
        previous?.preference === preference && previous.theme === theme
          ? previous : { preference, theme });
    };
    const unsubscribe = subscribeThemePreference(update);
    update();
    return unsubscribe;
  }, []);

  return {
    preference: snapshot?.preference ?? null,
    theme: snapshot?.theme ?? null,
    setPreference: setThemePreference,
  };
}
