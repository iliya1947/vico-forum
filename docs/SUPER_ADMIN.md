# Super-admin — Owner-only product and runtime contract

## Scope and delivery status

Super-admin is the separate **exact server-bound Owner-only** administration surface of Vico Forum. It is distinct from the ordinary permission-scoped [Admin panel](ADMIN_PANEL.md), [Settings](SETTINGS.md), and [Needs attention](moderation/COMPLAINTS.md).

**SA-01–SA-08 are implemented and merged into `main` in the repository/local-CI path.**
SA-01–SA-02 deliver exact-Owner entry/navigation, System/Accounts/Security current
Monitoring, retained observations/auth facts, bounded attempt telemetry and shared
source-aware History. SA-03 delivers the canonical unified profile with independently
authorized public/Admin/Owner sections. SA-04 closes active-account admission across
Better Auth and authoritative writers with neutral inactive public identity. SA-05
adds the actual canonical exact-Owner deactivation command. SA-06 delivers native
Forum/Administration/Moderation/Notifications Monitoring. SA-07 delivers
Background/Localization/Files/Data/Integrations from existing native sources.
SA-08 composes all twelve measured areas into Overview, completes global/scoped
History filters and connected repository acceptance. **Infrastructure remains an
inert Stage-6 placeholder; production integrations, real Google/Owner binding,
external deployment and final UI/UX acceptance are not implied.**

Current factual implementation status is in [PROJECT_STATE.md](../PROJECT_STATE.md); implementation/review/merge evidence is in [project history](PROJECT_HISTORY/PROJECT_HISTORY.md). Production/Stage-6 status is governed separately by [ROADMAP.md](../ROADMAP.md) and `docs/database/*`.

## Authority and separation of concerns

- The entire Super-admin surface requires an authenticated Better Auth session whose `user.id` **exactly matches** the trusted server-side `VICO_OWNER_USER_ID`. An administrator, ordinary role, dynamic permission grant, email or provider claim does not confer this authority.
- SA-01–SA-08 add **no** Owner role, permission key, second RBAC, generic elevated mutation capability, or alternative Owner-binding/bootstrap mechanism. The single-Owner product model remains in [AUTHORIZATION.md](auth/AUTHORIZATION.md).
- The Owner has two approved links to the **same** canonical `/:locale/super-admin` destination: an Owner-only entry in ordinary administration, and an Owner-only entry from the Owner account/profile navigation.
- Ordinary **Admin** remains the authoritative location for forum object management, user administration and measures, Roles authorization views, and ordinary significant-action History. **Settings** retains role/permission/registration configuration and personal account settings. **Needs attention** retains Signals, Complaints, and Security work queues. Super-admin does not replace or duplicate their operations or authorization checks.
- Every implemented protected Super-admin route independently checks Owner authority before cursor/input parsing or private reads. Private document/data responses and controlled errors use `private, no-store`; no session returns 401, a non-Owner returns 403, malformed cursor/query returns 400, unknown or mismatched monitor scopes return 404, and classified monitoring-storage unavailability returns 503. Unexpected database/schema/programming failures are not misreported as malformed input.

## Outgoing address routing boundary

The merged `AdministrativeRouting` foundation has distinct typed destination families:
`superAdmin` for Owner-surface links and `admin` for ordinary administration.
Current Super-admin shell, all delivered Monitoring/History/Event log links and the approved
Owner entries use the active UI or request-scoped resolver. A trusted replacement
resolver can produce a different Owner base/origin without rewriting those outgoing
addresses; the current default remains `/:locale/super-admin/*`.

This is **outgoing address construction only**. In the current implementation
Super-admin retains its existing route registrations and Worker ingress, with
the same exact server-bound Owner guards and same-origin defaults.
No separate Owner Worker, Access, isolated Owner authentication/session,
database/deployment capability separation, hidden route or cross-origin transport
is delivered by this foundation. Those are separate future Stage-6 security work;
a link or destination never confers Owner authority.

## Approved information architecture

The Super-admin product consists of **Overview**, **Monitoring & Event log**, and **Infrastructure**. User-specific administrative/Owner information belongs in the approved **unified user profile** model, not a second Super-admin user-detail implementation.

**Overview** is a concise cross-area current-state summary, with relevant problems, source/coverage qualifiers and navigation to details. It does not duplicate the Monitoring readers or invent metrics. SA-08 composes the real measured state of **all twelve delivered areas** from the same authoritative sources; **Infrastructure** is a visible, unmeasured Stage-6 placeholder.

**Monitoring** has these thirteen approved logical areas:

1. System
2. Accounts & authentication
3. Security
4. Forum
5. Localization & translations
6. Notifications
7. Files & attachments
8. Administration
9. Moderation
10. Background processes
11. Data
12. Integrations
13. Infrastructure

**All twelve non-Infrastructure areas are delivered** with closed, code-backed monitor catalogs and source-specific truthful coverage. Infrastructure alone remains **Under development / Stage 6**, without live readings or control. An area being delivered does not assert complete observation, a running provider/scheduler, live external credentials, a full audit or permission to invent new producers.

For each monitor that is actually implemented, the approved contextual model is:

1. **Current state** — the present measured/known state and an honest freshness/coverage boundary.
2. **Adjacent History** — the retained state observations and relevant events for that **same** monitor, directly accessible beside its current state.
3. **Applicable actions** — only real operations applicable to that object/state, with the original domain's permission, validation, and lifecycle checks. An otherwise read-only monitor needs no invented action. Existing Admin/Settings/Attention operations must be reused at their canonical boundary, without a duplicate mutation or event producer; genuinely Owner-only operations require their own approved package.

A separate **global Event log** aggregates applicable events across current and future monitoring areas. It **complements**, not replaces, per-monitor History. It is not a claim that full security, account-access, infrastructure, or provider auditing is already connected.

## SA-01 — implemented System Monitoring and event foundation

### Current state and Overview

The live System area currently has exactly three monitors:

- `system.runtime` — current application/Worker serving state and an explicitly labeled build/mode value; no fabricated uptime or release-version measurement.
- `system.dependencies` — actual PostgreSQL availability for a successful read and the queried database server version.
- `system.requests` — the **recorded 5xx failures only**, presented as limited coverage; not a total traffic/error-rate monitor.

A successful System read produces or reuses bounded persisted observations. Unchanged measurements are deduplicated during a short sampling window, while meaningful changes and periodic snapshots remain available. Observation write failure is reported as degraded recording, not silently presented as reliable persistence, and does not veto an otherwise successful current-state read.

Each card displays the time of the current read and **Coverage since**. The coverage start is the **earliest actually retained timestamp** across observations and matching System events for that monitor, not the last sample and not an invented pre-history interval. The last recorded observation timestamp is tracked internally but is not separately displayed on the current cards.

The original SA-01 System monitors and their sampling semantics remain authoritative. SA-02 extended the earlier Overview with Accounts/Security; SA-08 now composes all delivered area summaries from shared native reads without double-counting or fabricating measurements.

### Adjacent History and global Event log

- `/:locale/super-admin/monitoring/system` shows the implemented System cards.
- `/:locale/super-admin/monitoring/system/:monitorKey/history` displays each implemented monitor's **scoped** retained observations/events.
- `/:locale/super-admin/events` displays the **global** source-aware journal. SA-01 introduced projection of native `owner_events`, `owner_monitor_observations`, and applicable ordinary `admin_history` records without copying source identities; SA-02 extends that projection with the additional sources described below.
- Global and scoped views share the original source identity; pagination is stable for source/timestamp ordering and uses validated cursors. Invalid calendar dates are rejected before PostgreSQL; unknown filters do not open arbitrary private queries.
- Ordinary Admin History retains its own independent authorization and product meaning. A projected ordinary History event in the Owner journal does not grant an ordinary admin read access to Super-admin or expose a separate user-security audit that has not been implemented.

### Storage, retention and safety

Forward migration `0062_owner_monitoring_foundation` introduced the append-only `owner_events` and `owner_monitor_observations` tables. The web runtime receives the bounded SELECT/INSERT access required for recorded events/observations and reads, not UPDATE/DELETE or identity-sequence mutation access. Owner records are source-aware, immutable after append, deduplicated by occurrence where applicable, and use bounded/safe payloads rather than copied passwords, tokens, raw requests, or private user data.

The approved Owner monitoring/event history policy is **indefinite retention until an explicit Owner policy change**, with **no ordinary UI deletion**. This is not a promise of historical backfill or full audit coverage from before the producers were connected. There is no retention/cleanup job. SA-02 adds bounded authentication/account facts and attempt telemetry. SA-03 projects only target-attributable retained sources into the canonical profile; it did not invent backfill, copy source identities, or itself add a deactivation producer. SA-05 later added that separate canonical Owner operation.

The Worker records a small sanitized event for an actual HTTP 5xx response on a best-effort basis. Recording failure must not change the original response; it is **not** an exhaustive request log. A classified query-timeout/storage failure can produce a protected 503; unrelated unexpected errors retain their normal classification.

## SA-02 — implemented Accounts & authentication + Security Monitoring

### Current state and Overview

SA-02 adds exactly seven live monitors:

- `accounts.users` — total persisted users and users created during the previous 24 hours;
- `accounts.methods` — users with a credential password, Google, or both;
- `accounts.sessions` — active sessions at the snapshot read-time and retained expired session rows;
- `accounts.registration` — current Google/email-password registration flags, version and update time;
- `security.auth` — cumulative retained/coalesced auth attempts, rate-limited attempts, retained source patterns, unknown/overflow/gap counts, last seen time, and current recording-hour pool usage;
- `security.access` — the same bounded telemetry model for Super-admin exact-Owner admission failures;
- `security.attachments` — retained attachment-security evidence total, previous-24-hour count and latest evidence time.

Current values come from fixed server-side PostgreSQL aggregates and source tables, not arbitrary Owner-supplied filters. A read uses a single database snapshot/read-time. Observation persistence is best-effort: recording failure is surfaced as degraded recording and does not convert an otherwise valid current-state read into fabricated zeroes.

The Overview adds compact Accounts/Security summaries from the same readers. It does not duplicate all seven cards or claim full authentication/security audit coverage.

### Exact auth facts and bounded attempt telemetry

SA-02 records only proven persisted auth transitions for these five kinds:

- `account.created`;
- `auth.methodLinked`;
- `auth.passwordChanged`;
- `auth.sessionCreated`;
- `auth.sessionDeleted`.

A refused attempt or an HTTP success without a proven persisted transition is not promoted to an exact fact. These facts reuse the existing `owner_events` journal with source `auth`, bounded safe identity fields, and no password/hash/token payloads.

Forward migration `0063_owner_attempt_telemetry` adds `owner_attempt_patterns` and
`owner_attempt_telemetry_state`. Attempt recording uses a PostgreSQL-assigned UTC recording
hour. New attributed source-pattern groups are admitted separately into authenticated and
anonymous-known-network pools, each capped at **256 new groups per hour**. Repeats coalesce
into the same retained group; unknown sources, capacity overflow and recording gaps use fixed
bounded state slots. A new recording hour receives a fresh admission budget without deleting
or reassigning old history. Current totals therefore describe **recorded retained telemetry**,
not every request or every attacker/source under arbitrary cardinality flood.

When available from the trusted ingress/request context, Owner-only telemetry may retain the
internal actor ID and a canonical network IP with explicit source quality. It does not trust
client X-Forwarded-For/X-Real-IP/user input as identity, and does not store passwords, hashes,
cookies, bearer/session/OAuth tokens, raw request bodies/queries/URLs, email/name/user-agent,
provider payloads, exception text or SQL text.

### Adjacent History and global Event log

- `/:locale/super-admin/monitoring/accounts` exposes four Accounts monitors.
- `/:locale/super-admin/monitoring/security` exposes three Security monitors.
- `/:locale/super-admin/monitoring/:area/:monitorKey/history` is restricted to fixed System/Accounts/Security area-monitor membership; unknown or mismatched scopes do not become arbitrary private queries.
- Scoped History and the global `/:locale/super-admin/events` project the **same original source identities** rather than copying records into a second journal.

The current source-aware History can project System events, exact auth events, monitor observations,
registration changes from ordinary Admin History, native attachment-security evidence,
coalesced attempt patterns and bounded attempt-state rows. It distinguishes occurred/recorded
time, safe actor/target/entity references, source/quality/network data where legitimately
available, and grouped count/first/last semantics. Opaque IDs are rendered literally; only
semantic numeric counters receive locale number formatting.

Context actions reuse existing authoritative destinations instead of creating duplicate mutations:
Users → Admin Users, methods/sessions → the Owner's own Account & security settings,
registration → Owner Forum & roles, and attachment evidence → Needs attention/Security/Attachments.

## SA-03 — implemented canonical unified user profile

The canonical `/:locale/users/:userId` profile is now the single current user-detail page.
Its public profile baseline remains available under the ordinary public contract. Privileged
sections are added only after independent server-side admission and are bound to the current
authenticated viewer; unauthorized sections are not read or serialized.

Ordinary administrative composition reuses existing authoritative capabilities rather than a
second user-admin backend:

- `admin.users.blocks.manage` may expose the target's existing AP-10 measure summaries, still
  subject to current target/hierarchy restrictions. Exact Owner viewing their own profile uses
  the existing own-measures path because AP-10 deliberately forbids Admin Owner/self targets.
- `access.authorization.manage` may expose the existing targeted role/grant/override/effective
  authorization snapshot. Only exact bound Owner receives the existing assignment/override
  mutation forms; writes still go through the canonical authorization action/writer and its
  fresh Owner-only policy.
- `admin.users.read` remains the directory capability. The legacy
  `/:locale/admin/users/:userId` route independently checks that permission and target
  existence, then redirects private/no-store to the canonical profile; it is not a second
  detail implementation.

The exact-Owner section has a fixed safe read-only account projection: email and verification
state, account creation/update time, linked password/Google methods, active/expired-retained
session counts, and a 25-item keyset page of safe session records with created/expiry time,
current-session marker, bounded device label and normalized recorded IP when present. It does
not expose password hashes, OAuth/session tokens, provider payloads or arbitrary Better Auth
records, and SA-03 adds no operation over another user's credentials or sessions.

The exact-Owner target History is a 25-item target-bound keyset projection over only retained
sources with proven person attribution: exact auth events, coalesced attributed attempt
patterns, attachment-security evidence and ordinary Admin History where the user is actor,
target or the target of a retained measure event. Original source IDs/timestamps are preserved;
unattributed global observations, quota/gap slots and arbitrary event sources do not become
per-user activity. This is relevant retained History, not a complete activity/audit timeline.

Profile document/data responses and controlled errors are private/no-store. Client presentation
also binds every privileged snapshot to the authenticated viewer: known sign-out/viewer change
removes previously matched private/Admin state synchronously, while a first fresh authorized
snapshot may wait for HeaderAuth synchronization and then render without a second loader request.
This presentation rule supplements, never replaces, the server admission checks.

Forward migration `0064_sa03_profile_history_indexes` adds six target-chronological btree
indexes across existing Owner events, attempt patterns, attachment evidence and Admin History.
It adds no relation, domain state, permission, grant or runtime writer.

## SA-04 — implemented AccountState foundation and enforcement

SA-04 is a **repository/local-CI account-lifecycle foundation**, not an Owner-facing
deactivation feature. Forward migration `0065_sa04_account_state_foundation` adds three
server-owned nullable columns to the existing Better Auth `user` row:
`deactivated_at`, `deactivated_by_user_id` and `retain_at_least_until`.
All three NULL means active. A deactivated tuple requires all three set, a nonblank
deactivating actor ID and a retention bound no earlier than one **UTC calendar year**
after deactivation; the database CHECK enforces this. Existing accounts remain active
without backfill. These fields are neither writable Better Auth additionalFields
nor ordinary auth/public DTO fields. SA-04 adds no user-facing state writer, automatic
retention-expiry action or physical-delete path.

Neither a previously authenticated cookie nor Owner/admin permissions bypass the
active-account requirement. Better Auth session resolution, existing direct and HTTP
auth APIs, session creation and account-target writes reject inactive/missing identity
or target instead of granting new authenticated authority. The narrow exception is
**own signed sign-out** to clear the old session/cookie, not forced revocation of
someone else's sessions. Classified AccountState storage failure is distinguished
from inactive/guest and unexpected failure; it never grants access by fallback.

The existing **authoritative actor-owned writer boundaries** additionally admit the
active actor inside their database transaction, even when preflight admission has
already passed. This covers Forum topic/post/profile/Help operations, notifications,
read-state and presence; attachment upload/private draft/finalization/Cancel;
authorization mutations; AP-10 measures and appeals; Complaints participation,
triage, notes, decisions and appeals; own locale and Privacy saves; exact-Owner
registration-settings writes; and new user-content translation-generation plans.
The lifecycle predicate also applies to relevant no-op and committed-replay paths,
without replacing existing permission, hierarchy, measure, Owner, CAS, receipt,
History or storage-fence contracts. If a writer commits before the competing
state change, that admitted write stands; if the state change wins the authoritative
admission, the denied attempt creates no new durable domain effects. Already
accepted translation tasks/consumers continue normally rather than being cancelled
by later inactivity. SA-04 does not retroactively erase a committed publication
or an already in-flight physical upload.

The shared public identity projection retains stable user/profile IDs and
published topic/post content, revisions and attachments while rendering inactive
people as localized **Deleted user** with neutral avatar and without old public
name/image, bio or external links in serialized public data. The protection also
covers public author/notification/revision projections, the Users directory
identity and name-based search, mention suggestions, and online list/count/heartbeat.
Existing authorized private account, History and immutable evidence keep their
original retained data under their separate access controls; those records are
not physically deleted or globally anonymized.

Known inactive/missing lifecycle denials at protected request boundaries use
private/no-store authentication failure; classified state storage unavailability
returns protected `503`, while unexpected errors retain the unexpected-error path.
Mounted forms retain explicit user control and do not silently replay denied writes
or show false success. SA-04 introduces no new permission/RBAC, Monitoring area,
reactivation, foreign credential/provider operation, forced-session control,
Stage-6 activation or production rollout.

## SA-05 — implemented canonical Owner account deactivation

SA-05 adds the **actual state-changing command** to the approved canonical
`/:locale/users/:userId` profile, not to a second user-detail or Super-admin
mutation backend. Only the currently authenticated exact server-bound Owner can
invoke it. The Owner cannot deactivate themselves; submitted target/operation
identity does not establish actor authority. The command requires no mandatory
reason. Ordinary Admin measure or authorization management does not confer this
capability.

In one authoritative PostgreSQL transaction, the operation serializes the
Owner/target lifecycle admission, changes the existing SA-04 AccountState tuple,
clears public presence as required, and records the **one original retained
deactivation event**. Replays/no-ops and uncertain acknowledgements do not
produce a second effect or invented successful history. Mandatory event failure
rolls back the lifecycle/presence change. Concurrent writers follow the
authoritative actor/state commit order: a writer that committed first stands;
a later writer denied by active-account admission cannot add domain effects.
Previously accepted background tasks are not retroactively cancelled.

The account ceases new authenticated participation on its next protected
request; previously issued cookies are not treated as authority, while
own signed sign-out remains possible. Public profiles, authors and identity
projections display neutral **Deleted user** without revealing old identity;
published forum content, revisions and attachments remain visible under their
existing access rules. Private/account data, evidence and attributed retained
History are not purged, with `retain_at_least_until` at least one UTC calendar
year after deactivation. This is **not** a hard delete, forced foreign-session
termination, reactivation or expiration-triggered purge. No new Owner role,
credential/provider mutation or production rollout is introduced.

## SA-06 — implemented native Forum, Administration, Moderation and Notifications

SA-06 extends the same Owner Monitoring/History model to four native areas
and ten fixed monitors:

- **Forum:** `forum.structure`, `forum.state`, `forum.content`,
  `forum.presence`;
- **Administration:** `administration.authorization`,
  `administration.measures`, `administration.registration`;
- **Moderation:** `moderation.help`, `moderation.complaints`;
- **Notifications:** `notifications.inbox`.

Current figures come from complete native PostgreSQL aggregates at a defined
read-time, not from a truncated UI page. A truly empty source is zero; a failed
source is unavailable rather than an invented healthy zero. Recording of
monitor snapshots remains bounded and best-effort; a failed observation write
does not erase a successfully measured current value. Existing visibility,
permission and lifecycle rules retain their original authoritative domain
boundaries; read-only Monitoring never performs the domain action.

Adjacent/global/Owner-target History project the **original native source
IDs**, immutable revisions, Admin commands, Help/Complaint events, measure
appeals and terminal outcomes, and notification creation/first-read events
where the actual source proves them. One source fact can be associated with
several monitor scopes without becoming duplicate global events. Actor,
subject, recipient and first-read attribution are limited to persisted proof;
unknown terminal time or legacy actor remains explicitly unknown instead of
being guessed. Stable timestamp/ID cursor pagination and fixed source-aware
filters do not silently skip relevant retained rows. Forward migration
`0066_sa06_native_monitor_indexes` adds the required native chronological,
person-attributed and terminal/source-lookup indexes without a new journal,
permission, producer or source-table rewrite.

## SA-07 — implemented Background, Localization, Files, Data and Integrations

SA-07 supplies five additional areas using existing domain and operational
sources, with fixed read-only catalogs:

- **Background processes:** `background.translation`,
  `background.attachments` — real retained task/cleanup state and bounded
  successful-transition facts; scheduler/provider runtime that is disabled
  or not wired is labeled as such.
- **Localization & translations:** `localization.registry`,
  `localization.ui`, `localization.content`,
  `localization.budget` — actual persistent locale/translation/bundle,
  current-revision and budget state, with the localization DB read separated
  from the web DB role. Unknown provider wiring or limits are not fabricated.
- **Files & attachments:** `files.assets`, `files.operations` —
  authoritative metadata/journal/cleanup counts; retained observations for
  the 13 supported private storage slots, not a fresh R2 probe on page GET.
- **Data:** `data.application`, `data.compatibility`,
  `data.retention` — real application/compatibility state and explicit
  coverage/unchecked retention boundaries, without performing migration
  or retention cleanup.
- **Integrations:** `integrations.database`,
  `integrations.authentication`, `integrations.translation`,
  `integrations.storage` — bounded evidence from already observed
  dependency/auth/task/storage sources; configuration is not proof of a
  successful external operation.

A successful operational event remains one native `owner_events` identity
through global/scoped History. Local transport/mock provider fixtures used in
CI never claim a live Cloudflare/Neon/Google/provider integration. Monitoring
does not trigger R2 calls, translation-generation/provider work, Queue jobs,
credential changes, background cleanup or a second audit writer. Sources
distinguish measured, sampled, best-effort, disabled, unavailable, stale
and unattributed coverage; a retained sample is not a live provider call or
an exhaustive continuous event stream.

## SA-08 — implemented complete Overview and closed History controls

SA-08 composes the approved **13-area** Overview: twelve measured source areas
and the explicitly unmeasured **Infrastructure** placeholder. Current counts,
timestamps, registration, task, file and retention summaries reuse their
existing native readers, not a new data store or repeated source probes.
The bounded web snapshot and separately bound localization read provide
source-local consistency. Independent classified unavailable sources are
isolated with SAVEPOINT recovery; successful neighboring areas retain
their measured values. The composer uses at most 40 fixed source-read
statements and a 10-second read budget, then closes read transactions before
any bounded global observation batch. Global sample gates use the existing
15-minute deduplication semantics and ordered advisory locks. A failed
recorder cannot turn a valid current read into a false zero. Unknown or
partially covered state never becomes an overall healthy assertion.

The global Event log and every applicable adjacent History retain the same
original `(origin, source ID)` fact identity and closed allowlisted filters:
area, monitor, source origin, fact kind and UTC start/end. Invalid/duplicate,
scope-incompatible or impossible-calendar filters fail before private SQL.
Keyset cursors bind the full selected filter set and page size, preserve
microsecond timestamps, and retain compatibility with previously valid
unfiltered cursors. UI links/paging round-trip the active filters.
Historical/event/source timestamps, limited coverage, missing actor proof
and sampled observations are identified rather than silently normalized
into a continuous full audit.

Contextual actions navigate to the existing guarded **Admin**, **Settings**,
**Needs attention** or canonical **profile** operation as appropriate, with
their existing session, permission, actor, origin, CAS and History contracts.
A Monitoring card or an action link does not authorize a new write. On known
sign-out, actor change or late private response, previously matched Owner
presentation is not revived by stale client data. All private success,
document/data and controlled-error responses retain no-store protection.

## Infrastructure and acceptance boundary

The `/:locale/super-admin/infrastructure` tab is a truthful **Under
development / Stage 6** placeholder. It exposes no live Cloudflare/Neon,
deployment, secret, provider or storage-administration API. Separate Owner
Worker, Access, authentication/session isolation, production DB/deployment
separation, real OAuth/Owner binding and external runtime checks require
explicit Stage-6 work and approval.

**SA-01–SA-08 are complete in the repository/local-CI delivery scope.**
The whole-SA08 connected acceptance covers actual built Worker, genuine
Better Auth sessions, disposable PostgreSQL 17, Chromium and local R2
where applicable, including canonical Owner action/lifecycle races,
native source identity, multi-page filtered History, partial failures,
privacy, keyboard/responsive and EN/RU/HE/RTL presentation. These checks
do **not** establish deployed infrastructure, production migration/roles,
live Google OAuth, real `VICO_OWNER_USER_ID`, active external
provider/Queue operations or full security/event collection. The actual
Owner visual/UI refinement and final product acceptance belong to a
**later separate UI/UX pass** by explicit Developer decision, and did
not block the SA-08 implementation merge. No other disabled capability
becomes implemented merely by documenting its approved destination.
