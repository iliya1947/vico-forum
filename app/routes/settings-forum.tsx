import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useFetcher, useLoaderData, useRevalidator, type RouterContextProvider } from "react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { requireSameOrigin } from "../forum/mutations.server";
import { registrationSettingsContext } from "../settings/request-context";
import { RegistrationSettingsConflictError, RegistrationSettingsForbiddenError,
  RegistrationSettingsValidationError } from "../../db/registration-settings";
import { RegistrationSettingsUnavailableError } from "../../db/hyperdrive-registration-settings";
import {
  AuthorizationManagementContent, type AuthorizationFailure,
} from "../authorization/admin-view";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { canonicalAuthorizationPath } from "../settings/paths";
import { loader as readCanonicalAuthorization } from "./authorization-admin";
import { settingsPrivateHeaders } from "./settings";

const authorizationFetcherKey = "settings-forum-authorization";
const registrationFetcherKey = "settings-forum-registration";
type RegistrationError = "invalid" | "forbidden" | "conflict" | "unavailable";
const registrationErrorMessages = {
  invalid: "settingsRegistrationInvalid",
  forbidden: "settingsRegistrationForbidden",
  conflict: "settingsRegistrationConflict",
  unavailable: "settingsRegistrationUnavailable",
} as const;

export function headers() { return settingsPrivateHeaders; }
function requireOwner(context: RouterContextProvider): string {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  if (!isBoundOwner(session.user.id, context.get(authorizationOwnerContext))) {
    throw new Response("Forbidden", { status: 403, headers: settingsPrivateHeaders });
  }
  return session.user.id;
}

export async function loader(args: { params: { locale?: string }; context: RouterContextProvider }) {
  requireOwner(args.context);
  // Both reads are private, but no second authorization-management writer is introduced.
  const [state, registration] = await Promise.all([
    readCanonicalAuthorization(args), args.context.get(registrationSettingsContext).read(),
  ]).catch(error => {
    if (error instanceof RegistrationSettingsUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: settingsPrivateHeaders });
    }
    throw error;
  });
  return data({ ...state, registration }, { headers: settingsPrivateHeaders });
}

function failure(error: RegistrationError, status: number) {
  return data({ ok: false as const, error }, { status, headers: settingsPrivateHeaders });
}

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  const actorId = requireOwner(context);
  if (!requireSameOrigin(request)) return failure("forbidden", 403);
  let form: FormData;
  try { form = await request.formData(); } catch { return failure("invalid", 400); }
  const allowed = new Set(["expectedVersion", "googleRegistrationEnabled", "emailRegistrationEnabled"]);
  if ([...form.keys()].some(key => !allowed.has(key))) return failure("invalid", 400);
  const version = form.getAll("expectedVersion");
  if (version.length !== 1 || typeof version[0] !== "string" ||
    !/^[1-9]\d{0,9}$/.test(version[0]) || Number(version[0]) > 2147483647) return failure("invalid", 400);
  function flag(key: "googleRegistrationEnabled" | "emailRegistrationEnabled") {
    const values = form.getAll(key);
    if (values.length > 1 || (values.length === 1 && values[0] !== "on")) {
      throw new RegistrationSettingsValidationError("Invalid checkbox");
    }
    return values.length === 1;
  }
  try {
    await context.get(registrationSettingsContext).update(actorId, {
      expectedVersion: Number(version[0]),
      googleRegistrationEnabled: flag("googleRegistrationEnabled"),
      emailRegistrationEnabled: flag("emailRegistrationEnabled"),
    });
    return data({ ok: true as const }, { headers: settingsPrivateHeaders });
  } catch (error) {
    if (error instanceof RegistrationSettingsValidationError) return failure("invalid", 400);
    if (error instanceof RegistrationSettingsForbiddenError) return failure("forbidden", 403);
    if (error instanceof RegistrationSettingsConflictError) return failure("conflict", 409);
    if (error instanceof RegistrationSettingsUnavailableError) return failure("unavailable", 503);
    throw error;
  }
}

function RegistrationControls({ registration }: {
  registration: { googleRegistrationEnabled: boolean; emailRegistrationEnabled: boolean; version: number };
}) {
  const fetcher = useFetcher<{ok: boolean; error?: RegistrationError}>({ key: registrationFetcherKey });
  const revalidator = useRevalidator();
  const handledConflict = useRef<unknown>(null);
  // RR does not automatically refresh loader data after an action's 409 response.
  // Refresh exactly once per rejected version so the next submit uses current policy.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.error === "conflict"
      && handledConflict.current !== fetcher.data) {
      handledConflict.current = fetcher.data;
      void revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);
  const { t } = useTranslation("common");
  const pending = fetcher.state !== "idle";
  return <section className="settings-registration" aria-labelledby="settings-registration-heading">
    <h2 id="settings-registration-heading">{t("settingsRegistrationHeading")}</h2>
    <p>{t("settingsRegistrationIntro")}</p>
    <fetcher.Form key={registration.version} method="post" className="settings-registration-form"
      aria-busy={pending || undefined}>
      <input type="hidden" name="expectedVersion" value={registration.version} />
      <label className="settings-registration-option">
        <input type="checkbox" name="googleRegistrationEnabled" defaultChecked={registration.googleRegistrationEnabled}
          disabled={pending} />
        <span>{t("settingsRegistrationGoogle")}</span>
      </label>
      <label className="settings-registration-option">
        <input type="checkbox" name="emailRegistrationEnabled" defaultChecked={registration.emailRegistrationEnabled}
          disabled={pending} />
        <span>{t("settingsRegistrationEmail")}</span>
      </label>
      <button type="submit" disabled={pending}>{pending ? t("authPending") : t("settingsRegistrationSave")}</button>
    </fetcher.Form>
    {fetcher.data?.ok ? <p role="status">{t("settingsRegistrationSaved")}</p> : null}
    {fetcher.data?.error ? <p role="alert">{t(registrationErrorMessages[fetcher.data.error])}</p> : null}
  </section>;
}

export default function SettingsForumRoute() {
  const state = useLoaderData<typeof loader>();
  const routing = useAdministrativeRouting();
  const fetcher = useFetcher<{ ok?: boolean; error?: AuthorizationFailure }>({ key: authorizationFetcherKey });
  return <SettingsShell locale={state.locale} canViewForum current="forum">
    <RegistrationControls registration={state.registration}/>
    <AuthorizationManagementContent {...state} result={fetcher.data}
      inline={{ action: canonicalAuthorizationPath(state.locale,routing), fetcherKey: authorizationFetcherKey }} />
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
