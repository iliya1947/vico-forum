# Ordinary admin panel

## Status and source-of-truth boundary

This document is the permanent product and technical contract for the ordinary Vico Forum
admin panel. AP-01 established the documentation contract. AP-02 implements
`/:locale/admin`: a protected reusable shell/navigation and Overview with real public
aggregate counts. The existing `/:locale/admin/authorization` UI remains independently
protected at its original URL; its full composition into the shell remains AP-04.
AP-03 adds authorization-change History and protected Overview recent actions. New object
pages, topic closure and user blocking remain unimplemented. AP-02 itself added no schema
or permission keys; AP-03 adds the independent `admin.history.read` capability.

Other routes and capabilities described below as delivery targets become available only
through their respective bounded implementation PRs. Unfinished Forum/Users/Settings
links explicitly use the shared Under development surface and grant no future read/action
permission. Forum navigation is shown for Forum capabilities; the Users placeholder is
shown with the existing authorization-user-management subset, not a new general user read.

Related sources of truth:

- [PROJECT.md](../PROJECT.md) — product and architecture baseline;
- [AUTHORIZATION.md](auth/AUTHORIZATION.md) — authoritative application authorization;
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
Topic closure to new replies is approved; its remaining decisions are listed below.

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
Under development mechanism. This does not grant a private read or mutation. Settings has no
approved concrete operations yet; its placeholder does not authorize a settings store or API.
An unfinished section is not reported as implemented or accepted at closeout.

## Authorization and admission matrix

Use the existing server-side PermissionResolver, dynamic code-backed catalog, role grants
and per-user `allow` / `deny` / `inherit` overrides. Better Auth supplies authoritative
session identity. Role names, client input and long-lived session claims do not grant access.
Preserve snapshot consistency, next-request freshness and existing lockout protection.

Global admission is the union of applicable **implemented** section capabilities below.
There is no additional mandatory global `admin.access` permission. Own-only participation
permissions do not grant global administration. Attention-only access does not automatically
grant global admission either. Each section and action independently checks its own boundary.

| Surface | Admission/read boundary | Action boundary |
| --- | --- | --- |
| Overview / shell | Authenticated actor with at least one applicable implemented section capability | Navigation is not mutation authority; only public aggregate statistics and permitted destinations are exposed |
| Forum / category, section, topic pages | At least one of `forum.topic.pin`, `forum.solution.manageAny`, `forum.helpDuplicate.manage`, `forum.sourceLocale.correctAny`, `forum.post.history.read`; later the implemented topic-closure capability | Exact operation permission and authoritative object/resource conditions, as below |
| Roles & permissions | `access.authorization.manage` | Same existing permission, management validation and atomic lockout invariants |
| Users | Future independent administrative-user-read capability for general index/detail; `access.authorization.manage` for its existing authorization subset; future block-management capability for minimal target/block lookup | Authorization controls only with `access.authorization.manage`; block/lift only with the implemented block capability |
| History / Overview recent actions | `admin.history.read` | History-read does not authorize recorded operations; actors do not need history-read merely to perform an otherwise permitted operation |
| Settings placeholder | Actor already admitted to shell | No private settings data or mutation |

Future capability labels in this document are requirements, not executable permission keys.
Their exact keys and explicit initial grants are fixed with the real capability package;
AP-01 does not register them. New keys are not automatically granted to custom roles.
Update the centralized catalog, DB constraints/seeds and relevant schema/privilege contracts
together with implementation. Do not add a new authorization system to make navigation work.

`forum.helpNeedsDetails.manage` and `forum.attachmentSecurity.read` currently support the
separate attention workflow and do not independently grant global admission. This does not
remove their existing direct-route or contextual capabilities. A new concrete administrative
use can extend the admission matrix with its implementation, rather than by role membership.

`access.authorization.manage` retains its existing direct URL and role/user management
functionality without a new mandatory user-read gate. Conversely, user-read or block-management
must not expose the full authorization-management snapshot, email, grants or overrides.
User DTOs explicitly project fields for the actor's capability; public profile fields can be
reused without creating a second identity store.

### Object/action matrix

| Object/action | Effective permission | Authoritative applicability |
| --- | --- | --- |
| Create/rename/delete custom role; change role grants, assignment or user override | `access.authorization.manage` | Existing built-in/custom rules, assigned-role deletion restriction and last-manager lockout |
| Pin/unpin topic | `forum.topic.pin` | Target topic exists; authorship alone is insufficient |
| Mark solved / select best answer administratively | `forum.solution.manageAny` | Existing topic/post identity and solution/duplicate state rules |
| Own-topic solution controls | `forum.solution.manageOwn` | Authoritative topic author is the actor; does not independently admit the global panel |
| Set Help solution review/outdated state | `forum.solution.manageAny` | Applicable solved Help question and expected current best answer; existing reason validation |
| Confirm/remove Help duplicate; resolve duplicate appeal | `forum.helpDuplicate.manage` | Existing Help-only relationship, canonical-original, expected relationship/appeal and solution-state invariants |
| Review Help signal in its existing workflow | `forum.helpNeedsDetails.manage` for needs-details; `forum.helpDuplicate.manage` for duplicate; `forum.solution.manageAny` for solution kinds | Persisted signal kind selects permission; current case/target identity and applicability are rechecked |
| Correct topic-title or post-body source locale | `forum.sourceLocale.correctAny`, or `forum.sourceLocale.correctOwn` with authoritative ownership | Existing current-revision CAS, canonical non-`und` source-locale validation; no general content-edit right |
| Read message revision history | `forum.post.history.read` | Post belongs to target topic; read independently before loading revision bodies |
| Close topic / proposed reopen | Future topic-closure capability | New replies obey persisted closed-state; remaining product decisions below precede implementation |
| Block/lift block on user | Future block-management capability | Approved block-effect, target, expiry and stale-block rules below precede implementation |
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
Roles & permissions loader/actions keep `access.authorization.manage` and are not gated by
an additional global permission.

One PostgreSQL statement reads scalar totals for categories, public sections (excluding the
reserved internal Help service section), topics and messages. Help content remains included
in topic/message totals. These are public aggregate statistics, not a user-management,
private-case or bounded public-list snapshot. Zero is a real count; classified statistics
storage unavailability renders an explicit unavailable state with usable navigation/retry.
Authorization failure remains fail-closed; unexpected SQL/configuration/programming errors
propagate normally. Both document and data responses use private/no-store headers.

Navigation keeps the approved section order and marks unfinished destinations explicitly.
Settings remains a placeholder exposing no private data. History is a real destination only
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
rejected/rolled-back changes do not either. The existing mutation serialization and lockout
check stay authoritative; event insertion uses the same transaction/client, and insertion
failure rolls back the mutation.

`admin_history` retains immutable event UUID, database time at millisecond precision,
actor ID/display label, action/target identity and bounded typed context. Labels are limited
to 200 Unicode characters; JSON context to 16 KiB. No target FK/cascade destroys deleted-role
context. These six operations require no reason; the nullable bounded reason column remains
empty. Passwords, emails, sessions, full authorization snapshots and request bodies are excluded.
The runtime has only SELECT/INSERT on History, without UPDATE/DELETE or sequence privileges.

Read order is `(occurred_at DESC, id DESC)` with a matching index and validated keyset cursor;
pages contain 25 events, Overview reads the newest 5. New inserts do not shift older pages.
Without History permission Overview does not query or serialize recent activity. A classified
History outage gives a protected 503 on History and an explicit unavailable recent-actions
state on Overview; unexpected failures propagate. Private document/data responses are no-store.
UI timestamps explicitly use UTC with a visible zone, keeping SSR/hydration deterministic.
This is ordinary significant-action History, not complete owner audit or AP-04+ integration.

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

The existing topic-level disclosure labelled Admin panel is contextual administration; it
does not imply that the global panel already exists. Its later Quick actions integration
preserves authoritative operations and is separate from the global shell entry point.

## Significant administrative actions and reasons

Ordinary History answers who acted, what changed, which object was affected, when, the
applicable reason and minimal useful change context. It is distinct from post revisions,
security-upload events, notification inboxes and the future full owner audit surface.

The following matrix defines coverage to connect with the relevant implementation packages.
AP-03 records the authorization-management rows only; the remaining rows await their
producer packages. A reason marked “not required” preserves the
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
| Close/reopen topic | Actual closed-state transition | Per-action reason decision required before closure implementation |
| Temporary/permanent block; explicit lift | Actual block-state transition, including configured expiry and lifted block identity | Per-action reason decision required before blocking implementation |

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

Persist only bounded useful context, sufficient to retain event meaning if its target later
ceases to exist. Do not copy passwords, tokens, sessions, full requests, complete authorization
snapshots, message bodies or private case explanations into ordinary History. History-read
does not implicitly grant access to private target data or the original case workflow.

## Topic closure boundary

Closing a topic prevents new replies. It does not imply solved, remove a selected answer,
change duplicate relationships or delete existing messages. Persisted closed-state and
reply admission must share the existing authoritative topic-row serialization boundary.
Concurrent reply either commits before closure or is rejected after closure; hiding a form
alone is insufficient. Preserve the result of replaying a reply already committed under its
publication receipt; replay must not create a new reply or duplicate event.

Before the closure package, explicitly settle reopening, its permission relationship to
closing, per-action reasons and any actor exception. Reopening is proposed in the technical
plan, not an already implemented capability. No implicit moderator bypass is authorized.

## User blocking boundary and unresolved product gate

Ordinary administration includes temporary and permanent blocks. Temporary blocks support
presets, arbitrary duration/end date and automatic expiry by authoritative time comparison.
An actor with the applicable implemented permission can lift another administrator's block.
Account deletion is excluded.

Before implementing blocking, the owner must decide the exact effect on:

- login and existing sessions;
- public/private reading;
- topic/Help-question/reply creation, own edits and profile changes;
- signals/appeals, uploads and translation generation;
- administrative actions, self-block and other access managers;
- per-action required reasons and the capabilities restored on expiry/lift.

These are explicit implementation gates, not defaults chosen by this document. A block does
not become a new role or mass deny override. Application restrictions supplement the existing
permission/resource checks using one consistent policy at all affected entry points, including
active sessions and direct attachment/forum APIs. Preserve committed publication replay and
necessary cleanup so restrictions do not lose an acknowledged result or retain files forever.

An expired temporary block is inactive without a cron/unlock job or write on public GET.
Expiry/end dates are validated as unambiguous server-interpreted instants; authoritative time
decides activity. Explicit lift checks the expected block identity/version so a stale action
cannot remove a replacement block. History retains the configured expiry without inventing
an unlock action by a synthetic system actor.

If the approved effect prevents login or authorization management, block changes and access
management must coordinate through the existing serialization/lockout boundary to retain at
least one usable access manager, including concurrent grant/override and block changes.
The existing count of effective access managers alone is insufficient for that policy.
If management remains usable, do not add that conditional recovery invariant unnecessarily.
Do not build a generic ban framework before this decision.

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
| AP-08 | Topic closure after AP-07 and closure decisions above |
| AP-09 | Users index/page reusing existing authz controls after AP-08 and earlier shared foundations |
| AP-10 | Block/lift and all affected enforcement after AP-09 and approved block-effect/reason matrix |
| AP-11 | Integration and factual closeout of delivered scope |

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
report AP-02+ behavior, unrun CI or future runtime acceptance as completed. Later closeout must
identify remaining Settings/unspecified-operation decisions; the whole umbrella is not complete
while required approved functionality is only a placeholder, unless the owner explicitly
separates it into a later phase.
