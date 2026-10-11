import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { draftDestination, fetchDraftMetadata, type DraftMetadata } from "./draft-client";

export function DraftDiscovery({ locale }: { locale: string }) {
  const owner = useHeaderAuthUser()?.id ?? null;
  const { t } = useTranslation("common");
  const location = useLocation();
  const [available, setAvailable] = useState<DraftMetadata | null>(null);
  useEffect(() => {
    if (!owner) { setAvailable(null); return; }
    let live = true;
    const check = () => {
      void fetchDraftMetadata(locale).then((items) => {
        if (!live) return;
        setAvailable(items.find((item) => item.status === "active" && !!draftDestination(locale, item.contextKey)) ?? null);
      }).catch(() => { /* No server connection: local drafts are still usable in the editor. */ });
    };
    check();
    window.addEventListener("focus", check);
    return () => { live = false; window.removeEventListener("focus", check); };
  }, [locale, owner]);
  if (!owner || !available || location.pathname.endsWith("/drafts")) return null;
  const destination = draftDestination(locale, available.contextKey);
  if (!destination) return null;
  return (
    <aside className="editor-draft-discovery" aria-label={t("editorDraftAvailable")}>
      <span>{t("editorDraftAvailable")}</span>
      <Link to={destination}>{available.title || available.snippet || t("editorDraftContinue")}</Link>
    </aside>
  );
}
