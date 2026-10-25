import { useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { linkGoogleAccount } from "./auth-client";

/** Explicit linking requires an authenticated local identity and provider ownership. */
export function GoogleAccountLink({ callbackURL, link = linkGoogleAccount }: {
  callbackURL: string;
  link?: (callbackURL: string) => Promise<boolean>;
}) {
  const { t } = useTranslation("common");
  const [query] = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(query.has("linkError"));
  async function connect() {
    if (pending) return;
    setPending(true);
    setError(false);
    try { setError(!await link(callbackURL)); }
    catch { setError(true); }
    finally { setPending(false); }
  }
  return <div>
    <button type="button" className="profile-button auth-google-link" onClick={connect} disabled={pending}>
      {t(pending ? "authPending" : "authLinkGoogle")}
    </button>
    {error ? <p role="alert">{t("authError")}</p> : null}
  </div>;
}
