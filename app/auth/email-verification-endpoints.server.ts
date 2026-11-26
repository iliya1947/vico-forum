import { APIError, createAuthEndpoint, dispatchAuthEndpoint, formCsrfMiddleware,
  signUpEmail, sendVerificationEmail, verifyEmail, type AuthEndpoint } from "better-auth/api";
import { safeMailAddress, AuthMailValidationError } from "./auth-mail-contract.server";
import { verificationMailDestination } from "./auth-mail-urls.server";
import type { AuthEmailVerification } from "./email-verification.server";
import { LifecycleBudgetExceededError, type AuthLifecycleBudget } from "./lifecycle-budget.server";
import { InvalidLifecycleProofError } from "./lifecycle-state.server";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";
import type { SignupVerificationEvidence } from "./signup-verification-evidence.server";
import type { RegistrationChallengeAdmission } from "./registration-challenge-admission.server";
import type { VerificationAttemptOperation, VerificationAttemptCode } from "../observability/attempt-collector.server";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
// Keep the public endpoint types nameable through Better Auth's exported
// contract rather than leaking pnpm's transitive Zod installation path.
type SignupBody = ReturnType<typeof signUpEmail>["options"]["body"];
type ResendBody = ReturnType<typeof sendVerificationEmail.options.body.strict>;
type PickedToken = ReturnType<typeof verifyEmail.options.query.pick<{ token: true }>>;
type TokenSchema = ReturnType<PickedToken["strict"]>;
type PostOptions<Body> = {
  method: "POST"; operationId: string; body: Body;
  use: (typeof formCsrfMiddleware)[]; metadata: { noStore: true };
};
type SignupOptions = Omit<PostOptions<SignupBody>, "metadata"> & {
  cloneRequest: true;
  metadata: { noStore: true; allowedMediaTypes: string[] };
};
type InspectOptions = {
  method: "GET"; operationId: string; query: TokenSchema; metadata: { noStore: true };
};
type Acknowledgement = { status: boolean };
type SignupAcknowledgement = Acknowledgement & { token: null };
export type EmailVerificationEndpoints = {
  signUpEmail: AuthEndpoint<"/sign-up/email", SignupOptions, SignupAcknowledgement>;
  sendVerificationEmail: AuthEndpoint<"/send-verification-email", PostOptions<ResendBody>, Acknowledgement>;
  verifyEmail: AuthEndpoint<"/verify-email", PostOptions<TokenSchema>, Acknowledgement>;
  inspectEmailVerification: AuthEndpoint<"/inspect-email-verification", InspectOptions, Acknowledgement>;
};

const nativeSignup = signUpEmail();
const tokenSchema: TokenSchema = verifyEmail.options.query.pick({ token: true }).strict();

function publicEmail(value: string): string {
  const email = value.toLowerCase();
  if (!safeMailAddress(email)) throw new APIError("BAD_REQUEST", { message: "Invalid email address" }, privateHeaders);
  return email;
}

function destination(callback: string | undefined, baseURL: string) {
  try { return verificationMailDestination(callback, new URL(baseURL).origin); }
  catch (error) {
    if (error instanceof AuthMailValidationError) {
      throw new APIError("BAD_REQUEST", { message: "Invalid return destination" }, privateHeaders);
    }
    throw error;
  }
}

/** One canonical HTTP/direct plugin. Use the public native endpoint and its
 * own schema/CSRF/hash/admission/transaction; do not copy signup internals.
 */
export function emailVerificationEndpoints(
  service: AuthEmailVerification,
  budget: AuthLifecycleBudget,
  transaction: AuthLifecycleTransaction,
  evidence: SignupVerificationEvidence,
  unavailable: (error: unknown) => boolean,
  observeDirectFailure?: (operation: VerificationAttemptOperation, code: VerificationAttemptCode) => void,
  challenge?: RegistrationChallengeAdmission,
): EmailVerificationEndpoints {
  async function command<T>(work: () => Promise<T>, directOperation?: VerificationAttemptOperation): Promise<T> {
    try { return await work(); }
    catch (error) {
      if (directOperation) {
        const code = error instanceof LifecycleBudgetExceededError ? "rate-limited"
          : error instanceof InvalidLifecycleProofError ? "invalid"
          : unavailable(error) ? "unavailable" : "gap";
        try { observeDirectFailure?.(directOperation, code); } catch { /* passive observation */ }
      }
      if (error instanceof LifecycleBudgetExceededError) {
        const retry = String(error.retryAfterSeconds);
        throw new APIError("TOO_MANY_REQUESTS", { message: "Too many requests" },
          { ...privateHeaders, "Retry-After": retry, "X-Retry-After": retry });
      }
      if (error instanceof InvalidLifecycleProofError) {
        throw new APIError("BAD_REQUEST", { code: "INVALID_TOKEN", message: "Invalid or expired verification" }, privateHeaders);
      }
      if (unavailable(error)) {
        throw new APIError("SERVICE_UNAVAILABLE", { message: "Service unavailable" }, privateHeaders);
      }
      throw error;
    }
  }

  return {
    signUpEmail: createAuthEndpoint<"/sign-up/email", SignupOptions, SignupAcknowledgement>("/sign-up/email", {
      method: "POST",
      operationId: "signUpWithEmailAndPassword",
      body: nativeSignup.options.body,
      use: [formCsrfMiddleware],
      cloneRequest: true,
      metadata: { noStore: true, allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"] },
    }, async ctx => {
      for (const [key, value] of Object.entries(privateHeaders)) ctx.setHeader(key, value);
      return command(async () => {
        const email = publicEmail(ctx.body.email);
        const target = destination(ctx.body.callbackURL, ctx.context.baseURL);
        // The two independently committed admissions precede the identity
        // transaction. The mail scope remains open for the identical nested
        // issuance call (no double spend, no refund on a failed domain operation).
        await budget.run({ kind: "signup" }, async () => undefined);
        await budget.run({ kind: "mail", purpose: "email-verification", email }, async () => {
          const { registrationChallengeProof, ...body } = ctx.body;
          const signup = () => evidence.run(email, () => dispatchAuthEndpoint(nativeSignup, {
            context: ctx.context, body, headers: ctx.headers,
            request: ctx.request, method: "POST", asResponse: false,
          }));
          const created = challenge ? await challenge.email(email, registrationChallengeProof,
            async () => !!await ctx.context.internalAdapter.findUserByEmail(email), signup) : await signup();
          if (transaction.controlFailure) throw transaction.controlFailure;
          // Native dispatch returns only after its owned transaction completes.
          // A duplicate/denied/rolled-back signup cannot issue a proof.
          if (created) await service.issueForCommittedSignup(created.id, created.email, target);
        });
        // Identical acknowledgement for a new or existing email. No identity
        // DTO, verification bearer, or session is returned.
        return ctx.json({ status: true, token: null });
      });
    }),

    sendVerificationEmail: createAuthEndpoint<"/send-verification-email", PostOptions<ResendBody>, Acknowledgement>("/send-verification-email", {
      method: "POST", operationId: "sendVerificationEmail",
      body: sendVerificationEmail.options.body.strict(), use: [formCsrfMiddleware],
      metadata: { noStore: true },
    }, async ctx => {
      for (const [key, value] of Object.entries(privateHeaders)) ctx.setHeader(key, value);
      return command(async () => {
        const email = publicEmail(ctx.body.email);
        const target = destination(ctx.body.callbackURL, ctx.context.baseURL);
        // Retain the pinned native guest minimum response-time floor.
        // A real provider's variable latency is not a constant-time guarantee.
        const start = Date.now();
        await service.resend(email, target);
        const remaining = 500 - (Date.now() - start);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
        return ctx.json({ status: true });
      }, ctx.request ? undefined : "verification-send");
    }),

    // Replacing the core key closes the old state-changing GET for both
    // native routing and direct auth.api.verifyEmail dispatch.
    verifyEmail: createAuthEndpoint<"/verify-email", PostOptions<TokenSchema>, Acknowledgement>("/verify-email", {
      method: "POST", operationId: "verifyEmail",
      body: tokenSchema, use: [formCsrfMiddleware],
      metadata: { noStore: true },
    }, async ctx => {
      for (const [key, value] of Object.entries(privateHeaders)) ctx.setHeader(key, value);
      return command(async () => {
        await service.confirm(ctx.body.token, userId =>
          ctx.context.internalAdapter.updateUser(userId, { emailVerified: true }));
        return ctx.json({ status: true });
      }, ctx.request ? undefined : "email-verification");
    }),

    inspectEmailVerification: createAuthEndpoint<"/inspect-email-verification", InspectOptions, Acknowledgement>("/inspect-email-verification", {
      method: "GET", operationId: "inspectEmailVerification",
      query: tokenSchema, metadata: { noStore: true },
    }, async ctx => {
      for (const [key, value] of Object.entries(privateHeaders)) ctx.setHeader(key, value);
      return command(async () => {
        await service.inspect(ctx.query.token);
        return ctx.json({ status: true });
      });
    }),
  };
}
