# Settings — product and runtime contract

## Status and source-of-truth boundaries

Settings is an independent five-surface product sequence after ordinary Admin Panel AP-01–AP-11
and Owner/authorization redesign. SET-01 and SET-02 are implemented in `main` in the
repository/local-CI path. The remaining SET-03–SET-06 are approved future scope, not
implemented routes or server settings. Current factual status: [PROJECT_STATE.md](../PROJECT_STATE.md).
The ordinary panel contract is [ADMIN_PANEL.md](ADMIN_PANEL.md); application authorization
is governed by [AUTHORIZATION.md](auth/AUTHORIZATION.md).

This document describes deployed-code semantics, not proof of deployed/production
acceptance. Live Google OAuth configuration, real server-side Owner binding,
owner visual acceptance and Stage 6 external integration are not claimed.

## Five surfaces and current access

| Surface | Route | Current implementation and access |
| --- | --- | --- |
| Forum & roles | `/:locale/settings/forum` | **SET-02 implemented**; exact authenticated server-bound Owner only; existing authorization management plus independent new-registration flags |
| Administrator preferences | No route yet | **SET-03 pending**; future per-admin convenience preferences, gated by current Admin or Attention access |
| User preferences | No route yet | **SET-04 pending**; future authenticated per-user preference controls |
| Account & security | No route yet | **SET-05 pending**; future authenticated Better Auth account/session management |
| Privacy | No route yet | **SET-06 pending**; future authenticated online-visibility preference (default ON when implemented) |

`/:locale/settings` is a protected authenticated navigation entry, **not** a sixth
functional Settings surface. It uses one `SettingsShell` inside the existing forum shell,
not a second Admin shell. The forum header/account navigation and ordinary Admin Settings
navigation lead here. The Forum & roles link is shown only to an exact bound Owner;
unimplemented sections are explicitly marked Under development and expose no new
settings reads or actions. Complaint priority/settings remain inside Complaints.

The locale segment uses the existing generic locale boundary and canonical registry;
the new UI is localized for EN/RU/HE and supports responsive/RTL layout. Direct route
loaders independently enforce their own access even when reached without navigation.

## Forum & roles: authorization management (SET-01 + SET-02)

The existing role/grant/assignment/per-user override management view is reused at
`/:locale/settings/forum`. There is **one** authoritative authorization-management
mutation writer: `/:locale/admin/authorization` and its existing six intents
(create/rename/delete custom role, replace grants, assign role, update per-user override).
The Settings view submits inline to that canonical action; it does not duplicate
repository mutations, role state, permission catalog or History production.

All six authorization-management writes require the exact authenticated
server-bound Owner and existing fresh permission/transactional checks, including
no-op or forged direct POST. The existing `access.authorization.manage` capability
still permits its protected Roles and authorization-user **reads** for non-Owners at
legacy entry points; these remain read-only without mutation forms. It does not grant
access to the new Owner-only Forum & roles Settings page. Owner authority is determined
by server-only `VICO_OWNER_USER_ID` matched to the Better Auth `user.id`; never by
email, a role or submitted user ID. Raw grants/overrides, transaction mutex, AP-10
authority constraints, and atomic Admin History remain authoritative as specified
in `AUTHORIZATION.md`.

The current-release Owner-only application policy leaves a future delegation
design possible, but does not implement deputy roles or a dormant deputy path.

## Independent new-registration policy (SET-02)

Migration `0060_forum_registration_settings.sql` introduces one typed PostgreSQL
singleton `forum_registration_settings` (`id = 1`), seeded with:

- `google_registration_enabled = true`;
- `email_registration_enabled = true`;
- positive CAS `version` (initially 1) and `updated_at`.

The two booleans independently control **creation of new** Google OAuth and
email/password accounts. Either flag may be off and **both false are valid**.
There is no master switch, last-open-method requirement, Owner-registration
exception, account deletion or automatic credential/provider disablement.
An absent/invalid singleton is an invariant error, **not** an implicit
open-by-default fallback.

Only the exact authenticated Owner can update flags. The server validates
same-origin and an allowlisted form, reads fresh Owner binding/session,
locks the singleton, compares `expectedVersion` and applies a transactional CAS.
A stale version returns `409`; an unchanged update preserves version and
does not append History. An actual change increments version and atomically appends
one ordinary Admin History `settings.registrationChanged` event against
`forum-settings / registration`, with bounded before/after booleans and versions.
Denied/rolled-back writes append no event. History-reader access remains gated
by `admin.history.read`; a failed History insert rolls back the policy change.
The runtime registration relation grants the web role SELECT/UPDATE but not
INSERT/DELETE.

## Authoritative Better Auth admission

The installed Better Auth `1.7.7` `user.validateUserInfo` lifecycle receives a
fresh PostgreSQL policy read at `source.action === "create-user"`:

1. `source.method === "email-password"` checks the email flag.
2. `source.method === "oauth"` with `source.oauth.providerId === "google"`
   checks the Google flag.
3. Unknown new-account methods are not silently admitted.

Intentional closure returns the safe method-specific
`vico_email_registration_closed` or `vico_google_registration_closed` denial.
A closed registration method does **not** disable sign-in for an existing
email/password or Google user, or explicit Google linking by an already
authenticated user. Better Auth account linking remains explicit-only:
unverified same-email local accounts are not linked implicitly, and the
authenticated `link-social` request checks the current server session and
`x-vico-link-user` stale-identity expectation. Existing provider/email
verification and Origin checks remain in place.

New-user policy is read at actual account creation, not from UI input,
OAuth redirect initiation, a long-lived cache or a claimed provider field.
A Google OAuth flow initiated while registration was open is subject to
the **current** policy at its creation callback. Once a creation was admitted,
a later flag change does not retroactively remove that account or session.

Database connection/availability/query-timeout failures in the admission path
fail closed. The request-local production `AuthRuntime.handle` preserves the
original policy-read error across Better Auth `1.7.7` validation wrapping:
classified PostgreSQL unavailability produces a safe no-store `503`, while
missing singleton, schema/configuration or unexpected errors take the normal
unexpected-error path rather than becoming ordinary `403 validation_failed`.
Deliberate policy closure retains method-specific denial (including a safe
localized OAuth callback error); it is not classified as a storage outage.
No new user/account/session is written on a denied/failed admission.

The public `/:locale/sign-up` page reads only the two booleans in a no-store
response, hides/disables unavailable registration choices and presents safe
localized feedback. On a classified policy-read outage, presentation may
disable both choices rather than treating either as open. **The UI is not the
security boundary**: direct Better Auth endpoints obey the same server-side
creation gate. Sign-in remains independently available.

All protected Settings document/data, success and controlled failure responses
use private/no-store semantics. Independent session/Owner checks precede
protected Settings reads or writes; user-controlled form/identity fields
never select the authorized actor. Stale UI conflict revalidation does not
automatically replay a POST. Unexpected failures must not be converted into
silent success or ordinary authorization denial.

## Approved but not yet implemented (SET-03–SET-06)

- **SET-03 Administrator preferences:** per-admin convenience presentation,
  without introducing a global settings store or new Admin permission system.
- **SET-04 User preferences:** future controls over existing theme, locale and
  editor-preference mechanisms, respecting their current storage ownership.
  Reply/mention notification toggles were explicitly deferred; hiding types in
  the UI is not a substitute for authoritative unread/producer semantics.
- **SET-05 Account & security:** future supported Better Auth account/session
  operations, without replacing the authentication/session provider.
- **SET-06 Privacy:** future persisted per-user public online visibility
  (default ON, opt-out), applied to public online list/count and heartbeat.

These are product/technical boundaries, not claims that routes, storage, APIs,
mutations or acceptance already exist. Implement only by their separately
approved bounded packages. Do not add a universal settings JSON store, second
RBAC, deputy stub or unrelated Stage 6 work as part of SET-02.

## Verification boundary

SET-02 completed repository/local-CI implementation, PostgreSQL 17 integration
and local Chromium/built Worker/Better Auth tests before its merge. Those results
do not establish live Google credentials, actual Owner binding, deployed/production
acceptance or owner visual approval. Exact PR/review/check snapshots are retained
in [PROJECT_HISTORY_18.md](PROJECT_HISTORY/PROJECT_HISTORY_18.md), not in
`PROJECT_STATE.md`.
