import { createContext } from "react-router";
import type { ResolvedLocaleContext } from "./locale";

export const localeContext = createContext<ResolvedLocaleContext>();
