import { signJWT, verifyJWT } from "better-auth/crypto";
import {
  InvalidLifecycleProofError, LifecycleStateInvariantError, lifecycleProofTtlSeconds,
  type LifecycleClaims, type LifecycleProof,
} from "./lifecycle-state.server";

const proofType = "vico-email-verification:v1";

/** Use the pinned Better Auth signing primitive. Bind the token to immutable
 * subject/current generation, not an email lookup or an ambient session.
 * Persisted state additionally binds the digest and locked email snapshot.
 */
export async function signEmailVerificationProof(secret: string, claims: LifecycleClaims): Promise<string> {
  if (claims.purpose !== "email-verification" || claims.phase !== "pending") {
    throw new LifecycleStateInvariantError();
  }
  return signJWT({ proofType, userId: claims.userId, purpose: claims.purpose,
    phase: claims.phase, generation: claims.generation }, secret,
  lifecycleProofTtlSeconds["email-verification"]);
}

/** Signed claims are not proof of current state. GET inspection and POST
 * consumption must both validate the persisted operation under AccountState.
 */
export async function decodeEmailVerificationProof(secret: string, token: unknown): Promise<LifecycleProof> {
  if (typeof token !== "string" || token.length > 2048 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new InvalidLifecycleProofError();
  }
  const claims = await verifyJWT<Record<string, unknown>>(token, secret);
  if (!claims || claims.proofType !== proofType || claims.purpose !== "email-verification" ||
      claims.phase !== "pending" || typeof claims.userId !== "string" ||
      typeof claims.generation !== "string" ||
      !Number.isSafeInteger(claims.exp)) {
    throw new InvalidLifecycleProofError();
  }
  return { token, userId: claims.userId, purpose: "email-verification",
    phase: "pending", generation: claims.generation };
}
