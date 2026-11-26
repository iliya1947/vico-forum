import { AsyncLocalStorage } from "node:async_hooks";
import { getOAuthState } from "better-auth/api";
import type { RegistrationChallenge, RegistrationChallengeDecision } from "./registration-challenge.server";

type Method = "email" | "google";
type Receipt = Readonly<{
  version: 1; purpose: "fresh-registration"; method: Method; nonce: string;
  decision: RegistrationChallengeDecision; expiresAt: number;
}>;
type Frame = { open: boolean; email?: string; receipt?: Receipt; observed: boolean };
export const REGISTRATION_CHALLENGE_CONTEXT = "vicoRegistrationChallenge";

/** Server capabilities live in an invocation scope or native signed OAuth
 * serverContext. Neither submitted booleans nor additionalData are receipts.
 */
export class RegistrationChallengeAdmission {
  private readonly scope = new AsyncLocalStorage<Frame>();
  constructor(private readonly challenge: RegistrationChallenge,
    private readonly observeFailure?: (code: "invalid" | "unavailable") => void) {}

  private async prepare(method: Method, raw: unknown): Promise<Receipt | undefined> {
    if (!this.challenge.required) return;
    const binding = { purpose: "fresh-registration" as const, method, nonce: crypto.randomUUID() };
    // This is a request input bound; accepted provider proof formats/TTL/replay
    // remain the verifier's contract. No provider material enters the receipt.
    const proof = typeof raw === "string" && raw.length <= 8192 ? raw : undefined;
    const decision = await this.challenge.verifyRegistrationChallenge(binding, proof);
    return Object.freeze({ version: 1, ...binding, decision, expiresAt: Date.now() + 600_000 });
  }

  async email<T>(email: string, raw: unknown, exists: () => Promise<boolean>, work: () => Promise<T>): Promise<T> {
    const receipt = this.challenge.required && !await exists() ? await this.prepare("email", raw) : undefined;
    return this.run({ open: true, email, receipt, observed: false }, work);
  }

  async google<T>(raw: unknown, work: (receipt: Receipt | undefined) => Promise<T>): Promise<T> {
    const receipt = await this.prepare("google", raw);
    return this.run({ open: true, receipt, observed: false }, () => work(receipt));
  }

  private async run<T>(frame: Frame, work: () => Promise<T>): Promise<T> {
    return this.scope.run(frame, async () => {
      try { return await work(); }
      finally { frame.open = false; }
    });
  }

  /** Called only by the native actual create-user gate, after SET-02 policy.
   * No verifier/provider I/O occurs in its identity transaction.
   */
  async admit(method: Method, email: string) {
    if (!this.challenge.required) return;
    const frame = this.scope.getStore();
    let raw: unknown = frame?.open && (method === "google" || frame.email === email) ? frame.receipt : undefined;
    if (method === "google" && !raw) {
      const state = await getOAuthState();
      raw = state?.serverContext?.[REGISTRATION_CHALLENGE_CONTEXT];
    }
    const receipt = raw as Partial<Receipt> | undefined;
    const valid = receipt && receipt.version === 1 && receipt.purpose === "fresh-registration" &&
      receipt.method === method && typeof receipt.nonce === "string" && /^[a-f0-9-]{36}$/.test(receipt.nonce) &&
      typeof receipt.expiresAt === "number" && Number.isFinite(receipt.expiresAt) &&
      receipt.expiresAt > Date.now() && receipt.expiresAt <= Date.now() + 600_000;
    if (valid && receipt.decision === "passed") return;
    const unavailable = !receipt || receipt.decision === "unavailable" || receipt.decision === "not-required";
    if (!frame || !frame.observed) {
      if (frame) frame.observed = true;
      try { this.observeFailure?.(unavailable ? "unavailable" : "invalid"); } catch { /* passive */ }
    }
    return { error: unavailable ? "vico_registration_challenge_unavailable" : "vico_registration_challenge_rejected",
      errorDescription: "Registration unavailable" };
  }
}
