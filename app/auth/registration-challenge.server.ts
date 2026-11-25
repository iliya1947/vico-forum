/** Provider-neutral registration challenge boundary. No provider, SDK or
 * public proof endpoint is enabled by this foundation. Bindings and proof
 * values stay server-side except for the actual future challenge exchange.
 */
export type RegistrationChallengeBinding = Readonly<{
  purpose: "fresh-registration";
  method: "email" | "google";
  nonce: string;
}>;
export type RegistrationChallengeResult =
  | { status: "passed"; binding: RegistrationChallengeBinding }
  | { status: "rejected" | "unavailable" };
export interface RegistrationChallengeVerifier {
  /** A future adapter must establish freshness, binding, and replay safety.
   * Never implement this by echoing a client boolean or unverified fields.
   */
  verifyRegistrationChallenge(input: Readonly<{
    proof: string;
    expected: RegistrationChallengeBinding;
  }>): Promise<RegistrationChallengeResult>;
}
export type RegistrationChallengeConfig =
  | Readonly<{ mode: "disabled" }>
  | Readonly<{ mode: "required"; verifier?: RegistrationChallengeVerifier }>;

export const DISABLED_REGISTRATION_CHALLENGE = Object.freeze({ mode: "disabled" } as const);
export type RegistrationChallengeDecision = "not-required" | "passed" | "rejected" | "unavailable";

export class RegistrationChallenge {
  constructor(private readonly config: RegistrationChallengeConfig = DISABLED_REGISTRATION_CHALLENGE) {}

  async verifyRegistrationChallenge(expected: RegistrationChallengeBinding,
    proof: string | undefined): Promise<RegistrationChallengeDecision> {
    if (this.config.mode === "disabled") return "not-required";
    if (this.config.mode !== "required" || !this.config.verifier) return "unavailable";
    if (!expected || expected.purpose !== "fresh-registration" ||
        (expected.method !== "email" && expected.method !== "google") ||
        typeof expected.nonce !== "string" || !expected.nonce || expected.nonce.length > 256 ||
        typeof proof !== "string" || !proof) return "rejected";
    // Only the adapter defines accepted proof format/size, TTL and replay
    // rules. The endpoint must bound its request body independently.
    const binding = Object.freeze({ ...expected });
    try {
      const result = await this.config.verifier.verifyRegistrationChallenge({ proof, expected: binding });
      if (result.status === "rejected" || result.status === "unavailable") return result.status;
      if (result.status !== "passed" || !result.binding ||
        result.binding.purpose !== binding.purpose || result.binding.method !== binding.method ||
        result.binding.nonce !== binding.nonce) return "rejected";
      return "passed";
    } catch {
      // Never expose provider errors or silently substitute a fake verifier.
      return "unavailable";
    }
  }
}
