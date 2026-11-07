import { redirect, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { credentialReturnPath } from "../auth/credential-path";
import { CredentialView } from "../auth/credential-view";

export function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const locale = params.locale ?? "en";
  const query = new URL(request.url).searchParams;
  const returnTo = credentialReturnPath(locale, query.get("returnTo"));
  if (authSessionForRequest(context)) throw redirect(returnTo);
  // Better Auth may redirect here with arbitrary provider diagnostics. Never reflect them.
  return { locale, returnTo, callbackError: query.has("error") ? "authentication" as const : null };
}

export default function CredentialSignIn() {
  const data = useLoaderData<typeof loader>();
  return <CredentialView {...data} mode="sign-in" />;
}
