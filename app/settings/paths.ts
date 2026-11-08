/** Registered Settings entry points; other approved surfaces are not routes yet. */
export function settingsPath(locale: string): string {
  return `/${encodeURIComponent(locale)}/settings`;
}

export function settingsForumPath(locale: string): string {
  return `${settingsPath(locale)}/forum`;
}

export function settingsAdministratorPath(locale: string): string {
  return `${settingsPath(locale)}/administrator`;
}

export function settingsUserPath(locale: string): string {
  return `${settingsPath(locale)}/user`;
}

export function canonicalAuthorizationPath(locale: string): string {
  return `/${encodeURIComponent(locale)}/admin/authorization`;
}
