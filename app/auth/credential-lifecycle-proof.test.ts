// @vitest-environment node

import { describe, expect, it } from "vitest";
import { decodeCredentialProof, signCredentialProof } from "./credential-lifecycle-proof.server";
import { signEmailVerificationProof } from "./email-verification-proof.server";

const secret = "disposable-unit-test-signing-key-0123456789";
const subject = { userId: "test-user", generation: "abcd", phase: "pending" as const };

describe("credential lifecycle proof", () => {
  it.each(["password-reset", "password-create"] as const)("binds %s to its current generation and immutable subject", async purpose => {
    const token = await signCredentialProof(secret, { ...subject, purpose });
    await expect(decodeCredentialProof(secret, token, purpose)).resolves.toEqual({ ...subject, purpose, token });
    const other = purpose === "password-reset" ? "password-create" : "password-reset";
    await expect(decodeCredentialProof(secret, token, other)).rejects.toThrow("Invalid or expired");
    await expect(decodeCredentialProof(secret + "-different", token, purpose)).rejects.toThrow("Invalid or expired");
  });

  it("rejects a proof signed for email verification", async () => {
    const token = await signEmailVerificationProof(secret, { ...subject, purpose: "email-verification" });
    await expect(decodeCredentialProof(secret, token, "password-reset")).rejects.toThrow("Invalid or expired");
  });
});
