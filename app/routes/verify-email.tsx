import { useEffect, useRef, useState } from "react";
import { data, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { credentialPagePath, verificationPagePath, verificationReturnPath } from "../auth/credential-path";
import { verificationClientActions, type VerificationResult } from "../auth/auth-client";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function headers() { return privateHeaders; }
export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  const locale = params.locale ?? "en";
  const values = new URL(request.url).searchParams.getAll("returnTo");
  // Never serialize the token in loader data or HTML.
  return data({ locale, returnTo: verificationReturnPath(locale, values.length === 1 ? values[0] : null) },
    { headers: privateHeaders });
}

type State = "loading" | "ready" | "confirming" | "confirmed" | Exclude<VerificationResult, "ok">;
export default function VerifyEmailPage() {
  const { locale, returnTo } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const token = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<State>("loading");
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    if (token.current === undefined) {
      const url = new URL(window.location.href);
      const values = url.searchParams.getAll("token");
      token.current = values.length === 1 && /^[A-Za-z0-9._~-]{1,2048}$/.test(values[0]) ? values[0] : null;
      try {
        // Keep React Router history metadata; no router navigation/revalidation
        // and no token in browser storage or a rendered form.
        window.history.replaceState(window.history.state, "", verificationPagePath(locale, "verify-email", returnTo));
      } catch { token.current = null; }
    }
    if (!token.current) { setState("invalid"); return; }
    void verificationClientActions.inspect(token.current).then(result => {
      if (active) {
        setState(result === "ok" ? "ready" : result);
        if (result !== "ok") token.current = null;
      }
    });
    return () => { active = false; };
  }, [locale, returnTo]);

  async function confirm() {
    if (busy.current || state !== "ready" || !token.current) return;
    busy.current = true;
    setState("confirming");
    const result = await verificationClientActions.confirm(token.current);
    // Never replay an uncertain terminal operation automatically.
    token.current = null;
    setState(result === "ok" ? "confirmed" : result);
    busy.current = false;
  }
  const error = state === "invalid" ? "authVerificationInvalid"
    : state === "rate-limited" ? "authVerificationRateLimited"
    : state === "unavailable" ? "authVerificationUnavailable" : null;

  // Deliberately isolated document content: no header/locale navigation
  // built from the original token-bearing router location.
  return <main className="credential-page" aria-labelledby="verification-heading">
    <h1 id="verification-heading">{t("authVerificationHeading")}</h1>
    {state === "loading" ? <p role="status">{t("authPending")}</p> : null}
    {state === "ready" || state === "confirming" ? <button type="button"
      className="auth-action credential-submit" disabled={state === "confirming"}
      onClick={() => void confirm()}>{t(state === "confirming" ? "authPending" : "authVerificationConfirm")}</button> : null}
    {error ? <p role="alert" className="credential-error">{t(error)}</p> : null}
    {state === "confirmed" ? <>
      <p role="status">{t("authVerificationSuccess")}</p>
      <p className="credential-hint">{t("authVerificationSessionNote")}</p>
    </> : null}
    {state !== "loading" && state !== "confirming" ? <div className="credential-alternatives">
      {state !== "confirmed" ? <a href={verificationPagePath(locale, "resend-verification", returnTo)}>{t("authVerificationResend")}</a> : null}
      <a href={credentialPagePath(locale, "sign-in", returnTo)}>{t("authVerificationSignIn")}</a>
    </div> : null}
  </main>;
}
