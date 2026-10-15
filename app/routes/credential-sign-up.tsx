import { redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { credentialReturnPath } from "../auth/credential-path";
import { CredentialView } from "../auth/credential-view";

export function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const locale = params.locale ?? "en";
  const returnTo = credentialReturnPath(locale, new URL(request.url).searchParams.get("returnTo"));
  if (authSessionForRequest(context)) throw redirect(returnTo);
  return { locale, returnTo };
}

export default function CredentialSignUp() {
  const data = useLoaderData<typeof loader>();
  return <CredentialView {...data} mode="sign-up" />;
}
