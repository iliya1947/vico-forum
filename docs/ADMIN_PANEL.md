# Ordinary admin panel

## Status and source-of-truth boundary

This document is the permanent product and technical contract for the ordinary Vico Forum
admin panel. AP-01 established the documentation contract. AP-02 implements
`/:locale/admin`: a protected reusable shell/navigation and Overview with real public
aggregate counts. The existing `/:locale/admin/authorization` UI remains independently
protected at its original URL and, in AP-04, reuses the common shell/navigation.
AP-03 adds authorization-change History and protected Overview recent actions. AP-05 reuses
existing topic operations in shared Quick actions and connects their forum/Help History producers. AP-06 adds
protected category/section browsing and dedicated object pages. AP-07 adds administrative topic detail
and shared source-locale/history actions for individual messages. AP-08 adds shared topic close/reopen.
AP-09 adds protected Users index/detail with the independent `admin.users.read` capability.
The selected user's authorization snapshot requires the separate
`access.authorization.manage` read capability; inline assignment/override controls
are writable only for the exact server-bound Owner (SET-01). AP-10 adds configurable administrative measures, exact-measure
appeals, their affected-operation enforcement and the independent
`admin.users.blocks.manage` / `admin.users.blocks.managePrivileged` capabilities.
AP-02 itself added no schema
or permission keys; AP-03 adds `admin.history.read`, AP-09 adds `admin.users.read`, and AP-10
adds the two block-management capabilities plus its measure persistence.

Other routes and capabilities described below as delivery targets become available only
through their respective bounded implementation PRs. Settings is a separate sequence outside
the completed AP-01–AP-11 delivery scope. SET-01–SET-02 now provide a real protected
Settings entry and Owner-only Forum & roles page; User preferences (SET-03)
and Administrator preferences (SET-04) are also implemented. Account & security
(SET-05) and Privacy (SET-06) are implemented for authenticated users in
repository/local-CI. Privacy provides an account-wide public online-visibility
setting; its authoritative contract is in `SETTINGS.md`. See `SETTINGS.md` for their access and registration contracts.
Users is now a real destination for `admin.users.read`;
an authorization-manager without that permission keeps the existing authorization-user-management
subset rather than gaining the general Users directory.

Related sources of truth:

- [PROJECT.md](../PROJECT.md) — product and architecture baseline;
- [AUTHORIZATION.md](auth/AUTHORIZATION.md) — authoritative application authorization;
- [SETTINGS.md](SETTINGS.md) — Settings surfaces, Owner-only Forum & roles and registration policy;
- [UI_UX_PASS.md](UI_UX_PASS.md) — shared presentation, localization and acceptance;
- [PROJECT_STATE.md](../PROJECT_STATE.md) — factual implementation state;
- [ROADMAP.md](../ROADMAP.md) — development and release boundaries.

[PR #251](https://github.com/iliya1947/vico-forum/pull/251) is the planning, coordination,
assignment and progress channel for this work, by direct developer instruction. Do not
duplicate its reports or status into PR #236 unless the developer explicitly requests it.
Implementation uses separate bounded PRs from current `main`; each dependent package starts
after its prerequisite is reviewed and merged. This document contains lasting requirements,
not agent reports or a claim that those packages have shipped.

## Product model and boundaries

The global admin panel is a protected service area for managing the forum itself. Its
top-level structure, in order, is:

1. Overview
2. Forum
3. Users
4. Roles & permissions
5. History
6. Settings

Overview is a real landing page: available destinations, concise real forum statistics and,
once History is implemented, recent significant administrative actions for authorized readers.
Statistics must not be reconstructed from truncated lists. Missing or unavailable data is
reported truthfully; synthetic recent actions are not a runtime substitute for History.

Forum follows `category → section → topic → messages`. Categories, sections and topics each
have an administrative object page. Users have a searchable/listable index, list quick
actions and a dedicated administrative user page. Messages are administered inside topic
context and through Quick actions; they do not get a separate administrative page.

An object page does not authorize unspecified create, rename, move, delete, bulk or edit-any
operations. Each new operation needs concrete behavior, an authoritative backend contract,
its applicable permission, state validation, reason rule and tests before implementation.
Topic closure/reopening to new replies follows the approved AP-08 boundary below.

Three boundaries remain distinct:

- **Needs attention** (`/:locale/attention`) is a separate case/action queue with its own
  permission-scoped Signals, Complaints and Security surfaces. It is not an admin section
  or embedded Overview queue. Reusing a domain operation does not migrate its cases or
  private explanations into the global panel.
- **Contextual administration** exposes applicable Quick actions near an object. It shares
  authoritative operations with the global panel, not a second administration backend.
- **Future super-admin UI** is a separately designed owner-only surface. Account deletion,
  deeper/full audit, infrastructure, deployments, secrets and provider administration are
  outside the ordinary panel. Do not implement foundations solely for that future UI.

Reserved Help & solutions category/service-section identities retain their existing rules.
Administrative browsing must not turn the internal service section into an ordinary public
section or enable unspecified structural mutations. Public discovery retains its public
location projection, including `section: null` for Help questions. Any necessary internal
admin projection is separately protected and does not alter that public contract.

During owner-only pre-release, approved unfinished destinations may use the shared localized
Under development mechanism. This does not grant a private read or mutation. Settings is
a separate approved five-surface product sequence outside AP-01–AP-11.
SET-01–SET-06 have implemented Owner-only authorization writes, the protected Settings
shell and Owner-only Forum & roles (including new-registration controls), authenticated
User preferences, Account & security and Privacy, and Admin/Attention-gated Administrator
preferences in repository/local-CI. Privacy is available at `/:locale/settings/privacy`
without an Owner/Admin permission. Real Google/Owner binding acceptance remains Stage 6.

## Implemented category/section browsing (AP-06)

`/:locale/admin/forum` lists categories; `/:locale/admin/forum/categories/:categoryId`
shows category metadata and its sections; `/:locale/admin/forum/sections/:sectionId`
shows section metadata and its parent category. Forum navigation is current on all three
pages. The old `under-development?feature=admin-forum` link redirects to the protected index.

Each flat route independently checks the existing Forum admission/read boundary before
parsing object/query input or reading private data. This adds no permission, role, schema,
migration or runtime privilege. Request-scoped resolver snapshots and next-request revocation
are inherited from the existing authorization capability. Success and controlled
401/403/400/404/503 responses use `private, no-store`; typed authorization/database outages
fail closed while unexpected failures propagate to the existing error boundary.

A separate protected admin reader returns only category/section identifiers, names,
relationships, reserved/service flags and aggregate counts. It uses existing SELECT access
to categories, sections, topics and posts. Category lists and category child-section lists
support literal case-insensitive name/ID search (`q`, trimmed, at most 200 Unicode code points)
and stable ID keyset paging (`after`, at most 2048 UTF-8 bytes), 25 items per page.
Search filters run in PostgreSQL before LIMIT; exact matching totals do not shrink with
the cursor. Object IDs have the same 2048-byte bound. Duplicate query/cursor values,
empty cursors and NUL are rejected. Counts are independent aggregates; empty results,
zero counts and missing objects are presented truthfully. Search starts a fresh page;
next/first links preserve the filter. These are live lists, not a multi-request snapshot.

The reserved Help category and internal service section have explicit localized labels.
Admin category counts include that internal section. The service-section public-view link
opens the public Help category; no public service-section URL is introduced. Public readers,
Overview public aggregates and Help discovery `section: null` remain unchanged. No topic or
message body, revision, user email, Cases or History payload is included in the admin DTO.

This slice is read-only. Section detail provides counts and a public-view link; administrative
topic navigation/message actions belong to AP-07. Structural create/rename/move/delete,
closure, Users and blocking are outside AP-06. There is no speculative Quick actions menu
without an approved category/section operation. EN/RU/HE, shared AdminShell, logical CSS,
keyboard search/navigation and responsive/RTL behavior apply to these pages.

## Topic detail and message actions (AP-07)

The protected `/:locale/admin/forum/sections/:sectionId` page additionally lists that
section's topics. Discovery is a scoped PostgreSQL current-title/ID search, literal
case-insensitive and filtered before LIMIT; each 25-topic ID-keyset page has lookahead and
an independent matching total. Current title/source locale and real post count are projected,
not message bodies or prior revisions. The internal Help service section stays protected;
no public service-section destination is created. Empty, missing, malformed and unavailable
states retain the existing AP-06 semantics.

`/:locale/admin/forum/topics/:topicId` is a dedicated protected topic page, reached from
a section or directly. Its loader independently checks the implemented Forum admission
permissions before target validation/private reads; it rechecks the individual Quick action
permissions for the current actor. It reuses the current `ForumReader.readTopicPage()` rather
than adding another writer, topic domain model or history-paging API. An explicit private
admin DTO exposes current title and messages, their revision identities, author labels,
timestamps, relationships, current solution/Help states and published attachment metadata.
The private Help duplicate relationship ID and pending appeal ID are present only with
current `forum.helpDuplicate.manage`; no private appeal explanation, complaint Case data,
prior revision bodies, email or session data is serialized.

The page uses one `AdminShell`, Forum navigation and category → section → topic hierarchy,
with safe Markdown, revision-bound current translations/original fallback, source language
direction, attachment URLs from existing post-asset membership, and canonical public links.
Post IDs and numbered anchors stay stable in chronological original ordering even when
the best answer is visually promoted. It adds no publishing, arbitrary edit-any, deletion or attachment lifecycle capability.
AP-08 subsequently adds shared closure controls; AP-07 itself added no closure capability.

Topic-level Quick actions reuse `TopicQuickActions inline`. A shared per-message disclosure
is used by admin and public topic pages: correction of the current post source locale requires
`forum.sourceLocale.correctAny` in admin scope, while viewing previous published revisions
requires the independent `forum.post.history.read` permission. History is fetched only on
explicit demand, bound to the canonical topic/post and current session. Viewer/target/grant
changes isolate cached fetcher responses; old revision bodies cannot be reused across another
context. Display preserves exact stored revision text, source language and UTC timestamps.

Both message operations POST to the existing canonical `/:locale/topics/:topicId` action,
not a second admin API. The source-correction form transmits current `postId`,
`expectedRevisionId`, `operationScope=any`, source locale and stale-account expectation.
The server still authorizes the session, origin, effective capability, post/topic membership,
non-`und` locale and revision CAS. Its inline response stays on the current admin/public
page while the ordinary caller retains its old redirect. A stale 409 refreshes the view but
never automatically retries the write. History responses and controlled mutation errors
use `private, no-store`; reader failure/denial never degrades into an unprotected result.
These paths preserve the existing significant-action History producer and do not create
a separate event for history reads or duplicate a Complaints action/Decision.

No new RBAC keys, database migrations, runtime grants, separate message route, closure,
Users, blocking or Settings operations are part of AP-07. External deployment/production
acceptance remains a separate release boundary.

## Authorization and admission matrix

Use the existing server-side PermissionResolver, dynamic code-backed catalog, role grants
and per-user `allow` / `deny` / `inherit` overrides. Better Auth supplies authoritative
session identity. Role names, client input and long-lived session claims do not grant access.
Preserve snapshot consistency, next-request freshness and the retained serialized authorization-mutation boundary.

Global admission is the union of applicable **implemented** section capabilities below.
There is no additional mandatory global `admin.access` permission. Own-only participation
permissions do not grant global administration. Attention-only access does not automatically
grant global admission either. Each section and action independently checks its own boundary.

| Surface | Admission/read boundary | Action boundary |
| --- | --- | --- |
| Overview / shell | Authenticated actor with at least one applicable implemented section capability | Navigation is not mutation authority; only public aggregate statistics and permitted destinations are exposed |
| Forum / category, section, topic pages | At least one of `forum.topic.pin`, `forum.solution.manageAny`, `forum.helpDuplicate.manage`, `forum.sourceLocale.correctAny`, `forum.post.history.read`, `forum.topic.close` | Exact operation permission and authoritative object/resource conditions, as below |
| Roles & permissions | `access.authorization.manage` for protected reads | Exact server-bound Owner only for all role/grant/user authorization mutations; existing validation, shared mutex and fresh permission/admission checks |
| Users / measures | `admin.users.read` for general index/detail; `access.authorization.manage` for the existing authorization subset; `admin.users.blocks.manage` for exact target/measures lookup | Authorization assignment/override writes require exact bound Owner (non-Owner read-only); measure create/change/lift and appeal review retain fresh `admin.users.blocks.manage` plus target/issuer hierarchy (and `admin.users.blocks.managePrivileged` for privileged targets) |
| History / Overview recent actions | `admin.history.read` | History-read does not authorize recorded operations; actors do not need history-read merely to perform an otherwise permitted operation |
| Settings entry / implemented surfaces | Authenticated session for `/:locale/settings`, `/:locale/settings/user`, `/:locale/settings/account` and `/:locale/settings/privacy`; exact bound Owner for `/:locale/settings/forum`; current effective Admin-or-Attention access for `/:locale/settings/administrator` | Forum & roles reuses canonical Owner-only authorization writer and independent registration flags; personal preferences, Account & security and Privacy follow their independent contracts in `SETTINGS.md` |

Capability labels described in this document but not present in the current code-backed catalog
are requirements, not executable permission keys. Their exact keys and explicit initial grants
are fixed with the real capability package; AP-01 itself registers none. New keys are not
automatically granted to custom roles.
Update the centralized catalog, DB constraints/seeds and relevant schema/privilege contracts
together with implementation. Do not add a new authorization system to make navigation work.

`forum.helpNeedsDetails.manage` and `forum.attachmentSecurity.read` currently support the
separate attention workflow and do not independently grant global admission. This does not
remove their existing direct-route or contextual capabilities. A new concrete administrative
use can extend the admission matrix with its implementation, rather than by role membership.

`access.authorization.manage` retains its existing direct URL and role/user
**read** functionality without a new mandatory user-read gate; SET-01 permits
mutation there only for exact bound Owner. Conversely, user-read or block-management
must not expose the full authorization-management snapshot, email, grants or overrides.
User DTOs explicitly project fields for the actor's capability; public profile fields can be
reused without creating a second identity store.

### Object/action matrix

| Object/action | Effective permission | Authoritative applicability |
| --- | --- | --- |
| Create/rename/delete custom role; change role grants, assignment or user override | Exact bound Owner + fresh `access.authorization.manage` | Existing built-in/custom rules, assigned-role deletion restriction, current-release Owner-only policy, fresh server-side permission/admission checks and serialized mutation boundary (including no-ops) |
| Pin/unpin topic | `forum.topic.pin` | Target topic exists; authorship alone is insufficient |
| Mark solved / select best answer administratively | `forum.solution.manageAny` | Existing topic/post identity and solution/duplicate state rules |
| Own-topic solution controls | `forum.solution.manageOwn` | Authoritative topic author is the actor; does not independently admit the global panel |
| Set Help solution review/outdated state | `forum.solution.manageAny` | Applicable solved Help question and expected current best answer; existing reason validation |
| Confirm/remove Help duplicate; resolve duplicate appeal | `forum.helpDuplicate.manage` | Existing Help-only relationship, canonical-original, expected relationship/appeal and solution-state invariants |
| Review Help signal in its existing workflow | `forum.helpNeedsDetails.manage` for needs-details; `forum.helpDuplicate.manage` for duplicate; `forum.solution.manageAny` for solution kinds | Persisted signal kind selects permission; current case/target identity and applicability are rechecked |
| Correct topic-title or post-body source locale | `forum.sourceLocale.correctAny`, or `forum.sourceLocale.correctOwn` with authoritative ownership | Existing current-revision CAS, canonical non-`und` source-locale validation; no general content-edit right |
| Read message revision history | `forum.post.history.read` | Post belongs to target topic; read independently before loading revision bodies |
| Close/reopen topic | `forum.topic.close` for both commands | Existing ordinary/Help topic, authoritative closure-version CAS and state transition; no author/role bypass or required reason |
| Create/change/lift measure; review measure appeal | `admin.users.blocks.manage` plus privileged-target capability when needed | Exact target/measure, no self/owner target, raw issuer/target hierarchy, current effective permission, active lifecycle and expected measure version |
| Other category/section/topic/message mutations | Not authorized by page visibility | Define concrete behavior and capability in a separately bounded package first |

These checks apply to full pages, list controls, contextual actions and direct requests.
Private loaders authorize before reading/serializing protected data. A parent layout loader
or hidden button cannot replace a child loader/action boundary. All mutations preserve
authoritative session identity, same-origin/CSRF protection and runtime input validation.
Submitted IDs and state expectations do not select the actor or grant permission.

Permission denial and authorization-infrastructure failure remain different results.
Protected paths fail closed and may return controlled 503 only for classified unavailable
errors. Public optional controls may be hidden for that typed failure. Unexpected schema,
configuration and programming errors follow normal error handling; do not swallow them.
Private responses use the existing no-store boundary.

## Overview foundation (AP-02)

Global admission is evaluated from the implemented union above, including a custom role or
per-user grant of only one capability. The header links to the global panel using a fresh
server presentation boolean; the protected loader independently rechecks access before its
count query. Attention-only and own-only capabilities do not grant entry. Existing direct
Roles & permissions loader retains `access.authorization.manage`; actions also require
the separate Owner-only mutation policy, without any additional global permission.

One PostgreSQL statement reads scalar totals for categories, public sections (excluding the
reserved internal Help service section), topics and messages. Help content remains included
in topic/message totals. These are public aggregate statistics, not a user-management,
private-case or bounded public-list snapshot. Zero is a real count; classified statistics
storage unavailability renders an explicit unavailable state with usable navigation/retry.
Authorization failure remains fail-closed; unexpected SQL/configuration/programming errors
propagate normally. Both document and data responses use private/no-store headers.

Navigation keeps the approved section order and marks unfinished destinations explicitly.
Settings links to the independently guarded `/:locale/settings` entry; its Forum & roles
destination and registration controls remain Owner-only. User preferences, Account & security and Privacy are implemented for
authenticated accounts; Administrator preferences remain available to current
Admin/Attention actors. History is a real destination only
with `admin.history.read`; it is omitted without that permission. Attention queues and
fabricated events are never shown. AP-03 recent actions follow the same History-read gate.

## History implementation (AP-03)

`/:locale/admin/history` independently requires a session and effective `admin.history.read`
before cursor parsing or private reads. That capability alone admits the global shell; it
does not grant authorization management. Initial seed grants it only to built-in admin.
Existing custom roles, moderator grants and personal overrides remain unchanged.

Coverage begins with this migration, without backfill: create/rename/delete custom role,
replace role grants, explicit user-role assignment and per-user allow/deny/inherit changes.
An implicit default → explicit assignment is a configuration change even if the effective
role remains the same; setting an already identical explicit assignment is a no-op. Grants
record only added/removed permissions. Successful identical retries do not add events;
rejected/rolled-back changes do not either. The existing mutation serialization and fresh authorization/admission checks stay authoritative;
event insertion uses the same transaction/client, and insertion failure rolls back the mutation.

`admin_history` retains immutable event UUID, database time at millisecond precision,
actor ID/display label, action/target identity and bounded typed context. Labels are limited
to 200 Unicode characters; JSON context to 16 KiB. No target FK/cascade destroys deleted-role
context. These six operations require no reason; the nullable bounded reason column remains
empty. Passwords, emails, sessions, full authorization snapshots and request bodies are excluded.
The runtime has only SELECT/INSERT on History, without UPDATE/DELETE or sequence privileges.

Authoritative read order is a unique generated bigint `position DESC` with a matching
index. UUID remains event identity, and `occurred_at` remains actual DB display time.
The validated cursor carries positive PostgreSQL bigint position as a decimal string,
without conversion to JavaScript Number. Pages contain 25 events; Overview reads the newest 5.
All current pg authorization and Drizzle forum producers allocate identity under the same
transaction advisory lock (`1447641935, 1`) through COMMIT/ROLLBACK. Append is the final write
after domain locks/mutations; no later domain lock may be acquired while holding this order
lock. The existing authorization mutation lock and topic/Help/revision boundaries still
protect their respective operations. Later committed events therefore sort before an
issued cursor even when timestamps tie, and do not enter older pages. Rollback gaps are
valid; position is an ordering key, not a gapless event count. Generated identity needs
no additional runtime sequence privileges. This guarantee covers the connected AP-03/AP-05
producers; future producer integration must preserve the ordering contract.
Without History permission Overview does not query or serialize recent activity. A classified
History outage gives a protected 503 on History and an explicit unavailable recent-actions
state on Overview; unexpected failures propagate. Private document/data responses are no-store.
UI timestamps explicitly use UTC with a visible zone, keeping SSR/hydration deterministic.
This is ordinary significant-action History, not complete owner audit or later action integration.

## Roles & permissions composition (AP-04)

The existing `/:locale/admin/authorization` route renders its single management view inside
AdminShell, with Roles marked current and capability-derived Overview/Forum/History navigation.
There is one forum shell/main landmark and one admin-panel h1. Management headings nest below
it without changing the forms, intents or field names. UI Preview reuses that same view.

Direct loader and action retain independent `access.authorization.manage` checks;
the action additionally rejects every non-Owner with private `403` before parsing mutation
payload, independently of the UI. Neither a parent loader nor shell admission replaces them. The loader derives presentation flags from
the same resolver handle as its management gate, using the existing internally consistent
resolution/cache and next-request freshness. History-read is not required for management.
The six existing intents continue through the same service/repository transaction, retained
mutex/fresh permission checks and AP-03 event producer. Invalid/not-found/assigned-role/unavailable
feedback stays controlled. Canonical URL and built-in/custom rules are retained; shared localized metadata and
no-store headers apply to the composed route; no new keys, schema, permission or API is introduced.

Stage 2 exposes the actual bound Owner effective authority in the **private** Roles and
Users authorization projection alongside unchanged stored role/grants/overrides; the
explanation is localized EN/RU/HE. SET-01 now makes **every** authorization-management
write Owner-only: role create/rename/delete, grants, assignment and per-user overrides.
A non-Owner with `access.authorization.manage` can still read permitted Roles and
targeted Users authorization state, including raw vs effective values, but sees no
mutation forms. Existing elevated-key checks for
`admin.users.blocks.managePrivileged` remain an additional constraint. The single
application policy seam `canMutateAuthorization` is extensible for separately approved
future deputy delegation; no deputy authority or new role is implemented.
Server enforcement inside the shared serialized/fresh writer is authoritative,
including for no-op and direct requests; hiding forms is not the authorization boundary.
SET-02 reuses this content and the existing `/:locale/admin/authorization` POST
through Owner-only `/:locale/settings/forum`; it adds no second authorization writer.
The canonical legacy read route keeps its existing non-Owner read-only admission.

**Single-Owner bootstrap boundary.** Vico Forum has exactly one Owner: the developer.
The developer signs in through Google to the intended internal forum account;
Google email, name, provider claim or a saved role does not grant Owner rights.
Only that account's exact internal Better Auth `user.id` in trusted server-side
`VICO_OWNER_USER_ID` grants Owner authority. No second Owner, transfer, successor,
first-admin/first-manager grant/bootstrap or ownership recovery-to-another-person UI/API
is part of this model. No additional application feature is needed; real Google
configuration, Owner binding and deployed acceptance remain unfinished Stage 6 work.

## Shared Quick actions contract

Quick actions is one reusable interaction concept across admin lists/pages, public section
and topic pages, individual messages and users where applicable. Available actions derive
from object type, current authoritative object state and the actor's effective permissions.

- Descriptors/components select presentation and forms; they do not implement a second RBAC.
- Full pages and Quick actions invoke the same authoritative operation, permission, resource,
  reason, validation, failure and history semantics. Existing intent/handler boundaries may
  be reused; a separate admin-only mutation API is not required.
- Server actions recheck permission and target state independently of presentation hints.
  Stale expected revision, best answer, relationship, case or block identity must not retarget
  an operation silently. Preserve existing stale-account safeguards.
- Message actions target the stable post ID within its authoritative topic. Permanent numbers
  and anchors do not change when the selected answer is visually promoted.
- General source-locale correction and private revision-history reading keep their separate
  permissions. Own-only controls remain available under existing resource rules.
- Start with a real consumer using existing contextual topic operations before new dependent
  Forum/User screens. Add supported object types incrementally; do not build speculative
  dispatch or domain subsystems in advance.

AP-05 replaces the existing topic-level Admin panel disclosure with localized Quick actions.
`TopicQuickActions` and its typed descriptors consume already resolved capabilities and the
current topic snapshot; every form explicitly targets the canonical topic URL and existing
intent. Connected controls include pin/unpin, administrative solved/best-answer selection,
Help solution moderation, duplicate confirmation/removal/appeal resolution, and title
source-locale correction. Expected revision/answer/relationship/appeal IDs and required
outdated-reason validation are preserved. Best-answer candidates keep original post IDs and
permanent numbers despite visual promotion. Own-only controls remain separate. Attention
case presentation is unchanged and uses the same authoritative producers; no new full pages,
admin-only endpoint, permission catalog or speculative dispatcher is introduced.

Own solution/title-source controls explicitly submit `operationScope=own`; scoped
administrative Quick actions submit `operationScope=any` to the same canonical intents.
The marker selects operation semantics, never authority: the server validates it, rechecks
current capabilities, and retains authoritative ownership/state/CAS checks. An explicit
own request requires the current corresponding Own permission and the actor's own resource.
Any does not substitute for Own; explicit any requires Any and remains administrative. An
opened own form stays own after an Any grant while Own is retained; revoked Own causes
controlled denial on the next submit even if Any remains. Author solved-confirmation stays own even when
its preceding answer-selection Quick action was administrative. Omitted markers retain
legacy request scope selection; all current first-party scoped controls send a marker.
Any-only authors use administrative Quick actions; neither the answer-selection redirect
nor the topic view offers them an own solved-confirmation.

## Significant administrative actions and reasons

Ordinary History answers who acted, what changed, which object was affected, when, the
applicable reason and minimal useful change context. It is distinct from post revisions,
security-upload events, notification inboxes and the future full owner audit surface.

The following matrix defines coverage to connect with the relevant implementation packages.
AP-03 records the authorization-management rows. AP-05 connects the existing topic/Help
rows through administrative source-locale correction, including both topic-title and post
correction service paths. Closure records real state transitions through the AP-08 producer; AP-10 connects an
atomic measure and measure-appeal-review History producer. A reason marked “not required” preserves the
current operation contract; it does not introduce a new reason form or persistence field.

| Operation | Significant event when coverage is connected | Administrative reason rule |
| --- | --- | --- |
| Create/rename/delete custom role | Actual role change; preserve deleted target identity/context | Not required by current contract |
| Change role grants, user assignment or override | Actual before/after delta | Not required by current contract |
| Pin/unpin topic | Actual pin-state transition | Not required by current contract |
| Administrative solved/best-answer change | Actual administrative state/selection change, including relevant replaced-answer context | No new mandatory reason; existing system reason for replaced best answer remains system-derived |
| Set Help solution outdated | Actual answer moderation change | Existing nonblank validated outdated explanation is mandatory |
| Set needs-review / clear Help solution moderation | Actual moderation-state transition | Not required by current contract |
| Confirm/remove duplicate; resolve duplicate appeal | Actual relationship or appeal-resolution change | No new mandatory reviewer reason; author's required appeal explanation remains in its own private workflow |
| Review Help signal | Actual persisted review outcome and applicable effect | No new mandatory reviewer reason; existing kind-specific submission explanations remain unchanged |
| Administrative source-locale correction | Actual new revision/source-metadata change | Not required by current contract |
| Close/reopen topic | Actual closed-state transition, recording before/after and previous/new closure versions | Not required by the approved AP-08 contract |
| Create/change/lift temporary or permanent measure; decide its appeal | Committed `measure.created`, `measure.changed`, `measure.lifted` or `measure.appealResolved` with exact measure ID and bounded state context | Nonblank reasons for create/change/explicit lift, and reviewer explanation for appeal decision; expiry creates no synthetic event |

“Administrative” is determined by the authoritative operation/scope, not by actor role or
the requesting URL. Ordinary own-content participation, own solution controls, signal
submission/withdrawal and appeal submission are not automatically promoted into admin History
because an actor also holds an administrative permission.

History records real committed state changes. Denied, rolled-back, repeated no-op or replayed
operations do not create fictitious new events. A case actually changing to a terminal review
outcome is a state change even when no new label/relationship is applied. Shared review and
inner domain operations must not emit duplicate events for the same significant effect.

For covered PostgreSQL mutations, append the event in the same authoritative transaction as
the change, not after a route response or as best-effort post-commit work. Event-insert failure
rolls back that mutation. Integrate existing pg and Drizzle transaction boundaries; do not
introduce an independent log commit, generic event bus or speculative outbox. The first History
slice includes an actual authorization-management producer, protected reader and Overview
integration. Further significant operations connect their producers with their own package.
Do not fabricate pre-existing history or claim coverage before a producer is connected.

AP-05 forum events retain stable topic/post/revision and relevant relationship/appeal IDs,
minimal before/after state and bounded current topic-title labels. Direct outdated moderation
retains its validated reason. A Help signal review records one `help.signalReviewed` event
for the requested case's actual accepted/rejected/superseded outcome, with any applied effect
inside that event; it does not also emit an inner moderation/duplicate event.
When duplicate removal accepts a pending appeal, the same `help.duplicateRemoved` event
contains `resolvedAppeal: {id, outcome: "accepted"}` from the actual updated row and shows
that outcome/identity in History. Removal without a pending appeal retains the original
context; neither path copies appeal explanation or emits a second event. Automatic
supersession of sibling cases remains a side effect, without fabricated separate review
actors/events. Signal/appeal submission text and private case explanations are not copied.
Ordinary own-scope solved/answer/source corrections do not emit administrative events even
when the actor also holds administrative capabilities. Unpin forwards the session actor to
the authoritative transaction. Actual insert/delete/state/revision results decide emission;
no-op or rejected/stale requests do not append. Forward migration 0051 extends only the
History action/target constraint; existing SELECT/INSERT runtime grants remain sufficient.

Persist only bounded useful context, sufficient to retain event meaning if its target later
ceases to exist. Do not copy passwords, tokens, sessions, full requests, complete authorization
snapshots, message bodies or private case explanations into ordinary History. History-read
does not implicitly grant access to private target data or the original case workflow.

## Topic closure and reopening (AP-08)

`forum.topic.close` is one independent permission for **both** closing and reopening
existing ordinary and Help topics. The initial grant is for built-in moderator/admin;
custom roles and per-user allow/deny/inherit retain their dynamic semantics. The
author of the topic has no implicit close/reopen right. This capability by itself
admits an authenticated actor to the global admin Forum area, without granting
History reads, Help-private details, solution controls or reply creation. Neither
transition requires a reason.

The existing `forum_topics` row stores `is_closed` (initially false) and
`closure_version` (nonnegative integer, initially zero). A real transition
increments the version exactly once; a request already at its desired state is
a no-op **only with the current expected version**. Older versions, including
open→closed→open ABA, and version overflow fail closed as conflicts. Closure
does not alter solved, best answer, pin, Help duplicate/moderation, existing
messages/revisions or published attachments, and does not prevent public reading
or existing own-published-post edits.

The public and protected administrative topic detail use the same
`TopicQuickActions` and canonical `/:locale/topics/:topicId` POST with
`closeTopic`/`reopenTopic`. Each form sends the current
`expectedClosureVersion`, a stale-account `editorActorId` expectation and
inline marker. The route validates unique canonical inputs, same origin and
fresh `forum.topic.close`; only the session supplies actor authority, only
route parameters supply target authority. No second admin-only API or Own
closure scope exists. Inline success/error and ordinary locale redirect
are no-store. Pending state prevents double submit; controlled stale or
authentication/permission errors revalidate once, without automatically
retrying. Stale fetcher feedback cannot cross actor/topic/grant/version context.
Actual public/admin DTO state is `isClosed` and `closureVersion`; each view
shows a separate localized **Closed** label, never conflated with **Solved**.

`setTopicClosed` locks the existing topic row in one repository transaction,
checks the expected version and appends a `topic.closed` or `topic.reopened`
significant History event only for a real transition. Context is limited to
`before`, `after`, `previousVersion`, `version` and the established
bounded topic identity/label. Append failure rolls back the state and version.
Denied, no-op, stale, rolled-back and replayed operations emit no new event;
reading these events still requires independent `admin.history.read`.

A closed topic prohibits **all new replies**, including those from the author,
moderators, admins or the closing actor. Reopening does not bypass
`forum.reply.create` or confirmed-duplicate restrictions. The authoritative
check occurs after existing committed publication-receipt replay and the shared
topic-row `FOR UPDATE`, before cooldown, post/revision writes, notifications
and attachment publication. This serializes competing close/reply transactions:
a reply locked first may commit before close; a new reply locked after close
is denied. A matching committed reply remains idempotently replayable even
after closing; fresh text and attachment-only replies return private/no-store
`409 topicClosed` with no partial effects or loss of temporary upload selection.

Initially closed topics do not show new Reply, Quote or composer controls.
When closure arrives while an editor is already mounted, it retains its text,
Undo/Redo and selected/in-flight attachments and keeps Cancel available,
but prevents Publish and its keyboard shortcut. A server `topicClosed`
409 triggers one loader revalidation with no automatic retry or unmount.
After reopening, publication requires another explicit user action and still
obeys current permissions/duplicate rules. Buffers are isolated by actor/topic;
closure does not introduce drafts, autosave or new attachment policies.

These are repository/local-CI implementation contracts, not evidence of
production deployment, independent review, real-browser acceptance or owner
visual approval.

## Users index, detail and existing authorization controls (AP-09)

`/:locale/admin/users` and `/:locale/admin/users/:userId` independently require the
effective `admin.users.read` capability before query/target validation and protected reads.
The initial grant is built-in admin only; custom roles and per-user allow/deny/inherit remain
dynamic. This permission admits the Users section but grants no authorization-management
mutation or private authorization snapshot. Conversely, `access.authorization.manage`
continues to expose its existing authorization-user subset without implicitly granting the
general Users directory.

The Users index is read-only and projects only public identity fields needed by the page:
user ID, display name, image and joined timestamp. Search is literal case-insensitive name/ID
search, filtered in PostgreSQL before LIMIT; email is neither selected nor searchable. Results
use stable ID keyset paging with 25 items plus lookahead and an independent matching total.
The detail page reuses the existing public profile reader but explicitly projects only public
profile fields, role display and public statistics. Success and controlled protected failures
remain private/no-store.

When the same actor also has `access.authorization.manage`, the detail page may additionally
load a targeted management snapshot for that one selected user: role options plus the target
user's assignment, grants, overrides and effective permissions under the existing consistent
authorization-read contract. It does not load the full authorization-management user list or
other users' state. Without the management permission, none of that management payload or UI is
rendered.

The selected user's authorization details remain visible to actors with
`access.authorization.manage`, but **only the exact bound Owner** sees assignment
and per-permission override Forms. Those Owner forms reuse the existing canonical
`/:locale/admin/authorization` action with `assignRole` / `override` intents.
AP-09 adds no second writer, mutation protocol, actor authority field,
authorization-serialization model or History event kind. The session remains actor
authority; the canonical action rechecks fresh `access.authorization.manage` and the
Owner-only write policy. On success, inline Users detail revalidates; on fresh
403 with `admin.users.read` still effective, it performs at most one same-URL
GET recovery without replay. Without Users-read, denial remains fail-closed.
A later independent permission change can recover the protected read view,
but never confers write authority on a non-Owner.

The old `under-development?feature=admin-users` URL remains only as a compatibility redirect:
Users-read actors go to the real Users index, management-only actors go to the existing
authorization-user subset, and permission-dependent success redirects are private/no-store.
Users is no longer listed as unfinished. AP-09 does not implement blocking, account deletion,
general edit-any user operations, Settings, a second RBAC or production rollout.

## User administrative measures and appeals (AP-10)

AP-10 provides temporary and permanent **administrative measures**. A measure is not
a new role, mass permission override, Better Auth ban or account deletion. Different
violations generate **separate measures**, each with its own ID, original reason,
restrictions, expiry/lift, version, issuer authority floor, history and appeal quota.
Overlapping active measures remain independent. For non-administrative child restrictions,
an operation is restricted while **any** active measure has that enabled key. Administrative
family restrictions additionally obey the issuer-floor/current-target authority rule below.
Ending measure A does not alter measure B. An expired or lifted measure is terminal and cannot
be extended or reactivated; a subsequent violation requires a new measure.

Administrators select individual restrictions, optionally using UI group checkboxes
(including their indeterminate state). Only child keys are persisted; the group is
a presentation shortcut and not a policy key. Expiry and restrictions are independent.

| Group | Exact child restriction keys | Fresh operation affected |
| --- | --- | --- |
| Publication | `topics.create`, `replies.create`, `attachments.upload` | New ordinary/Help topics, replies, attachments |
| Own content | `posts.edit`, `profile.edit` | Own published-post editing, public profile edits |
| Submissions | `complaints.submit`, `helpSignals.submit` | New Complaint reports, Help signals |
| Translation | `translations.generate` | New title, automatic/explicit body translation generation |
| Administration | `admin.forum`, `admin.complaints`, `admin.security`, `admin.usersAccess` | Effective administrative permission families listed below |

Four administrative restrictions suppress exactly these permissions on the current
action/read request; they never modify raw role grants or user overrides:

- `admin.forum`: `forum.topic.pin`, `forum.topic.close`,
  `forum.solution.manageAny`, `forum.helpNeedsDetails.manage`,
  `forum.helpDuplicate.manage`, `forum.sourceLocale.correctAny`,
  `forum.post.history.read`.
- `admin.complaints`: `forum.complaint.review`,
  `forum.complaint.appeal.review`, `forum.complaint.priority.manage`,
  `forum.complaint.reporterIdentity.read`.
- `admin.security`: `forum.attachmentSecurity.read`.
- `admin.usersAccess`: `admin.users.read`, `access.authorization.manage`,
  `admin.history.read`, `admin.users.blocks.manage`,
  `admin.users.blocks.managePrivileged`.

Public reading, login/session, notifications, the punished subject's private
status/reasons and **all domain appeal submissions** stay outside this catalog.
`helpSignals.submit` applies only to creating a new Help signal; withdrawal of an existing
signal remains available. Own solved/best-answer and own source-locale correction have no
separate punitive restriction. Expiry/lift restore only capabilities otherwise permitted by current
effective authorization, resource state and other active measures; they do not rewrite
permissions, topic closure or Complaint/Help decision state.

**Bound Owner immunity (redesign Stage 2).** A measure that was previously stored
against the user now bound by `VICO_OWNER_USER_ID` remains persisted with its reason,
restrictions, expiry/lift state, appeals and History, but does **not** suppress that
Owner's current permissions or block admission for the affected Forum actions,
attachments, Complaints operations or translation-generation preflight. The same rule
applies to administrative permission filtering and the Owner's own active-restriction
hints. Common native PostgreSQL and Drizzle policy paths use the server binding;
ordinary users remain subject to all stored measures. This does not bypass session,
Origin, ownership, revision/CAS, lifecycle or independent domain checks
for operations that still require them. No synthetic lift or rewrite is performed.

**Authority.** Non-Owner measure managers require raw
`admin.users.blocks.manage` for exact-ID management and appeal review; that capability
does not grant the general Users catalog, authorization-user directory or private History.
For ordinary actors the fresh raw role grants plus per-user overrides (deny precedence),
**before** Owner effective projection or sanction filtering, determine hierarchy:
rank 0 (ordinary), rank 1 (administrative-family capability), rank 2
(`admin.users.blocks.managePrivileged`). A privileged-target operation requires
strictly greater actor rank, including the elevated key where applicable.

The exact authenticated server-bound Owner is **rank 3** even when the saved role has
no grants and both block-management permissions are denied as raw overrides. Only this
Owner bypasses the raw basic-manage prerequisite; it does **not** bypass the target
comparison, stored issuer floor, lock, CAS or lifecycle. Administrative-family
restrictions may be selected by a rank-2 non-Owner or rank-3 Owner; UI hints and
authoritative checks use the same raw hierarchy. A stored issuer floor protects later
change/lift/review. Administrative-family restrictions suppress a non-Owner's current
capability only while the floor exceeds that target's current raw rank. Self-target
and Owner-target operations remain forbidden, including attempts by Owner.

Neither block-management capability has built-in seed grants, including for
moderator/admin; ordinary actors gain them only by explicit dynamic grants/overrides.
Stage 1 removed obsolete manager-count veto without changing the retained shared
`authz_mutation_lock` mutex, fresh checks or atomic History. Stage 2 implemented
Owner authority, targeted/queue reads, issuer-floor semantics and the immunity above;
it did not create a role named Owner, recovery/bootstrap, general Users directory
for measure managers, Settings or production rollout.

**Lifecycle and reasons.** Creating a measure requires a nonblank reason and at
least one valid child restriction. Manually changing its restrictions/expiry requires
a new reason but preserves the original one; explicit lift has its own required
reason. Temporary expiry is a validated instant, permanence has no expiry, and
effective activity is checked against authoritative PostgreSQL time with no
background unlock action. An ordinary change does not close a pending appeal; natural expiry
makes a pending appeal effectively moot without a synthetic write, while explicit lift closes
it as moot in the same transaction. Existing committed publication receipts and matching
committed Complaint results remain replayable; changed/new operations are subject to fresh
restriction admission before new side effects. Necessary cancel/cleanup continues to work;
fresh denied writes produce no partial effect. If a new
restriction arrives while Create Topic, Help Question or own published-post Edit is already
mounted, that same editor operation retains its text/history and selected or in-flight
attachments plus explicit Cancel/cleanup, while Publish/Save and keyboard submission are
disabled. Fresh denied editors/actions are not offered, and revalidation never replays a POST.

**Appeals** target an exact measure, never a Complaint Case or Complaint Appeal.
The punished user may submit at most **three sequential appeals per measure**,
with one pending at a time. A rejected appeal leaves the measure unchanged. An
accepted appeal either fully lifts it or changes restrictions/expiry of that same
measure, preserving ID, quota and timeline. Accepted + lifted stays accepted,
rather than being marked moot. Appeal review requires a nonblank explanation.
Expired/lifted measures cannot be reviewed as active; stale version/authority
and duplicate pending/quota conditions are rejected. Identical committed retries
do not consume a second appeal slot or create a second History event.

**Routes and privacy.** `/:locale/account/measures` and
`/:locale/account/measures/:measureId` derive subject identity only from the
current authenticated session; their allowlisted private DTOs show reasons,
status, active restrictions, expiry, transitions and appeal outcomes, **not**
issuer/actor/reviewer identity or unfiltered administrative History context.
`/:locale/admin/measures?target=:userId` and
`/:locale/admin/measures/:measureId` expose exact targeted administration
only after fresh block-management authority and current target hierarchy checks. Exact detail
may remain readable when the target hierarchy permits it even if the actor is below that
measure's stored issuer floor; in that case Change/Lift/pending-Appeal Review controls are not
offered. They reappear only after a fresh current authority snapshot satisfies the floor and
other mutation guards. The privileged actor identities remain accessible to separately
authorized internal History readers; no public user directory is opened by these routes.

Mutations validate same-origin, session identity, operation UUID, expected
measure version and required input; compare-and-swap and admin History append
are atomic with the underlying transition. Denied/stale/rolled-back/no-op/replayed
requests do not invent History events. Success and controlled errors use private,
no-store responses. UI revalidates protected loader state on failed
403/404/409, displays current permission/measure status, and never automatically
replays the write. Pending and revalidation states block repeated submission.

This is the permanent **product/runtime contract** for the AP-10 implementation now present
in the repository. Repository merge does not imply production/deployed rollout;
`PROJECT_STATE.md` records the current factual project and external state.

## Integration closeout (AP-11)

AP-11 adds no new domain capability, schema, permission or grant. It closes the delivered
AP-01–AP-10 scope by exercising existing boundaries together in a real local runtime:
Users detail + canonical authorization mutation + History + same-session revoke/recovery,
Forum hierarchy/topic close/reopen + mounted reply editor + AP-10 reply restrictions, and
protected response/privacy plus EN/RU/HE responsive behavior on the connected admin surfaces.

The connected admission constraints remain independent: topic closure does not replace or lift
an active reply restriction, and lifting the measure does not reopen a closed topic. A stale
denied reply preserves the mounted editor/operation and existing attachment state, blocks repeat
Publish/new Attach through the explicit fresh-loader revalidation, keeps Cancel available, and
never automatically replays the POST. Users authorization grant/revoke transitions now use the bound Owner through the existing
canonical authorization writer and History path, not non-Owner writes or fixture SQL as a
substitute for the operation being verified.

AP-11 is repository/local-CI integration evidence, not production/deployed acceptance or owner
visual acceptance. Settings is intentionally outside this closeout and follows the separately
approved sequence: owner/authorization redesign → Settings.

## Delivery and acceptance

The technical sequence agreed for bounded delivery is:

| Package | Deliverable / prerequisite |
| --- | --- |
| AP-01 | This permanent documentation contract and necessary source-of-truth links |
| AP-02 | Global shell and truthful Overview foundation after AP-01 |
| AP-03 | History with authorization-management producer and protected recent actions after AP-02 |
| AP-04 | Existing Roles & permissions surface composed into shell after AP-03 |
| AP-05 | Shared Quick actions on existing topic operations and their history producers after AP-04 |
| AP-06 | Category/section administrative browsing after AP-05 |
| AP-07 | Topic page and message actions within topic context after AP-06 |
| AP-08 | Shared topic close/reopen, persisted closure CAS and reply admission after AP-07 |
| AP-09 | Users index/page reusing existing authz controls after AP-08 and earlier shared foundations |
| AP-10 | Administrative measures, exact-measure appeals and all affected enforcement after AP-09 and approved measure-effect/reason matrix |
| AP-11 | Integration and factual closeout of delivered AP-01–AP-10 scope; Settings explicitly deferred |

Each implementation PR has its own applicable checks and stable-head review before merge;
AP-11 is not the first security or integration check. Schema-changing work follows existing
forward-migration, clean PostgreSQL, manifest and runtime-privilege verification contracts.
No package silently authorizes external Stage 6 rollout, production data, resources or secrets.

New UI uses canonical English catalog/localization and registry-controlled locale/direction,
shared logical CSS, responsive layouts and keyboard-accessible controls. Verify changed actual
application flows and permission boundaries; static Pages is progress presentation, not
evidence of authentication, database state or authoritative mutations. Owner visual acceptance
is initiated only when explicitly requested. Final product/runtime acceptance remains governed
by the existing release requirements.

AP-01 is complete when this contract is self-contained and consistent with current sources of
truth, necessary links are aligned, and the change remains documentation-only. It must not
report AP-02+ behavior, unrun CI or future runtime acceptance as completed. AP-11 closes the
approved AP-01–AP-10 delivered scope; Settings is a separate product sequence.
SET-01–SET-06 are now implemented in repository/local-CI, including the
authenticated Privacy route. See `SETTINGS.md` for the separate contract.
