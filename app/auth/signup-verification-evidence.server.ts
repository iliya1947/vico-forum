import { AsyncLocalStorage } from "node:async_hooks";
import { APIError } from "better-auth/api";
import { LifecycleStateInvariantError } from "./lifecycle-state.server";

type Created = Readonly<{ id: string; email: string }>;
type Frame = {
  readonly email: string;
  open: boolean;
  admitted: boolean;
  denied?: string;
  failure?: { error: unknown };
  created?: Created;
  inconsistent?: boolean;
};

/** Actual native provisioning evidence, independent of optional telemetry.
 * The scope exists only while our canonical signup wrapper calls the pinned
 * native endpoint. The native email callback only records data, never sends.
 */
export class SignupVerificationEvidence {
  private readonly scope = new AsyncLocalStorage<Frame>();

  noteAdmission(result: unknown): void {
    const frame = this.scope.getStore();
    if (!frame?.open) return;
    if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
      frame.denied = result.error;
    } else {
      frame.admitted = true;
    }
  }

  noteAdmissionFailure(error: unknown): void {
    const frame = this.scope.getStore();
    if (frame?.open) frame.failure = { error };
  }

  noteCreated(user: { id: string; email: string; emailVerified: boolean }): void {
    const frame = this.scope.getStore();
    if (!frame?.open) return;
    if (frame.created || !frame.admitted || frame.denied || frame.failure ||
        typeof user.id !== "string" || !user.id || user.email !== frame.email || user.emailVerified !== false) {
      frame.inconsistent = true;
      return;
    }
    frame.created = { id: user.id, email: user.email };
  }

  async run(email: string, nativeSignup: () => Promise<unknown>): Promise<Created | null> {
    if (this.scope.getStore()) throw new LifecycleStateInvariantError();
    const frame: Frame = { email, open: true, admitted: false };
    return this.scope.run(frame, async () => {
      try {
        let result: unknown;
        try { result = await nativeSignup(); }
        catch (error) { throw frame.failure ? frame.failure.error : error; }
        // Native mandatory-verification signup can synthesize an HTTP success
        // for a policy denial. Never confuse that with a real created user.
        if (frame.failure) throw frame.failure.error;
        if (frame.denied) {
          if (frame.denied === "vico_registration_challenge_unavailable") {
            throw new APIError("SERVICE_UNAVAILABLE", { code: frame.denied, message: "Registration unavailable" });
          }
          throw new APIError("FORBIDDEN", { code: frame.denied, message: "Registration unavailable" });
        }
        if (!result || typeof result !== "object" || !("token" in result) || result.token !== null ||
            frame.inconsistent || frame.admitted !== !!frame.created) throw new LifecycleStateInvariantError();
        // A native duplicate does not invoke the provisioning gate or the
        // callback. Its synthetic user DTO is deliberately not used.
        if (!frame.created) return null;
        const user = "user" in result ? result.user : undefined;
        if (!user || typeof user !== "object" || !("id" in user) || user.id !== frame.created.id) {
          throw new LifecycleStateInvariantError();
        }
        return frame.created;
      } finally { frame.open = false; }
    });
  }
}
