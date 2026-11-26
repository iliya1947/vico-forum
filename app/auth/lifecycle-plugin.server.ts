import { AccountSecurityLifecycle, type AccountLifecycleTransition } from "./account-security-lifecycle.server";
import { accountSecurityEndpoints, type AccountSecurityEndpoints } from "./account-security-endpoints.server";
import { credentialChangePassword, credentialSignIn } from "./credential-auth-endpoints.server";
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
  googleEnabled?: boolean;
  observeAccount?: (transition: AccountLifecycleTransition) => void;
  registrationChallenge?: RegistrationChallengeConfig;
  mail?: AuthMailRuntime;
  observeVerified?: VerificationFactObserver;
  observeCredential?: (transition: CredentialTransition) => void;
  mailObservations?: OwnerOperationalFactSink;
  observeVerificationDirectFailure?: (operation: VerificationAttemptOperation | CredentialAttemptOperation, code: VerificationAttemptCode) => void;
}>;

type LifecyclePlugin = {
  id: "vico-auth-lifecycle";
  endpoints: EmailVerificationEndpoints & CredentialLifecycleEndpoints & AccountSecurityEndpoints & {
    signInEmail: ReturnType<typeof credentialSignIn>;
    changePassword: ReturnType<typeof credentialChangePassword>;
  };
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
  const account = new AccountSecurityLifecycle(client, state, budget, secret, dependencies?.googleEnabled ?? false);
  return {
    id: "vico-auth-lifecycle",
    endpoints: {
      ...accountSecurityEndpoints(account, unavailable, dependencies?.mail, dependencies?.mailObservations, dependencies?.observeAccount,
        dependencies?.observeVerificationDirectFailure),
      signInEmail: credentialSignIn(client, transaction, onActorStateError),
      changePassword: credentialChangePassword(client, transaction, state, onActorStateError),
      ...emailVerificationEndpoints(emailVerification, budget, transaction, evidence, unavailable,
        dependencies?.observeVerificationDirectFailure),
      ...credentialLifecycleEndpoints(credentials, unavailable, dependencies?.mail, dependencies?.observeCredential,
        dependencies?.observeVerificationDirectFailure, dependencies?.mailObservations),
    },
    init: () => ({ context: { vicoAuthLifecycle: state, vicoAuthBudget: budget,
      vicoRegistrationChallenge: challenge, vicoEmailVerification: emailVerification } }),
  } satisfies BetterAuthPlugin;
}
