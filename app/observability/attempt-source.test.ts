import { describe, expect, it } from "vitest";
import {
  captureAttemptIngressSource, normalizeAttemptIp, syntheticAttemptIngressSource,
  UNKNOWN_ATTEMPT_SOURCE,
} from "./attempt-source";

function cfRequest(ip: string | null, headers: Record<string, string> = {}, colo = "DFW") {
  const request = new Request("https://forum.test/api/auth/sign-in/email", {
    method: "POST", headers: { ...(ip ? { "cf-connecting-ip": ip } : {}), ...headers },
  });
  Object.defineProperty(request, "cf", { value: { colo } });
  return request;
}

describe("SA02 ingress source, no untrusted header identity", () => {
  it("canonicalizes genuine IPv4, IPv6 and IPv4-mapped sources", () => {
    expect(normalizeAttemptIp("192.0.2.7")).toBe("192.0.2.7");
    expect(normalizeAttemptIp("2001:0db8:0:0::A")).toBe("2001:db8::a");
    expect(normalizeAttemptIp("::ffff:192.0.2.7")).toBe("192.0.2.7");
    expect(syntheticAttemptIngressSource("2001:db8::1"))
      .toEqual({ networkIp: "2001:db8::1", networkQuality: "trusted" });
    expect(syntheticAttemptIngressSource(null)).toEqual(UNKNOWN_ATTEMPT_SOURCE);
  });

  it("rejects CIDR, ports, whitespace, lists, zone IDs, invalid and ambiguous address forms", () => {
    for (const input of [
      "", "192.0.2.1:443", "192.0.2.0/24", "192.0.2.1,203.0.113.4",
      "192.0.2.1 ", "001.002.003.004", "999.0.0.1", "::", 
      "[2001:db8::1]", "fe80::1%eth0", "2001:db8::1/64", "123.3.4",
      "1.2.3.4\n", "x".repeat(200),
    ]) {
      if (input === "::") expect(normalizeAttemptIp(input)).toBe("::");
      else expect(normalizeAttemptIp(input)).toBeNull();
    }
  });

  it("ignores forged CF/XFF/real-IP headers without Worker ingress metadata", () => {
    const headers = {
      "cf-connecting-ip": "192.0.2.5", "x-forwarded-for": "198.51.100.99",
      "true-client-ip": "198.51.100.99", "cf-connecting-ipv6": "2001:db8::9",
    };
    expect(captureAttemptIngressSource(new Request("https://forum.test", { headers })))
      .toEqual(UNKNOWN_ATTEMPT_SOURCE);
    expect(captureAttemptIngressSource(cfRequest("192.0.2.5", {}, "bad")))
      .toEqual(UNKNOWN_ATTEMPT_SOURCE);
  });

  it("retains qualified ingress IP, never elevates to proven identity", () => {
    expect(captureAttemptIngressSource(cfRequest("2001:0db8:0:0::1")))
      .toEqual({ networkIp: "2001:db8::1", networkQuality: "qualified" });
    expect(captureAttemptIngressSource(cfRequest("203.0.113.7", {
      "x-forwarded-for": "198.51.100.99", "true-client-ip": "198.51.100.99",
    }))).toEqual({ networkIp: "203.0.113.7", networkQuality: "qualified" });
  });

  it("fails to unknown on subrequest signals, cross-zone shared IP and pseudo IPv4", () => {
    for (const request of [
      cfRequest("203.0.113.7", { "x-real-ip": "198.51.100.5" }),
      cfRequest("203.0.113.7", { "cf-worker": "other-zone" }),
      cfRequest("2a06:98c0:3600::103"),
      cfRequest("241.10.10.10", { "cf-connecting-ipv6": "2001:db8::8" }),
      cfRequest("not an IP"),
      cfRequest(null),
    ]) expect(captureAttemptIngressSource(request)).toEqual(UNKNOWN_ATTEMPT_SOURCE);
  });
});
