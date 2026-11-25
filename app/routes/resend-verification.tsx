import { useRef, useState, type FormEvent } from "react";
import { data, Link, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { credentialPagePath, verificationReturnPath } from "../auth/credential-path";
import { verificationClientActions, type VerificationResult } from "../auth/auth-client";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function headers() { return privateHeaders; }
export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  const locale = params.locale ?? "en";
  const values = new URL(request.url).searchParams.getAll("returnTo");
  return data({ locale, returnTo: verificationReturnPath(locale, values.length === 1 ? values[0] : null) },
    { headers: privateHeaders });
}

export default function ResendVerificationPage() {
  const { locale, returnTo } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    busy.current = true;
    setPending(true);
    setResult(null);
    const outcome = await verificationClientActions.resend(email, returnTo);
    setResult(outcome);
    setPending(false);
    busy.current = false;
  }
  const error = result === "rate-limited" ? "authVerificationRateLimited"
    : result === "unavailable" ? "authVerificationUnavailable"
    : result === "invalid" ? "authError" : null;
  return <ForumShell locale={locale}>
    <section className="credential-page" aria-labelledby="resend-heading">
      <h1 id="resend-heading">{t(result === "ok" ? "authVerificationPending" : "authVerificationResendHeading")}</h1>
      {result === "ok" ? <p role="status">{t("authVerificationPendingBody")}</p> :
        <form className="credential-form" onSubmit={submit}>
          <label>{t("authEmailAddress")}
            <input name="email" type="email" autoComplete="email" dir="ltr" maxLength={254} required disabled={pending} />
          </label>
          <button className="auth-action credential-submit" type="submit" disabled={pending}>
            {t(pending ? "authPending" : "authVerificationResend")}
          </button>
        </form>}
      {error ? <p role="alert" className="credential-error">{t(error)}</p> : null}
      <Link to={credentialPagePath(locale, "sign-in", returnTo)}>{t("authVerificationSignIn")}</Link>
    </section>
  </ForumShell>;
}
