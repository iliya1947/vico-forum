import { useEffect, useState } from "react";
import {
  ADMIN_ENTRY_IDS, ATTENTION_MODES, ATTENTION_GROUPS, adminEntryPath,
  attentionEntryPath, type AdminEntryId, type AttentionEntryMode,
  type AttentionEntryGroup, type AttentionEntryAccess,
} from "./workspace-access";

export interface AdministratorPreferences {
  readonly version: 1;
  readonly adminEntry: "default" | "last";
  readonly adminDefault: AdminEntryId;
  readonly adminLast: AdminEntryId | null;
  readonly attentionEntry: "default" | "last";
  readonly attentionDefaultMode: AttentionEntryMode;
  readonly attentionDefaultGroup: AttentionEntryGroup;
  readonly attentionLastMode: AttentionEntryMode | null;
  readonly attentionLastGroup: AttentionEntryGroup | null;
  readonly density: "comfortable" | "compact";
  readonly technicalDetailsExpanded: boolean;
}

export const DEFAULT_ADMINISTRATOR_PREFERENCES: AdministratorPreferences = Object.freeze({
  version: 1,
  adminEntry: "default",
  adminDefault: "overview",
  adminLast: null,
  attentionEntry: "default",
  attentionDefaultMode: "signals",
  attentionDefaultGroup: "needs-details",
  attentionLastMode: null,
  attentionLastGroup: null,
  density: "comfortable",
  technicalDetailsExpanded: false,
});

export const ADMINISTRATOR_PREFERENCES_EVENT = "vico:administrator-preferences";
const prefix = "vico:administrator-workspace:v1:";
const transient = new Map<string, AdministratorPreferences>();

export function administratorPreferenceKey(accountId: string): string {
  return prefix + accountId;
}
function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}
function validGroup(mode: AttentionEntryMode, group: unknown): group is AttentionEntryGroup {
  return oneOf(ATTENTION_GROUPS[mode], group);
}

/** Decode only declared enum/boolean fields. Unexpected versions or corrupted records never escape. */
export function parseAdministratorPreferences(raw: string | null): AdministratorPreferences {
  if (!raw) return DEFAULT_ADMINISTRATOR_PREFERENCES;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_ADMINISTRATOR_PREFERENCES;
    const v = value as Record<string, unknown>;
    if (v.version !== 1
      || !oneOf(["default", "last"], v.adminEntry)
      || !oneOf(ADMIN_ENTRY_IDS, v.adminDefault)
      || !(v.adminLast === null || oneOf(ADMIN_ENTRY_IDS, v.adminLast))
      || !oneOf(["default", "last"], v.attentionEntry)
      || !oneOf(ATTENTION_MODES, v.attentionDefaultMode)
      || !validGroup(v.attentionDefaultMode, v.attentionDefaultGroup)
      || !(v.attentionLastMode === null || oneOf(ATTENTION_MODES, v.attentionLastMode))
      || !(v.attentionLastGroup === null || (v.attentionLastMode !== null
        && validGroup(v.attentionLastMode, v.attentionLastGroup)))
      || (v.attentionLastMode === null) !== (v.attentionLastGroup === null)
      || !oneOf(["comfortable", "compact"], v.density)
      || typeof v.technicalDetailsExpanded !== "boolean") return DEFAULT_ADMINISTRATOR_PREFERENCES;
    return {
      version: 1, adminEntry: v.adminEntry, adminDefault: v.adminDefault,
      adminLast: v.adminLast, attentionEntry: v.attentionEntry,
      attentionDefaultMode: v.attentionDefaultMode, attentionDefaultGroup: v.attentionDefaultGroup,
      attentionLastMode: v.attentionLastMode, attentionLastGroup: v.attentionLastGroup,
      density: v.density, technicalDetailsExpanded: v.technicalDetailsExpanded,
    };
  } catch {
    return DEFAULT_ADMINISTRATOR_PREFERENCES;
  }
}

export function readAdministratorPreferences(accountId: string | null): AdministratorPreferences {
  if (!accountId || typeof window === "undefined") return DEFAULT_ADMINISTRATOR_PREFERENCES;
  const key = administratorPreferenceKey(accountId);
  if (transient.has(key)) return transient.get(key)!;
  try { return parseAdministratorPreferences(window.localStorage.getItem(key)); }
  catch { return DEFAULT_ADMINISTRATOR_PREFERENCES; }
}

export function updateAdministratorPreferences(
  accountId: string | null, changes: Partial<Omit<AdministratorPreferences, "version">>,
): void {
  if (!accountId || typeof window === "undefined") return;
  const oldValue = readAdministratorPreferences(accountId);
  const next = parseAdministratorPreferences(JSON.stringify({ ...oldValue, ...changes }));
  if (JSON.stringify(oldValue) === JSON.stringify(next)) return;
  const key = administratorPreferenceKey(accountId);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
    transient.delete(key);
  } catch {
    // Storage-denied browsers still support best-effort same-tab workspace preferences.
    transient.set(key, next);
  }
  window.dispatchEvent(new CustomEvent(ADMINISTRATOR_PREFERENCES_EVENT, { detail: { accountId } }));
}

export function subscribeAdministratorPreferences(accountId: string | null, listener: () => void): () => void {
  if (!accountId || typeof window === "undefined") return () => {};
  const key = administratorPreferenceKey(accountId);
  const fromLocal = (event: Event) => {
    if ((event as CustomEvent<{ accountId: string }>).detail?.accountId === accountId) listener();
  };
  const fromStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    transient.delete(key);
    listener();
  };
  window.addEventListener(ADMINISTRATOR_PREFERENCES_EVENT, fromLocal);
  window.addEventListener("storage", fromStorage);
  return () => {
    window.removeEventListener(ADMINISTRATOR_PREFERENCES_EVENT, fromLocal);
    window.removeEventListener("storage", fromStorage);
  };
}

export function useAdministratorPreferences(accountId: string | null): AdministratorPreferences {
  const [snapshot, setSnapshot] = useState<{ id: string | null; values: AdministratorPreferences }>({
    id: null, values: DEFAULT_ADMINISTRATOR_PREFERENCES,
  });
  useEffect(() => {
    const update = () => setSnapshot({ id: accountId, values: readAdministratorPreferences(accountId) });
    const unsubscribe = subscribeAdministratorPreferences(accountId, update);
    update();
    return unsubscribe;
  }, [accountId]);
  return snapshot.id === accountId ? snapshot.values : DEFAULT_ADMINISTRATOR_PREFERENCES;
}

export function selectAdminEntry(locale: string, allowed: readonly AdminEntryId[], prefs: AdministratorPreferences): string {
  const preferred = prefs.adminEntry === "last" ? prefs.adminLast : prefs.adminDefault;
  const fallback = prefs.adminDefault;
  const chosen = preferred && allowed.includes(preferred) ? preferred
    : allowed.includes(fallback) ? fallback : allowed[0];
  return chosen ? adminEntryPath(locale, chosen) : `/${encodeURIComponent(locale)}/admin`;
}

export function selectAttentionEntry(
  locale: string, allowed: AttentionEntryAccess, prefs: AdministratorPreferences,
): string {
  const preferredMode = prefs.attentionEntry === "last" ? prefs.attentionLastMode : prefs.attentionDefaultMode;
  const preferredGroup = prefs.attentionEntry === "last" ? prefs.attentionLastGroup : prefs.attentionDefaultGroup;
  const mode = preferredMode && allowed[preferredMode].length > 0 ? preferredMode
    : allowed[prefs.attentionDefaultMode].length > 0 ? prefs.attentionDefaultMode
    : ATTENTION_MODES.find(candidate => allowed[candidate].length > 0);
  if (!mode) return `/${encodeURIComponent(locale)}/attention`;
  const group = preferredMode === mode && preferredGroup && allowed[mode].includes(preferredGroup)
    ? preferredGroup : prefs.attentionDefaultMode === mode && allowed[mode].includes(prefs.attentionDefaultGroup)
      ? prefs.attentionDefaultGroup : allowed[mode][0]!;
  return attentionEntryPath(locale, mode, group);
}

export function recordAdminIndex(accountId: string | null, destination: AdminEntryId): void {
  updateAdministratorPreferences(accountId, { adminLast: destination });
}
export function recordAttentionIndex(
  accountId: string | null, mode: AttentionEntryMode, group: AttentionEntryGroup,
): void {
  if (!validGroup(mode, group)) return;
  updateAdministratorPreferences(accountId, { attentionLastMode: mode, attentionLastGroup: group });
}
