import { createContext, type RouterContextProvider } from "react-router";
import { AccountSecurityError, type AuthRuntime } from "../auth/request-context";
import type {
  AttemptOperation, AttemptSurface, AttemptOutcome, AttemptTelemetryInput,
  AttemptTelemetryWriter,
} from "../../db/owner-attempt-telemetry";
import type { AttemptIngressSource } from "./attempt-source";

const MAX_REQUEST_ATTEMPTS = 4;
type DirectOperation = "password-change" | "session-revoke" | "session-revoke-all";
type Sink = AttemptTelemetryWriter & { close(): Promise<void> };
type WriterFactory = () => Sink;

export class RequestAttemptCollector {
  private readonly pending: AttemptTelemetryInput[] = [];
  private readonly missed: Record<AttemptSurface, number> = { auth: 0, access: 0 };
  private actorId: string | null = null;
  private ownerGuardSeen = false;
  private finalized = false;
  constructor(readonly source: AttemptIngressSource, private readonly sinkFactory: WriterFactory) {}

  /** The only actor used for attribution is the authenticated, resolved session. */
  setResolvedActor(value: string | null | undefined): void {
    this.actorId = typeof value === "string" && /^[A-Za-z0-9._:-]{1,200}$/.test(value)
      ? value : null;
  }

  private add(input: Omit<AttemptTelemetryInput, "networkIp" | "networkQuality" | "actorUserId" | "occurredAt">) {
    if (this.finalized) return;
    if (this.pending.length >= MAX_REQUEST_ATTEMPTS) {
      this.missed[input.surface] += 1;
      return;
    }
    this.pending.push({
      ...input, networkIp: this.source.networkIp, networkQuality: this.source.networkQuality,
      actorUserId: this.actorId, occurredAt: new Date(),
    });
  }

  recordHttpFailure(operation: AttemptOperation, status: number): void {
    if (!Number.isInteger(status) || status < 400 || status > 599) return;
    const outcome: AttemptOutcome = status === 429 ? "rate-limited"
      : status === 503 ? "unavailable"
        : status === 401 || status === 403 || status === 400 ? "denied" : "failed";
    this.add({ surface: "auth", operation, outcome, httpStatus: status });
  }

  recordDirectFailure(operation: DirectOperation, error: unknown): void {
    if (!(error instanceof AccountSecurityError)) {
      this.missed.auth += 1;
      return;
    }
    const status: Record<AccountSecurityError["code"], number | null> = {
      unauthenticated: 401, "account-changed": 409, "invalid-password": 400,
      "no-password": 409, "not-fresh": 403, "session-not-found": 409,
      "current-session": 409, "rate-limited": 429, unavailable: null,
    };
    const httpStatus = status[error.code];
    this.add({
      surface: "auth", operation,
      outcome: error.code === "rate-limited" ? "rate-limited"
        : error.code === "unavailable" ? "unavailable" : "denied",
      ...(httpStatus === null ? { directCode: "unavailable" } : { httpStatus }),
    });
  }

  recordOwnerGuardDenied(status: 401 | 403): void {
    if (this.ownerGuardSeen) return;
    this.ownerGuardSeen = true;
    this.add({
      surface: "access", operation: "owner-guard",
      outcome: "denied", httpStatus: status,
    });
  }

  recordGap(surface: AttemptSurface, count = 1): void {
    if (this.finalized) return;
    this.missed[surface] = Math.min(1_000_000, this.missed[surface] + count);
  }

  /** Called exactly once by the Worker; no unhandled background promises. */
  async flush(): Promise<void> {
    if (this.finalized) return;
    this.finalized = true;
    const records = this.pending.splice(0);
    if (!records.length && !this.missed.auth && !this.missed.access) return;
    let sink: Sink;
    try { sink = this.sinkFactory(); }
    catch { return; }
    try {
      for (const record of records) {
        try { await sink.record(record); }
        catch { this.missed[record.surface] = Math.min(1_000_000, this.missed[record.surface] + 1); }
      }
      for (const surface of ["auth", "access"] as const) {
        const count = this.missed[surface];
        if (count) {
          try { await sink.recordGap({ surface, occurredAt: new Date(), count }); }
          catch { /* Unavailable storage cannot promise durable gap coverage. */ }
        }
      }
    } finally {
      try { await sink.close(); }
      catch { /* Never veto the original auth/access decision. */ }
    }
  }
}

export const requestAttemptCollectorContext = createContext<RequestAttemptCollector | null>(null);

export function attemptCollectorForRequest(context: RouterContextProvider): RequestAttemptCollector | null {
  return context.get(requestAttemptCollectorContext);
}

const AUTH_HTTP_OPERATIONS: Readonly<Record<string, AttemptOperation>> = {
  "/sign-up/email": "sign-up",
  "/sign-in/email": "sign-in",
  "/link-social": "method-link",
  "/change-password": "password-change",
  "/revoke-session": "session-revoke",
  "/revoke-sessions": "session-revoke-all",
  "/revoke-other-sessions": "session-revoke-all",
  "/sign-out": "sign-out",
};

function httpOperation(request: Request): AttemptOperation | null {
  if (request.method !== "POST") return null;
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/auth/")) return null;
  return AUTH_HTTP_OPERATIONS[path.slice("/api/auth".length)] ?? null;
}

/**
 * Instrument original, canonical HTTP/direct calls without creating an auth
 * route, changing validation, copying bodies/cookies or counting session probes.
 * Nested change-password calls auth.handler internally, not this facade, so
 * the direct operation is recorded at most once here.
 */
export function withAttemptObservation(
  runtime: AuthRuntime, collector: RequestAttemptCollector,
): AuthRuntime {
  const security = runtime.security;
  return {
    ...runtime,
    getSession: headers => runtime.getSession(headers),
    async handle(request) {
      const operation = httpOperation(request);
      try {
        const response = await runtime.handle(request);
        if (operation) collector.recordHttpFailure(operation, response.status);
        return response;
      } catch (error) {
        if (operation) collector.recordGap("auth");
        throw error;
      }
    },
    ...(security ? { security: {
      read: (...args: Parameters<typeof security.read>) => security.read(...args),
      async changePassword(...args: Parameters<typeof security.changePassword>) {
        try { return await security.changePassword(...args); }
        catch (error) { collector.recordDirectFailure("password-change", error); throw error; }
      },
      async revokeOneOther(...args: Parameters<typeof security.revokeOneOther>) {
        try { return await security.revokeOneOther(...args); }
        catch (error) { collector.recordDirectFailure("session-revoke", error); throw error; }
      },
      async revokeAllOthers(...args: Parameters<typeof security.revokeAllOthers>) {
        try { return await security.revokeAllOthers(...args); }
        catch (error) { collector.recordDirectFailure("session-revoke-all", error); throw error; }
      },
    } } : {}),
  };
}
