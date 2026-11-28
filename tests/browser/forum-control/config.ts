import type { ForumControlOAuthConfig } from "../../../app/forum-control/oauth-provider.server";
import { forumControlScopes } from "../../../app/forum-control/write-tool-contract";

export const origin = "http://127.0.0.1:4242";
export const databaseName = "vico_forum_control_browser_test";
export const config: ForumControlOAuthConfig = {
  ownerUserId: "fixture-owner", issuer: origin + "/api/auth",
  clientId: "fixture-site", resource: origin + "/mcp",
  redirectUri: origin + "/callback", repositoryId: "123",
  loginPage: origin + "/login", consentPage: origin + "/consent",
};
export const scopes = [forumControlScopes.read, forumControlScopes.write, "offline_access"];
