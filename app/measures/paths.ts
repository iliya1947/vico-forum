export const ownMeasuresPath = (locale: string) => "/" + encodeURIComponent(locale) + "/account/measures";
export const ownMeasurePath = (locale: string, id: string) =>
  ownMeasuresPath(locale) + "/" + encodeURIComponent(id);
export const adminMeasuresPath = (locale: string) =>
  "/" + encodeURIComponent(locale) + "/admin/measures";
export const adminMeasurePath = (locale: string, id: string) =>
  adminMeasuresPath(locale) + "/" + encodeURIComponent(id);
