# Settings — product and runtime contract

## Status and source-of-truth boundaries

Settings is an independent five-surface product sequence after ordinary Admin Panel AP-01–AP-11
and Owner/authorization redesign. SET-01–SET-06 are implemented in `main` in the
repository/local-CI path, including the authenticated Privacy route and persisted
online-visibility preference. Current factual status:
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
| Account & security | `/:locale/settings/account` | **SET-05 implemented**; authenticated own linked-method, credential-password and session controls through existing Better Auth |
| Privacy | `/:locale/settings/privacy` | **SET-06 implemented**; authenticated own account-wide public online-visibility toggle, persisted in PostgreSQL, default ON |

`/:locale/settings` is a protected authenticated navigation entry, **not** a sixth
functional Settings surface. It uses one `SettingsShell` inside the existing forum shell,
not a second Admin shell. The forum header/account navigation and ordinary Admin Settings
navigation lead here. The Forum & roles link is shown only to an exact bound Owner;
Privacy links to its independently authenticated own-account setting, not to
the public privacy-policy document. Complaint priority/settings remain inside Complaints.

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

## Account & security (SET-05)

`/:locale/settings/account` is an independently guarded **authenticated**
personal Settings route. It uses the existing `SettingsShell` and the request-local
`AuthRuntime` backed by Better Auth **1.7.7** and the existing PostgreSQL
user/account/session tables; no new authentication provider, schema, migration,
permission or Admin History writer was introduced. Non-authenticated loaders
and actions fail privately; no Owner/Admin permission is needed.

**Linked methods and credentials.** The loader reads the current user's linked
Better Auth accounts and projects only safe method labels (password and Google),
plus whether a real credential password exists. OAuth access/refresh/ID tokens,
password hashes, provider-private payloads and session bearer tokens are never
included in the public or private page DTO. The existing authenticated
`GoogleAccountLink` control is reused here with its explicit current-user
identity check; Profile now points to this Account page rather than offering a
second linking flow. Closing **new** Google registration does not disable
explicit linking for an already authenticated account.

Password change is offered **only** when an existing credential account has a
stored password. It requires the current password and independently rechecks
the current Better Auth session and submitted stale-user/session expectations.
It cannot create a password for a Google-only account. Password change uses the
existing Better Auth HTTP handler at canonical `/api/auth/change-password`, not a
direct `auth.api.changePassword` call that skips HTTP admission. Thus Settings
and direct canonical requests share Better Auth's existing **database-backed,
per-trusted-client-IP change-password limit of 3 requests per 10 seconds** in
the installed version. On exhaustion the private `429` response propagates
sanitized `Retry-After` and `X-Retry-After` through the Settings action and
document headers, with localized feedback. Rejected attempts do not change
the password. The call passes `revokeOtherSessions: false`; password change
does not implicitly sign out other sessions.

**Own sessions.** The loader lists active sessions of the authenticated user,
with session ID, creation/expiry timestamps, a plain-text device/user-agent
label and an explicit current-session marker. Only the server uses the session
token. The action can revoke **one other** session by resolving the submitted
session ID against freshly loaded own sessions and passing its token internally
to Better Auth; foreign, expired, missing and current-session targets cannot be
used to sign out another user's session or the caller's current session. A
separate command revokes **all other** sessions but preserves the current
session and leaves unrelated accounts untouched. Subsequent requests from
revoked sessions are unauthorized.

Better Auth `listSessions` enforces session freshness. If it reports
`SESSION_NOT_FRESH`, the page shows no session controls and directs the user
through the existing sign-out and sign-in path (safe localized return URL).
**Both** direct single-session and all-other-session revocations require the
same fresh-session check on the server; hiding UI controls is not sufficient.
No custom reauthentication protocol, separate multi-session provider or device
fingerprint management is introduced.

**Request and response protections.** Each loader/action rechecks the
authoritative session and current identity independently of the parent shell.
State-changing forms validate same-origin, one exact allowlisted intent/fields
and the current account/session expectations; submitted user IDs never select
the authorized subject. Stale-account/session conflicts, missing targets,
credential failures and classified unavailable storage have controlled
private responses. Unexpected schema/configuration errors are not silently
reclassified. Protected document/data, successful writes and controlled
failures use `private, no-store`; password/session secrets are not reflected
in responses, URLs or browser controls. Existing Better Auth
cookie/session handling and independent sign-out behavior are preserved.

Account & security does **not** implement password reset/recovery,
Google-only set-password, email change, provider unlink, account deletion,
two-factor authentication/passkeys or production credential configuration.

## Privacy: public online visibility (SET-06)

`/:locale/settings/privacy` is an independent authenticated personal
Settings route inside the existing `SettingsShell`. It presents one setting,
**Show me online**, with an explicit Save. It does not grant an Admin/Owner
capability and does not replace the public privacy-policy destination. The
current session's Better Auth `user.id`, never an input-supplied target, is
the authoritative subject. EN/RU/HE, keyboard input, responsive and RTL
presentation use the existing Settings/localization architecture.

**Persistence and default.** Forward migration
`0061_user_privacy_preferences.sql` adds
`user_privacy_preferences` with one row per `user.id`, a non-null
`show_online` boolean (default true), a timestamp and a cascading user
foreign key. A missing preference row means **ON**; an actual failed
read does not mean ON. The preference is account-wide and persists across
sessions/devices. No shared settings JSON, second RBAC or new Owner exception
is created. Personal privacy changes do not append Admin History events.
The web runtime can SELECT/INSERT/UPDATE preferences and DELETE the owner's
current presence; it cannot DELETE preference rows. The localization-read
role does not gain access to these relations through SET-06.

**Server-authoritative presence.** Turning OFF uses a READ COMMITTED
transaction that locks the authenticated user's existing account row,
upserts the preference and deletes that user's
`forum_online_presence` row atomically. Repeated OFF also clears any
newly stale presence row. The heartbeat acquires the **same account-row
lock** and reads the latest committed preference in a separate statement
*after* acquiring it: OFF heartbeats do not insert or refresh presence.
No global serialization lock is introduced; existing 45-second
write-throttle and five-minute online window remain unchanged. Turning
ON does **not** manufacture activity: the user returns to the public
list only after a permitted ordinary heartbeat.

**Public list and count.** The public online reader joins current
preferences and excludes `show_online = false` in SQL **before** the
window count, ordering and 12-member limit. This also excludes a hidden
user whose stale presence row was restored or retained, without
altering the public profile or published posts. Absence of a preference
continues to count as ON for a recently active authenticated member.
No private preferences, emails or session data are included in the
public member DTO.

**Route and failure boundaries.** Each loader/action independently
requires a valid current authenticated session. The POST requires
same origin, exactly one `intent=save-online-visibility`,
`expectedUserId` matching the current session and explicit
`showOnline="true"` or `"false"`; duplicate, missing and extra
fields are rejected. The checkbox's absence is never interpreted as
ON, and a client cannot choose another account. Stale accounts/identity
produce controlled `409`; guests `401`, invalid inputs `400`,
route-owned cross-origin denials `403`, classified database
unavailability `503`. A foreign-Origin request may be rejected by
React Router *before* the action as a generic `400` with
`Vary: Origin`; it does not mutate the preference. PostgreSQL
availability/transport exceptions wrapped in Drizzle's `cause`
remain classified for the unavailable response, while schema,
authentication/configuration and programming failures retain the
normal unexpected-error path. The UI does not claim a save when the
server result is unavailable and never automatically retries a POST.
Unsaved form state is isolated by account and refreshed persisted
state; a mounted route cannot expose or submit another account's draft.

Privacy Settings document/data, successful writes and controlled
route-owned failures use `private, no-store`. Because online member
identities depend on the current preference, the homepage document
**and data response** also use `private, no-store`; heartbeat
success and route-owned controlled failures use `no-store`. When
online storage is classified unavailable, the optional homepage card
reports unavailable rather than displaying a fabricated zero, while
the rest of the homepage can render. No production cache rollout or
external/deployed acceptance follows merely from these headers.

SET-06 does **not** add invisible browsing, profile/post privacy,
account deletion, data export, password/session management, new
registration policy, permission keys, notifications or other
unapproved privacy controls.

## Verification boundary

SET-02 through SET-06 completed repository/local-CI implementation, applicable
PostgreSQL 17 integration and local Chromium/built Worker/Better Auth acceptance
before their merges. Those results do not establish live Google credentials, actual Owner
binding, deployed/production acceptance or owner visual approval. Exact
implementation/review/correction/check snapshots are retained in
[PROJECT_HISTORY_18.md](PROJECT_HISTORY/PROJECT_HISTORY_18.md) and
[PROJECT_HISTORY_19.md](PROJECT_HISTORY/PROJECT_HISTORY_19.md),
[PROJECT_HISTORY_20.md](PROJECT_HISTORY/PROJECT_HISTORY_20.md) and
[PROJECT_HISTORY_21.md](PROJECT_HISTORY/PROJECT_HISTORY_21.md) and
[PROJECT_HISTORY_22.md](PROJECT_HISTORY/PROJECT_HISTORY_22.md), not in
`PROJECT_STATE.md`.
