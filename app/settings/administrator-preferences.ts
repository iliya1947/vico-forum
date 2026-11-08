import { useEffect, useState } from "react";

/** Presentation-only state, never an authority, route or private-resource store. */
export const ADMIN_DESTINATION_IDS = ["overview", "forum", "users", "measures", "roles", "history"] as const;
export type AdminDestinationId = (typeof ADMIN_DESTINATION_IDS)[number];
export const ATTENTION_GROUP_IDS = {
  signals: ["needs-details", "needs-review", "solution-outdated", "duplicate", "appeals", "mixed"],
  complaints: ["group1", "group2", "group3"],
  security: ["attachments"],
} as const;
export type AttentionModeId = keyof typeof ATTENTION_GROUP_IDS;
export type AttentionGroupId = (typeof ATTENTION_GROUP_IDS)[AttentionModeId][number];
export interface AttentionSelection {
  readonly mode: AttentionModeId;
  readonly group: AttentionGroupId;
}
export interface AdministratorPreferences {
  readonly version: 1;
  readonly adminEntry: AdminDestinationId | "last";
  readonly lastAdmin: AdminDestinationId | null;
  readonly attentionEntry: "default" | "last";
  readonly defaultAttention: AttentionSelection;
  readonly lastAttention: AttentionSelection | null;
  readonly density: "comfortable" | "compact";
  readonly detailsExpanded: boolean;
}
export const DEFAULT_ADMINISTRATOR_PREFERENCES: AdministratorPreferences = Object.freeze({
  version: 1,
  adminEntry: "overview",
  lastAdmin: null,
  attentionEntry: "default",
  defaultAttention: { mode: "signals", group: "needs-details" } as const,
  lastAttention: null,
  density: "comfortable",
  detailsExpanded: false,
});

export const ADMINISTRATOR_PREFERENCES_EVENT = "vico:administrator-preferences";
const PREFIX = "vico:administrator-preferences:v1:";
const transient = new Map<string, string>();

function keyFor(accountId: string) { return PREFIX + accountId; }
function isDestination(value: unknown): value is AdminDestinationId {
  return typeof value === "string" && (ADMIN_DESTINATION_IDS as readonly string[]).includes(value);
}
export function isAttentionSelection(value: unknown): value is AttentionSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.mode !== "signals" && v.mode !== "complaints" && v.mode !== "security") return false;
  return typeof v.group === "string" && (ATTENTION_GROUP_IDS[v.mode] as readonly string[]).includes(v.group);
}
export function normalizeAdministratorPreferences(value: unknown): AdministratorPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_ADMINISTRATOR_PREFERENCES;
  const source = value as Record<string, unknown>;
  if (source.version !== 1) return DEFAULT_ADMINISTRATOR_PREFERENCES;
  return {
    version: 1,
    adminEntry: source.adminEntry === "last" || isDestination(source.adminEntry)
      ? source.adminEntry : DEFAULT_ADMINISTRATOR_PREFERENCES.adminEntry,
    lastAdmin: isDestination(source.lastAdmin) ? source.lastAdmin : null,
    attentionEntry: source.attentionEntry === "last" ? "last" : "default",
    defaultAttention: isAttentionSelection(source.defaultAttention)
      ? { mode: source.defaultAttention.mode, group: source.defaultAttention.group }
      : DEFAULT_ADMINISTRATOR_PREFERENCES.defaultAttention,
    lastAttention: isAttentionSelection(source.lastAttention)
      ? { mode: source.lastAttention.mode, group: source.lastAttention.group } : null,
    density: source.density === "compact" ? "compact" : "comfortable",
    detailsExpanded: source.detailsExpanded === true,
  };
}
export function readAdministratorPreferences(accountId: string | null): AdministratorPreferences {
  if (!accountId || typeof window === "undefined") return DEFAULT_ADMINISTRATOR_PREFERENCES;
  const key = keyFor(accountId);
  try {
    const raw = transient.get(key) ?? window.localStorage.getItem(key);
    return raw === null ? DEFAULT_ADMINISTRATOR_PREFERENCES
      : normalizeAdministratorPreferences(JSON.parse(raw));
  } catch { return DEFAULT_ADMINISTRATOR_PREFERENCES; }
}
export function writeAdministratorPreferences(
  accountId: string | null,
  changes: Partial<Omit<AdministratorPreferences, "version">>,
): void {
  if (!accountId || typeof window === "undefined") return;
  const next = normalizeAdministratorPreferences({ ...readAdministratorPreferences(accountId), ...changes });
  const key = keyFor(accountId);
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(key, raw);
    transient.delete(key);
  } catch {
    // Storage can be unavailable (private browsing/policy). The choice is transient only.
    transient.set(key, raw);
  }
  window.dispatchEvent(new CustomEvent(ADMINISTRATOR_PREFERENCES_EVENT, { detail: { accountId } }));
}
export function rememberAdminDestination(accountId: string | null, destination: AdminDestinationId): void {
  writeAdministratorPreferences(accountId, { lastAdmin: destination });
}
export function rememberAttentionSelection(accountId: string | null, selection: AttentionSelection): void {
  if (isAttentionSelection(selection)) writeAdministratorPreferences(accountId, { lastAttention: selection });
}
export function subscribeAdministratorPreferences(
  accountId: string | null, listener: () => void,
): () => void {
  if (!accountId || typeof window === "undefined") return () => {};
  const key = keyFor(accountId);
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<{ accountId: string }>).detail?.accountId === accountId) listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    transient.delete(key);
    listener();
  };
  window.addEventListener(ADMINISTRATOR_PREFERENCES_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ADMINISTRATOR_PREFERENCES_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}
export function useAdministratorPreferences(accountId: string | null): AdministratorPreferences {
  const [state, setState] = useState<{ id: string | null; values: AdministratorPreferences }>({
    id: null, values: DEFAULT_ADMINISTRATOR_PREFERENCES,
  });
  useEffect(() => {
    const update = () => setState({ id: accountId, values: readAdministratorPreferences(accountId) });
    const unsubscribe = subscribeAdministratorPreferences(accountId, update);
    update();
    return unsubscribe;
  }, [accountId]);
  return state.id === accountId ? state.values : DEFAULT_ADMINISTRATOR_PREFERENCES;
}
