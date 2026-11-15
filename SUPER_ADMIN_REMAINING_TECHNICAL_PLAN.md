# Super-admin — complete remaining technical plan, SA04-L–S through SA08

Date: 2026-11-15. Planner: Lev / Codex-6.1 Sol. Service PR: **#331, never merge**.

Status: **submitted for Mira whole-plan scope/fit review; implementation STOPPED**. Lira/Mark inactive. This is a service planning artifact, not implementation, runtime acceptance or permanent project documentation.

## 1. Authority, baseline and completion boundary

Planning baseline: `main=6652c898067d05a7c1476377e95f50cd73937410` (merge #332). SA01–03 and SA04 A–K are delivered; the remaining task is **SA04-L–S → SA05 → SA06 → SA07 → SA08**, including separate final factual documentation. Acceptance of only the L–S subplan does not open implementation of the whole task.

Normative inputs:

- [Accepted original Super-admin product/package map, #251 comment #6745289141](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745289141), particularly §§3–13.
- [Accepted detailed L–S subplan](https://github.com/iliya1947/vico-forum/blob/chatgpt/admin-panel-service-2/SA04_L_S_TECHNICAL_PLAN.md), blob `cde81eeb259a3b7a5c4b96324a92aa310f375915`; handoff [#6891833779](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6891833779), including accepted R provisional-head clarification and N-DEP-01. This plan incorporates it by reference, in full, without replacing its writer-specific contracts.
- Current `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/SUPER_ADMIN.md`, authorization/AP-10, Settings/Privacy, Complaints, attachment and translation contracts. Current permanent Super-admin documentation describes SA01–03; interim SA04 facts belong in the service channel until separate documentation closeout. That known timing is not authority to omit the current source.

The existing detailed subplan's statements that SA05 planning is future work describe its former boundary. **Sections 4–16 below supply that planning now**, before implementation resumes. The requirement that SA05 implementation wait for complete SA04 acceptance remains.

Product boundaries remain fixed: exact server-bound Owner, one canonical user detail `/:locale/users/:userId`, independently guarded public/Admin/Owner projections, neutral public Deleted user, retained content/private account data, no second RBAC. Exact bound Owner is not a valid deactivation target by the approved product decision. There is **no last administrator/permission-manager count, recovery invariant, or extra manager immunity** in this plan. Existing unrelated policy cleanup is not silently bundled here.

No reactivation, hard delete, retention-end job, forced logout control, credential/provider mutation, mandatory reason, new reauthentication protocol, infrastructure API, external collection service, deployment, live provider setup, #315 remediation or Stage 6 work. Infrastructure remains the honest Under development / Stage 6 destination. Local synthetic acceptance does not establish production readiness or owner visual acceptance.

## 2. Current seams and confirmed storage constraints

| Capability | Current authoritative source/seam | Consequence for remaining work |
|---|---|---|
| Lifecycle | `db/account-state.ts`; three nullable columns and UTC calendar-year CHECK in `drizzle/0065_sa04_account_state_foundation.sql` | Reuse shared tuple parser/predicate/errors and transaction-local NO KEY UPDATE guard. No second active-state rule. |
| Owner access | `app/super-admin/access.server.ts`, `app/authorization/owner.ts`, Worker session initialization | Every new document/data/action guards independently before private query, cursor parsing or context resolution. Request identity alone is insufficient for a subsequent write. |
| Owner current/history | `db/owner-system-{history,monitoring}.ts`, `owner-sa02-{catalog,current,history}.ts`, `hyperdrive-owner-system.ts` | Extend typed current/history capability and fixed catalog; preserve ten delivered monitor identities and all legacy cursors. |
| Profile | `db/owner-user-{profile,history}.ts`, `hyperdrive-owner-profile.ts`, `app/profile/request-context.ts`, profile route/view | Add lifecycle fields/control only to Owner section of existing detail. Existing session metadata allowlist and cross-account invalidation remain. |
| Exact events | `owner_events`; native `admin_history`, Complaint events, attachment security evidence, revision records | Existing events are projected, not copied into another Owner success event. New lifecycle/operational facts use the existing Owner relation only where native persistence cannot retain the fact. |
| Observations | `owner_monitor_observations`; System recorder and SA02 recorder | Extend closed schemas/keys. Existing SQL has **no source/kind/monitor enum CHECK** to migrate. System and SA02 currently have different sampling policies; preserve delivered policies while specifying one policy for new monitors (§6). |
| Append ordering | Existing Owner append advisory key `(1447641935,2)`; Admin History has its existing ordering seam | Journal ordering lock is last, after domain/actor locks. Atomic lifecycle writer accepts the caller's transaction; passive writers run after domain COMMIT. |
| Translation | `translation-task-store.ts`, title/body planning stores, three publication stores, reconciler, allowance/request-budget stores | Real mutable task state is available. Historical transitions cannot be reconstructed from updated_at. Instrument actual accepted transitions without enabling currently disabled runtime. |
| Attachments | attachment repository/finalization, `workers/attachment-storage.ts`, cleanup `runOnce`, sweep relation | Separate DB metadata/ref/claim state from an actual storage outcome. No cleanup execution from Monitoring GET or new operator button. |
| Database capabilities | `.github/scripts/runtime-privileges.mjs`, binding resolver, native probes | Current web role explicitly cannot SELECT locales or translation_tasks. SA07 needs a bounded, explicit privilege contract delta (§11), not fallback to migration credentials. |

`owner_events` already has unique `(source,occurrence_key)`, global chronological, monitor/kind/entity/actor/target position and actor/target chronological indexes. Observations already have global chronological and monitor/scope/position indexes. Neither relation needs a new column/table for the proposed events. `user` already has web UPDATE, presence DELETE already exists, and web has Owner journal SELECT/INSERT. **SA05 needs no schema or grant migration.**

Current native time precision differs: lifecycle user timestamps allow PostgreSQL microseconds; Owner event timestamps are milliseconds. SA05 deliberately uses one DB millisecond instant for both, rather than comparing independently rounded clocks.

Current runtime uses two required connections: `HYPERDRIVE` for localization read, `WEB_HYPERDRIVE` for web. Production content-generation action runtime is explicitly disabled; translation consumer/reconciler and attachment cleanup classes are not newly scheduled by this task. Static code availability, configured binding, runtime enablement, successful observation and continuous health are separate facts.

## 3. Complete dependency and bounded delivery graph

Only one bounded implementation assignment is active at a time. All architectural decisions in this document apply across packages; later preparation refreshes exact locators/main and detects drift. It does not reopen the delivery model or invent a per-package architecture. A genuine source-contract conflict or necessary plan change returns to Lev/Mira before implementation of that change.

| Queue ID | Prerequisites | Bounded deliverable and stop point |
|---|---|---|
| L | Accepted whole remaining plan | All six authorization writers; exact L contract in accepted subplan. STOP. |
| M1, M2 | L merged | M1 measure create/change/lift; M2 participant appeal + resolution and whole-M closure. STOP per assigned slice. |
| N1, N2, N3 | M merged | N1 submit/replay + N-DEP-01; N2 priority/activity/note/decision; N3 appeal/resolution + whole-N closure. |
| O | N merged | Own locale conditional write and lifecycle mapping. |
| P | O merged | Privacy same-transaction subject lock, including repeated OFF. |
| Q | P merged | Registration singleton actor guard before CAS/no-op. |
| R1, R2, R3 | Q merged | R1 title/body authoritative stores; R2 action/capability/planner propagation; R3 connected real-store and cross-writer whole-R closure. Runtime remains disabled. |
| S1, S2 | All A–R accepted | S1 full native inventory/races, S2 connected complete SA04 state. No user-facing deactivation yet. Full SA04 acceptance opens SA05. |
| 05-A | Full SA04 accepted | Typed atomic deactivate command, Owner event mapping to accounts/profile/global, direct/native acceptance. No visible button until command and route tests pass. |
| 05-B | 05-A merged | Canonical Owner profile control/resource action/retention view + real stale-session/race/rollback acceptance. Whole SA05 closure. |
| 06-0 | SA05 accepted | Extend fixed catalog/history/read DTO/action-descriptor foundation for already named future entries, registered routes only for implemented areas; bounded passive fact port needed later; chronological scope indexes. No empty future areas represented as measured. |
| 06-F | 06-0 | Forum current/read/history/action links, native revision projections and indexes. |
| 06-A | 06-F | Administration roles/measures/settings monitors; Admin History mapping, measure-appeal creation facts. |
| 06-M | 06-A | Moderation monitors, Complaint events and retained creation facts, Attention links. |
| 06-N | 06-M | Notifications counts/target validity and persisted creation/first-read facts; own-inbox link. Whole SA06 closure. |
| 07-B1 | SA06 accepted | Translation task read capability/grants, canonical Background task monitor, actual planning/claim/failure/publication/reconciliation instrumentation. Localization links to these identities later. |
| 07-L | 07-B1 | Localization registry/UI/content coverage/budget monitors, existing localization connection, typed cross-links to Background. |
| 07-F | 07-L | Files monitors, safe upload/publication/cleanup instrumentation; Background attachment-cleanup monitor and cross-links delivered together. No cleanup scheduler/action. |
| 07-D | 07-F | Data allowlisted counts/relationship/schema-compatibility/retention coverage monitors. |
| 07-I | 07-D | Integrations configuration/capability/actual-outcome monitors and connection of existing application adapter outcomes. Whole SA07 closure. |
| 08-A | SA04–07 accepted | Complete Overview, cross-area/source/kind/time filtering, common pagination/action presentation and partial-availability composition. |
| 08-B | 08-A | Final connected/native full-program matrix on one exact accepted code state; defect correction returns through normal review. Whole implementation closure. |
| DOC | Implementation closure | Separate factual/contract/history documentation PR; Mira/independent review and Owner merge. No unperformed external/visual checks marked done. |

Each row is a meaningful implementation PR or expressly assigned bounded sub-PR, never one PR for the remaining program. Lira implements → author STOP with evidence → Mira whole-PR coordinator review → after coordinator PASS, Lev independent review of the same stable exact implementation head → Owner merge. No implementer self-review or automatic merge. CI can run while service handoff/context is prepared; no need to keep work in an agent's private memory while waiting. Formal acceptance still requires applicable completed checks. Service edits alone do not change implementation head.

## 4. SA04 remainder is the fixed prerequisite, not replanning work

The detailed L–S file is normative for the 24 authoritative writers: L6/M5/N8/O1/P1/Q1/R2, plus three generation action and two planner paths. Required placement remains:

- L: authz singleton → actor NO KEY UPDATE → fresh Owner/raw RBAC/AP-10 → operation/no-op → native History last.
- M: authz singleton → actor → target KEY SHARE → measure → appeal/effects → History last. Participant appeal has lifecycle admission without invented AP-10 veto; inactive target is not a new operator exclusion.
- N: existing content dependencies before actor where required; replace late actor mutex with full state admission, and add priority-settings guard before CAS. N-DEP-01 resolves topic dependency before post UPDATE/actor for real post/title submissions. Case/event/evidence/fanout rules stay canonical.
- O: one conditional own UPDATE with shared active predicate/RETURNING and same shared-state classification on zero rows. P: reuse existing stronger subject FOR UPDATE inside the same transaction before preference/presence changes. Q: Owner binding → actor NO KEY UPDATE → singleton/CAS/no-op → native History.
- R: head/task/content/revision/translation dependencies → transient trusted actor → budgets/admitted generation/task effects → COMMIT → enqueue. Accepted provisional head initialization is rollback-scoped mutex scaffolding in that same transaction. No separate committed head-init transaction, new global lock, persisted actor in task identity or cancellation of previously accepted tasks.
- S: full direct/native and connected A–R closure, not a subset of happy-path route tests. See detailed subplan §§9–12 for every lock/race/error/evidence requirement.

SA04 uses fixture state changes for testing. SA05 is the first production command that changes lifecycle. The SA05 command acquires no authz/content/case/head/budget lock, which is why the established SA04 content→actor and authz→actor orders remain compatible.

## 5. SA05 command, protocol and canonical profile

### 5.1 Narrow capability and action

Add `OwnerAccountLifecycleCommand.deactivate({actorId,targetId,operationId})` in a dedicated server DB module/facade and request context. Construct it with trusted validated Owner binding in `workers/app.ts`; no browser-supplied Owner identity, email/role check, permission key or generic elevated action dispatcher. Direct command calls enforce exact binding and active actor themselves.

Register a dedicated POST resource at `/:locale/users/:userId/owner/deactivate` in the existing route tree. It has no new detail view. Extend typed outgoing canonical profile/action paths instead of concatenating untrusted URLs in monitor descriptors. All route spellings/framework failures accepted by routing receive the current protected response/cache treatment, including `.data`, encoded/case-insensitive/static aliases and repeated slashes established by K.

Before private work: require current authenticated exact Owner; reject unsupported methods; require same-origin Origin using the existing mutation helper; parse a bounded exact form containing `intent=deactivate`, `expectedActorId`, `targetUserId`, `operationId` (UUID), with URL/body target agreement. Duplicate/unknown fields, malformed IDs/UUID or mismatched URL/body target: 400; changed actor expectation: 409. Input IDs use the existing canonical profile/resource identity contract; no lossy truncation or new System-event key regex for trusted opaque account IDs. Existing route admission precedes target lookup. Deactivating exact configured Owner: 403 even for replay. Missing target: 404. Missing/inactive authoritative actor: shared lifecycle 401; known storage availability/timeout: 503; unexpected invariant: sanitized 500. All responses private/no-store.

Return a typed 200 result `{targetUserId,state,changed,deactivatedAt,retainAtLeastUntil,eventId}`; `eventId` may be null only when returning an already deactivated state with no known production lifecycle event (e.g. prior fixture/import). Never fabricate/backfill an event for that case. UI revalidates the canonical profile on success; it does not automatically resubmit on authentication change, 409, 503 or uncertain acknowledgement.

### 5.2 One transaction; exact ordering and replay

Use one bounded native PostgreSQL transaction and one client throughout:

1. Verify trusted binding equals actor; BEGIN; set existing bounded local transaction/statement/lock timeouts. Shared `assertActiveAccountForMutation(client,actorId)` obtains actor NO KEY UPDATE and validates the full active tuple. No-op/replay goes through this step too.
2. Reject target==bound Owner. Lock target row NO KEY UPDATE; read/validate its complete shared state through the same transaction. Missing target → typed not found.
3. Check the retained occurrence for source `account`, key `sa05:` + SHA-256 of the canonical tuple `["account.deactivated",actorId,operationId]`. Reuse with another target/semantic tuple → 409 and rollback; matched occurrence must agree with target's deactivated tuple or raise invariant failure. Same exact active Owner actor lock serializes concurrent commands, including commands for different targets. Never treat a conflicting ON CONFLICT as successful state change.
4. If already deactivated, return its original state/retention and known original event ID without changing timestamp, extending retention, deleting another session or appending a second event. A new operation ID on an already deactivated target is also a no-op, not a new deactivation. No separate receipt table/reservation is needed for no-op requests.
5. For active target obtain one `date_trunc('milliseconds',clock_timestamp())` DB instant. Set deactivated_at/by and derive minimum retention with **UTC calendar arithmetic** `((instant AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC'`. Store that same instant in the event. Retention is a lower bound, not an expiry action. Delete target's `forum_online_presence` in the same transaction; preserve Privacy preference and all content/account/provider/role rows.
6. Append exactly one mandatory `account.deactivated` to `owner_events` using a typed helper accepting **this client**. Acquire existing Owner append ordering lock `(1447641935,2)` last. Source `account`, canonical monitor `accounts.users`, entity `user`/target, actor/target IDs, operation UUID in correlation_id, occurredAt=DB instant; bounded payload only state and retainAtLeastUntil. The existing helper that opens its own Auth/System transaction must not be used here. New event ID generated once for this attempted transition; source occurrence unique is authoritative. Unexpected conflict or insert failure rolls back the whole command.
7. COMMIT, release. Unknown COMMIT is not reported as proven rollback/success and is not blindly replayed inside a nested retry. A later explicit same-operation request safely observes either the retained transition or an active target and executes once.

No user FOR UPDATE/key change, authz singleton, target role count, session/account delete, role rewrite, deny override, extra account policy, external network call or sampling occurs while this transaction holds locks. DELETE presence is mandatory in this transaction; safe journal append is mandatory here, unlike passive telemetry.

### 5.3 Owner section and accounts projection

Extend existing `OwnerUserProfileSnapshot` with the shared lifecycle state and retained deactivation actor/time/minimum boundary. Keep original private identity/email/method/session allowlists. Show lifecycle/retention in Owner section only; canonical public projection remains neutral Deleted user, Admin section gets no private Owner lifecycle/history capability.

Active non-Owner target gets one explicit confirmation identifying that account using already authorized Owner profile data. Hidden expected actor/target + stable operation UUID belong to that rendered confirmation. Disable pending duplicate submit for UX; transaction is the actual guarantee. Cancel sends no mutation. A deactivated target shows state/retention and no second action; exact Owner target shows no action. On account switch/sign-out or late loader/fetcher response, existing viewer/session-bound invalidation removes private section and stale confirmation, never offering to replay under another account.

`accounts.users` retains total/created24h and adds active/deactivated/minimum-retention-pending counts from the complete shared tuple, using decimal strings and DB time. Retain old sample schema versions in History; new samples are versioned. Deactivated sessions are still ordinary retained session rows: any future session counter distinguishing unexpired rows from usable active-account sessions must label both accurately; deactivation does not revoke raw sessions. The lifecycle event appears with the **same original UUID/source** in accounts.users History, global Event log and target/actor Owner profile History.

### 5.4 SA05 acceptance

Native PG17 tests run the actual command/facade: actor/binding/target errors before effects; exact Owner target rejection; any other administrator/manager target allowed; same/different operation replay once; conflicting operation target reuse; two concurrent commands; UTC/leap-day/DST retention; millisecond event/state equality; mandatory event and presence-delete fault rollback; unknown COMMIT and explicit retry. Assert retained account/provider/password/grant/content rows byte-for-byte unchanged except lifecycle/presence; no new rights policy.

Race both commit orders against each SA04 writer family and stronger Privacy/heartbeat lock. Writer-first may commit its already admitted effect then deactivation proceeds; state-first denies later actor write and no domain/History/notification/budget/ref side effect. Deactivation does not acquire other domain locks. Real Worker/Better Auth/Chromium acceptance uses Owner plus **two genuine existing sessions** for the target, old open pages and a pending operation. After actual command commit, stale cookies fail active use/new auth-session creation, public HTML and `.data` are neutral, Owner retains private data, online is absent, and already accepted jobs can finish. Test failed-event rollback through the actual action and revalidation, not fixture-only deactivation. Complete matrix in §15.

## 6. Shared monitor/read/observation architecture

### 6.1 Fixed catalog and DTOs

Extend the small existing catalog into `db/owner-monitor-catalog.ts` (or a clearly equivalent fixed module at implementation), retaining existing System/SA02 exports as compatibility aliases while consumers move together. This is a closed typed map, **not** a runtime registry/plugin/query language. Each entry has area/key, supported scope `global`, value schemaVersion, typed reader name, fixed History source/kind mapping, canonical contextual action descriptors, runtime capability and coverage/freshness semantics. There is no arbitrary monitor creation or browser SQL/table/URL input.

New area route keys: `forum`, `administration`, `moderation`, `notifications`, `localization`, `files`, `background`, `data`, `integrations`. Existing `system`, `accounts`, `security` keep URLs. Infrastructure remains outside measured catalog. Each new area has `/:locale/super-admin/monitoring/<area>` and the existing typed `.../<monitorKey>/history` pattern. Extend `SuperAdminMonitorScope`, request capability, path family, navigation, private-failure classification and translations together. Fixed area current loaders resolve only that area's required readers; they do not read all private domains to render one card.

Current result per monitor: key/schemaVersion, values (closed flat scalar allowlist), source, observedAt, quality, runtime capability/enablement, recording status, first retained History time/last retained sample, freshness and coverage explanation. Counts/sums/bytes are nonnegative decimal strings; finite bounded duration numbers are permitted. Missing/disabled/unbound/not-instrumented values are null with a reason, never measured zero. Successful empty aggregate is zero. Invalid state/schema/DTO is unexpected 500, not fabricated availability.

Fixed aggregate SQL reads use explicit selected fields and bind values. No SELECT *, serialized native records, arbitrary JSON context, text excerpts, object keys, token/claim values or SQL/errors. Separate bounded kind/status groups, never an unbounded GROUP BY private labels. Current DB counts are full counts, not page length. Use FILTER/EXISTS/preaggregated groups to avoid join multiplication; relationship checks are named exact predicates, not assumed FK failure repair.

Read each DB-local area in one repeatable-read read-only transaction with one DB time. Resolve runtime config as safe booleans/enums separately. Localization uses the existing second connection, so its observation times/provenance remain separate; never assert a distributed atomic snapshot. Commit read-only transaction **before** any observation write. Bound SQL with current deadline helpers and small fixed query counts. Pool/client cleanup preserves original causes.

### 6.2 New sample policy and retention

For new monitor keys: server keyed advisory `(1447641936,hashtext(key+":global"))`; at most one sample per monitor per 15 minutes, including concurrent GET/prefetch/Refresh. On the first read after that gate, persist the current typed snapshot/fingerprint even if unchanged, establishing an actual observation time; within the gate return the existing sample. This deliberately preserves SA02's bounded sampling policy; System's existing fingerprint/change behavior remains until a separately justified change. Refresh always performs a fresh current read, but cannot defeat sample gate. Version included in canonical fingerprint; schema bump neither reinterprets old payload nor bypasses gate.

No observation write changes domain state or calls external services. No browser poller/cron/Queue is introduced. Disabled runtime can still have a measured retained task count; sample states both facts. Sampling failure keeps measured current result when available, sets recording unavailable; History lookup failure is likewise explicit. No retained sample yet means no retained sample, not zero coverage. First retained source time is **earliest available retained fact**, not proof collection was continuous since that date. Quiet periods/stale samples/unknown collection gaps remain visible.

History and samples are indefinitely retained until explicit Owner policy change. There is no ordinary UI deletion or TTL job. Any native immutable/monotonic facts admitted as History below become retained source contracts; operational cleanup must not later erase them silently. This does not require keeping live bearer sessions for a year or preventing current bounded operational cleanup on non-History rows.

## 7. One normalized History, source identity and filter contract

Extend the existing Owner History implementation, rather than add an independent journal per area. Extract shared source projection/filter helpers for `owner-sa02-history.ts` and `owner-user-history.ts` as needed so that identical facts have identical safe values/scopes/identity in global, scoped and target views. Do not replace ordinary Admin/Complaint readers or their authority.

Stable identity is **(origin, native source ID)**. Owner event IDs remain their UUIDs. Same event associated with multiple monitor keys is emitted once globally, not once per association. A native immutable fact and its related command History are different facts with honest kinds; they are not two alleged successful executions. For example an existing source-locale correction can retain its one Admin command entry plus its real new revision record, without a new owner_events copy.

Add these closed origins and projections as each slice delivers them:

| Origin/source | Exact fact and attribution | Scopes / retained payload |
|---|---|---|
| Existing system/auth/attempt/evidence/observation origins | Preserve delivered semantics, including attempt coalescing and saturation | Existing scopes plus explicitly named integration/data/files associations below; no new attempt producer copy |
| `account-event` / owner_events source account | SA05 deactivation; real actor and target | accounts.users; state, retained minimum, safe IDs/operation |
| `admin-history` | All existing actual native actions once | Authorization→administration.authorization; measures→administration.measures; registration→administration.registration + accounts.registration; topic/post structural actions→forum.state; help/signal/duplicate actions→moderation.help and relevant forum.state |
| `forum-title-revision`, `forum-post-revision` | Native revision persisted at its immutable created_at; revision author is actor | forum.content; content/revision ID/sourceLocale only. No original title/body or current-state-as-old-state. Initial and later revisions use same truthful fact kind. |
| `complaint-event` | Existing submitted/noted/decided/appealed/appeal-resolved/priority/review-started event at created_at | moderation.complaints; event/case/actor and persisted linkage IDs, categorical kind/priority only; no note/reason/evidence body |
| `help-signal-created`, `duplicate-appeal-created`, `measure-appeal-created` | Immutable creation columns in retained native rows; these describe **creation only** | moderation.help / administration.measures; ID, createdAt, proven submitter/subject/relationship/measure reference, fixed categorical kind. Mutable current status is not serialized as creation outcome. Reviews/resolutions remain their native Admin History actions. |
| `notification-created`, `notification-first-read` | Native notification ID + created_at, or first non-null read_at set by current coalesce-only own-reader writers | notifications.inbox; recipient ID, optional proven actor, kind and typed target references. First-read actor=recipient because canonical command only marks own row. No message/title/body copy. Origin distinguishes two different facts of one original row. |
| `operational-event` / owner_events source operation | Actual missing task/file/adapter outcomes in §§9–10 | Canonical monitor + fixed additional associations. No native event copied into this origin. |

Notifications already persist creation atomically in Forum/Complaint transactions and preserve first read_at through coalesce; current web has no DELETE on inbox. Therefore **do not add a second per-recipient Owner event producer or unbounded fanout collector** just to display those facts. Reuse those persisted facts as the authoritative History seam. SA06-N tests every real producer and both own mark-read methods; monotonic creation/read timestamps and retained-source policy are now explicit. Related Complaint notification creation uses actual decision/resolution time. Do not infer delivery, email sending or a repeated read event from row state. If future inbox deletion/retention is proposed, preserving admitted History becomes a separate explicit policy/implementation requirement.

Profile History adds new origins only where actor or target attribution is proven in those retained sources: lifecycle actor/target, revision author, Complaint event actor (and affected account only through authoritative retained target relation), native submission/appeal submitter/subject, notification recipient/known actor, operational facts with genuinely known transient actor or stored owner. Apply person predicate **inside each source before LIMIT**; OR actor=target does not duplicate. Global observations, gap slots, unknown auth attempts and task HMAC subject keys never become per-user history. Operational job completion is not attributed to the user who happens to view the monitor.

### Pagination and final filters

Preserve existing SA01 `timestamp~origin~UUID` and valid SA02 v1 cursors/URLs; accept them only in their compatible old scope. The canonical ordering remains `(exact timestamp, origin, native ID)` descending, preserving PostgreSQL microseconds and the existing PostgreSQL text collation consistently in ORDER BY and tuple predicates. Perform the final merge/order in SQL, not a JS localeCompare merge with different collation. No JS Date round-trip for keyset boundaries. Use original occurrence/creation time, not mutable updated_at; coalesced attempt identity stays admitted_at and displays its first/last occurrence interval separately.

New filter-capable cursor v2 binds the complete canonical filter set: area, monitor, origin, kind, optional inclusive from/exclusive until UTC timestamps and page size, plus last tuple. Closed field names, no duplicates, exact timestamp/calendar and source/kind/scope compatibility validation before DB read after Owner guard. No free-text/body/user query, arbitrary timezone/column/operator or browser return URL. Query names: `area`, `monitor`, `origin`, `kind`, `from`, `until`, `before`; page size fixed 25 (internal hard maximum 50). Unknown filter→400; unknown area/monitor route→404; filter/cursor mismatch→400. Clearing/changing a filter clears before. Dates and source-kind choices come from catalog enums; empty time range yields a truthful empty result, reversed/invalid range→400. Cursor decoding is canonical: v2 maximum4096 encoded characters /3072 decoded UTF-8 bytes; source IDs use the existing Owner History nonblank/no-control-character maximum200 contract, without truncation. Fixed catalog keys/categorical filters are at most80 characters; test the worst supported Unicode ID and all filters fit those bounds. Invalid native identities are source invariants, not silently dropped rows. Old cursor limits remain valid for old formats.

Push scope/kind/time/person predicates and strict cursor tuple into each applicable fixed SQL branch, read at most limit+1 per branch, UNION/merge with one final global order/limit. Do not limit native data first and then filter in JS. Exclude incompatible source branches statically. Parameterize values; source identifiers/SQL fragments only from server code. A source SQL failure fails the requested History page honestly (503 for classified availability), not a partial timeline with a cursor skipping missing facts. DTO invariant is sanitized 500. Global view may display multiple distinct facts of one transaction; it must not deduplicate unrelated facts by timestamp/correlation alone.

SA06 foundation supplies the complete filter model and source contracts; 08-A exposes final cross-area controls. Existing scoped History remains usable throughout. Source projection changes are tested across all delivered and newly added scopes, not only the new tab.

## 8. Concrete catalog: SA06 current readers and canonical actions

Every named monitor is real current data plus adjacent History, provenance/time/coverage and the appropriate read-only or canonical navigation action. All SQL is in dedicated server read modules/facade, not React views. Enum groups below are closed fields/statuses with schema versions; bounded breakdowns may be separate typed cards rather than arbitrary nested JSON samples.

| Monitor key | Complete current-state measurement / SQL source | History and contextual action |
|---|---|---|
| `forum.structure` | Full category/section/topic/post/tag/active tag-link counts from corresponding forum tables; no text/labels required | Its observations; native revision facts may cross-link to forum.content. Admin Forum workspace via typed routing, public content path for known IDs; no structural CRUD. |
| `forum.state` | Topic closed/open, pin count, Help solved/best-answer, active duplicate relationships; predicates use actual domain fields/categories and count distinct primary resources, not multiplied joins | Native Admin significant actions including signal-applied effect once. Existing Admin topic/Quick actions only on canonical destination with fresh permissions/CAS/Origin. |
| `forum.content` | Topic title/post current revision counts, total retained revisions, revision activity24h from both immutable revision tables; no revision bodies; missing/current-link anomaly counts named explicitly | Native title/post revisions, relevant source-locale Admin actions. Existing topic/edit/history links; current resource rights still decide action. |
| `forum.presence` | Visible active-account presence within existing TTL and Privacy predicate; stale retained presence count separate, never expose inactive original identity | Observations; no per-heartbeat event or collected browser-local preference; read-only. |
| `administration.authorization` | Complete role, role-grant, assigned-role and per-user allow/deny override aggregates from existing authz tables; permission catalog is code-backed, no SELECT grant to authz_permissions | Native role/grant/assignment/override History; canonical Roles/target profile authorization controls. No extra Owner/manager-count invariant. |
| `administration.measures` | Active/effective/expired/lifted measures, restrictions by fixed permission key, pending/resolved appeal counts using DB time and actual AP-10 policy; no reasons/bodies | Native measure History and native appeal-creation fact. Canonical measures/measure/target public+independent Admin profile. Owner immunity remains AP-10 only, not lifecycle bypass. |
| `administration.registration` | Read the existing validated singleton/version/flags; share value snapshot with accounts.registration when composing Overview | Same native registration change ID, associated to both monitors; existing Settings forum/administrator destination matching current control location, not a duplicate editor. |
| `moderation.help` | Help signals per fixed kind/status; pending duplicate appeals/current duplicate relations; exact domain predicates excluding superseded where queues do so, with total retained and actionable counts distinguished | Native creation facts and existing Admin review/duplicate actions. Canonical Needs attention Help/appeal destinations. No second review UI. |
| `moderation.complaints` | Cases by state, reports, pending appeal count, current priority distribution and effective weights/settings version, live/expired reviewer activity by DB time; no notes/evidence text | Existing complaint events; priority-settings native History if present in actual writer, otherwise observations of current settings (no invented old event). Canonical Attention queue/case/review/appeal/settings route; current participant/permission checks remain. |
| `notifications.inbox` | Counts per four fixed kinds, unread/read totals and age, total valid/missing target reference counts through actual polymorphic source joins, never hide invalid refs by inner joins | Persisted creation/first-read facts (§7). Read-only global monitor, only existing own `/notifications` link; no foreign mark-read/resend/delete and no cross-user body display. |

Administration/Moderation overlap is a projection decision: e.g. accepted Help action is one Admin History entry associated with Help and Forum state; Complaint event is not copied as Admin success. For current configuration where no historical transition is persisted, observations are the only past evidence until an explicitly required existing writer instrumented fact is added; do not assert old exact change times from a mutable version.

SA06 acceptance per slice: real DB aggregates > page size; correct zero/null and multiplicity; valid/invalid references; at least two timestamp ties and multiple History pages; same original identity global/scoped/profile; source fault/recording fault and malformed filters; canonical action enters its existing writer and causes exactly its native command entry (no Owner duplicate); guest/Admin denial before query; EN/RU/HE and private late-response behavior. Notification controls must remain own-only after monitoring exists. No code branches that fill an implemented area with placeholder zeroes.

## 9. SA07 Background/Localization and actual transition instrumentation

### 9.1 Bounded passive operational fact port

06-0 introduces one narrow typed `OwnerOperationalFactSink` for the fixed event union below, reusing existing Owner append ordering/dedup/timeouts. It is **not a general event bus, new durable outbox, job framework or arbitrary JSON logger**. Occurrence identity is a SHA-256 of a canonical source transition tuple; secrets/claim tokens/opaque provider reservation refs may be inputs to the one-way digest solely where needed to distinguish an ownership occurrence, never persisted raw or displayed. Payload/source IDs are explicit safe fields. Values capped at existing 8 KiB; ordinary strings at current bounded field limits, IDs through their native validators. No source text/fingerprint/HMAC requester identity leakage.

Capture a fact only from an actual successful RETURNING/known committed transaction result or a genuinely observed external adapter outcome. Pass a callback/sink dependency through the existing store/facade constructors; after the actual outer database.transaction promise resolves, append best-effort on a separate short Owner transaction. In-transaction helpers collect a bounded typed result for that caller; they **never flush or call a new connection while holding domain locks**. For a single autocommit UPDATE, append only after the statement has returned successfully. An unknown COMMIT/rollback/claim-lost/no-op does not create a success transition. A failed external call can create a classified observed-failure fact without claiming DB transition succeeded.

At most 32 facts per ordinary request/pass; bounded reconciler batches up to existing100 candidates use one run summary plus actual per-transition facts only within their declared bounded pass limit. Counts omitted by a collector are explicitly not complete event coverage. Use the existing Worker waitUntil/finally lifecycle pattern to flush actual request facts without vetoing the regular response, and await bounded flush in already invoked transport-neutral local job passes. No recursive telemetry about telemetry failures. Collector/append failure does not roll back a successful domain operation or turn it into an error; runtime reporting uses safe categorical recording failure and monitor coverage is always **best-effort/non-continuous**, never exact audit completeness. A healthy reader cannot prove there was no collector outage; display that limitation even with a fresh sample. Any persisted recovery/gap notice is best-effort too and is not a guaranteed outage count.

Existing auth collector and attempt coalescing remain separate typed producers, not migrated into this port. SA05 atomic event never uses this passive port. Native transactional Admin/Complaint History stays mandatory and unchanged.

### 9.2 Exact transition ownership

| Producer/method seam | Fact kinds; occurrence identity; admission/atomicity |
|---|---|
| `translation-task-store.ts upsertPending`; title/body task-store `upsertPending` after R | `task.planned` only on actual new pending generation or accepted reactivation; taskId/generation/pending transition time. Existing identity/result replay emits nothing. Trusted transient actor may be captured by planner but not added to persisted task/spec/HMAC identity. |
| `claim`, `claimContentTopicTitle`, `claimContentPostBody` / claimByKind | `task.claimed`; taskId/generation/attempt and ownership-occurrence digest; preserve attemptStarted=false exhausted reclaim distinction. Already-claimed/terminal/not-found emit no claimed success. No actor lifecycle gate for a previously accepted job. |
| allowance acquire/admission/deferral/markContentTaskStaleFromAllowance | `task.allowanceAdmitted`, `task.allowanceDeferred`, `task.stale` only on actual owned persisted changes; task/generation/attempt/transition instant and occurrence digest. Fixed provider/reason codes; no reservation/claim token/subject text. Leasing/live/deferred current counts also come from observer, not fabricated events. |
| `recordFailure`, `markStale`, and stale transitions within actual stores/publication helpers | `task.retryReleased`, `task.failed`, `task.stale` from successful RETURNING/transaction outcome; task/generation/attempt/previous ownership digest. claim-lost produces no transition. Failure code/disposition/maxAttempts safe; retry and terminal outcome separate. |
| `ui-translation-publication-store.ts`, title/body execution-store `publishClaimedMachineResult` | `task.completed` only after transaction actually publishes/completes; task/generation/attempt/outcome. Stale result is stale, ignored/claim-lost is no completed event. Preserve head→task→content/namespace ordering, manual precedence and generation/revision CAS. A lower helper does not also emit the same completion. |
| `reserveReconciliationCandidates` and `TranslationTaskReconciler.reconcile` | Existing reservation updates stay native; `task.reconciliationPass` after actual bounded run with run UUID, selected/enqueued/enqueueFailures and pending/expired-processing counts/outcome. Enqueued means transport call accepted, **not job completed/delivered**. Run identity generated at actual invocation, not Monitoring read. |
| `UiTranslationTaskExecutor`, `ContentTopicTitleTaskExecutor`, `ContentPostBodyTaskExecutor` around their existing `providerRouter.translate/translateWithProvider` calls | `integration.translationCall` summarizes actual provider calls for one execution/attempt: calls/succeeded/failed, bounded total duration and safe outcome code; task/generation/attempt/ownership digest plus execution UUID. Body segmentation aggregates that attempt's actual calls rather than emits unbounded segment events. Capture errors immediately around the provider call so later DB/publication failure is not mislabeled provider failure. Not-eligible/unsupported/allowance-deferred/exhausted paths with no call emit no provider-call success. The executors' existing failure persistence remains canonical. This fact is canonical integrations.translation with association to background.translation; it is distinct from task completed/failed. |

All task event canonical monitor keys are **`background.translation`**; Localization links/project-associates those same facts where relevant, without a second emitter or differently named copy. Source/schema validation is versioned; no SQL kind CHECK migration. For code-only/not-wired consumers, hooks are implemented/tested through the real class composition but UI states consumer runtime disabled/not connected; no fake live event is inserted as evidence. Optional sink omitted by a known not-integrated caller is not reported as fully instrumented. Worker planning hooks are connected only to the currently executable capability; this plan never enables the disabled generation runtime merely to demonstrate a card.

### 9.3 Concrete current readers

| Monitor key | Current fields/source and semantics | History/actions |
|---|---|---|
| `background.translation` | Reuse `DrizzleTranslationTaskStore.observeTranslationTasks()` semantics: pending/processing/stale/completed/failed; unattempted/retry released, live/expired leases/ages, attempts remaining/exhausted, terminal/retry-exhausted groups, leasing/admitted/deferred allowance and retry ages/reasons. Add safe kind breakdown for UI/title/body and reconciliationAttemptedAt/old pending candidates using fixed read-only SQL. Existing observer integers must be checked; adapter cannot silently round/overflow. For Owner aggregates use exact decimal SQL counts and bounded fixed groups if existing integer result cannot represent a count. No second lifecycle engine. | Actual task/pass facts + samples. Read-only; contextual Localization link, no retry/cancel/reconcile/claim-steal button. |
| `localization.registry` | Actual LocaleRegistry loader health/active language list, default/source/locale structural validity; three existing localization tables via localization-read connection. Safe locale codes/booleans/counts, never connection string | Samples with that connection's observation time; registry unavailable remains unavailable, no fallback synthetic active set. Read-only. |
| `localization.ui` | Code-backed shipped UI key/namespace manifest versus approved UI translation rows and served bundle namespace/locale/revision/version, manual/machine counts, missing/stale/invalid bundle coverage. Compare against actual canonical bundle compilation/fingerprint rules; do not infer missing simply from one truncated list or expose translation text. Browser-local UI preferences are not collected. | Samples and same task facts for kind ui. No new manual translation editor, provider action or internal bundle-reconcile control. |
| `localization.content` | Current topic-title/post-body translation coverage by active target locale/current revision/source resolution and manual/machine/stale quality using existing canonical resolution rules; do not count source-locale/same-locale/ineligible content as missing work | Samples, existing revision/source-locale facts, associated actual task facts for title/body. Link to canonical topic/generate action only when actual runtime enabled and existing permission allows; currently disabled label. |
| `localization.budget` | Existing request-budget counters aggregated only by fixed scope/window and global/requester pool, sum usedUnits/expiry. Never expose subject_key/HMAC or infer per-user history. Read actual allowance fields on tasks via shared Background DTO, link rather than duplicate state machine | Samples; associated allowance/deferred/failed task facts. Read-only; no budget reset/quota/credential control. |

A fixed locale registry may produce more languages than the current viewport; counts cover the full validated registry, UI pagination if needed is presentation only. Failure groups/reasons are existing closed codes with explicit bounded top groups + total group/count/truncation metadata; arbitrary raw failure messages never flow through them. Current limits/policy versions are actual loaded server policy, not hard-coded as measured current usage.

07-B1 acceptance includes real title/body/UI stores (not replacement in-memory store), concurrent same generation/replay, reclaim/exhaustion/claim loss, provider allowance deferral, stale revision/manual precedence, completed/failed/retry publication, existing accepted-job completion after account deactivation, sink failure and unknown COMMIT. Reconciler uses actual reserve method with a controlled local enqueuer; successful enqueue is never asserted as consumption. No extra actor lock is added to the consumer. Verify each true transition has exactly one occurrence identity and no current read produces one.

07-L acceptance compares current counts to independent fixture SQL including stale/current/manual/missing/invalid bundles, multiple locales, disabled runtime plus existing persisted tasks, numeric boundaries and separate-connection partial failure. All four monitors have real retained History and adjacent cross-links, no embedded internal operator console.

## 10. SA07 Files, Data and Integrations

### 10.1 Files and cleanup

| Monitor key | Current complete source | History/actions |
|---|---|---|
| `files.assets` | forum_attachments count, byte sum by fixed detected type and cleanup_status; distinct published/draft/evidence referenced and unreferenced assets using EXISTS | Existing security evidence associated with files.assets + safe accepted upload/metadata outcomes + samples. Links only to already authorized known content/security context; no arbitrary file browser. |
| `files.operations` | upload-object journal preparing/ready/claimed states and age, active/stale draft-context/ref counts, publication-reference counts; retain object keys/draft nonces/ETags only inside SQL | Samples plus actual publication/metadata outcomes; no draft content or internal capability exposure. |
| `background.attachments` | Current asset deleting/live/expired cleanup claims, eligible unreferenced age using existing grace/reference rules; upload journal/sweep claimed_at and lease age. Cursor/token value omitted; cursorPresent boolean only | Actual bounded cleanup/sweep pass/outcome facts + samples, cross-link files.operations. Code available / scheduler not enabled stated explicitly. No cleanup action. |

Instrumentation belongs at these existing seams, using §9.1 passive policy:

- `DrizzleForumAttachments.createDraftAttachment`: `file.accepted` only after metadata/ref transaction commits, attachment ID/owner, detected type/byte count; idempotent existing result is not a second acceptance. `admitUpload`, reservation/PUT activation and late rejected finalization are distinct phases; do not call admission a published file.
- Actual Worker private bucket reserve/put/get/delete adapter: safe observed call outcomes, fixed operation/success/unavailable category and bounded measured duration, no raw key/URL/error/response. A PUT success with failed DB metadata remains storage success and **not** file.accepted. Avoid double recording with route or cleanup wrappers: storage adapter owns the external-call fact; repository owns the domain transition.
- Canonical Forum attachment finalization/publication helpers: `file.published` only for actually newly inserted post attachment refs whose outer Forum transaction commits; post/attachment IDs, native ref created_at, actor only when trusted. Ref removal after edit: `file.unpublished` only for removed refs after committed edit. Mutable refs must not be used to fabricate old publication history after they disappear. Capture bounded counts/IDs at existing helper RETURNING; do not retain draft nonce/object key. One operation with more attachments than bound emits one safe operation summary with actual added/removed counts and explicit per-file detail coverage, not an unbounded hidden collector. Replay unchanged refs emits nothing.
- `ForumAttachmentCleanup.runOnce`: one `file.cleanupPass` run UUID with actual prunedRefs/claimed/deleted/failed summary after actual bounded pass; separate successful asset-delete transition only after token-guarded DELETE RETURNING if per-asset event is emitted. Object delete ACK alone never proves DB asset removed. Existing unknown delete leaves retryable deleting claim. Sweep summary distinguishes reservation marker deletes, journal cleanup and asset deletion; never call every claimed object deleted. No new list/delete request from current reads.

Attachment event canonical keys: domain accepted/publication→files.assets/files.operations by fixed kind; cleanup pass→background.attachments; adapter storage call→integrations.storage, associated to files operations where useful. Existing security evidence retains original ID across Security and Files. No extra event from every chunk/byte, ref read, heartbeat or GET rendering a monitor. Existing K account-state/fencing/CAS/reference/cleanup invariants and R2 uncertainty remain unchanged.

07-F native/connected acceptance uses local private bucket and real cleanup/finalization: published/evidence refs protect assets; stale refs/expired claims/retry/unknown ACK, DB/R2 failure distinctions, replay, deactivation during PUT, no post-deactivation metadata, original security evidence ID once and no keys/nonces in DTO/history/errors. This exercises the existing class locally; it does not start a production cleanup job.

### 10.2 Data

`data.application`: named full row counts for the app relation groups already required by the catalog (accounts, Forum, moderation, inbox, attachment metadata, translation tasks/results, Owner/native history), relationship anomalies on current topic/post revision refs, polymorphic notification refs and existing attachment ref targets. Report each named check's source/success/time; no unspecified database-wide scan, arbitrary user SQL, repair/export/backup or pg_stat_* privilege.

`data.compatibility`: compiled expected migration from `.github/production-schema-manifest.json`/build metadata separately from actual runtime compatibility probes. Fixed SELECT/LIMIT0 or narrow pg_catalog information accessible to ordinary current roles verifies only the exact relation/column/type subset the app uses, plus server-version/runtime relation access. No read of protected migration ledger or claim actual deployed migration ID merely from compiled expectation. Return compatible/incompatible/unavailable/unchecked per named check. Missing relation/column or denied configured grant is an observed compatibility/configuration failure; sanitize to a fixed code, not SQL text. Full schema-manifest parity remains CI/native verification, not a web superuser health check.

`data.retention`: source-specific retained fact/sample counts, first/last retained fact and sample times, schema versions present, current lifecycle deactivated/minimum-boundary counts. Report indefinite-history policy versus account minimum lower bound separately. No countdown-to-delete, purge control or statement that tokens/sessions are retained indefinitely. Coalesced/sampled/best-effort coverage stays source-specific. History: its own observations plus already recorded actual system dependency failures; compiled provenance is a snapshot, not an invented migration-applied event.

07-D acceptance proves exact counts/relationships (including deliberate synthetic invalid reference fixtures where constraints permit), compatibility pass/missingcolumn/insufficientgrant/dependency outage classification, large counts and no dynamic SQL/protected ledger access. Actual SQLSTATE may be used internally only; UI receives fixed codes.

### 10.3 Integrations and safe runtime facts

`integrations.database`: existing required-binding capability booleans, routing roles localization/web, actual application DB read outcome and measured duration; dependency System fact cross-associated, never duplicate synthetic ping. A database outage that prevents event append remains observable as current unavailable when possible, with honest missing history.

`integrations.authentication`: Google configuration parameters present/absent as a combined usable-configuration boolean (never values), registration enabled separately, and **actual provider-attributed** local auth/account/session outcomes from existing auth facts/attempts. Password success cannot be relabeled Google success. Existing Google verified linking/freshness/registration rules remain. No provider health claimed from secret presence, no live OAuth test, credential editor or operator unlink.

`integrations.storage`: optional bucket binding present/absent, actual adapter outcome/last-known success/failure times grouped by fixed operation. Bucket/key/account/namespace names, ETags, list cursors and URLs omitted. New storage event timestamp is when that existing call was observed, with recordedAt distinct. Presence with no actual outcome is configured/unmeasured, not healthy. Current Monitoring performs no bucket list/head/read probe. Real accepted file/security facts link here where they prove an actual adapter result, without copying them.

`integrations.translation`: actual content generation runtime enabled/disabled, provider/enqueuer/consumer capability wired/not wired as booleans/categorical code, known last actual task/provider/transport outcomes from canonical task events. Current Worker is disabled; no provider invocation or live Queue binding is added. Provider failure classification is existing code, no provider error payload or key/model endpoint from env. Code-only classes are identified as code-only.

07-I wires safe observed outcomes into the already used DB/auth/storage adapters and available local task composition. To bound hot-path storage/DB call events, use fixed operation/outcome observations/coalesced summaries where repeated successful reads are only measurements; persist bounded actual failures/success state changes with stable request/run occurrence, at most the §9.1 request bound. No unbounded per-read journal on a download/heartbeat path. Counters identify their measured retained/best-effort population, not total lifetime application traffic. Existing System 5xx facts are cross-linked; no second request-failure emitter. Request latency derives only from actual measured failures/adapter calls, never invented p95/all-request uptime.

07-I acceptance tests absent/present/unwired/disabled vs actual success/failure with controlled **local adapters**, secret marker canaries throughout HTML/data/history/errors/log projections, collector outage and no response veto, provider attribution and no extra external request on current/History GET. Live Google/Neon/R2/platform acceptance stays unperformed Stage 6 work.

## 11. Exact schema, index and runtime-privilege boundaries

### Schema/index queue

No new domain table, event/observation column, event-kind SQL enum/check, lifecycle field, global mutation lock or permission key is planned. No data rewrite/backfill, default-history duplication or migration solely to add a TS monitor name.

Forward index migrations are justified by the new keyset readers, which existing resource-prefix or position indexes do not cover. Allocate next migration numbers against then-current main; update `db/schema.ts`, migration journal/snapshot and production schema manifest together.

| Slice | New indexes (all btree; chronological columns DESC with deterministic ID tie) | Why |
|---|---|---|
| 06-0 | owner_events `(monitor_key,occurred_at,id)`; owner_monitor_observations `(monitor_key,resource_scope,observed_at,id)` | Scoped chronological keysets, rather than sorting all retained positions. Existing global and target chronological indexes remain. |
| 06-F | forum_topic_title_revisions `(created_at,id)`; forum_post_revisions `(created_at,id)` | Existing unique content/revision prefixes do not support global revision History. |
| 06-A | user_measure_appeals `(created_at,id)` | Global immutable creation-fact source, existing index is measure-prefixed. |
| 06-M | forum_complaint_events `(created_at,id)`; forum_help_signals `(created_at,id)`; forum_help_duplicate_appeals `(created_at,id)` | Existing case/status/relationship-prefix indexes do not support global History keysets. |
| 06-N | forum_reply_notifications `(created_at,id)`; `(read_at,id) WHERE read_at IS NOT NULL` | Independent global creation/first-read branches; existing indexes are recipient-prefixed. |

Keep every index attached to its actual delivered reader. Before DDL, refresh existing index definitions to avoid an identical concurrent-main addition; dropping a now-redundant planned index is locator/drift reconciliation, not reason for another architecture. Source-specific actor/profile queries use current actor/recipient/resource indexes plus pushed predicate and hard page bound; confirm EXPLAIN on populated fixtures. Add an extra index only on measured bounded-reader need, report the evidence/plan amendment rather than preemptively indexing every permutation.

SA05 no DDL. SA07 reads existing relations and extends grants; no schema DDL is required merely for those monitors or typed passive events. SA08 filters use the established chronological indexes. No new DB trigger/DDL logging policy/outbox is introduced to make passive telemetry mandatory.

### Planned least-privilege delta in 07-B1

Keep exactly the two current runtime bindings, roles distinct and non-owner. Localization-read role remains SELECT-only on `locales`, `ui_translations`, `ui_translation_bundles`; use that connection for localization monitoring rather than grant those tables to web. Web continues to be denied SELECT on locales and authz_permissions, and receives **SELECT only** additionally on:

1. `translation_tasks` — task state/allowance/failure/reconciliation fields;
2. `translation_task_generation_heads` — current generation compatibility/coverage;
3. `content_topic_title_translation_tasks`;
4. `content_post_body_translation_tasks` — typed task/source relationship coverage;
5. `content_translation_request_budget_counters` — aggregate budget usage;
6. `forum_attachment_sweep` — actual cleanup claim/checkpoint metadata.

Existing web SELECT covers Forum content results/revisions, attachment journals/refs/security, roles/measure/Complaint/settings/inbox and Owner relations. No write privilege on any translation task/head/budget/result table or sweep is added to web. **Instrumentation of code-only task/cleanup classes does not justify granting their worker mutation capabilities to the web role.** Actual local consumer/cleanup acceptance uses the existing dedicated test composition's appropriate disposable DB role, never changes production bindings. No superuser, pg_read_all_data/statistics, schema CREATE, role membership, migration connection, table owner fallback, sequence mutation, journal UPDATE/DELETE or default grants.

Update `.github/scripts/runtime-privileges.mjs`, its contract tests, `verify-runtime-privilege-probes.mjs` and all test-role grant fixtures that mirror this contract in the same slice. Replace former negative web translation_tasks **read** probe with real positive limited SELECT probes for the six tables, retain/add negative INSERT/UPDATE/DELETE and unrelated reads, and verify both connections independently. Update binding-wiring tests to prove localization data still uses localization connection and Owner task reads use bounded web connection. Production grants/migration execution remain external Stage 6 actions; repository/native role fixtures prove the proposed contract, not deployed grants. If a real deployment still has old grants, return truthful unavailable/configuration state; do not route through another credential.

Native PostgreSQL17 clean migration + incremental-from-baseline migration, schema manifest, index definitions/query plans, identity append and exact role privilege probes are required in DDL/grant slices. Known baseline `drizzle-kit 0.31.10 generate` BigInt exception/exit0 means the existing green generation step is **not substantive parity proof**. Do not claim it is fixed by this plan. New DDL requires independent native manifest/schema evidence; if the existing parity gate itself must be changed, isolate and explicitly justify that bounded check repair, not a dependency upgrade or unrelated schema rewrite. Required checks cannot be waived by relabeling a false-green step.

## 12. Canonical actions and authority boundaries across all areas

Action descriptors are typed server-owned destination kinds plus validated resource IDs and label keys, resolved through current `AdministrativeRouting`/canonical Forum/Attention/Settings path helpers. No persisted URL, arbitrary redirect, monitor-driven command name/SQL or generic Owner mutation proxy. A monitor row may have History, Refresh and navigation only; read-only is complete functionality.

- Forum → existing Admin Forum/topic/section workspace and public topic/current edit/Quick actions where actual resource rights allow.
- Administration → existing Roles/users canonical profile/measures/settings controls.
- Moderation/Security → existing Needs attention case/review/appeal/evidence context, subject to its own authority. Owner read capability never replaces participant/ordinary evidence checks.
- Accounts → users directory and canonical profile. Deactivation appears only in that profile's Owner section/approved action; never a second bulk Users operation.
- Localization → canonical topic translation action only under real enabled runtime and permissions. Current disabled state offers an explanation/read-only path, not a live form backed by a fake provider.
- Notifications → own inbox only. Files → existing authorized content/security context only. Background/Data/Integrations → read-only plus appropriate existing workspace/config link; no internal maintenance controls.

Destination loaders/actions recheck fresh account state/permission/Owner/Origin/CAS using their current canonical contracts. Navigation from Monitoring does not grant authority or emit success. Fresh state changes while page is open may hide/deny an action without replay. A native action that already writes Admin/Complaint History retains **one** command event, no extra “action run from Monitoring” producer.

Ordinary Admin cannot receive Owner journal/profile data by owning `access.authorization.manage`, through a monitor URL, action descriptor, navigation module, failure fallback, loader parent, cursor, prefetch or public profile response. New source associations do not broaden ordinary admin history APIs. Public content retains neutral identity; original IDs/identities in authorized Owner source projections are not copied into public DTOs.

## 13. Cross-package lock, transaction and race matrix

| Interaction | Resolved order/result | Regression evidence required |
|---|---|---|
| SA05 vs L/M/N/Q | Deactivate actor Owner NKU→target NKU→presence→Owner append last. It does not request authz/case/measure locks, so it cannot introduce authz↔actor reversal. Existing target FK KEY SHARE is compatible with NO KEY UPDATE. | State-first denies authoritative actor; writer-first commits admitted work then state changes. Include cross-target Owner operation, M target role/measure and N fanout. |
| SA05 vs J/K/R | Existing content/draft/head→actor remains; deactivate never needs those locks. K may perform already admitted external PUT but metadata/finalization later guard denies. R already accepted job persists/finishes; no new user plan after state-first. | Real native barriers, both orders, no orphan published refs/tasks/budget changes on denial; no deadlock masked by retries. |
| SA05 vs O/P/heartbeat | Conditional own UPDATE serializes with target state; Privacy/heartbeat stronger target FOR UPDATE serializes. Deactivation deletes presence atomically after target lock. No writer can recreate visible presence after state-first. | Repeated OFF/no-op, ON, pending heartbeat/locale, old returned viewer data and public online check. |
| Owner command replay/event append | Active actor lock before target/prior receipt; mandatory event same connection and final Owner append lock. No event-first→actor lock path. | Concurrent same operation/different targets, journal failure, uncertain COMMIT/retry, no duplicate/no partial state. |
| Passive task/file instrumentation | Preserve original transaction/lock order. Collect within caller, flush after outer COMMIT. No domain locks inside sink, no lifecycle gate on job/notification side effects. | Instrumentation failure/deadline/unknown COMMIT cannot veto or create false success; repeated transitions dedup. |
| Observation recording vs domain commands | Read-only snapshot commits first; separate short sample lock/append has no user/content/authz lock. | Concurrent current reads/Refresh one sample per gate; blocked/failing sample does not hold up a user writer or turn measured value into zero. |
| Global/scoped/profile timelines vs writers | Read-only keyset queries, immutable order fields and source IDs. Native record creation/read facts use only immutable/monotonic fields, never status updated_at. | New rows during page traversal, same-time ties, coalesced attempts updating, exact source/person isolation. |

No global mutex across all users, operator recovery lock, deadlock retry framework, scheduler or new transaction spanning external I/O is introduced. Timeouts remain classified through preserved causes; SQLSTATE 40P01 is not “account inactive.” A reproduced new lock cycle requires completing its causal diagnosis and amending the plan before adding compensating retries.

## 14. Privacy, errors, cache and UI-state contract

All new Owner documents/data/actions and every failure branch are `Cache-Control: private, no-store`; framework unexpected failures preserve K's proven private redaction/cache behavior on actually matched spellings. Extend protected path classification for new area and profile child action, retain original aliases; test document, `.data`, explicit resource and malformed/unsupported-method responses. No stack, SQL/query/params, raw provider response, credentials, original deactivated public identity, object key, claim/operation capability, email from an unauthorized projection or source text in browser errors.

Admission order: trusted session/Owner → exact route/filter/input checks → required capability/reader → domain work. Anonymous 401, wrong Owner 403, bad filter/cursor400, unknown resource404, lifecycle missing/inactive401, known availability503, expected conflict409, unexpected sanitized500. Owner binding absent/malformed gives no authority. Do not map any arbitrary exception or missing invariant row to a successful empty monitor. Required source unavailable for an area returns classified503; successfully measured independent Overview areas may remain visible with explicit failed area state (§15). Native History page is never partially omitted as if complete.

Only deactivation data/confirmation and source metadata authorized for the current viewer are serialized. Existing safe session device/IP projection remains separate; no reuse of raw session/account records as monitor payload. HTML and loader data must both omit original deactivated public identity. Owner-only historical IDs do not cause ordinary public display components to recover a retained original name/avatar.

EN/RU/HE use existing catalog/localization structure, translated monitor/source/quality/error/confirmation labels, RTL-safe layout; IDs/time/codes use bdi/LTR as appropriate. Keyboard focus/confirmation/cancel/pending state and narrow-screen History/action visibility are tested in real browser. History remains adjacent to each monitor, not buried only in global Event log. No pretend continuous-green light from a stale sample.

Continue SA03 cross-account safeguards for every new Owner current/History/Overview/deactivation response: scope query/fetcher keys to viewer/session, discard late responses from old auth epoch, purge private DOM on sign-out/non-Owner account switch and never replay POST. New UI follows the existing pattern rather than inventing a separate client security store. Owner's visual-polish approval is recorded only if actually provided; agent browser checks do not substitute for it.

## 15. SA08 full Overview, final filters and connected program acceptance

### Overview composition

Overview is a compact current summary and navigation into the same catalog/area readers, not another metric/source implementation. It accounts for all **13 areas**: twelve measured areas, one explicit Infrastructure placeholder. Each real area shows actual key figures/status/observed time/coverage/History and applicable contextual destination; Infrastructure shows no invented measurement/History.

Use a bounded web read transaction for shared DB-local aggregate inputs, then fan projections from those same rows (registration, task, attachment, retention values are not independently recalculated with different times). Localization connection/read time is explicit. Existing System/SA02 modules may expose their pure snapshot-reader functions to this composer; keep their public compatibility facades. Do not call every public per-area endpoint or record duplicate observations. Use at most one web pool/client and one localization client per composition, at most40 fixed read statements total and a10-second overall read budget; no unbounded per-locale/resource query loop. Apply existing caller deadlines and server statement timeout at most1.5seconds or the remaining read budget minus cleanup margin, whichever is smaller; stop issuing statements when budget is spent, roll back/release, and mark remaining sources unavailable. Do not race a timeout promise and abandon a live query/client. Snapshot failure rolls that transaction back; independently successful connection results remain usable. For independent classified source-unavailability inside one shared web transaction, isolate each fixed source group with a SAVEPOINT before continuing; a failed statement must not poison subsequent groups. Unexpected invariants still fail the request with sanitized500. Observation writes start after read transactions close. New monitor samples use one bounded short batch transaction: obtain distinct advisory lock integers in ascending signed numeric order of the actual PostgreSQL hashtext(key+":global"), then apply the individual15-minute gates and fixed schema/fingerprint rules; this order is safe even under hash collisions and area-subset reads. Batch failure rolls back samples and marks their recording unavailable without losing measured current state. Delivered System/SA02 recording policies remain compatible and independently bounded; no parallel sample transactions through a max1 pool. One unavailable independent area is a typed unavailable tile with no data/green zero; it cannot downgrade successful independent measurements. The response identifies partial coverage, and unavailable/unknown areas cannot produce an overall healthy assertion.

Global Event log exposes the already implemented §7 filter model, source-aware event/observation/creation/first-read kinds and exact keyset pagination. Per-monitor History uses the same reader/projections and source IDs; URL filters/cursors round-trip through trusted paths. Dates/timezones are displayed unambiguously. Native action facts, observations and sampled/best-effort/coalesced sources are visually distinguishable.

### Final whole-program evidence on one stable code state

| Chain | Required actual acceptance and assertions |
|---|---|
| Owner entry surfaces | Overview, all12 measured areas, every adjacent History, global journal, canonical profile/public+Admin+Owner composition, Infrastructure placeholder; direct document/`.data`/prefetch/action access with genuine Owner, ordinary Admin, member, guest, missing/wrong binding. No private reader calls on rejected access. |
| Lifecycle full chain | Actual SA05 command with two old target sessions/open tabs, then I auth endpoints/direct server paths, J Forum, seven K entrypoints, all24 L–R writers/action branches, settings/Privacy/locale/inbox/read state/presence/translation planning. Include expected no-op/replay/CAS branches; ordinary own sign-out cleanup remains. Fixture-only state is insufficient for final chain. |
| Content/retention | Existing topics/posts/revisions/attachments/complaint evidence remain usable per permissions; public original identity absent in HTML/data/lists/search/count/mention/online/notification presenters; Owner retains account identity/lifecycle/method/session metadata and source history. Event failure leaves active state/presence unchanged. No hidden role/credential/session deletion or retention-end action. |
| Concurrent commit orders | Native state-first/writer-first/rollback for all mutation families, N-DEP-01 actual post/title/J control, head/task/content R order, deactivation vs Privacy/heartbeat, K late PUT/finalizer; job accepted before state still completes; no new post-state planning budget/task/ref effects. Assert physical table effects, no deadlock accepted as lifecycle denial. |
| Monitoring correctness | Populate above page bounds with each domain status/locale/ref/lease outcome, assert independent exact SQL totals and no multiplied joins. Measured zero versus unavailable/disabled/unwired/stale, decimal boundaries, same snapshot/provenance, current refresh/sample timegate races. Each real key has a typed current result and a working original-source History. |
| Event identity/coverage | Same original `(origin,id)` and values in global/scoped/profile where attributable, one global row per source fact; related command/revision distinct but no duplicate success producer. Existing Auth/attempt/security/System preserved. Task/file real transitions, replay/no-op/claim-lost/unknown COMMIT, passive sink fault and no domain veto. No reconstructed mutable task history or invented continuous collection. |
| Filters/keysets | All area/source/kind/date combinations and incompatible/unknown/duplicate fields, old valid cursors, new filter-bound cursor, wrong target/scope, invalid calendar/microsecond ties, multiple pages, rows inserted concurrently, coalesced pattern changing last/count. No filtered-source omission, missing/duplicate page rows or skipped failed branch. |
| Canonical actions | Every advertised destination resolves under current typed routing; performs its existing guarded action with one native command History fact. Exact Owner deactivation only canonical profile; disabled translation not invoked; no foreign inbox/storage/job/secret control. Changed permissions/actor between GET and POST denied safely. |
| Fault/privacy/cache | Real PG unavailable/timeout, wrong runtime grants, source relation/column mismatch, broken native row/DTO invariant, mandatory event failure, passive event/sample failure, local R2 error/unknown ACK, auth unavailable and framework500. Check HTTP/data/error-body/cache plus actual absence of leaked secret/name/text/key/SQL markers. No synthetic green fallback. |
| UI composition | Built Worker + Better Auth + PG17 + local R2 + Chromium. EN/RU/HE/RTL, desktop/narrow/mobile, keyboard confirmation/history/filter/return navigation, late response after sign-out/account switch, network failure/retry without automatic POST. Actual owner visual acceptance remains separately attributed. |
| Schema/runtime evidence | Clean/incremental PG17 migrations; actual schema manifest/index/role probes and populated-query EXPLAIN; localization role separation; six SELECT additions only; denied writes/DDL/journal delete/sequence mutation; no external/migration credentials in Worker. Known drizzle-generate false-green does not stand in for parity. |

Run applicable repository checks using pinned Node24.21.0/pnpm12.3.4: lint, typecheck, app tests, native DB tests, build/UI preview and current required workflows, plus connected browser checks for delivered route/UI scope. Record exact implementation head, fixture/runtime composition, commands/results and logs. Test doubles are allowed only for external provider/transport boundaries in local acceptance; they do not replace authoritative stores/writers/auth/session paths and do not establish live integrations. Earlier L–S diagnostic controls are evidence for planning only, not passes for the future implementation.

Do not repeat all expensive checks for every service text edit. Each implementation slice runs its meaningful affected checks and required gates; SA08-B runs complete composition on the final stable code. Any changed implementation after review receives a new coordinator/independent cycle.

## 16. Documentation closeout and handoff contract

After actual implementation acceptance, a separate DOC PR updates `docs/SUPER_ADMIN.md` for all delivered areas/typed sources/coverage/action/deactivation/retention; relevant auth/lifecycle, Settings, Complaints/notifications, translation/attachment and runtime privilege contracts only where factual behavior changed. Update `PROJECT_STATE.md` with current facts/remaining external and visual limits, not CI/review history; put completed implementation/acceptance snapshots in `docs/PROJECT_HISTORY/` and index them. ROADMAP reflects only accepted current Stage. No Stage 6/production/live-provider completion claim, no future purge/recovery policy.

The whole-plan gate closes only after Mira reviews **this entire chain**, including its incorporated L–S subplan, against the accepted product map/current source. Acceptance then permits coordinator activation of **L only**; it is not blanket execution of every row. No implementation PR is created by this planning handoff. Owner still merges each implementation/documentation PR.

Outstanding product decisions identified by this planning: **none required to implement the already accepted scope**. Non-continuous/best-effort observability, code-only background execution, separate runtime-read privilege delta, exact mandatory deactivation event, native retained creation/read facts and explicit Infrastructure placeholder are technical resolutions within that scope, not new product features. If Mira finds scope/fit issues, return one complete package of corrections before activation.

## 17. Verification of this planning deliverable

This is source-based planning, not implementation acceptance. Current source was inspected in a fresh detached checkout at exact baseline; no source implementation changed, no implementation branch/PR or runtime service was started for this remaining-plan task. Reused unchanged L–S analysis includes its explicitly labeled bounded native diagnostic evidence; this document does not relabel it as production-path implementation coverage.

Source anchors inspected for this extension include `db/schema.ts`, migrations0062–0065, Owner catalog/current/history/profile/auth fact/System/facade modules; AccountState/Owner helpers; canonical routes/request contexts/address families/Worker wiring and private failure boundaries; native Admin/Complaint/notification/Forum/revision writers; translation task/planning/publication/reconciliation/budget and attachment/cleanup/storage seams; schema/privilege manifest/probes. A companion source SHA-256 inventory in the planning evidence directory pins the new analysis to this baseline; the accepted L–S file retains its own detailed inventory. Not every source file in the repository was audited, and no complete source/security audit or #315 remediation is claimed.

Handoff: **Lev planner STOP → Mira whole remaining-plan scope/fit review through SA08.** Implementation remains stopped until that review accepts the complete plan.


## 18. Source identity inventory (baseline6652c898)

These hashes pin the source anchors used for planning; they do not assert a complete repository audit or future implementation acceptance. The unchanged L–S subplan supplies its own writer/caller inventory.

```text
a28c2d88e20fc7265ec7ea11dd96336255e439d0051fd0373e03b4f9d4d23918  AGENTS.md
6506d45831e6cde13f59e9457b0f0bf8c58937a099cf05066e6e2f6479e793fa  PROJECT.md
c7af091096a2d8b77a52a0a82e341c0faa7f9f0ea683769198c4c4cdb829172a  PROJECT_STATE.md
b6eeff38bf66abcf2641a120c117f394035aedf9bef085acbf1bc13613739475  ROADMAP.md
fd906d93a5a830284f2b85961c526ce422c72593d3dbcf349946737dc3fd567d  docs/SUPER_ADMIN.md
4a1bde443c43fc737f8196c7c455f9620350f4b51d52eaf49c7f822eef5714fa  db/schema.ts
84fbed1d5833673731a8880da2cfe145bf853867d7fa563bca439d01a5093923  drizzle/0062_owner_monitoring_foundation.sql
1ad8c853723281fa5f2ef7286d671a5d069a451f9dec4373e17b4636f03a18f8  drizzle/0063_owner_attempt_telemetry.sql
32113246887bdff1cde27d81aa6cd81e8096d310c54523ab9dd33c09d71b99ac  drizzle/0064_sa03_profile_history_indexes.sql
27db7f9cccb88fe8863b11c251d8d10bd5a981e77d7f93c88bb5f8f6c9d60a2b  drizzle/0065_sa04_account_state_foundation.sql
864836ce2995f5ed5f5e0b90ab4a851174b58cb7be82460b2e468ab669cbf351  db/account-state.ts
99c00bd7c54ccfd0af1eed00d095b32aa24088135d9292495f95d1dc3cc86a47  db/owner-sa02-catalog.ts
3abc77a07ddcccb648326147af5fd87d8c0b514403b4bb418f650febd134d6f5  db/owner-sa02-current.ts
5e472f462a5fa0b280bdbf14a4bdc96b6f01aa9d212557d73ee99a196f94c273  db/owner-sa02-history.ts
14b921648a4e8d39e565586faf1fda2dee34f84f066f918cab86154a5720a2b0  db/owner-system-history.ts
6566a909f17d555207406cd808a7e65788ae26223e85d53b2b2ed8514fdc9df0  db/owner-system-monitoring.ts
ad46cef8184f6fc90e675f8e710301e451fe77c697f52dd8192eac7313cf4dee  db/owner-auth-facts.ts
6db9bdfde110e88089fbac81c32c722118a834f0135898711212348df4f31c4e  db/owner-user-profile.ts
c4821bfaba7683f67d8ba4a6df44253bd21bd2a3ceb56ef34d44f8434d306658  db/owner-user-history.ts
03c5ce8a00e1cc202438e1d4d5ae3367c81b21f207bc24808db29c7bc44117f8  db/hyperdrive-owner-system.ts
64f326160671fdafe6493ab6a469ea3d0eabcd014a443e41f451fd037e15b20d  db/hyperdrive-owner-profile.ts
3d5be44701c617d536eade57ff5ab0c1003e19990fb4207b04fe7b0dbce78940  db/postgres-deadlines.ts
983adfc601132174515f55aca0a66e6c2fa07451c5d56685c33386dc95b07a1b  db/admin-history.ts
636380c503fa7221a529b5965ffbc8b40165d1e72c6dcc6bdf04de9a5e19e964  db/forum-repository.ts
2bd16cdcdf1304efb03a527fbd5004cb809edad634d924642c93196fc8f70727  db/forum-notifications.ts
da581f4b1e0f55167167c834c7098a7e1cd788612552e4c26f451c9b9113a1e5  db/complaints-repository.ts
18385c4e7e5752df30be4b594a66aaebd062fc40ce3acafe79fbab4fec26f607  db/translation-task-store.ts
a74f0202e9c6eb314710b28d1c4be95d67ce651b1283d4cb47f344c46a9da082  db/content-topic-title-task-store.ts
d20180284a39a78770cf166d59f2a87d8ffd0a7a8db8a45e99f8a9301377cb67  db/content-post-body-task-store.ts
f344ffebcf65c3e0889ba7d43053829e9f49939a5dbe31a5c38c11cde6677ef8  db/content-topic-title-execution-store.ts
84616d89477314bdb0b09ea6da4778150ab68fa1800686bf51e9d3e073af7e4f  db/content-post-body-execution-store.ts
5c8e30211f34bb3a12026ea634527e001a60ba1c9c4d4e4c7087f7470ada1bf0  db/ui-translation-publication-store.ts
8040bf4017b6918ec94bed1aebc30a94d9d707c78a42cfd9eaa5fdf7cc1415d6  db/content-request-budget-store.ts
e4d6123f81fe34d998ae89c2710a75d4864f917bcf3c3b5a5a1efbd15441aefc  db/ui-translation-bundle-store.ts
2380536853ee4b9452cc82ffa5cbce916ae6019041618bcbc4d36364b279bd3e  db/forum-attachments.ts
12347f0583fe25840a5177f0e87b69aa3ef332e7f0ac194412bb7991bb858f12  db/forum-attachment-cleanup.ts
0680dc57e651bc4c31138161caceab1b2f0067911b56b1565c9516cb8150ccfe  app/authorization/owner.ts
a35696eba4b4c00bab5b372937c94fc3add9962b6cef9829cb6185a34ba1205b  app/super-admin/access.server.ts
e481df15ffbb9511c0dd4da9c38595c6ba9ebb9d21a774f0ded81edfb4718cde  app/super-admin/request-context.ts
8192446679c31cefb7872367e1538cd2bb6e3311bef76fe888a6ecfae5a68799  app/super-admin/history-query.server.ts
e8f58a37951c596c0c3204bd0f938725802bd7c2f7ed0d461358107707836e6f  app/super-admin/current-loader.server.ts
6f6aed2e6cc8977a4dd6ea991fc3ec1ae11f449e4e17e48bf6e991d94636a854  app/administrative-routing/addresses.ts
d77ab58b28e83aceebdfbc165e69a610a825cf81e5880b94d712ed7eda7abf41  app/profile/request-context.ts
bc405436a0aa5dac8cacdaaadbddbee548166fabf68b82348bf510386b6c18cd  app/routes.ts
79d87b7e3bd93bdc391684eeb5260ceee23568ad1daadaef62506b5976174f33  app/routes/profile.tsx
ad4e7f9875b4e2ace906559f52b94e3126daa016d8665f90c6cb7e4b7b68abf3  app/routes/super-admin.tsx
a7f352c03c30a47ea39bef19752e7ed04ca5025d5644c73f50f43baed605d753  app/routes/super-admin-events.tsx
a0d517506e2e28cfa4968184357c9bd4618fc333915a6e9ad427ddf0b40cdf4d  app/routes/super-admin-monitor-history.tsx
3763cd88c965255113a764a5defd80caff036f41480fe8b43386e7cac813bb10  app/localization/translation-task-reconciliation.ts
7cc9cc357c2e27cc94ea18d8962096c16adecacde46dbcd16082aab83237f0e4  app/localization/translation-task-consumer.ts
ec3f72bbf6d47bf8606ecbf358ea13afc9fb24843cbf35b9f41758cb1a14d3be  app/localization/content-translation-task-consumer.ts
0451dd0bdc67b8b1eca92bdb1bf8a367f6b863f9c3cd1f6dd8249e97c73cf457  app/localization/translation-execution.ts
bc5c2030a42919ce0885353f2f261eea80bb0802dc5494fa06343af7955c21b6  app/localization/content-translation-execution.ts
4aa596a42623de2153f5355181f375f8f8b20d43812c8b34d282e636c5ce1dab  app/localization/content-post-body-execution.ts
6af4ab37642082eec6da897721a6e03cfad355a2c9d9b5b491c98265fb9e943d  app/localization/translation-provider.ts
bb83779742fd3b256b1931550c7502e1917b44e98d5e87fc1f3329c9804bba7f  workers/app.ts
0b3cef7654a3c4730d6f7899e0f80166103a9f770ed57f7d5d8f34d2b2d739ef  workers/attachment-storage.ts
d9879a88bf4ad2d956b5300088bc0d7e671e39d085ea823fc3a87b96a1ef7af2  workers/database-bindings.ts
c83e769ad24b85439a9aae0461df255fd4150cde64cb8b85dca9cbfe5e6f1bf1  workers/private-failure-response.ts
eec43e4e3b9e423c9de6b25edfb895a1ce900fdabe108453cb326bb43d4678a0  .github/production-schema-manifest.json
8319b7b5d4d6054a6078a233a9ad34f0b32448ac1531d4323aa920745bcc0919  .github/scripts/runtime-privileges.mjs
cb3b1f8bdf82522ddda2166f47513a641be53efea44c786673de3e1b5ab49d30  .github/scripts/verify-runtime-privilege-probes.mjs
57389712b35f2250b084d0876c83f846a846186d729ca804f2685dc5af8dd2f6  .github/scripts/verify-production-runtime-privileges.mjs
efde47cd5c8f4bab1d16b87708063dc9702934a47b786d930bfd959c79aaf1b0  .github/scripts/production-schema-manifest.mjs
bb4b7a417f6bc0009e01001d6945cfd044232e794d09b2867bf182f55cdf069a  package.json
```
