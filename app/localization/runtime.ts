import { createInstance, type i18n } from "i18next";
import type { TranslationSnapshot } from "./resource-loader";

export function createTranslationRuntime(snapshot: TranslationSnapshot): i18n {
  const instance = createInstance();
  void instance.init({
    lng: snapshot.locale.translationLocale,
    fallbackLng: snapshot.fallbackLocales.length ? snapshot.fallbackLocales : false,
    load: "currentOnly",
    supportedLngs: false,
    resources: snapshot.resourcesByLocale,
    defaultNS: "common",
    ns: Object.keys(snapshot.resourcesByLocale.en ?? {}),
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}
