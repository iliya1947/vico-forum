import { addOAuthServerContext, APIError, callbackOAuth, createAuthEndpoint, dispatchAuthEndpoint,
  signInSocial, type AuthEndpoint } from "better-auth/api";
import type { AuthLifecycleBudget } from "./lifecycle-budget.server";
import { LifecycleBudgetExceededError } from "./lifecycle-budget.server";
import { REGISTRATION_CHALLENGE_CONTEXT, type RegistrationChallengeAdmission } from "./registration-challenge-admission.server";

type Social = ReturnType<typeof signInSocial>;
type Callback = typeof callbackOAuth;
type SocialResult = Social extends AuthEndpoint<"/sign-in/social", Social["options"], infer R> ? R : never;
const native = signInSocial();
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export function registrationOAuthEndpoints(budget: AuthLifecycleBudget, challenge: RegistrationChallengeAdmission,
  unavailable: (error: unknown) => boolean): { signInSocial: Social; callbackOAuth: Callback } {
  function failure(error: unknown): never {
    if (error instanceof LifecycleBudgetExceededError) {
      const retry = String(error.retryAfterSeconds);
      throw new APIError("TOO_MANY_REQUESTS", { message: "Too many requests" },
        { ...headers, "Retry-After": retry, "X-Retry-After": retry });
    }
    if (unavailable(error)) throw new APIError("SERVICE_UNAVAILABLE", { message: "Service unavailable" }, headers);
    if (error instanceof APIError && error.body?.code === "vico_registration_challenge_unavailable") {
      throw new APIError("SERVICE_UNAVAILABLE", { code: "vico_registration_challenge_unavailable", message: "Registration unavailable" }, headers);
    }
    throw error;
  }

  return {
    signInSocial: createAuthEndpoint<Social["path"], Social["options"], SocialResult>(native.path, native.options, async ctx => {
      for (const [key, value] of Object.entries(headers)) ctx.setHeader(key, value);
      const { registrationChallengeProof, ...additionalData } = ctx.body.additionalData ?? {};
      // Remove the raw exchange before native state generation. Native serverContext
      // is the public trusted seam and overrides any client additionalData key.
      return challenge.google(registrationChallengeProof, async receipt => {
        if (receipt && !ctx.body.idToken) await addOAuthServerContext({ [REGISTRATION_CHALLENGE_CONTEXT]: receipt });
        let admissionFailure: { error: unknown } | undefined;
        const adapter = ctx.context.adapter;
        const guarded = new Proxy(adapter, { get(target, key, receiver) {
          const value = Reflect.get(target, key, receiver);
          if (key !== "transaction" || typeof value !== "function") return value;
          return async (...args: unknown[]) => {
            let admitted = false;
            try { return await budget.run({ kind: "signup" }, async () => { admitted = true; return Reflect.apply(value, target, args); }); }
            catch (error) { if (!admitted) admissionFailure = { error }; throw error; }
          };
        } });
        try {
          const result = await dispatchAuthEndpoint(native, { ...ctx, body: { ...ctx.body, additionalData },
            context: { ...ctx.context, adapter: guarded }, asResponse: false, returnHeaders: true }) as { response: SocialResult; headers: Headers };
          if (admissionFailure) failure(admissionFailure.error);
          result.headers.forEach((value, key) => ctx.responseHeaders.append(key, value));
          return ctx.json(result.response);
        } catch (error) { return failure(admissionFailure?.error ?? error); }
      });
    }),
    callbackOAuth: createAuthEndpoint<Callback["path"], Callback["options"], never>(callbackOAuth.path, callbackOAuth.options, async ctx => {
      for (const [key, value] of Object.entries(headers)) ctx.setHeader(key, value);
      let admissionFailure: { error: unknown } | undefined;
      const adapter = ctx.context.adapter;
      const guarded = new Proxy(adapter, { get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        if (key !== "transaction" || typeof value !== "function") return value;
        return async (...args: unknown[]) => {
          let admitted = false;
          try { return await budget.run({ kind: "signup" }, async () => { admitted = true; return Reflect.apply(value, target, args); }); }
          catch (error) { if (!admitted) admissionFailure = { error }; throw error; }
        };
      } });
      try {
        await dispatchAuthEndpoint(callbackOAuth, { ...ctx, context: { ...ctx.context, adapter: guarded },
          asResponse: false, returnHeaders: true });
        if (admissionFailure) failure(admissionFailure.error);
        throw new Error("Native OAuth callback did not redirect");
      } catch (error) { return failure(admissionFailure?.error ?? error); }
    }),
  };
}
