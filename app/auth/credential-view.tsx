import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { authClientActions, emailAuthClientActions, type AuthClientActions, type EmailAuthActions } from "./auth-client";
import { credentialPagePath, type CredentialMode } from "./credential-path";

export function CredentialView({
  locale, mode, returnTo, emailActions = emailAuthClientActions, googleActions = authClientActions,
}: {
  locale: string;
  mode: CredentialMode;
  returnTo: string;
  emailActions?: EmailAuthActions;
  googleActions?: AuthClientActions;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const registration = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    if ((registration && !name) || !email || password.length < 8 || password.length > 128) {
      setError(true);
      return;
    }
    setPending(true);
    setError(false);
    try {
      const succeeded = registration
        ? await emailActions.signUpWithEmail(name, email, password)
        : await emailActions.signInWithEmail(email, password);
      if (succeeded) {
        void navigate(returnTo, { replace: true });
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function googleSignIn() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await googleActions.signInWithGoogle(returnTo, {
        onSuccess() { /* Better Auth handles the provider redirect. */ },
        onError() { setError(true); },
      });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <ForumShell locale={locale}>
      <section className="credential-page" aria-labelledby="credential-heading">
        <h1 id="credential-heading">{t(registration ? "authRegisterHeading" : "authEmailHeading")}</h1>
        <form className="credential-form" onSubmit={submit}>
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
        </form>
        {error ? <p role="alert" className="auth-feedback credential-error">
          {t(registration ? "authRegisterFailure" : "authEmailFailure")}
        </p> : null}
        <div className="credential-alternatives">
          <button type="button" className="auth-action credential-google" onClick={googleSignIn} disabled={pending}>
            {t("authGoogleOption")}
          </button>
          <Link to={credentialPagePath(locale, registration ? "sign-in" : "sign-up", returnTo)}>
            {t(registration ? "authSwitchToSignIn" : "authSwitchToRegister")}
          </Link>
        </div>
        <p className="credential-hint">{t("authEmailNoVerification")}</p>
      </section>
    </ForumShell>
  );
}
