import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { credentialPagePath } from "../auth/credential-path";
import { credentialRequest, takeCredentialProof, type CredentialRequestResult } from "../auth/credential-recovery-client";
import { headers, loader } from "./forgot-password";
export { headers, loader };

export default function ResetPasswordPage() {
  const { locale, returnTo } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const proof = useRef<string | null | undefined>(undefined);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CredentialRequestResult | null>(null);
  useEffect(() => {
    proof.current ??= takeCredentialProof();
    setReady(!!proof.current);
    if (!proof.current) setResult("invalid");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proof.current || busy.current) return;
    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    const token = proof.current;
    proof.current = null;
    busy.current = true;
    setPending(true);
    setResult(await credentialRequest("reset-password", { token, newPassword }));
    setPending(false);
    setReady(false);
    busy.current = false;
  }
  return <main className="credential-page" aria-labelledby="reset-password-heading">
    <h1 id="reset-password-heading">{t("authCredentialReset")}</h1>
    {ready ? <form method="post" className="credential-form" onSubmit={event => void submit(event)}>
      <label>{t("settingsSecurityNewPassword")}
        <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
      </label>
      <button type="submit" className="auth-action credential-submit" disabled={pending}>
        {t(pending ? "authPending" : "authCredentialReset")}
      </button>
    </form> : null}
    {result === "ok" ? <p role="status">{t("settingsSecurityPasswordSaved")}</p> : null}
    {result && result !== "ok" ? <p role="alert">{t(result === "rate-limited" ? "authVerificationRateLimited" : "authCredentialInvalid")}</p> : null}
    <Link to={credentialPagePath(locale, "sign-in", returnTo)}>{t("authVerificationSignIn")}</Link>
    {result && result !== "ok" ? <Link to={`/${encodeURIComponent(locale)}/forgot-password`}>{t("authCredentialForgot")}</Link> : null}
  </main>;
}
