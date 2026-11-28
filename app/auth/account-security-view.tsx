import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { takeCredentialProof } from "./credential-recovery-client";

export function AccountLifecycleView({ locale, userId, sessionId, email, verified, enabled, googleAccountId,
  pending }: {
  locale: string; userId: string; sessionId: string; email: string; verified: boolean; enabled: boolean;
  googleAccountId?: string; pending?: { phase: "old-address" | "new-address"; expiresAt: string } | null;
}) {
  const { t } = useTranslation("common");
  const revalidator = useRevalidator();
  const proof = useRef<string | null | undefined>(undefined);
  const busy = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [result, setResult] = useState<"ok" | "failed" | "rate-limited" | null>(null);
  useEffect(() => {
    const capture = () => {
      const candidate = takeCredentialProof("email-change");
      if (candidate || proof.current === undefined) proof.current = candidate;
      setConfirming(!!proof.current && enabled);
    };
    capture();
    setHydrated(true);
    window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, [enabled]);

  async function command(endpoint: string, body: Record<string, string>) {
    if (busy.current || !enabled) return;
    busy.current = true;
    setPendingRequest(true);
    setResult(null);
    try {
      const response = await fetch("/api/auth/" + endpoint, {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json", "x-vico-account-user": userId, "x-vico-account-session": sessionId },
        body: JSON.stringify(body),
      });
      const value: unknown = await response.json();
      const ok = response.ok && value && typeof value === "object" && "status" in value && value.status === true;
      setResult(ok ? "ok" : response.status === 429 ? "rate-limited" : "failed");
      if (ok) void revalidator.revalidate();
    } catch { setResult("failed"); }
    busy.current = false;
    setPendingRequest(false);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newEmail = String(new FormData(event.currentTarget).get("newEmail") ?? "");
    void command("change-email", { newEmail, callbackURL: `/${encodeURIComponent(locale)}` });
  }
  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proof.current || busy.current) return;
    const token = proof.current;
    proof.current = null;
    setConfirming(false);
    void command("confirm-email-change", { token, callbackURL: `/${encodeURIComponent(locale)}` });
  }
  const disabled = !hydrated || !enabled || pendingRequest;
  return <section className="settings-account-section" aria-labelledby="account-email-heading">
    <h3 id="account-email-heading">{t("authAccountEmail")}</h3>
    <p><bdi>{email}</bdi> · {t(verified ? "authAccountVerified" : "authAccountUnverified")}</p>
    {pending ? <p role="status">{t(pending.phase === "old-address" ? "authAccountOldPending" : "authAccountNewPending")}
      {" "}<time dateTime={pending.expiresAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(pending.expiresAt))}</time></p> : null}
    {result ? <p role={result === "ok" ? "status" : "alert"}>
      {t(result === "ok" ? "authAccountRequestDone" : result === "rate-limited" ? "authVerificationRateLimited" : "authAccountConflict")}
    </p> : null}
    {confirming ? <form method="post" onSubmit={confirm}>
      <button type="submit" disabled={disabled}>{t("authAccountConfirmEmail")}</button>
    </form> : <form method="post" onSubmit={submit} className="settings-email-form">
      <label>{t("authAccountNewEmail")}<input name="newEmail" type="email" autoComplete="email" maxLength={254} required dir="ltr" disabled={disabled} /></label>
      <button type="submit" disabled={disabled}>{t("authAccountChangeEmail")}</button>
    </form>}
    {googleAccountId ? <form method="post" onSubmit={event => { event.preventDefault(); void command("unlink-account", { accountId: googleAccountId }); }}>
      <button type="submit" disabled={disabled}>{t("authAccountUnlinkGoogle")}</button>
    </form> : null}
  </section>;
}
