import { APIError, changeEmail, createAuthEndpoint, formCsrfMiddleware, getSessionFromCtx,
  unlinkAccount, verifyEmail, type AuthEndpoint } from "better-auth/api";
import { AuthMailValidationError } from "./auth-mail-contract.server";
import type { VerificationAttemptCode } from "../observability/attempt-collector.server";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { AccountMethodConflictError, type AccountLifecycleTransition, type AccountSecurityLifecycle } from "./account-security-lifecycle.server";
import { InvalidLifecycleProofError } from "./lifecycle-state.server";
import { LifecycleBudgetExceededError } from "./lifecycle-budget.server";
import { deliverLifecycleMail, type AuthMailRuntime } from "./auth-mail.server";
import { verificationMailDestination } from "./auth-mail-urls.server";
import type { OwnerOperationalFactSink } from "../observability/operational-facts";

type EmailBody = ReturnType<typeof changeEmail.options.body.strict>;
type UnlinkBody = ReturnType<typeof unlinkAccount.options.body.strict>;
type TokenPick = ReturnType<typeof verifyEmail.options.query.pick<{ token: true; callbackURL: true }>>;
type TokenBody = ReturnType<TokenPick["strict"]>;
type Post<Body> = { method: "POST"; operationId: string; body: Body; use: (typeof formCsrfMiddleware)[] };
type Ack = { status: boolean };
export type AccountSecurityEndpoints = {
  changeEmail: AuthEndpoint<"/change-email", Post<EmailBody>, Ack>;
  confirmEmailChange: AuthEndpoint<"/confirm-email-change", Post<TokenBody>, Ack>;
  unlinkAccount: AuthEndpoint<"/unlink-account", Post<UnlinkBody>, Ack>;
};
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export function accountSecurityEndpoints(service: AccountSecurityLifecycle, unavailable: (error: unknown) => boolean,
  mail?: AuthMailRuntime, sink?: OwnerOperationalFactSink,
  observe?: (transition: AccountLifecycleTransition) => void,
  observeAttempt?: (operation: "email-change" | "unlink-account", code: VerificationAttemptCode) => void): AccountSecurityEndpoints {
  async function run<T>(ctx: Parameters<typeof getSessionFromCtx>[0], operation: "email-change" | "unlink-account", work: () => Promise<T>): Promise<T> {
    for (const [key, value] of Object.entries(headers)) ctx.setHeader(key, value);
    try { return await work(); }
    catch (error) {
      if (!ctx.request) {
        const code = error instanceof LifecycleBudgetExceededError ? "rate-limited" : unavailable(error) ? "unavailable"
          : error instanceof APIError || error instanceof InvalidLifecycleProofError || error instanceof AccountMethodConflictError ||
            error instanceof AccountMissingError || error instanceof AccountInactiveError || error instanceof AuthMailValidationError ? "invalid" : "gap";
        try { observeAttempt?.(operation, code); } catch { /* Passive recording. */ }
      }
      if (error instanceof AccountMethodConflictError) throw new APIError("CONFLICT", { message: "Account operation unavailable" }, headers);
      if (error instanceof AccountMissingError || error instanceof AccountInactiveError) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, headers);
      if (error instanceof InvalidLifecycleProofError || error instanceof AuthMailValidationError) throw new APIError("BAD_REQUEST", { message: "Invalid or expired request" }, headers);
      if (error instanceof LifecycleBudgetExceededError) throw new APIError("TOO_MANY_REQUESTS", { message: "Too many requests" },
        { ...headers, "Retry-After": String(error.retryAfterSeconds) });
      if (unavailable(error)) throw new APIError("SERVICE_UNAVAILABLE", { message: "Service unavailable" }, headers);
      throw error;
    }
  }
  async function actor(ctx: Parameters<typeof getSessionFromCtx>[0]) {
    const current = await getSessionFromCtx({ ...ctx, context: { ...ctx.context, session: null } },
      { disableCookieCache: true, disableRefresh: true });
    if (!current) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, headers);
    if (ctx.headers?.get("x-vico-account-user") !== current.user.id ||
      ctx.headers?.get("x-vico-account-session") !== current.session.id) throw new APIError("CONFLICT", { message: "Account changed" }, headers);
    return { userId: current.user.id, sessionId: current.session.id, freshAgeSeconds: ctx.context.sessionConfig.freshAge };
  }
  function publish(transition: AccountLifecycleTransition) {
    try { observe?.(transition); } catch { /* Passive reporting after proven commit. */ }
  }
  return {
    changeEmail: createAuthEndpoint<"/change-email", Post<EmailBody>, Ack>("/change-email", {
      method: "POST", operationId: "changeEmail", use: [formCsrfMiddleware], body: changeEmail.options.body.strict(),
    }, ctx => run(ctx, "email-change", async () => {
      const current = await actor(ctx);
      const destination = verificationMailDestination(ctx.body.callbackURL, new URL(ctx.context.baseURL).origin);
      const proof = await service.requestEmailChange(current, ctx.body.newEmail);
      await deliverLifecycleMail(mail, sink, proof, "email-change-confirmation", destination);
      return ctx.json({ status: true });
    })),
    confirmEmailChange: createAuthEndpoint<"/confirm-email-change", Post<TokenBody>, Ack>("/confirm-email-change", {
      method: "POST", operationId: "confirmEmailChange", use: [formCsrfMiddleware],
      body: verifyEmail.options.query.pick({ token: true, callbackURL: true }).strict(),
    }, ctx => run(ctx, "email-change", async () => {
      const destination = verificationMailDestination(ctx.body.callbackURL, new URL(ctx.context.baseURL).origin);
      const result = await service.confirmEmailChange(await actor(ctx), ctx.body.token);
      if ("proof" in result) await deliverLifecycleMail(mail, sink, result.proof, "email-change-verification", destination);
      else publish(result.transition);
      return ctx.json({ status: true });
    })),
    unlinkAccount: createAuthEndpoint<"/unlink-account", Post<UnlinkBody>, Ack>("/unlink-account", {
      method: "POST", operationId: "unlinkAccount", use: [formCsrfMiddleware], body: unlinkAccount.options.body.strict(),
    }, ctx => run(ctx, "unlink-account", async () => {
      publish(await service.unlinkGoogle(await actor(ctx), ctx.body.accountId));
      return ctx.json({ status: true });
    })),
  };
}
