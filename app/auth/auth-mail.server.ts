import { createContext } from "react-router";
import { OperationalFactBuffer, type AuthMailObservation, type OwnerOperationalFactSink } from "../observability/operational-facts";
import type { IssuedLifecycleProof } from "./lifecycle-state.server";
import { localeRegistry, type LocaleRegistry } from "../localization/registry";
import type { TranslationResourceLoader } from "../localization/resource-loader";
import {
  AuthMailValidationError, isMailPurpose, safeMailAddress, safeMailOperationId,
  type AuthMailExecution, type AuthMailFetch, type AuthMailInput, type AuthMailResult, type AuthMailStatus, type AuthMailTransport,
} from "./auth-mail-contract.server";
import { authMailLocale, authMailOrigin, buildAuthMailActionURL, validateAuthMailActionURL, type AuthMailAction } from "./auth-mail-urls.server";
import { renderAuthMail } from "./auth-mail-templates.server";
import { createBrevoAuthMailTransport, createResendAuthMailTransport } from "./auth-mail-transports.server";

export interface AuthMailEnvironment {
  readonly BETTER_AUTH_URL?: string;
  readonly AUTH_MAIL_MODE?: string;
  readonly AUTH_MAIL_PROVIDER?: string;
  readonly AUTH_MAIL_FROM_ADDRESS?: string;
  readonly AUTH_MAIL_FROM_NAME?: string;
  readonly AUTH_MAIL_RESEND_KEY?: string;
  readonly AUTH_MAIL_BREVO_KEY?: string;
  readonly AUTH_MAIL_TIMEOUT_MS?: string;
}
export interface AuthMailLocalization {
  readonly registry: LocaleRegistry;
  readonly resources: Pick<TranslationResourceLoader, "load">;
}
export interface AuthMailDependencies {
  readonly execution: AuthMailExecution;
  readonly localization: () => Promise<AuthMailLocalization>;
  readonly fakeTransport?: AuthMailTransport;
  /** Local/CI fixture only. External activation is deliberately absent in AUTH-01. */
  readonly providerFetch?: AuthMailFetch;
}
export type InvokedAuthMailTransport = "none" | "unknown" | "fake" | "resend" | "brevo";
export interface AuthMailRuntime {
  sendAuthMail(input: AuthMailInput, observeTransport?: (transport: InvokedAuthMailTransport) => void): Promise<AuthMailResult>;
  buildActionURL(action: AuthMailAction): Promise<string>;
}

export const authMailRuntimeContext = createContext<AuthMailRuntime>();

/** Lazy per-request capability: construction performs no I/O or auth mutation. */
export function createAuthMailRuntime(env: AuthMailEnvironment, dependencies: AuthMailDependencies): AuthMailRuntime {
  // Keep only mail-owned configuration, never snapshot unrelated Worker bindings.
  const config: AuthMailEnvironment = {
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    AUTH_MAIL_MODE: env.AUTH_MAIL_MODE,
    AUTH_MAIL_PROVIDER: env.AUTH_MAIL_PROVIDER,
    AUTH_MAIL_FROM_ADDRESS: env.AUTH_MAIL_FROM_ADDRESS,
    AUTH_MAIL_FROM_NAME: env.AUTH_MAIL_FROM_NAME,
    AUTH_MAIL_RESEND_KEY: env.AUTH_MAIL_RESEND_KEY,
    AUTH_MAIL_BREVO_KEY: env.AUTH_MAIL_BREVO_KEY,
    AUTH_MAIL_TIMEOUT_MS: env.AUTH_MAIL_TIMEOUT_MS,
  };
  const { execution, localization, fakeTransport, providerFetch } = dependencies;
  const origin = () => authMailOrigin(config.BETTER_AUTH_URL ?? "", execution);
  const selected = (): AuthMailTransport | AuthMailResult => {
    const mode = config.AUTH_MAIL_MODE ?? "disabled";
    if (mode === "disabled") return { status: "disabled" };
    if (mode !== "fake" && mode !== "provider") return { status: "rejected" };
    // Hard Stage-6 activation fence. Environment variables/keys cannot enable egress.
    if (execution !== "local" && execution !== "test") return { status: "disabled" };
    if (mode === "fake") return fakeTransport ?? { status: "unavailable" };
    if (!providerFetch) return { status: "disabled" };
    if (config.AUTH_MAIL_PROVIDER !== "resend" && config.AUTH_MAIL_PROVIDER !== "brevo") return { status: "rejected" };
    const timeout = config.AUTH_MAIL_TIMEOUT_MS;
    if (timeout !== undefined && !/^\d{1,5}$/.test(timeout)) return { status: "rejected" };
    const providerConfig = {
      senderAddress: config.AUTH_MAIL_FROM_ADDRESS ?? "",
      senderName: config.AUTH_MAIL_FROM_NAME ?? "Vico Forum",
      apiKey: (config.AUTH_MAIL_PROVIDER === "resend" ? config.AUTH_MAIL_RESEND_KEY : config.AUTH_MAIL_BREVO_KEY) ?? "",
      timeoutMs: timeout === undefined ? 5000 : Number(timeout),
    };
    return config.AUTH_MAIL_PROVIDER === "resend"
      ? createResendAuthMailTransport(providerConfig, providerFetch)
      : createBrevoAuthMailTransport(providerConfig, providerFetch);
  };
  return {
    async buildActionURL(action) {
      const { registry } = await localization();
      return buildAuthMailActionURL(origin(), registry, action);
    },
    async sendAuthMail(input, observeTransport) {
      try { observeTransport?.("none"); } catch { /* passive observer */ }
      const transport = selected();
      if (!("send" in transport)) return transport;
      let dispatched = false;
      try {
        if (!input || !isMailPurpose(input.purpose) || !safeMailAddress(input.recipient)
          || !safeMailOperationId(input.operationId) || typeof input.actionURL !== "string"
          || typeof input.locale !== "string"
          || (input.actionLocale !== undefined && typeof input.actionLocale !== "string")) return { status: "rejected" };
        const { registry, resources } = await localization();
        const actionURL = validateAuthMailActionURL(origin(), registry, input.purpose,
          input.actionLocale ?? input.locale, input.actionURL);
        const locale = authMailLocale(input.locale, registry);
        const rendered = await renderAuthMail(input.purpose, actionURL, locale, resources);
        dispatched = true;
        // Only report the invocation boundary, not a configured provider.
        try { observeTransport?.(config.AUTH_MAIL_MODE === "fake" ? "fake"
          : config.AUTH_MAIL_PROVIDER === "resend" ? "resend" : "brevo"); } catch { /* passive observer */ }
        const result = await transport.send({ ...rendered, recipient: input.recipient,
          purpose: input.purpose, operationId: input.operationId });
        // Never forward a transport-supplied payload, recipient or raw error.
        const status = result?.status;
        return { status: ["accepted", "rejected", "unavailable", "uncertain", "disabled"].includes(status)
          ? status : "uncertain" };
      } catch (error) {
        return { status: error instanceof AuthMailValidationError ? "rejected" : dispatched ? "uncertain" : "unavailable" };
      }
    },
  };
}


/** Records the outcome of an already committed issuance. Mail and recording
 * failures never alter the committed identity state or expose recipient data.
 */
export async function deliverLifecycleMail(
  mail: AuthMailRuntime | undefined,
  sink: OwnerOperationalFactSink | undefined,
  proof: IssuedLifecycleProof,
  purpose: AuthMailObservation["mailPurpose"],
  destination: { locale: string; returnTo?: string },
): Promise<AuthMailStatus> {
  let outcome: AuthMailStatus = "disabled";
  let transport: InvokedAuthMailTransport = "none";
  if (mail) {
    let actionURL: string | undefined;
    try { actionURL = await mail.buildActionURL({ purpose, token: proof.token, ...destination }); }
    catch (error) { outcome = error instanceof AuthMailValidationError ? "rejected" : "unavailable"; }
    if (actionURL !== undefined) {
      // An injected runtime may not implement invocation observation.
      const observed: { transport: InvokedAuthMailTransport } = { transport: "unknown" };
      try {
        // Guest actions retain their validated locale. Own messages use the
        // locked account preference (bootstrap for an unset value), while the
        // already validated callback locale/return path remains authoritative
        // for the link. Registry fallback is applied independently at render.
        const own = purpose === "password-create" || purpose.startsWith("email-change");
        const locale = own ? proof.savedLocale ?? localeRegistry.bootstrap.tag : destination.locale;
        const result = await mail.sendAuthMail({ purpose, recipient: proof.recipient, locale,
          ...(own ? { actionLocale: destination.locale } : {}),
          actionURL, operationId: proof.claims.generation }, value => { observed.transport = value; });
        outcome = result.status;
        if (outcome === "disabled" && observed.transport === "unknown") observed.transport = "none";
      } catch { outcome = "uncertain"; }
      transport = observed.transport;
    }
  }
  try {
    const observations = new OperationalFactBuffer(sink);
    observations.captureAuthMail(proof.claims.generation, new Date().toISOString().replace("Z", "000Z"), {
      mailPurpose: purpose, mailTransport: transport, mailOutcome: outcome,
    });
    await observations.flush();
  } catch { /* Recording never changes the issuance result. */ }
  return outcome;
}
