import type { AttemptNetworkQuality } from "../../db/owner-attempt-telemetry";

export interface AttemptIngressSource {
  readonly networkIp: string | null;
  readonly networkQuality: AttemptNetworkQuality;
}

export const UNKNOWN_ATTEMPT_SOURCE: AttemptIngressSource = Object.freeze({
  networkIp: null, networkQuality: "unknown",
});

const CROSS_ZONE_WORKER_IP = "2a06:98c0:3600::103";

/** Strict address-only parser; never accepts browser-provided ports/CIDR/lists. */
export function normalizeAttemptIp(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 45 || /[\s,/[%\]]/.test(value)) return null;
  if (/^[0-9.]+$/.test(value)) {
    const octets = value.split(".");
    if (octets.length !== 4 || octets.some(x =>
      !/^(0|[1-9]\d{0,2})$/.test(x) || Number(x) > 255)) return null;
    return octets.join(".");
  }
  if (!/^[0-9a-fA-F:.]+$/.test(value) || !value.includes(":")) return null;
  try {
    const host = new URL("http://[" + value + "]/").hostname;
    if (!host.startsWith("[") || !host.endsWith("]")) return null;
    const normalized = host.slice(1, -1);
    if (normalized.startsWith("::ffff:")) {
      const segments = normalized.slice(7).split(":");
      if (segments.length === 2 && segments.every(s => /^[0-9a-f]{1,4}$/.test(s))) {
        const high = parseInt(segments[0], 16), low = parseInt(segments[1], 16);
        return [high >>> 8, high & 255, low >>> 8, low & 255].join(".");
      }
    }
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Only a Worker ingress with platform cf.colo evidence is eligible. The
 * observed IP is qualified, not a proven person: same-zone subrequests and
 * Pseudo IPv4 modes cannot be authenticated solely from request headers.
 * Normal browser/Node requests with forged CF/XFF values stay unknown.
 */
export function captureAttemptIngressSource(request: Request): AttemptIngressSource {
  const cloudflare = (request as Request & { cf?: { colo?: unknown } }).cf;
  if (!cloudflare || typeof cloudflare.colo !== "string" ||
      !/^[A-Z]{3}$/.test(cloudflare.colo)) return UNKNOWN_ATTEMPT_SOURCE;
  if (request.headers.has("x-real-ip") || request.headers.has("cf-worker")) {
    return UNKNOWN_ATTEMPT_SOURCE;
  }
  const ip = normalizeAttemptIp(request.headers.get("cf-connecting-ip"));
  if (!ip || ip === CROSS_ZONE_WORKER_IP) return UNKNOWN_ATTEMPT_SOURCE;
  // In a Pseudo IPv4 overwrite configuration, a Class E address is not the
  // original IPv6. Never guess the mode from a client-selectable header.
  if (/^\d+\./.test(ip) && Number(ip.split(".")[0]) >= 240) {
    return UNKNOWN_ATTEMPT_SOURCE;
  }
  return { networkIp: ip, networkQuality: "qualified" };
}

/** Explicit synthetic ingress for local tests; never derived from request input. */
export function syntheticAttemptIngressSource(
  value: string | null, quality: AttemptNetworkQuality = "trusted",
): AttemptIngressSource {
  const networkIp = normalizeAttemptIp(value);
  return networkIp ? { networkIp, networkQuality: quality } : UNKNOWN_ATTEMPT_SOURCE;
}
