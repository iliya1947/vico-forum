import { useState, type FormEvent } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { authClientActions, emailAuthClientActions, type AuthClientActions, type EmailAuthActions } from "./auth-client";
import { credentialPagePath, type CredentialMode } from "./credential-path";

export function CredentialView({
  locale, mode, returnTo, registrationFlags, callbackError, emailActions = emailAuthClientActions, googleActions = authClientActions,
}: {
  locale: string;
  mode: CredentialMode;
  returnTo: string;
  registrationFlags?: { googleRegistrationEnabled: boolean; emailRegistrationEnabled: boolean };
  callbackError?: "email-closed" | "google-closed" | "authentication" | null;
  emailActions?: EmailAuthActions;
  googleActions?: AuthClientActions;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"email" | "google" | "email-closed" | null>(null);
  const registration = mode === "sign-up";
  const emailAllowed = !registration || registrationFlags?.emailRegistrationEnabled === true;
  const googleAllowed = !registration || registrationFlags?.googleRegistrationEnabled === true;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !emailAllowed) return;
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    if ((registration && !name) || !email || password.length < 8 || password.length > 128) {
      setError("email");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const succeeded = registration
        ? await emailActions.signUpWithEmail(name, email, password)
        : await emailActions.signInWithEmail(email, password);
      if (succeeded === "closed") { setError("email-closed"); return; }
      if (succeeded) {
        await navigate(returnTo, { replace: true });
        void revalidator.revalidate();
        return;
      }
      setError("email");
    } catch {
      setError("email");
    } finally {
      setPending(false);
    }
  }

  async function googleSignIn() {
    if (pending || !googleAllowed) return;
    setPending(true);
    setError(null);
    try {
      await googleActions.signInWithGoogle(returnTo, {
        onSuccess() { /* Better Auth handles the provider redirect. */ },
        onError() { setError("google"); },
      }, credentialPagePath(locale, mode, returnTo));
    } catch {
      setError("google");
    } finally {
      setPending(false);
    }
  }

  return (
    <ForumShell locale={locale}>
      <section className="credential-page" aria-labelledby="credential-heading">
        <h1 id="credential-heading">{t(registration ? "authRegisterHeading" : "authEmailHeading")}</h1>
        {registration && !emailAllowed ? <p className="credential-hint" role="status">{t("authEmailRegistrationClosed")}</p> : null}
        {emailAllowed ? <form className="credential-form" onSubmit={submit}>
          {registration ? (
            <label>{t("authEmailName")}
              <input name="name" type="text" autoComplete="name" required maxLength={100} dir="auto" disabled={pending} />
            </label>
          ) : null}
          <label>{t("authEmailAddress")}
            <input name="email" type="email" autoComplete="email" dir="ltr" required maxLength={320} disabled={pending} />
          </label>
          <label>{t("authEmailPassword")}
            <input name="password" type="password" autoComplete={registration ? "new-password" : "current-password"}
              required minLength={8} maxLength={128} disabled={pending} />
          </label>
          {registration ? <p className="credential-hint">{t("authEmailPasswordHint")}</p> : null}
          <button className="auth-action auth-sign-in credential-submit" type="submit" disabled={pending}>
            {pending ? t("authPending") : t(registration ? "authRegisterSubmit" : "authEmailSubmit")}
          </button>
        </form> : null}
        {registration && !googleAllowed ? <p className="credential-hint">{t("authGoogleRegistrationClosed")}</p> : null}
        {callbackError ? <p role="alert" className="auth-feedback credential-error">
          {t(callbackError === "google-closed" ? "authGoogleRegistrationClosed"
            : callbackError === "email-closed" ? "authEmailRegistrationClosed" : "authError")}
        </p> : null}
        {error ? <p role="alert" className="auth-feedback credential-error">
          {t(error === "email-closed" ? "authEmailRegistrationClosed" : error === "google" ? "authError" : registration ? "authRegisterFailure" : "authEmailFailure")}
        </p> : null}
        <div className="credential-alternatives">
          {googleAllowed ? <button type="button" className="auth-action credential-google" onClick={googleSignIn} disabled={pending}>
            {t("authGoogleOption")}
          </button> : null}
          <Link to={credentialPagePath(locale, registration ? "sign-in" : "sign-up", returnTo)}>
            {t(registration ? "authSwitchToSignIn" : "authSwitchToRegister")}
          </Link>
        </div>
        {emailAllowed ? <p className="credential-hint">{t("authEmailNoVerification")}</p> : null}
        <p className="credential-hint">{t("authLinkGoogleHint")}</p>
      </section>
    </ForumShell>
  );
}
