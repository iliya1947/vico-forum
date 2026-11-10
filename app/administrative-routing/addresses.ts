/** Pure outgoing addresses only: not a React Router registration table or an authority mechanism. */
export interface AdminAddressFamily {
  overview(locale: string): string;
  forum(locale: string): string;
  category(locale: string, id: string): string;
  section(locale: string, id: string): string;
  topic(locale: string, id: string): string;
  users(locale: string): string;
  user(locale: string, id: string): string;
  measures(locale: string): string;
  measure(locale: string, id: string): string;
  history(locale: string, before?: string): string;
  authorization(locale: string): string;
}
export interface SuperAdminAddressFamily {
  overview(locale: string): string;
  monitoring(locale: string): string;
  system(locale: string): string;
  monitorHistory(locale: string, key: string, before?: string): string;
  events(locale: string, before?: string): string;
  infrastructure(locale: string): string;
}
export interface AdministrativeRouting {
  readonly admin: AdminAddressFamily;
  readonly superAdmin: SuperAdminAddressFamily;
}

type AddressBase = (locale: string) => string;
const encoded = (value: string) => encodeURIComponent(value);
const currentAdminBase: AddressBase = locale => `/${encoded(locale)}/admin`;
const currentOwnerBase: AddressBase = locale => `/${encoded(locale)}/super-admin`;

/**
 * Two independent address families. The default is the current same-origin public
 * spelling; a trusted future producer may supply distinct bases/origins.
 * Nothing here accepts untrusted URLs or changes current route registrations.
 */
export function createAdministrativeRouting(
  adminBase: AddressBase = currentAdminBase,
  superAdminBase: AddressBase = currentOwnerBase,
): AdministrativeRouting {
  const admin: AdminAddressFamily = {
    overview: locale => adminBase(locale),
    forum: locale => `${adminBase(locale)}/forum`,
    category: (locale, id) => `${adminBase(locale)}/forum/categories/${encoded(id)}`,
    section: (locale, id) => `${adminBase(locale)}/forum/sections/${encoded(id)}`,
    topic: (locale, id) => `${adminBase(locale)}/forum/topics/${encoded(id)}`,
    users: locale => `${adminBase(locale)}/users`,
    user: (locale, id) => `${adminBase(locale)}/users/${encoded(id)}`,
    measures: locale => `${adminBase(locale)}/measures`,
    measure: (locale, id) => `${adminBase(locale)}/measures/${encoded(id)}`,
    history: (locale, before) => `${adminBase(locale)}/history` +
      (before === undefined ? "" : `?${new URLSearchParams({ before })}`),
    authorization: locale => `${adminBase(locale)}/authorization`,
  };
  const superAdmin: SuperAdminAddressFamily = {
    overview: locale => superAdminBase(locale),
    monitoring: locale => `${superAdminBase(locale)}/monitoring`,
    system: locale => `${superAdminBase(locale)}/monitoring/system`,
    monitorHistory: (locale, key, before) =>
      `${superAdminBase(locale)}/monitoring/system/${encoded(key)}/history` +
      (before === undefined ? "" : `?before=${encoded(before)}`),
    events: (locale, before) => `${superAdminBase(locale)}/events` +
      (before === undefined ? "" : `?before=${encoded(before)}`),
    infrastructure: locale => `${superAdminBase(locale)}/infrastructure`,
  };
  return { admin, superAdmin };
}

export const defaultAdministrativeRouting = createAdministrativeRouting();
