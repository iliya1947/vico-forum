import { signJWT, verifyJWT } from "better-auth/crypto";
import {
  InvalidLifecycleProofError, LifecycleStateInvariantError, lifecycleProofTtlSeconds,
  type LifecycleClaims, type LifecycleProof,
} from "./lifecycle-state.server";

export type CredentialProofPurpose = "password-reset" | "password-create";
const proofType = "vico-credential-lifecycle:v1";

export async function signCredentialProof(secret: string, claims: LifecycleClaims): Promise<string> {
  if (claims.phase !== "pending" || (claims.purpose !== "password-reset" && claims.purpose !== "password-create")) {
    throw new LifecycleStateInvariantError();
  }
  return signJWT({ proofType, ...claims }, secret, lifecycleProofTtlSeconds[claims.purpose]);
}

export async function decodeCredentialProof(
  secret: string, token: unknown, purpose: CredentialProofPurpose,
): Promise<LifecycleProof> {
  if (typeof token !== "string" || token.length > 2048 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new InvalidLifecycleProofError();
  }
  const claims = await verifyJWT<Record<string, unknown>>(token, secret);
  if (!claims || claims.proofType !== proofType || claims.purpose !== purpose || claims.phase !== "pending" ||
      typeof claims.userId !== "string" || typeof claims.generation !== "string" ||
      !Number.isSafeInteger(claims.exp)) {
    throw new InvalidLifecycleProofError();
  }
  return { token, userId: claims.userId, purpose, phase: "pending", generation: claims.generation };
}
