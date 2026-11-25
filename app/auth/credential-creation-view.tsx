import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { credentialRequest, takeCredentialProof, type CredentialRequestResult } from "./credential-recovery-client";

export function CredentialCreationView({ locale, userId, sessionId }: {
  locale: string; userId: string; sessionId: string;
}) {
  const { t } = useTranslation("common");
  const proof = useRef<string | null | undefined>(undefined);
  const busy = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CredentialRequestResult | null>(null);
  const [created, setCreated] = useState(false);
  useEffect(() => {
    proof.current ??= takeCredentialProof();
    setCanSubmit(!!proof.current);
    setHydrated(true);
  }, []);
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    const identity = { userId, sessionId };
    const token = proof.current;
    busy.current = true;
    setPending(true);
    if (token) {
      proof.current = null;
      const outcome = await credentialRequest("create-password", { token, newPassword }, identity);
      setCanSubmit(false);
      setCreated(outcome === "ok");
      setResult(outcome);
    } else {
      setResult(await credentialRequest("request-password-create", { redirectTo: `/${encodeURIComponent(locale)}` }, identity));
    }
    setPending(false);
    busy.current = false;
  }
  return <>
    {result === "ok" ? <p role="status">{t(created ? "settingsSecurityPasswordSaved" : "authCredentialCreateSent")}</p> : null}
    {result && result !== "ok" ? <p role="alert">{t(result === "rate-limited" ? "authVerificationRateLimited" : "authCredentialInvalid")}</p> : null}
    {!created ? <form method="post" className="settings-account-form" onSubmit={event => void run(event)}>
      {canSubmit ? <label>{t("settingsSecurityNewPassword")}
        <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={!hydrated || pending} />
      </label> : null}
      <button type="submit" disabled={!hydrated || pending}>
        {t(pending ? "authPending" : canSubmit ? "authCredentialCreate" : "authCredentialSendLink")}
      </button>
    </form> : null}
  </>;
}
