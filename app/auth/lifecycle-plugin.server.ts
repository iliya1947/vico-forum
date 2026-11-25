import type { BetterAuthPlugin } from "better-auth";
import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";
import { AuthLifecycleState } from "./lifecycle-state.server";
import { AuthLifecycleBudget } from "./lifecycle-budget.server";
import { RegistrationChallenge, type RegistrationChallengeConfig } from "./registration-challenge.server";
import type { AttemptIngressSource } from "../observability/attempt-source";
import { AuthEmailVerification } from "./email-verification.server";
import type { AuthMailRuntime } from "./auth-mail.server";

export type AuthLifecycleDependencies = Readonly<{
  ingress?: AttemptIngressSource;
  registrationChallenge?: RegistrationChallengeConfig;
  mail?: AuthMailRuntime;
}>;

/** The single canonical server extension. Verification endpoints share this
 * request-local state, budget and transaction owner.
 */
export function authLifecyclePlugin(client: Pick<Client, "query">,
  transaction: AuthLifecycleTransaction, secret: string, dependencies?: AuthLifecycleDependencies) {
  const state = new AuthLifecycleState(client, transaction);
  const budget = new AuthLifecycleBudget(client, transaction, secret, dependencies?.ingress);
  const challenge = new RegistrationChallenge(dependencies?.registrationChallenge);
  const emailVerification = new AuthEmailVerification(client, transaction, state, budget, secret, dependencies?.mail);
  return {
    id: "vico-auth-lifecycle",
    init: () => ({ context: { vicoAuthLifecycle: state, vicoAuthBudget: budget,
      vicoRegistrationChallenge: challenge, vicoEmailVerification: emailVerification } }),
  } satisfies BetterAuthPlugin;
}
