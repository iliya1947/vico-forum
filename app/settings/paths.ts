/** Registered Settings entry points. */
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

export function settingsAccountPath(locale: string): string {
  return `${settingsPath(locale)}/account`;
}

export function settingsPrivacyPath(locale: string): string {
  return `${settingsPath(locale)}/privacy`;
}

export function canonicalAuthorizationPath(locale: string): string {
  return `/${encodeURIComponent(locale)}/admin/authorization`;
}
