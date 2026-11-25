import type { BetterAuthPlugin } from "better-auth";
import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";
import { AuthLifecycleState } from "./lifecycle-state.server";
import { AuthLifecycleBudget } from "./lifecycle-budget.server";
import { RegistrationChallenge, type RegistrationChallengeConfig } from "./registration-challenge.server";
import type { AttemptIngressSource } from "../observability/attempt-source";

export type AuthLifecycleDependencies = Readonly<{
  ingress?: AttemptIngressSource;
  registrationChallenge?: RegistrationChallengeConfig;
}>;

/** The single canonical server extension; no endpoint is registered in AUTH-02a.
 * Future endpoint replacements share this request-local state/transaction owner.
 */
export function authLifecyclePlugin(client: Pick<Client, "query">,
  transaction: AuthLifecycleTransaction, secret: string, dependencies?: AuthLifecycleDependencies) {
  const state = new AuthLifecycleState(client, transaction);
  const budget = new AuthLifecycleBudget(client, transaction, secret, dependencies?.ingress);
  const challenge = new RegistrationChallenge(dependencies?.registrationChallenge);
  return {
    id: "vico-auth-lifecycle",
    init: () => ({ context: { vicoAuthLifecycle: state, vicoAuthBudget: budget, vicoRegistrationChallenge: challenge } }),
  } satisfies BetterAuthPlugin;
}
