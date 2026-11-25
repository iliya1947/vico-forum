import { useEffect, useRef, useState, type FormEvent } from "react";
import { data, Link, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { credentialPagePath, verificationReturnPath } from "../auth/credential-path";
import { credentialRequest, type CredentialRequestResult } from "../auth/credential-recovery-client";
import { ForumShell } from "../forum/ui";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function headers() { return privateHeaders; }
export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  const locale = params.locale ?? "en";
  return data({ locale, returnTo: verificationReturnPath(locale, new URL(request.url).searchParams.get("returnTo")) },
    { headers: privateHeaders });
}

export default function ForgotPasswordPage() {
  const { locale, returnTo } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const [result, setResult] = useState<CredentialRequestResult | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    inFlight.current = true;
    setPending(true);
    setResult(await credentialRequest("request-password-reset", { email, redirectTo: returnTo }));
    setPending(false);
    inFlight.current = false;
  }
  return <ForumShell locale={locale}>
    <section className="credential-page" aria-labelledby="forgot-password-heading">
      <h1 id="forgot-password-heading">{t("authCredentialForgot")}</h1>
      {result === "ok" ? <p role="status">{t("authCredentialResetSent")}</p> :
        <form method="post" className="credential-form" onSubmit={event => void submit(event)}>
          <label>{t("authEmailAddress")}
            <input name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" disabled={!hydrated || pending} />
          </label>
          <button type="submit" className="auth-action credential-submit" disabled={!hydrated || pending}>
            {t(pending ? "authPending" : "authCredentialSendLink")}
          </button>
        </form>}
      {result && result !== "ok" ? <p role="alert">{t(result === "rate-limited" ? "authVerificationRateLimited" : "authError")}</p> : null}
      <Link to={credentialPagePath(locale, "sign-in", returnTo)}>{t("authVerificationSignIn")}</Link>
    </section>
  </ForumShell>;
}
