# Super-admin — Owner-only product and runtime contract

## Scope and delivery status

Super-admin is the separate **exact server-bound Owner-only** administration surface of Vico Forum. It is distinct from the ordinary permission-scoped [Admin panel](ADMIN_PANEL.md), [Settings](SETTINGS.md), and [Needs attention](moderation/COMPLAINTS.md).

The product model below is approved; **approval does not mean implementation**. **SA-01 and SA-02** have been merged into `main` and verified in the repository/local-CI path. SA-01 delivers the shell, System Monitoring, adjacent History, a global source-aware Event log foundation, retained Owner event/observation storage, passive safe 5xx telemetry, and an inert Infrastructure placeholder. SA-02 adds live **Accounts & authentication** and **Security** Monitoring, source-aware adjacent/global History, exact persisted auth-transition facts and bounded source-attributed attempt telemetry. Later SA packages, live infrastructure integration, and external/deployed Owner acceptance remain separate.

Current factual implementation status is in [PROJECT_STATE.md](../PROJECT_STATE.md); implementation/review/merge evidence is in [project history](PROJECT_HISTORY/PROJECT_HISTORY.md). Production/Stage-6 status is governed separately by [ROADMAP.md](../ROADMAP.md) and `docs/database/*`.

## Authority and separation of concerns

- The entire Super-admin surface requires an authenticated Better Auth session whose `user.id` **exactly matches** the trusted server-side `VICO_OWNER_USER_ID`. An administrator, ordinary role, dynamic permission grant, email or provider claim does not confer this authority.
- SA-01/SA-02 add **no** Owner role, permission key, second RBAC, generic elevated mutation capability, or alternative Owner-binding/bootstrap mechanism. The single-Owner product model remains in [AUTHORIZATION.md](auth/AUTHORIZATION.md).
- The Owner has two approved links to the **same** canonical `/:locale/super-admin` destination: an Owner-only entry in ordinary administration, and an Owner-only entry from the Owner account/profile navigation.
- Ordinary **Admin** remains the authoritative location for forum object management, user administration and measures, Roles authorization views, and ordinary significant-action History. **Settings** retains role/permission/registration configuration and personal account settings. **Needs attention** retains Signals, Complaints, and Security work queues. Super-admin does not replace or duplicate their operations or authorization checks.
- Every implemented protected Super-admin route independently checks Owner authority before cursor/input parsing or private reads. Private document/data responses and controlled errors use `private, no-store`; no session returns 401, a non-Owner returns 403, malformed cursor/query returns 400, unknown or mismatched monitor scopes return 404, and classified monitoring-storage unavailability returns 503. Unexpected database/schema/programming failures are not misreported as malformed input.

## Outgoing address routing boundary

The merged `AdministrativeRouting` foundation has distinct typed destination families:
`superAdmin` for Owner-surface links and `admin` for ordinary administration.
Current Super-admin shell, Monitoring/System/Accounts/Security/History/Event log links and the approved
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

**Overview** is a concise cross-area current-state summary, with relevant problems and navigation to details. It does not replicate all Monitoring views or require invented metrics. The current implementation uses real **System** measurements, compact **Accounts & authentication** and **Security** summaries, and a small recent-event projection; it does **not** claim to summarize unavailable future monitoring sources.

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

**System**, **Accounts & authentication**, and **Security** are live after SA-01/SA-02. The remaining nine non-Infrastructure areas are explicitly **Under development**; the Infrastructure area is Stage-6-only and also a placeholder. These names define future organization, **not** a complete approved metric/event/action catalog or permission to build new producers.

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

The SA-01 System projection remains unchanged. SA-02 later extends Overview with compact Accounts/Security summaries from the same current readers; unavailable future areas are not presented as measured.

### Adjacent History and global Event log

- `/:locale/super-admin/monitoring/system` shows the implemented System cards.
- `/:locale/super-admin/monitoring/system/:monitorKey/history` displays each implemented monitor's **scoped** retained observations/events.
- `/:locale/super-admin/events` displays the **global** source-aware journal. SA-01 introduced projection of native `owner_events`, `owner_monitor_observations`, and applicable ordinary `admin_history` records without copying source identities; SA-02 extends that projection with the additional sources described below.
- Global and scoped views share the original source identity; pagination is stable for source/timestamp ordering and uses validated cursors. Invalid calendar dates are rejected before PostgreSQL; unknown filters do not open arbitrary private queries.
- Ordinary Admin History retains its own independent authorization and product meaning. A projected ordinary History event in the Owner journal does not grant an ordinary admin read access to Super-admin or expose a separate user-security audit that has not been implemented.

### Storage, retention and safety

Forward migration `0062_owner_monitoring_foundation` introduced the append-only `owner_events` and `owner_monitor_observations` tables. The web runtime receives the bounded SELECT/INSERT access required for recorded events/observations and reads, not UPDATE/DELETE or identity-sequence mutation access. Owner records are source-aware, immutable after append, deduplicated by occurrence where applicable, and use bounded/safe payloads rather than copied passwords, tokens, raw requests, or private user data.

The approved Owner monitoring/event history policy is **indefinite retention until an explicit Owner policy change**, with **no ordinary UI deletion**. This is not a promise of historical backfill or full audit coverage from before the producers were connected. There is no retention/cleanup job. SA-02 adds bounded authentication/account facts and attempt telemetry, but no deactivation producer or unified per-user Owner history surface.

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

## Approved future boundaries — not SA-01/SA-02 deliverables

The canonical `/:locale/users/:userId` profile is the **target single user-detail page** with a public section and separately server-authorized ordinary-administrative and exact-Owner sections. Authorized ordinary administration may expose existing user **violation/measure** information and targeted role/permission controls, **not** a copy of the user's full internal activity or security history. The Owner-only section is intended to expose private account identity, available sign-in methods, safe session/device information, relevant account/security history, account status and the approved deactivation operation, when implemented. These protected details must not be serialized into a public profile response and merely hidden client-side. **None of this unified privileged-profile work is delivered by SA-01/SA-02.**

The approved future Owner-only **deactivation** product behavior is: the deactivated account ceases active forum use; published content remains; the public identity becomes **Deleted user**; underlying private/account data remains retained for **at least one year**. The exact bound Owner cannot deactivate their own account. No mandatory reason is required. Physical account deletion, end-of-retention action, reactivation, forced-session-termination controls, credential/provider manipulation, and a second Owner/recovery model are **not** authorized by this description. **SA-01/SA-02 do not implement deactivation.**

Additional Monitoring sources, new Owner-only actions, unified per-user privileged history, or deactivation require later bounded delivery and real source-specific evidence. SA-01/SA-02 do not claim completion of the remaining Super-admin plan or a unified full-audit implementation.

The **Infrastructure** tab is present at `/:locale/super-admin/infrastructure` as an honest **Under development / Stage 6** placeholder. It exposes no live Cloudflare/Neon/deployment/secret/provider data, controls, credentials or infrastructure API. Actual infrastructure administration and external runtime checks are deferred until the Owner explicitly resumes Stage 6.

## SA-01/SA-02 acceptance boundary

SA-01 and SA-02 have passed repository CI, native PostgreSQL 17 and built Worker/Better Auth/Chromium acceptance, followed by coordinator and independent technical review, and both implementations are merged. SA-02 acceptance additionally covers real local Better Auth signup/sign-in/password/session lifecycle flows, exact source identity across current/scoped/global views, protected document/data admission, storage degradation/recovery, EN/RU/HE, RTL/responsive and keyboard paths. Those checks use disposable/local test infrastructure and synthetic Owner binding. They do **not** imply production deployment, live Google OAuth, real Owner binding, Stage-6 integrations, complete security monitoring, or final owner visual-polish acceptance. The broader approved product model remains staged; no later package becomes authorized merely by this documentation.
