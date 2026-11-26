import { describe, expect, it, vi } from "vitest";
import { RegistrationChallenge, registrationChallengeConfig, type RegistrationChallengeBinding, type RegistrationChallengeVerifier } from "./registration-challenge.server";

const binding: RegistrationChallengeBinding = { purpose: "fresh-registration", method: "email", nonce: "test-server-bound-nonce" };

describe("AUTH-02a provider-neutral challenge injection", () => {
  it("uses explicit configuration with no verifier fallback", () => {
    expect(registrationChallengeConfig(undefined)).toEqual({ mode: "disabled" });
    expect(registrationChallengeConfig("disabled")).toEqual({ mode: "disabled" });
    expect(registrationChallengeConfig("required")).toEqual({ mode: "required" });
    expect(registrationChallengeConfig("fake")).toEqual({ mode: "required" });
  });
  it("bounds a hung verifier and cannot use its late result", async () => {
    vi.useFakeTimers();
    let late!: (result: Awaited<ReturnType<RegistrationChallengeVerifier["verifyRegistrationChallenge"]>>) => void;
    const verifier: RegistrationChallengeVerifier = { verifyRegistrationChallenge: () => new Promise(resolve => { late = resolve; }) };
    try {
      const result = new RegistrationChallenge({ mode: "required", verifier }).verifyRegistrationChallenge(binding, "synthetic");
      await vi.advanceTimersByTimeAsync(5000);
      expect(await result).toBe("unavailable");
      late({ status: "passed", binding });
      await Promise.resolve();
      expect(await result).toBe("unavailable");
    } finally { vi.useRealTimers(); }
  });
  it("distinguishes disabled from provider-verified, and required without a verifier fails closed", async () => {
    expect(await new RegistrationChallenge().verifyRegistrationChallenge(binding, undefined)).toBe("not-required");
    expect(await new RegistrationChallenge({ mode: "required" }).verifyRegistrationChallenge(binding, "proof"))
      .toBe("unavailable");
  });

  it("delegates proof validation and rejects mismatched returned binding", async () => {
    const verifier: RegistrationChallengeVerifier = {
      verifyRegistrationChallenge: vi.fn(async ({ expected }) => ({
        status: "passed" as const, binding: { ...expected, method: "google" as const },
      })),
    };
    const runtime = new RegistrationChallenge({ mode: "required", verifier });
    expect(await runtime.verifyRegistrationChallenge(binding, "synthetic")).toBe("rejected");
    expect(verifier.verifyRegistrationChallenge).toHaveBeenCalledWith({ expected: binding, proof: "synthetic" });
    expect(await runtime.verifyRegistrationChallenge(binding, undefined)).toBe("rejected");
    expect(verifier.verifyRegistrationChallenge).toHaveBeenCalledTimes(1);
  });

  it("uses explicit fake adapter proof binding, expiry and replay behavior only in tests", async () => {
    const consumed = new Set<string>();
    const verifier: RegistrationChallengeVerifier = {
      verifyRegistrationChallenge: async ({ proof, expected }) => {
        if (proof === "expired" || proof !== "valid" || expected.nonce !== binding.nonce ||
            consumed.has(proof)) return { status: "rejected" };
        consumed.add(proof);
        return { status: "passed", binding: expected };
      },
    };
    const runtime = new RegistrationChallenge({ mode: "required", verifier });
    expect(await runtime.verifyRegistrationChallenge({ ...binding, nonce: "wrong" }, "valid")).toBe("rejected");
    expect(await runtime.verifyRegistrationChallenge(binding, "expired")).toBe("rejected");
    expect(await runtime.verifyRegistrationChallenge(binding, "valid")).toBe("passed");
    expect(await runtime.verifyRegistrationChallenge(binding, "valid")).toBe("rejected");
  });

  it("does not expose provider failure, timeout or unavailable details", async () => {
    for (const verifier of [
      { verifyRegistrationChallenge: async () => { throw new Error("private provider failure"); } },
      { verifyRegistrationChallenge: async () => ({ status: "unavailable" as const }) },
    ]) {
      const runtime = new RegistrationChallenge({ mode: "required", verifier });
      expect(await runtime.verifyRegistrationChallenge(binding, "synthetic")).toBe("unavailable");
    }
  });
});
