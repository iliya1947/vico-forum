/**
 * SA-02 code-backed Owner monitoring catalog. These are semantic identities, not
 * client-selected queries, administrative permissions, or route registrations.
 */
export const SA02_AREAS = ["accounts", "security"] as const;
export type Sa02Area = (typeof SA02_AREAS)[number];

export const SA02_MONITORS = {
  accounts: ["accounts.users", "accounts.methods", "accounts.sessions", "accounts.registration"],
  security: ["security.auth", "security.access", "security.attachments"],
} as const satisfies Record<Sa02Area, readonly string[]>;
export type Sa02MonitorKey = (typeof SA02_MONITORS)[Sa02Area][number];

export function sa02AreaForMonitor(value: string): Sa02Area | null {
  for (const area of SA02_AREAS) {
    if ((SA02_MONITORS[area] as readonly string[]).includes(value)) return area;
  }
  return null;
}

/**
 * Actual persisted transitions only. A refused attempt or an HTTP success without
 * a proven state transition does not qualify as one of these facts.
 * A single fact can be projected in related scoped histories without duplication.
 */
export const SA02_FACT_MONITORS = {
  "account.created": ["accounts.users"],
  "auth.methodLinked": ["accounts.methods", "security.auth"],
  "auth.passwordChanged": ["accounts.methods", "security.auth"],
  "auth.sessionCreated": ["accounts.sessions", "security.auth"],
  "auth.sessionDeleted": ["accounts.sessions", "security.auth"],
} as const satisfies Record<string, readonly Sa02MonitorKey[]>;
export type Sa02FactKind = keyof typeof SA02_FACT_MONITORS;

export function sa02MonitorsForFact(kind: string): readonly Sa02MonitorKey[] | null {
  if (!Object.prototype.hasOwnProperty.call(SA02_FACT_MONITORS, kind)) return null;
  return SA02_FACT_MONITORS[kind as Sa02FactKind];
}
