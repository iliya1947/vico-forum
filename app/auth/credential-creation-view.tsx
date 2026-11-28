import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useRevalidator } from "react-router";
import { credentialRequest, takeCredentialProof, type CredentialRequestResult } from "./credential-recovery-client";

export function CredentialCreationView({ enabled, locale, userId, sessionId }: {
  enabled: boolean; locale: string; userId: string; sessionId: string;
}) {
  const { t } = useTranslation("common");
  const revalidator = useRevalidator();
  const proof = useRef<string | null>(null);
  const busy = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CredentialRequestResult | null>(null);
  const [created, setCreated] = useState(false);
  useEffect(() => {
    const capture = () => {
      const candidate = takeCredentialProof();
      if (!enabled || created) proof.current = null;
      else if (candidate) {
        proof.current = candidate;
        setResult(null);
      }
      setCanSubmit(!!proof.current);
    };
    capture();
    setHydrated(true);
    window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, [enabled, created]);
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || created || busy.current) return;
    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    const identity = { userId, sessionId };
    const token = proof.current;
    busy.current = true;
    setPending(true);
    if (token) {
      proof.current = null;
      const outcome = await credentialRequest("create-password", { token, newPassword }, identity);
      if (outcome === "ok") {
        proof.current = null;
        setCreated(true);
        // Raw auth fetch is outside the Router action lifecycle. Refresh the
        // authoritative linked methods and session list after the commit.
        void revalidator.revalidate();
      }
      setCanSubmit(!!proof.current);
      setResult(outcome);
    } else {
      setResult(await credentialRequest("request-password-create", { redirectTo: `/${encodeURIComponent(locale)}` }, identity));
    }
    setPending(false);
    busy.current = false;
  }
  if (!enabled && !created) return null;
  return <>
    {result === "ok" ? <p role="status">{t(created ? "settingsSecurityPasswordSaved" : "authCredentialCreateSent")}</p> : null}
    {result && result !== "ok" ? <p role="alert">{t(result === "rate-limited" ? "authVerificationRateLimited" : "authCredentialInvalid")}</p> : null}
    {enabled && !created ? <form method="post" className="settings-account-form" onSubmit={event => void run(event)}>
      {canSubmit ? <label>{t("settingsSecurityNewPassword")}
        <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={!hydrated || pending} />
      </label> : null}
      <button type="submit" disabled={!hydrated || pending}>
        {t(pending ? "authPending" : canSubmit ? "authCredentialCreate" : "authCredentialSendLink")}
      </button>
    </form> : null}
  </>;
}
