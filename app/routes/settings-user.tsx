import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { useThemePreference } from "../theme-preference";
import { settingsPrivateHeaders } from "./settings";

export function headers() { return settingsPrivateHeaders; }

export function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  return data({
    locale: params.locale ?? "en",
    canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
  }, { headers: settingsPrivateHeaders });
}

const themeOptions = ["system", "light", "dark"] as const;

/** SET-03 client preference surface. Account locale/Editor controls are separate follow-on slices. */
export default function SettingsUserRoute() {
  const { locale, canViewForum } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const { preference, setPreference } = useThemePreference();

  return <SettingsShell locale={locale} canViewForum={canViewForum} current="user">
    <section className="admin-overview settings-overview">
      <h2>{t("settingsUser")}</h2>
      <fieldset className="settings-theme-fieldset">
        <legend>{t("themeLabel")}</legend>
        <div className="settings-theme-options">
          {themeOptions.map(option => <label className="settings-theme-choice" key={option}>
            <input
              type="radio"
              name="themePreference"
              value={option}
              checked={preference === option}
              disabled={preference === null}
              onChange={() => setPreference(option)}
            />
            <span>{option === "system" ? t("settingsThemeSystem")
              : option === "light" ? t("lightTheme") : t("darkTheme")}</span>
          </label>)}
        </div>
      </fieldset>
    </section>
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
