import { redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { credentialReturnPath } from "../auth/credential-path";
import { CredentialView } from "../auth/credential-view";
import { registrationSettingsContext } from "../settings/request-context";
import { RegistrationSettingsUnavailableError } from "../../db/hyperdrive-registration-settings";

export async function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const locale = params.locale ?? "en";
  const returnTo = credentialReturnPath(locale, new URL(request.url).searchParams.get("returnTo"));
  if (authSessionForRequest(context)) throw redirect(returnTo);
  const error = new URL(request.url).searchParams.get("error");
  const callbackError = error === "vico_google_registration_closed" ? "google-closed" as const
    : error === "vico_email_registration_closed" ? "email-closed" as const
      : error ? "authentication" as const : null;
  let flags: { googleRegistrationEnabled: boolean; emailRegistrationEnabled: boolean };
  try {
    const settings = await context.get(registrationSettingsContext).read();
    flags = { googleRegistrationEnabled: settings.googleRegistrationEnabled,
      emailRegistrationEnabled: settings.emailRegistrationEnabled };
  } catch (cause) {
    if (!(cause instanceof RegistrationSettingsUnavailableError)) throw cause;
    // Presentation may degrade to both disabled; no open-by-default fallback.
    flags = { googleRegistrationEnabled: false, emailRegistrationEnabled: false };
  }
  return { locale, returnTo, registrationFlags: flags, callbackError };
}

export default function CredentialSignUp() {
  const data = useLoaderData<typeof loader>();
  return <CredentialView {...data} mode="sign-up" />;
}
