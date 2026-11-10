import { describe, expect, it } from "vitest";
import {
  SA02_AREAS, SA02_MONITORS, SA02_FACT_MONITORS,
  sa02AreaForMonitor, sa02MonitorsForFact,
} from "./owner-sa02-catalog";

describe("SA-02 closed monitoring and exact-transition catalog", () => {
  it("contains only the approved global Accounts and Security monitoring areas", () => {
    expect(SA02_AREAS).toEqual(["accounts", "security"]);
    expect(SA02_MONITORS.accounts).toEqual([
      "accounts.users", "accounts.methods", "accounts.sessions", "accounts.registration",
    ]);
    expect(SA02_MONITORS.security).toEqual([
      "security.auth", "security.access", "security.attachments",
    ]);
    expect(new Set(Object.values(SA02_MONITORS).flat()).size).toBe(7);
  });

  it("maps each fixed monitor to its area, rejecting unknown and mismatched keys", () => {
    for (const area of SA02_AREAS) {
      for (const monitor of SA02_MONITORS[area]) {
        expect(sa02AreaForMonitor(monitor)).toBe(area);
      }
    }
    expect(sa02AreaForMonitor("system.runtime")).toBeNull();
    expect(sa02AreaForMonitor("accounts.security")).toBeNull();
    expect(sa02AreaForMonitor("accounts.users/other")).toBeNull();
    expect(sa02AreaForMonitor("")).toBeNull();
  });

  it("enumerates only proven persisted account, method, password and session transitions", () => {
    expect(Object.keys(SA02_FACT_MONITORS)).toEqual([
      "account.created", "auth.methodLinked", "auth.passwordChanged",
      "auth.sessionCreated", "auth.sessionDeleted",
    ]);
    expect(sa02MonitorsForFact("account.created")).toEqual(["accounts.users"]);
    expect(sa02MonitorsForFact("auth.passwordChanged")).toEqual(["accounts.methods", "security.auth"]);
    expect(sa02MonitorsForFact("auth.sessionDeleted")).toEqual(["accounts.sessions", "security.auth"]);
    expect(sa02MonitorsForFact("auth.signIn")).toBeNull();
    expect(sa02MonitorsForFact("auth.attemptDenied")).toBeNull();
    expect(sa02MonitorsForFact("__proto__")).toBeNull();
  });

  it("contains no duplicate or unregistered monitor assignments for exact facts", () => {
    const monitors = new Set(Object.values(SA02_MONITORS).flat());
    for (const assigned of Object.values(SA02_FACT_MONITORS)) {
      expect(assigned.length).toBeGreaterThan(0);
      expect(new Set(assigned).size).toBe(assigned.length);
      for (const key of assigned) expect(monitors.has(key)).toBe(true);
    }
  });
});
