import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { OwnerUserProfileSnapshot } from "../../db/owner-user-profile";
import type { OwnerAccountDeactivationResult } from "../../db/owner-account-lifecycle";
import type { UiKey } from "../localization/catalog";
import { forumOwnerDeactivationPath } from "../forum/paths";

function errorLabel(status: number): UiKey<"common"> {
  switch (status) {
    case 400: return "ownerDeactivateInvalid";
    case 401: case 403: case 409: return "ownerDeactivateAuthChanged";
    case 404: return "ownerDeactivateNotFound";
    case 503: return "ownerDeactivateUnavailable";
    default: return "ownerDeactivateUnconfirmed";
  }
}

/** Mounted only within a currently viewer-bound exact-Owner profile section. */
export function OwnerLifecycleControl({ locale, viewerId, account }: {
  locale: string; viewerId: string; account: OwnerUserProfileSnapshot;
}) {
  const { t } = useTranslation("common");
  const revalidator = useRevalidator();
  const [confirmation, setConfirmation] = useState(false);
  const [operationId, setOperationId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<UiKey<"common"> | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (confirmation && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!confirmation && restoreFocus.current) {
      restoreFocus.current = false; opener.current?.focus();
    }
  }, [confirmation]);

  function cancel() {
    if (request.current) return;
    restoreFocus.current = true; dialog.current?.close(); setConfirmation(false); setError(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation || request.current || pending || error || confirmed || !operationId) return;
    const controller = new AbortController(); request.current = controller; setPending(true);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      // An explicit native-form submit is the only producer. Neither a new
      // loader snapshot nor Refresh, failure, or identity change repeats a POST.
      const response = await fetch(forumOwnerDeactivationPath(locale, account.targetUserId), {
        method: "POST", credentials: "same-origin", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ intent: "deactivate", expectedActorId: viewerId,
          targetUserId: account.targetUserId, operationId }),
      });
      if (!mounted.current) return;
      if (response.status !== 200) {
        // The UI uses only the status; release the unused response stream.
        await response.body?.cancel().catch(() => undefined);
        if (!mounted.current) return;
        setError(errorLabel(response.status));
        // Safe GET refresh also removes a now-unauthorized private section.
        if ([401,403,409].includes(response.status)) void revalidator.revalidate();
        return;
      }
      const result = await response.json() as OwnerAccountDeactivationResult;
      if (!mounted.current) return;
      if (result.targetUserId !== account.targetUserId || result.state !== "deactivated"
        || typeof result.changed !== "boolean") throw new Error("Invalid lifecycle acknowledgement");
      setConfirmed(true); dialog.current?.close(); setConfirmation(false);
      void revalidator.revalidate();
    } catch {
      // Timeout/network failure may follow a committed command. Never claim
      // rollback, invent success, expose the error, or retry automatically.
      if (mounted.current) setError("ownerDeactivateUnconfirmed");
    } finally {
      clearTimeout(timeout); request.current = null;
      if (mounted.current) setPending(false);
    }
  }

  if (account.lifecycle.status !== "active" || account.targetUserId === viewerId) return null;
  return <div className="owner-lifecycle-control">
    {confirmed ? <p role="status">{t("ownerDeactivateConfirmed")}</p> :
      <button ref={opener} className="profile-button owner-deactivate-button" type="button"
        disabled={confirmation || pending}
        onClick={() => { setOperationId(crypto.randomUUID()); setError(null); setConfirmation(true); }}>
        {t("ownerDeactivateOpen")}</button>}
    {confirmation ? <dialog ref={dialog} className="owner-deactivation-dialog"
      aria-labelledby="owner-deactivation-heading" aria-describedby="owner-deactivation-identity owner-deactivation-effects"
      onCancel={event => { event.preventDefault(); cancel(); }}>
      <h2 id="owner-deactivation-heading">{t("ownerDeactivateHeading")}</h2>
      <p id="owner-deactivation-identity"><bdi dir="auto">{account.email}</bdi><br/><bdi>{account.targetUserId}</bdi></p>
      <p id="owner-deactivation-effects">{t("ownerDeactivateEffects", { deletedUser: t("deletedUser") })}</p>
      <form method="post" action={forumOwnerDeactivationPath(locale, account.targetUserId)} onSubmit={submit}
        aria-busy={pending} className="owner-deactivation-form">
        <input type="hidden" name="intent" value="deactivate"/>
        <input type="hidden" name="expectedActorId" value={viewerId}/>
        <input type="hidden" name="targetUserId" value={account.targetUserId}/>
        <input type="hidden" name="operationId" value={operationId}/>
        {pending ? <p role="status">{t("ownerDeactivatePending")}</p> : null}
        {error ? <div role="alert" className="profile-feedback is-error"><p>{t(error)}</p>
          <button type="button" onClick={() => revalidator.revalidate()} disabled={revalidator.state !== "idle"}>
            {t("profileSectionRefresh")}</button></div> : null}
        <div className="profile-form-actions">
          <button type="button" onClick={cancel} disabled={pending}>{t("profileCancel")}</button>
          <button className="profile-button owner-deactivate-button" type="submit" disabled={pending || !!error}>
            {t(pending ? "ownerDeactivatePending" : "ownerDeactivateConfirm")}</button>
        </div>
      </form>
    </dialog> : null}
  </div>;
}
