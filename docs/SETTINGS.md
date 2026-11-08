# Settings — product and runtime contract

## Status and source-of-truth boundaries

Settings is an independent five-surface product sequence after ordinary Admin Panel AP-01–AP-11
and Owner/authorization redesign. SET-01–SET-04 are implemented in `main` in the
repository/local-CI path. SET-05–SET-06 remain approved, unassigned future scope,
not implemented routes or server settings. Current factual status:
[PROJECT_STATE.md](../PROJECT_STATE.md).
The ordinary panel contract is [ADMIN_PANEL.md](ADMIN_PANEL.md); application authorization
is governed by [AUTHORIZATION.md](auth/AUTHORIZATION.md).

This document describes deployed-code semantics, not proof of deployed/production
acceptance. Live Google OAuth configuration, real server-side Owner binding,
owner visual acceptance and Stage 6 external integration are not claimed.

## Five surfaces and current access

| Surface | Route | Current implementation and access |
| --- | --- | --- |
| Forum & roles | `/:locale/settings/forum` | **SET-02 implemented**; exact authenticated server-bound Owner only; existing authorization management plus independent new-registration flags |
| Administrator preferences | `/:locale/settings/administrator` | **SET-04 implemented**; authenticated actor with current Admin or Attention access; account/device-local workspace presentation preferences |
| User preferences | `/:locale/settings/user` | **SET-03 implemented**; authenticated users manage browser theme, own preferred locale and existing device-local Editor/code preferences |
| Account & security | No route yet | **SET-05 pending**; future authenticated Better Auth account/session management |
| Privacy | No route yet | **SET-06 pending**; future authenticated online-visibility preference (default ON when implemented) |

`/:locale/settings` is a protected authenticated navigation entry, **not** a sixth
functional Settings surface. It uses one `SettingsShell` inside the existing forum shell,
not a second Admin shell. The forum header/account navigation and ordinary Admin Settings
navigation lead here. The Forum & roles link is shown only to an exact bound Owner;
remaining unimplemented sections (SET-05–SET-06) are explicitly marked Under development
and expose no new settings reads or actions. Complaint priority/settings remain inside Complaints.

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

## User preferences (SET-03)

`/:locale/settings/user` requires an authenticated Better Auth session, not
Owner/Admin permissions. Its loader independently enforces the session and uses
private/no-store responses. User preferences do not grant authorization capabilities.

**Theme** uses the existing browser-wide `vico-theme` preference, not a
per-account database field. Light/Dark persist the existing explicit override;
System removes the override and follows the operating-system color scheme.
Settings and the forum header share observation of the same preference, including
same-tab updates, cross-tab storage events, system changes and reload. If browser
storage is unavailable, the currently applied preference is best-effort and is
not presented as durable or cross-device persistence.

**Preferred language** uses the existing `user.locale` as its sole account
persistence. A same-origin, allowlisted form with an authenticated session may
update **only that session's own** `user.locale`, after validating the exact
canonical active tag against the **healthy current Runtime LocaleRegistry**.
Invalid/inactive/alias choices are rejected; a degraded/unavailable registry
cannot persist a fallback choice. The submitted `expectedUserId` is only a
stale-account check, never a target selector. The language form is keyed by the
authenticated account ID: switching accounts on a still-mounted Settings route
discards the previous account's unsaved choice and initializes from the new
account's saved preference; same-account navigation/revalidation retains an
unsaved choice. No change is posted automatically. After explicit save the
application navigates to the selected locale; explicit locale URLs still take
precedence, while fresh `user.locale` participates in unprefixed negotiation.
Controlled failures preserve protected/private response semantics.

**Editor/code** reuses the four existing device-local, per-account browser keys:
`vico:editor:mode:<userId>`, `vico:editor:spellcheck:<userId>`,
`vico:editor:code-wrap:<userId>` and
`vico:editor:code-lines:<userId>`. The controls expose Simple/Advanced with
unset editor default, spellcheck Auto/On/Off, code wrapping and line numbers.
The shared adapter keeps actual mounted/new MarkdownEditor and ForumCodeBlock
consumers synchronized through same-tab notifications and cross-tab storage
events, while keeping account identities separate. Editor/code preferences do
not acquire server persistence or cross-device sync, and do not change
publication/source/history/attachments contracts from [EDITOR.md](EDITOR.md).

Personal theme, language and Editor/code choices do **not** create Admin
History entries. Reply/mention notification controls, time-zone preference,
translation-versus-original reading preference, drafts/autosave and a separate
accessibility feature package remain deferred; no placeholder silently changes
inbox/unread producers or the existing Editor draft boundary.

## Administrator preferences (SET-04)

`/:locale/settings/administrator` uses the existing Settings shell and has an
independent authenticated loader. A current effective capability admitting either
the ordinary Admin workspace or the separate Needs attention workspace is required;
otherwise the route returns private `401`/`403` (classified authorization outage:
`503`). No role name or stored local preference grants access. Forum & roles
continues to require the exact bound Owner. Settings navigation and the header
derive available destinations from the server's current permission projection,
including close-only `forum.topic.close` administrators; the Admin and Attention
routes retain their own authoritative guards.

Preferences use one versioned, allowlisted browser-local record per authenticated
account and device (`vico:administrator-workspace:v1:<userId>`), with no server
sync. It stores only: default versus last-visited Admin entry and permitted
Admin workspace ID; default versus last-visited Attention mode/group; comfortable
or compact density; and default expansion of **secondary technical details**.
The initial values select Admin Overview and Attention Signals/needs-details,
comfortable density and collapsed technical details. Unknown versions, corrupted
or invalid enum combinations fall back to safe defaults. Local storage denial
allows best-effort same-tab use, not guaranteed persistence. Same-tab/cross-tab
updates and account changes keep choices isolated; a still-mounted route never
reads or writes another account's preferences.

Default/last choices influence **entry links**, not direct destinations. Before
resolving an entry, the chosen workspace ID or Attention mode/group is intersected
with the actor's currently permitted choices and falls back to an accessible
option after a grant change or revoke. Explicit `/:locale/admin` remains Admin
Overview; explicit Admin paths, Attention URL/query values and private-object
deep links remain authoritative. The last-visited record is updated only for
eligible workspace index paths or validated Attention mode/group, never a private
topic/user/measure/Case ID, URL, search text or private-resource filter.
Browser preferences are presentation state, not authentication, server authority,
queue ordering, paging policy or domain mutation parameters.

Density is consumed by the real AdminShell (including authorized administrative
measure detail) and Attention presentation. Secondary technical-detail controls
apply to existing role/user/security-related identifier and metadata disclosures,
with an individual manual expand/collapse override. Reasons, outcomes, errors,
decisions and mutation controls remain visible independently of this preference.
SET-04 uses existing EN/RU/HE localization, RTL, responsive and keyboard-capable
controls, without introducing a second Settings shell.

SET-04 adds no database table, schema migration, new permission/RBAC, global
settings writer or Admin History entry for personal presentation choices.
It does not change existing Admin/Attention admission or domain operations.
Repository/local-CI acceptance covers actual built Worker/Better Auth/isolated
PostgreSQL 17/Chromium; it is not deployed or production acceptance.

## Approved but not yet implemented (SET-05–SET-06)

- **SET-05 Account & security:** future supported Better Auth account/session
  operations, without replacing the authentication/session provider.
- **SET-06 Privacy:** future persisted per-user public online visibility
  (default ON, opt-out), applied to public online list/count and heartbeat.

These future packages are product/technical boundaries, not claims that their
routes, storage, APIs, mutations or acceptance already exist. Implement only
through separately approved bounded packages; no universal settings JSON store,
second RBAC, deputy stub or unrelated Stage 6 work.

## Verification boundary

SET-02, SET-03 and SET-04 completed repository/local-CI implementation, PostgreSQL 17
integration and local Chromium/built Worker/Better Auth acceptance before their
merges. Those results do not establish live Google credentials, actual Owner
binding, deployed/production acceptance or owner visual approval. Exact
implementation/review/correction/check snapshots are retained in
[PROJECT_HISTORY_18.md](PROJECT_HISTORY/PROJECT_HISTORY_18.md) and
[PROJECT_HISTORY_19.md](PROJECT_HISTORY/PROJECT_HISTORY_19.md) and
[PROJECT_HISTORY_20.md](PROJECT_HISTORY/PROJECT_HISTORY_20.md), not in
`PROJECT_STATE.md`.
