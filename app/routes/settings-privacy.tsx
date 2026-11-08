import { useState } from "react";
import { data, Form, useActionData, useLoaderData, useNavigation, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { requireSameOrigin } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { userPrivacyContext } from "../settings/user-privacy-context";
import { SettingsShell } from "../settings/shell";
import { UserPrivacyAccountMissingError } from "../../db/user-privacy";
import { UserPrivacyUnavailableError } from "../../db/hyperdrive-user-privacy";
import { settingsPrivateHeaders } from "./settings";

type Args = { request: Request; params: { locale?: string }; context: RouterContextProvider };
type PrivacyError = "invalid" | "origin" | "conflict" | "unavailable";
type PrivacyOutcome = { saved: true } | { error: PrivacyError };

export function headers() { return settingsPrivateHeaders; }
export function meta() { return [{ title: "Privacy · Vico Forum" }]; }

export async function loader({ params, context }: Args) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  let showOnline: boolean;
  try {
    showOnline = await context.get(userPrivacyContext).read(session.user.id);
  } catch (error) {
    if (error instanceof UserPrivacyAccountMissingError) throw new Response("Conflict", {
      status: 409, headers: settingsPrivateHeaders,
    });
    if (error instanceof UserPrivacyUnavailableError) throw new Response("Unavailable", {
      status: 503, headers: settingsPrivateHeaders,
    });
    throw error;
  }
  return data({
    locale: params.locale ?? "en",
    accountId: session.user.id,
    showOnline,
    canViewForum: isBoundOwner(session.user.id, context.get(authorizationOwnerContext)),
  }, { headers: settingsPrivateHeaders });
}

function failure(error: PrivacyError, status: number) {
  return data<PrivacyOutcome>({ error }, { status, headers: settingsPrivateHeaders });
}

function exactlyOneString(form: FormData, field: string): string | null {
  const values = form.getAll(field);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
}

export async function action({ request, context }: Args) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  if (request.method !== "POST") throw new Response("Method Not Allowed", {
    status: 405, headers: { ...settingsPrivateHeaders, Allow: "POST" },
  });
  if (!requireSameOrigin(request)) return failure("origin", 403);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return failure("invalid", 400); }
  if ([...form.keys()].some(key => !["intent", "expectedUserId", "showOnline"].includes(key))) {
    return failure("invalid", 400);
  }
  const intent = exactlyOneString(form, "intent");
  const expectedUserId = exactlyOneString(form, "expectedUserId");
  const value = exactlyOneString(form, "showOnline");
  if (intent !== "save-online-visibility" || !expectedUserId || (value !== "true" && value !== "false")) {
    return failure("invalid", 400);
  }
  if (expectedUserId !== session.user.id) return failure("conflict", 409);
  try {
    await context.get(userPrivacyContext).save(session.user.id, value === "true");
    return data<PrivacyOutcome>({ saved: true }, { headers: settingsPrivateHeaders });
  } catch (error) {
    if (error instanceof UserPrivacyAccountMissingError) return failure("conflict", 409);
    if (error instanceof UserPrivacyUnavailableError) return failure("unavailable", 503);
    throw error;
  }
}

function PrivacyForm({ accountId, showOnline, busy }: {
  accountId: string; showOnline: boolean; busy: boolean;
}) {
  const { t } = useTranslation("common");
  const [enabled, setEnabled] = useState(showOnline);
  return <Form method="post" className="settings-privacy-form" aria-busy={busy || undefined}>
    <input type="hidden" name="intent" value="save-online-visibility" />
    <input type="hidden" name="expectedUserId" value={accountId} />
    {/* The checkbox has no name: one explicit boolean is always submitted. */}
    <input type="hidden" name="showOnline" value={enabled ? "true" : "false"} />
    <label className="settings-privacy-choice">
      <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)}
        disabled={busy} />
      <span>{t("settingsPrivacyShowOnline")}</span>
    </label>
    <p>{t(enabled ? "settingsPrivacyVisible" : "settingsPrivacyHidden")}</p>
    <button type="submit" disabled={busy}>{t(busy ? "authPending" : "settingsPrivacySave")}</button>
  </Form>;
}

const privacyErrors = {
  invalid: "settingsPrivacyInvalid",
  origin: "settingsPrivacyForbidden",
  conflict: "settingsLocaleConflict",
  unavailable: "settingsPrivacyUnavailable",
} as const;

export default function SettingsPrivacyRoute() {
  const state = useLoaderData<typeof loader>();
  const outcome = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";
  const { t } = useTranslation("common");
  const currentAccount = useHeaderAuthUser()?.id === state.accountId;
  return <SettingsShell locale={state.locale} canViewForum={state.canViewForum} current="privacy">
    <section className="admin-overview settings-overview settings-privacy">
      <h2>{t("settingsPrivacy")}</h2>
      <p>{t("settingsPrivacyIntro")}</p>
      {!currentAccount ? <p role="alert">{t("settingsLocaleConflict")}</p> : <>
        {outcome && "error" in outcome ? <p role="alert">{t(privacyErrors[outcome.error])}</p> : null}
        {outcome && "saved" in outcome ? <p role="status">{t("settingsPrivacySaved")}</p> : null}
        <PrivacyForm key={`${state.accountId}:${state.showOnline}`}
          accountId={state.accountId} showOnline={state.showOnline} busy={busy} />
      </>}
    </section>
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
