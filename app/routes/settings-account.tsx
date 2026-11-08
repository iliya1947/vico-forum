import { data, Form, useActionData, useLoaderData, useNavigation, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { GoogleAccountLink } from "../auth/google-account-link";
import {
  AccountSecurityError,
  authRuntimeForRequest,
  authSessionForRequest,
  type AccountSecurityErrorCode,
  type AccountSecurityIdentity,
} from "../auth/request-context";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { requireSameOrigin } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { settingsAccountPath } from "../settings/paths";
import { SettingsShell } from "../settings/shell";
import { settingsPrivateHeaders } from "./settings";

type Args = { request: Request; params: { locale?: string }; context: RouterContextProvider };
type Intent = "change-password" | "revoke-one" | "revoke-others";
type ActionError = AccountSecurityErrorCode | "invalid" | "origin";
type ActionOutcome = { saved: Intent } | { error: ActionError };

export function headers() { return settingsPrivateHeaders; }
export function meta() { return [{ title: "Account & security · Vico Forum" }]; }

function identity(context: RouterContextProvider): AccountSecurityIdentity {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  return { userId: session.user.id, sessionId: session.session.id };
}

export async function loader({ request, params, context }: Args) {
  const current = identity(context);
  const security = authRuntimeForRequest(context).security;
  if (!security) throw new Error("Account security runtime is missing");
  let snapshot: Awaited<ReturnType<typeof security.read>>;
  try {
    snapshot = await security.read(request.headers, current);
  } catch (error) {
    if (error instanceof AccountSecurityError) {
      if (error.code === "unavailable") throw new Response("Unavailable", { status: 503, headers: settingsPrivateHeaders });
      if (error.code === "unauthenticated" || error.code === "account-changed") {
        throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
      }
    }
    throw error;
  }
  return data({
    locale: params.locale ?? "en",
    accountId: current.userId,
    sessionId: current.sessionId,
    canViewForum: isBoundOwner(current.userId, context.get(authorizationOwnerContext)),
    ...snapshot,
  }, { headers: settingsPrivateHeaders });
}

function failure(error: ActionError, status: number) {
  return data<ActionOutcome>({ error }, { status, headers: settingsPrivateHeaders });
}

function exactlyOneString(form: FormData, field: string): string | null {
  const values = form.getAll(field);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
}

export async function action({ request, context }: Args) {
  const current = identity(context);
  if (request.method !== "POST") throw new Response("Method Not Allowed", {
    status: 405, headers: { ...settingsPrivateHeaders, Allow: "POST" },
  });
  if (!requireSameOrigin(request)) return failure("origin", 403);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return failure("invalid", 400); }
  const intent = exactlyOneString(form, "intent") as Intent | null;
  if (!intent || !["change-password", "revoke-one", "revoke-others"].includes(intent)) {
    return failure("invalid", 400);
  }
  const allowed = intent === "change-password"
    ? ["intent", "expectedUserId", "expectedSessionId", "currentPassword", "newPassword"]
    : intent === "revoke-one"
      ? ["intent", "expectedUserId", "expectedSessionId", "sessionId"]
      : ["intent", "expectedUserId", "expectedSessionId"];
  if ([...form.keys()].some(key => !allowed.includes(key))) return failure("invalid", 400);
  const expectedUserId = exactlyOneString(form, "expectedUserId");
  const expectedSessionId = exactlyOneString(form, "expectedSessionId");
  if (!expectedUserId || !expectedSessionId) return failure("invalid", 400);
  if (expectedUserId !== current.userId || expectedSessionId !== current.sessionId) {
    return failure("account-changed", 409);
  }
  const security = authRuntimeForRequest(context).security;
  if (!security) throw new Error("Account security runtime is missing");
  try {
    if (intent === "change-password") {
      const oldPassword = exactlyOneString(form, "currentPassword");
      const newPassword = exactlyOneString(form, "newPassword");
      if (oldPassword === null || newPassword === null || oldPassword.length > 128
        || newPassword.length < 8 || newPassword.length > 128) return failure("invalid", 400);
      await security.changePassword(request.headers, current, oldPassword, newPassword);
    } else if (intent === "revoke-one") {
      const sessionId = exactlyOneString(form, "sessionId");
      if (!sessionId || sessionId.length > 256) return failure("invalid", 400);
      await security.revokeOneOther(request.headers, current, sessionId);
    } else {
      await security.revokeAllOthers(request.headers, current);
    }
    return data<ActionOutcome>({ saved: intent }, { headers: settingsPrivateHeaders });
  } catch (error) {
    if (!(error instanceof AccountSecurityError)) throw error;
    const statuses: Record<AccountSecurityErrorCode, number> = {
      unauthenticated: 401, "account-changed": 409,
      "invalid-password": 400, "no-password": 409,
      "not-fresh": 403, "session-not-found": 409,
      "current-session": 409, unavailable: 503,
    };
    return failure(error.code, statuses[error.code]);
  }
}

const errorKeys: Record<ActionError, string> = {
  invalid: "settingsSecurityInvalid",
  origin: "settingsLocaleForbidden",
  unauthenticated: "settingsSecurityUnauthenticated",
  "account-changed": "settingsLocaleConflict",
  "invalid-password": "settingsSecurityWrongPassword",
  "no-password": "settingsSecurityNoPassword",
  "not-fresh": "settingsSecurityNotFresh",
  "session-not-found": "settingsSecuritySessionMissing",
  "current-session": "settingsSecurityCurrentSession",
  unavailable: "settingsSecurityUnavailable",
};

export default function SettingsAccountRoute() {
  const state = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const { t } = useTranslation("common");
  const header = useHeaderAuthUser();
  const currentAccount = header?.id === state.accountId;
  const busy = navigation.state !== "idle";
  const otherSessions = state.sessions.filter(session => !session.current);
  const identityFields = <>
    <input type="hidden" name="expectedUserId" value={state.accountId} />
    <input type="hidden" name="expectedSessionId" value={state.sessionId} />
  </>;
  const formatDate = (iso: string) => new Intl.DateTimeFormat(state.locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(iso));

  return <SettingsShell locale={state.locale} canViewForum={state.canViewForum} current="account">
    <section className="admin-overview settings-overview settings-account">
      <h2>{t("settingsAccount")}</h2>
      {!currentAccount ? <p role="alert">{t("settingsLocaleConflict")}</p> : <>
        {result && "error" in result ? <p role="alert">{t(errorKeys[result.error])}</p> : null}
        {result && "saved" in result ? <p role="status">{t(result.saved === "change-password"
          ? "settingsSecurityPasswordSaved" : "settingsSecuritySessionsSaved")}</p> : null}
        <section className="settings-account-section" aria-labelledby="settings-account-methods">
          <h3 id="settings-account-methods">{t("settingsSecurityMethods")}</h3>
          <ul>{state.linkedMethods.map(method =>
            <li key={method}>{method === "password" ? t("settingsSecurityPasswordMethod") : "Google"}</li>)}</ul>
          {!state.linkedMethods.includes("google")
            ? <GoogleAccountLink callbackURL={settingsAccountPath(state.locale)} expectedUserId={state.accountId} />
            : null}
          {!state.hasPassword ? <p>{t("settingsSecurityNoPassword")}</p> : null}
        </section>
        {state.hasPassword ? <section className="settings-account-section" aria-labelledby="settings-account-password">
          <h3 id="settings-account-password">{t("settingsSecurityPasswordHeading")}</h3>
          <Form method="post" className="settings-account-form" aria-busy={busy || undefined}>
            {identityFields}
            <input type="hidden" name="intent" value="change-password" />
            <label htmlFor="settings-current-password">{t("settingsSecurityCurrentPassword")}</label>
            <input id="settings-current-password" type="password" name="currentPassword"
              autoComplete="current-password" required maxLength={128} disabled={busy} />
            <label htmlFor="settings-new-password">{t("settingsSecurityNewPassword")}</label>
            <input id="settings-new-password" type="password" name="newPassword"
              autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} />
            <button type="submit" disabled={busy}>{t(busy ? "authPending" : "settingsSecurityChangePassword")}</button>
          </Form>
        </section> : null}
        <section className="settings-account-section" aria-labelledby="settings-account-sessions">
          <h3 id="settings-account-sessions">{t("settingsSecuritySessions")}</h3>
          {state.sessionAccess === "not-fresh" ? <p role="status">{t("settingsSecurityNotFresh")}</p>
            : <>
              <ul className="settings-account-sessions">
                {state.sessions.map(session => <li key={session.id}>
                  <div className="settings-account-session-info">
                    <strong><bdi dir="auto">{session.deviceLabel}</bdi></strong>
                    {session.current ? <span>{t("settingsSecurityThisSession")}</span> : null}
                    <span>{t("settingsSecuritySessionCreated")}: <time dateTime={session.createdAt}>
                      {formatDate(session.createdAt)}</time></span>
                    <span>{t("settingsSecuritySessionExpires")}: <time dateTime={session.expiresAt}>
                      {formatDate(session.expiresAt)}</time></span>
                  </div>
                  {!session.current ? <Form method="post" className="settings-account-revoke-form">
                    {identityFields}
                    <input type="hidden" name="intent" value="revoke-one" />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button type="submit" disabled={busy}>{t("settingsSecurityRevokeOne")}</button>
                  </Form> : null}
                </li>)}
              </ul>
              {otherSessions.length ? <Form method="post" className="settings-account-revoke-all">
                {identityFields}
                <input type="hidden" name="intent" value="revoke-others" />
                <button type="submit" disabled={busy}>{t("settingsSecurityRevokeOthers")}</button>
              </Form> : null}
            </>}
        </section>
      </>}
    </section>
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
