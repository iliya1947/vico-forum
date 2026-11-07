import { data, useFetcher, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import {
  AuthorizationManagementContent, type AuthorizationFailure,
} from "../authorization/admin-view";
import { ForumRouteError } from "../forum/ui";
import { SettingsShell } from "../settings/shell";
import { canonicalAuthorizationPath } from "../settings/paths";
import { loader as readCanonicalAuthorization } from "./authorization-admin";
import { settingsPrivateHeaders } from "./settings";

const authorizationFetcherKey = "settings-forum-authorization";

export function headers() { return settingsPrivateHeaders; }

export async function loader(args: { params: { locale?: string }; context: RouterContextProvider }) {
  const session = authSessionForRequest(args.context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: settingsPrivateHeaders });
  if (!isBoundOwner(session.user.id, args.context.get(authorizationOwnerContext))) {
    throw new Response("Forbidden", { status: 403, headers: settingsPrivateHeaders });
  }
  // Reuse the exact legacy management read path and its fresh permission admission.
  const state = await readCanonicalAuthorization(args);
  return data(state, { headers: settingsPrivateHeaders });
}

export default function SettingsForumRoute() {
  const state = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok?: boolean; error?: AuthorizationFailure }>({ key: authorizationFetcherKey });
  return <SettingsShell locale={state.locale} canViewForum current="forum">
    <AuthorizationManagementContent {...state} result={fetcher.data}
      inline={{ action: canonicalAuthorizationPath(state.locale), fetcherKey: authorizationFetcherKey }} />
  </SettingsShell>;
}

export const ErrorBoundary = ForumRouteError;
