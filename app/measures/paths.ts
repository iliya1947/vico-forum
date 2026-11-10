import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
export const ownMeasuresPath = (locale: string) => "/" + encodeURIComponent(locale) + "/account/measures";
export const ownMeasurePath = (locale: string, id: string) =>
  ownMeasuresPath(locale) + "/" + encodeURIComponent(id);
export const adminMeasuresPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.admin.measures(locale);
export const adminMeasurePath = (locale: string, id: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.admin.measure(locale, id);
