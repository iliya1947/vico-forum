import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAdministratorPreferences } from "./administrator-preferences";

/** Only secondary IDs/slugs may be disclosed; reasons, errors and controls stay outside. */
export function TechnicalDetails({ accountId, children }: {
  accountId: string | null; children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const prefs = useAdministratorPreferences(accountId);
  const [manual, setManual] = useState<{ accountId: string | null; open: boolean } | null>(null);
  const open = manual?.accountId === accountId ? manual.open : prefs.technicalDetailsExpanded;
  return <div className="admin-technical-details">
    <button type="button" aria-expanded={open} disabled={!accountId}
      onClick={() => setManual({ accountId, open: !open })}>
      {t(open ? "settingsAdminTechnicalHide" : "settingsAdminTechnicalShow")}
    </button>
    <div className="admin-technical-content" hidden={!open}>{children}</div>
  </div>;
}
