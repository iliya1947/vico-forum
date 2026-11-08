import { data, redirect, useActionData, useLoaderData, useNavigation, Form, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useEditorPreferences, writeEditorPreference } from "../settings/editor-preferences";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { registryForRequest } from "../localization/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { UserLocaleAccountMissingError, UserLocaleUnavailableError } from "../../db/hyperdrive-user-locale";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { settingsUserPath } from "../settings/paths";
import { userLocaleWriterContext } from "../settings/user-locale-context";
import { useThemePreference } from "../theme-preference";
import { settingsPrivateHeaders } from "./settings";

type Args = { request: Request; params: { locale?: string }; context: RouterContextProvider };
type LocaleError = "invalid" | "origin" | "conflict" | "unavailable";
const localeErrorKeys = {
  invalid: "settingsLocaleInvalid",
  origin: "settingsLocaleForbidden",
  conflict: "settingsLocaleConflict",
  unavailable: "settingsLocaleUnavailable",
} as const;

export function headers() { return settingsPrivateHeaders; }

export async function loader({ request, params, context }: Args) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  const loaded = await registryForRequest(context);
  return data({
    locale: params.locale ?? "en",
    canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
    accountId: session.user.id,
    preferredLocale: session.user.locale ?? null,
    availableLocales: loaded.registry.activeLocales()
      .map(({ tag, nativeName, direction }) => ({ tag, nativeName, direction }))
      .sort((a, b) => a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0),
    localeAvailable: loaded.health.status === "healthy",
    localeSaved: new URL(request.url).searchParams.get("localeSaved") === "1",
  }, { headers: settingsPrivateHeaders });
}

function failure(error: LocaleError, status: number) {
  return data({ error }, { status, headers: settingsPrivateHeaders });
}

export async function action({ request, context }: Args) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  if (request.method !== "POST") throw new Response("Method Not Allowed", {
    status: 405, headers: { ...settingsPrivateHeaders, Allow: "POST" },
  });
  if (!requireSameOrigin(request)) return failure("origin", 403);
  let form: FormData;
  try { form = await request.formData(); } catch { return failure("invalid", 400); }
  const allowed = new Set(["intent", "locale", "expectedUserId"]);
  if ([...form.keys()].some(key => !allowed.has(key))) return failure("invalid", 400);
  const intent = form.getAll("intent");
  const locale = form.getAll("locale");
  const expectedUserId = form.getAll("expectedUserId");
  if (intent.length !== 1 || intent[0] !== "save-locale"
    || locale.length !== 1 || typeof locale[0] !== "string"
    || expectedUserId.length !== 1 || typeof expectedUserId[0] !== "string") return failure("invalid", 400);
  if (expectedUserId[0] !== session.user.id) return failure("conflict", 409);

  const registry = await registryForRequest(context);
  // A degraded registry exposes only bootstrap fallback. It is never a durable user choice.
  if (registry.health.status !== "healthy") return failure("unavailable", 503);
  if (!registry.registry.activeLocales().some(option => option.tag === locale[0])) return failure("invalid", 400);
  try {
    await context.get(userLocaleWriterContext).save(session.user.id, locale[0]);
  } catch (error) {
    if (error instanceof UserLocaleAccountMissingError) return failure("conflict", 409);
    if (error instanceof UserLocaleUnavailableError) return failure("unavailable", 503);
    throw error;
  }
  // The explicit route changes to the selected locale; ordinary unprefixed navigation
  // separately uses the fresh saved user.locale from Better Auth on subsequent requests.
  return redirect(`${settingsUserPath(locale[0])}?localeSaved=1`, {
    status: 303, headers: settingsPrivateHeaders,
  });
}

const themeOptions = ["system", "light", "dark"] as const;

export default function SettingsUserRoute() {
  const state = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const { t } = useTranslation("common");
  const { preference, setPreference } = useThemePreference();
  const displayedUserId = useHeaderAuthUser()?.id;
  // A stale loader must never expose or change another account's browser preferences.
  const localAccountId = displayedUserId === state.accountId ? state.accountId : null;
  const editor = useEditorPreferences(localAccountId);
  const pending = navigation.state !== "idle";
  const savedLocale = state.availableLocales.some(option => option.tag === state.preferredLocale)
    ? state.preferredLocale! : "";

  return <SettingsShell locale={state.locale} canViewForum={state.canViewForum} current="user">
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
      <section className="settings-locale-section" aria-labelledby="settings-locale-heading">
        <h3 id="settings-locale-heading">{t("settingsPreferredLocale")}</h3>
        <p>{t("settingsPreferredLocaleIntro")}</p>
        <Form key={state.accountId} method="post" className="settings-locale-form" aria-busy={pending || undefined}>
          <input type="hidden" name="intent" value="save-locale" />
          <input type="hidden" name="expectedUserId" value={state.accountId} />
          <label htmlFor="settings-preferred-locale">{t("settingsPreferredLocale")}</label>
          <select id="settings-preferred-locale" name="locale" defaultValue={savedLocale}
            disabled={!state.localeAvailable || pending} required>
            <option value="" disabled>{t("settingsLocaleChoose")}</option>
            {state.availableLocales.map(option => <option key={option.tag} value={option.tag}
              dir={option.direction}>{option.nativeName}</option>)}
          </select>
          <button type="submit" disabled={!state.localeAvailable || pending}>
            {pending ? t("authPending") : t("settingsLocaleSave")}
          </button>
        </Form>
        {!state.localeAvailable ? <p role="alert">{t("settingsLocaleUnavailable")}</p> : null}
        {result?.error ? <p role="alert">{t(localeErrorKeys[result.error])}</p> : null}
        {state.localeSaved ? <p role="status">{t("settingsLocaleSaved")}</p> : null}
      </section>
      <section className="settings-editor-section" aria-labelledby="settings-editor-heading">
        <h3 id="settings-editor-heading">{t("settingsEditorHeading")}</h3>
        <p>{t("settingsEditorLocalHint")}</p>
        <div className="settings-editor-controls">
          <label className="settings-editor-select" htmlFor="settings-editor-mode">
            <span>{t("settingsEditorMode")}</span>
            <select id="settings-editor-mode" disabled={!localAccountId}
              value={editor.mode ?? "default"} onChange={event => {
                const mode = event.currentTarget.value;
                if (mode === "default" || mode === "simple" || mode === "advanced") {
                  writeEditorPreference(localAccountId, "mode", mode === "default" ? null : mode);
                }
              }}>
              <option value="default">{t("settingsEditorDefault")}</option>
              <option value="simple">{t("editorSimple")}</option>
              <option value="advanced">{t("editorAdvanced")}</option>
            </select>
          </label>
          <label className="settings-editor-select" htmlFor="settings-editor-spellcheck">
            <span>{t("editorSpellcheck")}</span>
            <select id="settings-editor-spellcheck" disabled={!localAccountId}
              value={editor.spellcheck === null ? "auto" : String(editor.spellcheck)}
              onChange={event => {
                const option = event.currentTarget.value;
                if (option === "auto" || option === "true" || option === "false") {
                  writeEditorPreference(localAccountId, "spellcheck",
                    option === "auto" ? null : option === "true");
                }
              }}>
              <option value="auto">{t("settingsEditorSpellcheckAuto")}</option>
              <option value="true">{t("settingsEditorSpellcheckOn")}</option>
              <option value="false">{t("settingsEditorSpellcheckOff")}</option>
            </select>
          </label>
          <label className="settings-editor-checkbox">
            <input type="checkbox" disabled={!localAccountId} checked={editor.codeWrap}
              onChange={event => writeEditorPreference(localAccountId, "codeWrap", event.target.checked)} />
            <span>{t("codeWrap")}</span>
          </label>
          <label className="settings-editor-checkbox">
            <input type="checkbox" disabled={!localAccountId} checked={editor.codeLines}
              onChange={event => writeEditorPreference(localAccountId, "codeLines", event.target.checked)} />
            <span>{t("editorLineNumbers")}</span>
          </label>
        </div>
      </section>
    </section>
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
