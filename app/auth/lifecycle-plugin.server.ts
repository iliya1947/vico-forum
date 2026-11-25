import { credentialSignIn } from "./credential-sign-in.server";
import { AuthCredentialLifecycle, type CredentialTransition } from "./credential-lifecycle.server";
import { credentialLifecycleEndpoints, type CredentialLifecycleEndpoints } from "./credential-lifecycle-endpoints.server";
import type { BetterAuthPlugin } from "better-auth";
import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";
import { AuthLifecycleState } from "./lifecycle-state.server";
import { AuthLifecycleBudget } from "./lifecycle-budget.server";
import { RegistrationChallenge, type RegistrationChallengeConfig } from "./registration-challenge.server";
import type { AttemptIngressSource } from "../observability/attempt-source";
import { AuthEmailVerification, type VerificationFactObserver } from "./email-verification.server";
import type { OwnerOperationalFactSink } from "../observability/operational-facts";
import type { CredentialAttemptOperation, VerificationAttemptOperation, VerificationAttemptCode } from "../observability/attempt-collector.server";
import type { AuthMailRuntime } from "./auth-mail.server";
import { emailVerificationEndpoints, type EmailVerificationEndpoints } from "./email-verification-endpoints.server";
import type { SignupVerificationEvidence } from "./signup-verification-evidence.server";

export type AuthLifecycleDependencies = Readonly<{
  ingress?: AttemptIngressSource;
  registrationChallenge?: RegistrationChallengeConfig;
  mail?: AuthMailRuntime;
  observeVerified?: VerificationFactObserver;
  observeCredential?: (transition: CredentialTransition) => void;
  mailObservations?: OwnerOperationalFactSink;
  observeVerificationDirectFailure?: (operation: VerificationAttemptOperation | CredentialAttemptOperation, code: VerificationAttemptCode) => void;
}>;

type LifecyclePlugin = {
  id: "vico-auth-lifecycle";
  endpoints: EmailVerificationEndpoints & CredentialLifecycleEndpoints & { signInEmail: ReturnType<typeof credentialSignIn> };
  init: () => { context: {
    vicoAuthLifecycle: AuthLifecycleState;
    vicoAuthBudget: AuthLifecycleBudget;
    vicoRegistrationChallenge: RegistrationChallenge;
    vicoEmailVerification: AuthEmailVerification;
  } };
};

/** The single canonical server extension. Verification endpoints share this
 * request-local state, budget and transaction owner.
 */
export function authLifecyclePlugin(client: Pick<Client, "query">,
  transaction: AuthLifecycleTransaction, secret: string, evidence: SignupVerificationEvidence,
  unavailable: (error: unknown) => boolean, dependencies?: AuthLifecycleDependencies,
  onActorStateError?: (error: unknown) => void): LifecyclePlugin {
  const state = new AuthLifecycleState(client, transaction);
  const budget = new AuthLifecycleBudget(client, transaction, secret, dependencies?.ingress);
  const challenge = new RegistrationChallenge(dependencies?.registrationChallenge);
  const emailVerification = new AuthEmailVerification(client, transaction, state, budget, secret,
    dependencies?.mail, dependencies?.observeVerified, dependencies?.mailObservations);
  const credentials = new AuthCredentialLifecycle(client, transaction, state, budget, secret);
  return {
    id: "vico-auth-lifecycle",
    endpoints: {
      signInEmail: credentialSignIn(client, transaction, onActorStateError),
      ...emailVerificationEndpoints(emailVerification, budget, transaction, evidence, unavailable,
        dependencies?.observeVerificationDirectFailure),
      ...credentialLifecycleEndpoints(credentials, unavailable, dependencies?.mail, dependencies?.observeCredential,
        dependencies?.observeVerificationDirectFailure),
    },
    init: () => ({ context: { vicoAuthLifecycle: state, vicoAuthBudget: budget,
      vicoRegistrationChallenge: challenge, vicoEmailVerification: emailVerification } }),
  } satisfies BetterAuthPlugin;
}
