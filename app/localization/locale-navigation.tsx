import { createContext, useContext, type ReactNode } from "react";
import type { TextDirection } from "./locale";

export interface PublicLocaleOption {
  readonly tag: string;
  readonly nativeName: string;
  readonly direction: TextDirection;
}

interface LocaleNavigationValue {
  readonly locales: readonly PublicLocaleOption[];
  readonly onLocaleChange?: (locale: string) => void;
}

const LocaleNavigationContext = createContext<LocaleNavigationValue>({
  locales: [],
});

export function LocaleNavigationProvider({
  locales,
  onLocaleChange,
  children,
}: {
  locales: readonly PublicLocaleOption[];
  onLocaleChange?: (locale: string) => void;
  children: ReactNode;
}) {
  return (
    <LocaleNavigationContext.Provider value={{ locales, onLocaleChange }}>
      {children}
    </LocaleNavigationContext.Provider>
  );
}

export function useLocaleNavigation(): LocaleNavigationValue {
  return useContext(LocaleNavigationContext);
}
