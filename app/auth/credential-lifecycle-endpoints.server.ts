import {
  APIError, createAuthEndpoint, formCsrfMiddleware, getSessionFromCtx,
  requestPasswordReset, requestPasswordResetCallback, resetPassword, type AuthEndpoint,
} from "better-auth/api";
import { verificationMailDestination } from "./auth-mail-urls.server";
import { AuthMailValidationError, safeMailAddress } from "./auth-mail-contract.server";
import { deliverLifecycleMail, type AuthMailRuntime } from "./auth-mail.server";
import { CredentialAlreadySetError, type AuthCredentialLifecycle, type CredentialTransition } from "./credential-lifecycle.server";
import type { IssuedLifecycleProof } from "./lifecycle-state.server";
import { InvalidLifecycleProofError } from "./lifecycle-state.server";
import { AccountMissingError, AccountInactiveError } from "../../db/account-state";
import type { OwnerOperationalFactSink } from "../observability/operational-facts";
import type { CredentialAttemptOperation, VerificationAttemptCode } from "../observability/attempt-collector.server";
import { LifecycleBudgetExceededError } from "./lifecycle-budget.server";
import { readOwnSession } from "./own-session.server";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
type ResetRequest = ReturnType<typeof requestPasswordReset.options.body.strict>;
type SetCredential = ReturnType<typeof resetPassword.options.body.strict>;
type DestinationPick = ReturnType<typeof requestPasswordReset.options.body.pick<{ redirectTo: true }>>;
type DestinationBody = ReturnType<DestinationPick["strict"]>;
type Post<Body> = { method: "POST"; operationId: string; body: Body; use: (typeof formCsrfMiddleware)[] };
type Acknowledgement = { status: boolean };
export type CredentialLifecycleEndpoints = {
  requestPasswordResetCallback: typeof requestPasswordResetCallback;
  requestPasswordReset: AuthEndpoint<"/request-password-reset", Post<ResetRequest>, Acknowledgement>;
  resetPassword: AuthEndpoint<"/reset-password", Post<SetCredential>, Acknowledgement>;
  requestCredentialCreation: AuthEndpoint<"/request-password-create", Post<DestinationBody>, Acknowledgement>;
  createCredential: AuthEndpoint<"/create-password", Post<SetCredential>, Acknowledgement>;
};

async function command<T>(work: () => Promise<T>, unavailable: (error: unknown) => boolean): Promise<T> {
  try { return await work(); }
  catch (error) {
    if (error instanceof CredentialAlreadySetError) {
      throw new APIError("CONFLICT", { message: "A password is already set" }, privateHeaders);
    }
    if (error instanceof AccountMissingError || error instanceof AccountInactiveError) {
      throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, privateHeaders);
    }
    if (error instanceof InvalidLifecycleProofError || error instanceof AuthMailValidationError) {
      throw new APIError("BAD_REQUEST", { message: "Invalid or expired credential operation" }, privateHeaders);
    }
    if (error instanceof LifecycleBudgetExceededError) {
      const retry = String(error.retryAfterSeconds);
      throw new APIError("TOO_MANY_REQUESTS", { message: "Too many requests" },
        { ...privateHeaders, "Retry-After": retry, "X-Retry-After": retry });
    }
    if (unavailable(error)) {
      throw new APIError("SERVICE_UNAVAILABLE", { message: "Service unavailable" }, privateHeaders);
    }
    throw error;
  }
}

function protect(ctx: { setHeader: (key: string, value: string) => void }): void {
  for (const [key, value] of Object.entries(privateHeaders)) ctx.setHeader(key, value);
}

export function credentialLifecycleEndpoints(service: AuthCredentialLifecycle,
  unavailable: (error: unknown) => boolean, mail?: AuthMailRuntime,
  observe?: (transition: CredentialTransition) => void,
  observeAttempt?: (operation: CredentialAttemptOperation, code: VerificationAttemptCode) => void,
  mailObservations?: OwnerOperationalFactSink): CredentialLifecycleEndpoints {
  async function run<T>(request: Request | undefined, operation: CredentialAttemptOperation, work: () => Promise<T>): Promise<T> {
    try { return await command(work, unavailable); }
    catch (error) {
      if (!request && observeAttempt) {
        const status = error instanceof APIError ? error.statusCode : 500;
        const code = status === 429 ? "rate-limited" : status === 503 ? "unavailable"
          : status >= 400 && status < 500 ? "invalid" : "gap";
        try { observeAttempt(operation, code); } catch { /* Best effort. */ }
      }
      throw error;
    }
  }

  async function deliver(proof: IssuedLifecycleProof | null, purpose: "password-reset" | "password-create",
    destination: ReturnType<typeof verificationMailDestination>): Promise<void> {
    if (proof) await deliverLifecycleMail(mail, mailObservations, proof, purpose, destination);
  }

  async function actor(ctx: Parameters<typeof getSessionFromCtx>[0]) {
    const current = await readOwnSession(ctx);
    if (!current) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, privateHeaders);
    if (ctx.headers?.get("x-vico-credential-user") !== current.user.id ||
      ctx.headers?.get("x-vico-credential-session") !== current.session.id) {
      throw new APIError("CONFLICT", { message: "Account or session changed" }, privateHeaders);
    }
    return { userId: current.user.id, sessionId: current.session.id, email: current.user.email,
      freshAgeSeconds: ctx.context.sessionConfig.freshAge };
  }

  function publish(transition: CredentialTransition): void {
    try { observe?.(transition); } catch { /* Best effort after commit. */ }
  }

  return {
    requestPasswordResetCallback: createAuthEndpoint<"/reset-password/:token", typeof requestPasswordResetCallback.options, never>(
      requestPasswordResetCallback.path, requestPasswordResetCallback.options,
      () => { throw new APIError("NOT_FOUND", { message: "Not Found" }, privateHeaders); }),
    requestPasswordReset: createAuthEndpoint<"/request-password-reset", Post<ResetRequest>, Acknowledgement>(
      "/request-password-reset", { method: "POST", operationId: "requestPasswordReset",
        use: [formCsrfMiddleware], body: requestPasswordReset.options.body.strict() },
      ctx => {
        protect(ctx);
        return run(ctx.request, "password-reset-request", async () => {
          const email = ctx.body.email.toLowerCase();
          if (!safeMailAddress(email)) throw new AuthMailValidationError();
          const destination = verificationMailDestination(ctx.body.redirectTo, new URL(ctx.context.baseURL).origin);
          const started = Date.now();
          await deliver(await service.requestReset(email, ctx.context.internalAdapter.createVerificationValue), "password-reset", destination);
          const wait = 500 - (Date.now() - started);
          if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
          return ctx.json({ status: true });
        });
      }),
    resetPassword: createAuthEndpoint<"/reset-password", Post<SetCredential>, Acknowledgement>(
      "/reset-password", { method: "POST", operationId: "resetPassword",
        use: [formCsrfMiddleware], body: resetPassword.options.body.strict() },
      ctx => {
        protect(ctx);
        return run(ctx.request, "password-reset", async () => {
          publish(await service.reset(ctx.body.token, ctx.body.newPassword, ctx.context.password.hash));
          return ctx.json({ status: true });
        });
      }),
    requestCredentialCreation: createAuthEndpoint<"/request-password-create", Post<DestinationBody>, Acknowledgement>(
      "/request-password-create", { method: "POST", operationId: "requestCredentialCreation",
        use: [formCsrfMiddleware], body: requestPasswordReset.options.body.pick({ redirectTo: true }).strict() },
      ctx => {
        protect(ctx);
        return run(ctx.request, "password-create", async () => {
          const current = await actor(ctx);
          const destination = verificationMailDestination(ctx.body.redirectTo, new URL(ctx.context.baseURL).origin);
          await deliver(await service.requestCreation(current, current.email), "password-create", destination);
          return ctx.json({ status: true });
        });
      }),
    createCredential: createAuthEndpoint<"/create-password", Post<SetCredential>, Acknowledgement>(
      "/create-password", { method: "POST", operationId: "createCredential",
        use: [formCsrfMiddleware], body: resetPassword.options.body.strict() },
      ctx => {
        protect(ctx);
        return run(ctx.request, "password-create", async () => {
          publish(await service.create(await actor(ctx), ctx.body.token, ctx.body.newPassword, ctx.context.password.hash));
          return ctx.json({ status: true });
        });
      }),
  };
}
