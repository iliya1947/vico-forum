# Block L — Security monitoring & incident response audit

## Статус

1. Scope создан 2026-11-18; current L1 audit target — `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Blocks A–K закрыты как audit blocks; их root causes в L не дублируются.
3. **L1 — Monitoring/incident-response inventory & ownership boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. **L2 — Security source attribution / telemetry admission завершён: 1 новый current-scope finding — `MON-AUTH-OUTCOME-01 Low/P3`; 0 deferred blockers.**
5. **L3 — Retention / coalescing / privacy завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
6. **L4 — Alertability / failure signals завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
7. **L5 — Audit / History integrity завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
8. Overall #315 остаётся **34 current findings + 4 deferred Stage-6 blockers**.
9. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
10. Production/Cloudflare/Neon/GitHub/provider mutation, external incident drill и destructive/fault-injection действия не разрешены и не выполнялись.

## Цель

Проверить, что security-relevant события и состояния Vico Forum имеют полезную, честно ограниченную наблюдаемость и пригодный incident-response путь: source attribution, retention/coalescing, alertability, audit/history, revocation/recovery и degraded-operation procedures — без превращения Monitoring в выдуманный полный аудит.

## Current scope

1. Security/auth/access/attachment/system failure sources и их attribution quality.
2. Exact facts, coalesced attempts, sampled observations, native History и operational evidence как разные классы доказательств.
3. Retention/coalescing/privacy boundaries и отсутствие опасной неконтролируемой telemetry-кардинальности.
4. Alertability и различие current state / retained evidence / unavailable / gap / stale.
5. Global/scoped/target History integrity, original-source identity и честная coverage.
6. Реальные revocation/recovery/containment действия: existing account/session/authorization/measure/lifecycle boundaries и их ограничения.
7. Incident-response degraded paths, recording gaps и recovery procedures в текущем repository/local-CI product.
8. Stage-6 external logging/alerts/provider/runtime integrations только как acceptance boundary, если текущий repository path сам не создаёт concrete defect.

## Anti-duplication

1. **Block B:** authentication/session/linking correctness, takeover/revocation semantics.
2. **Block D:** Complaints/Help/Admin privacy and moderation workflow correctness.
3. **Block F:** attachment content/storage integrity.
4. **Block H:** Cloudflare Worker topology/runtime/version exposure.
5. **Block I:** secrets, CI and supply-chain provenance.
6. **Block J:** provider/Queue/external integration lifecycle and data policy.
7. **Block K:** generic abuse/availability, включая `ATTACH-SECURITY-EVENT-SPAM-01` и `DB-CLEANUP-FLOAT-01`.
8. L owns monitoring/incident-response semantics only; one root cause → one finding ID.

## План проверки

### L1 — Monitoring/incident-response inventory & ownership boundaries
1. Enumerate current retained security/system/operational sources and their quality classes.
2. Map current Monitor/History/target-history surfaces to original source identities.
3. Separate retention/alert/recovery gaps from existing A–K findings and Stage-6 external acceptance.
4. Recheck current-main delta for new monitoring/incident-response sources without reopening unrelated closed blocks.

### L2 — Security source attribution / telemetry admission
1. Trusted source/actor/network attribution for auth/access/security signals.
2. Exact fact vs denied attempt vs unavailable/gap semantics.
3. Cardinality/coalescing/admission integrity and spoofing boundaries.
4. No duplicate of K resource-growth findings.

### L3 — Retention / coalescing / privacy
1. Owner-event, observation, attempt and attachment-evidence retention contracts.
2. Coalescing/dedup identity and loss/gap representation.
3. Sensitive-field minimization and target-history attribution.
4. Retention growth only where it is a monitoring-policy defect rather than K abuse.

### L4 — Alertability / failure signals
1. System request/dependency failures and Security monitor signals.
2. Whether serious retained states are distinguishable from healthy/unknown/unavailable.
3. Alert/action discoverability appropriate to current pre-release scope.
4. External alert delivery/on-call remains Stage-6/release acceptance unless already required.

### L5 — Audit / History integrity
1. Global/scoped/target History original-source identity.
2. Pagination/filter/coverage semantics and duplicate/lost fact boundaries.
3. Mandatory domain History vs best-effort telemetry distinction.
4. Tamper/update/delete capability and provenance where relevant.

### L6 — Revocation / containment / recovery actions
1. Existing session, authorization, measures and account-lifecycle containment paths.
2. Fresh authority checks and current-state effects.
3. Recovery limits explicitly not implemented by product decision.
4. Do not invent second mutation backends inside Monitoring.

### L7 — Incident-response degraded operation / Stage-6 gates
1. DB/auth/runtime failure behavior and telemetry gaps during incidents.
2. Evidence preservation vs response availability.
3. Current operator procedures that can actually be executed.
4. Stage-6 external logging/alert/provider/runtime acceptance gates.

### L8 — Cross-chain closeout
1. source event → retained evidence → Monitor/History → operator interpretation/action;
2. dedup A–K;
3. current-vs-Stage-6 severity validation;
4. record release/Stage-6 correction gates; remediation remains separate.

## L1 — результат

1. Audit target: current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Current monitoring evidence is intentionally heterogeneous rather than one fake audit stream:
   - exact persisted auth transitions are retained in `owner_events`;
   - denied/rate-limited/unavailable auth/access attempts use bounded/coalesced attempt telemetry;
   - attachment security evidence remains its native `forum_attachment_security_events` source;
   - System dependency/request failures and monitor observations retain their own source identities;
   - Admin/Complaints/Help/Notifications and other domain History is projected from native source relations;
   - translation/file/background operational evidence uses bounded best-effort operational facts.
4. Source quality is explicit. Current contracts distinguish exact, measured, sampled/coalesced, best-effort, unavailable, stale/gap and unattributed evidence instead of silently promoting one class into another.
5. Attempt telemetry has a concrete cardinality boundary: authenticated and anonymous-known-network pools admit at most 256 new attributed groups per recording hour; repeated patterns coalesce, while unknown/overflow/gap information uses bounded state slots.
6. Monitor observations are sampled/deduplicated on bounded windows (commonly 15 minutes), and recording failure is reported as degraded/unavailable recording rather than converting a valid current read into a false healthy zero.
7. Global/scoped Owner History projects original source identities; target History includes only sources with persisted person attribution. The existing contract explicitly says this is retained relevant History, **not** a complete continuous activity/audit timeline.
8. Owner monitoring/history retention policy is currently indefinite until explicit Owner policy change, with no ordinary deletion/cleanup. L1 records this as an approved current contract, not automatically a defect; L3 will test whether the retained/coalesced source set makes that policy unsafe or internally contradictory.
9. Current incident-response actions are deliberately outside read-only Monitoring: contextual links reuse canonical Admin, Settings, Needs attention and profile/account boundaries. Monitoring itself does not create a second mutation backend.
10. Current containment/recovery is partial by product design: exact-Owner account deactivation exists; own session/password management and authorization/measure controls exist in their canonical domains; forced foreign-session termination, reactivation, hard delete and Owner recovery/transfer are explicitly not implemented. L6 will evaluate whether any missing action violates the current incident-response contract rather than assuming every possible recovery feature is required.
11. System request-failure recording is best-effort and explicitly non-exhaustive; Security attempt telemetry also preserves recording gaps. L4/L7 will test whether these limitations are represented sufficiently for operator decisions.
12. Main advanced after Block K: Watch #345 added `forum_topic_watches` and watcher-driven reply notifications. L1 confirms this uses the existing `forum_reply_notifications` source, which is already the authoritative `notifications.inbox` current/History source. It creates no new monitoring journal or L-owned source class by itself.
13. The Watch delta therefore does **not** reopen Block K automatically in L1; any generic fan-out/abuse issue belongs K and requires separate evidence, while L audits truthful monitoring/incident response.
14. Current `PROJECT_STATE.md` still states repository migration history through `0067`, while current `main` contains `0068_topic_watch`. This is a factual documentation drift outside Block L; it does not change the L1 monitoring ownership result and is not counted as an L security finding.
15. No external alerting/on-call/paging mechanism is claimed by current Super-admin contract. Its absence alone is not classified in L1 because Vico is pre-release and Stage 6 remains paused; L4/L7 will test release/activation requirements.
16. No monitoring GET triggered provider/R2/background work during this audit; no external incident drill, production query, alert delivery, deployment or settings mutation was performed.
17. Next bounded slice: **L2 — Security source attribution / telemetry admission**.

## L2 — результат

1. Audit target: current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Verdict: **1 новый current-scope finding — `MON-AUTH-OUTCOME-01 Low/P3`; 0 deferred blockers.**
3. Network attribution — PASS: `captureAttemptIngressSource()` accepts a source only when Cloudflare Worker `request.cf.colo` evidence is present, rejects browser-only forged CF/XFF/real-IP inputs, rejects Worker/subrequest indicators and ambiguous IP forms, and labels accepted network identity only as `qualified`, not proven person identity.
4. Actor attribution — PASS: `RequestAttemptCollector.setResolvedActor()` receives only the authoritative session user resolved before Router dispatch. Guest Owner-guard denials remain actorless; authenticated non-Owner denials retain the resolved actor. Client expectations do not select telemetry actor identity.
5. Exact auth facts — PASS: native Better Auth persistence callbacks enqueue only the five approved persisted transition kinds. Success without proven persistence is not promoted into an exact fact; uncertain/missed recording is represented as a gap rather than an invented success.
6. Cardinality/admission — PASS: at most four attempt records are buffered per request before excess is converted into a bounded gap count; durable attributed patterns are capped at 256 new groups/hour/pool, repeats coalesce, and unknown/overflow/gap use fixed slots. Writer validation closes arbitrary operation/outcome/source/status values and uses database-owned recording hour.
7. **Independent L2 root cause:** HTTP auth attempt classification maps only 400/401/403 to `denied`; other non-429/non-503 4xx statuses become `failed`. The current canonical `/api/auth/link-social` path deliberately returns **409** when the authenticated session does not match the stale displayed-profile expectation, and the authorization source-of-truth explicitly describes this as a rejected/denied link initiation before OAuth state or account write.
8. The same semantic class is already treated differently on direct account-security paths: `recordDirectFailure()` maps `account-changed`, `no-password`, `session-not-found` and `current-session` 409 results to outcome `denied`. The HTTP path therefore has an internal attribution inconsistency rather than a general product decision that 409 means failure.
9. Retained effect is real: attempt History stores `operation`, `outcome`, `httpStatus` and related source fields and the Owner History UI renders the retained `outcome`. A stale link denial is therefore preserved as `failed` instead of `denied` for operator inspection.
10. Current Security aggregate counters are not materially corrupted by this classification: `security.auth` currently totals attributed attempts/rate-limited attempts/patterns/gaps and does not separately aggregate denied-vs-failed counts. The defect is retained incident interpretation/History semantics, not authentication correctness or rate limiting.
11. Severity: **Low/P3** — the request is correctly denied and no authority, confidentiality or availability boundary is bypassed; however a concrete security-relevant retained event is mislabeled in the Owner incident evidence, which violates L's truthful attribution requirement.
12. This is not a duplicate of Block B link correctness: Block B owns the stale-identity protection itself; L2 owns only the incorrect monitoring outcome assigned after that protection correctly rejects the request.
13. No second L2 finding: network source quality, resolved-actor attribution, exact-fact admission, bounded per-request buffering, hourly cardinality admission and gap/overflow representation were consistent with the current contract.
14. No external auth attempt, Google OAuth call, production telemetry write, incident drill or settings mutation was performed. Tests were inspected, not executed during L2.
15. #315 aggregate becomes **34 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **13 Moderate/P2 + 21 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
16. Next bounded slice: **L3 — Retention / coalescing / privacy**.

### `MON-AUTH-OUTCOME-01` — Low/P3 — current

**Root cause:** generic HTTP auth-attempt status mapping classifies the canonical stale-identity `/link-social` 409 rejection as `failed`, while the same class of direct 409 security conflicts is classified as `denied`.

**Current impact:** retained Owner Security History presents a real denied link attempt with the wrong outcome category, weakening incident interpretation without changing the underlying denial or authorization result.

**Boundary:** auth/link correctness remains Block B; aggregate Security counters do not currently split denied vs failed, so the defect is History/telemetry semantics only.

## L3 — результат

1. Audit target: current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Retention policy is explicit rather than accidental: the Owner Monitoring/History contract retains monitoring/event history indefinitely until an explicit Owner policy change and exposes no ordinary deletion UI. The current repository correspondingly has no application cleanup/delete path for `owner_events`, monitor observations or attempt telemetry.
4. This approved indefinite-retention policy is not reclassified as a security defect by itself. Block L only requires a finding where retained data exceeds the approved evidence purpose, leaks across an authorization boundary, or coalescing materially falsifies operator evidence.
5. Exact Owner auth/system/operational facts remain bounded/minimized at write time: event kinds and payload fields are closed, safe scalar fields are length/size bounded, raw passwords/hashes/tokens/cookies/request bodies/SQL/exception text are not persisted by these producers, and occurrence identity prevents duplicate exact facts from becoming multiple journal entries.
6. Attempt telemetry coalescing remains semantically bounded: the DB-owned UTC hour + actor/network/source/operation/outcome/status identity is unique, mutable counts preserve immutable admission/pagination identity, overflow/unknown/gap use fixed slots, and the retained pattern exposes first/last/count rather than pretending each coalesced request is an exact individual event.
7. Person-target History privacy — PASS: only sources with persisted person attribution are eligible; unattributed global observations and gap/overflow state do not join a user. Attributed attempt patterns may include the recorded qualified network IP, but this projection is exact-Owner-only and is explicitly part of the approved retained security evidence model.
8. Attachment evidence is deliberately split by audience. Exact Owner global/target History projects only upload identity/uploader/detected type/reason/declared size. More operational fields such as filename, declared MIME, editor context and draft identity remain on the native Security/Attachments queue, which independently requires the code-backed `forum.attachmentSecurity.read` permission before reading the source table.
9. The Security/Attachments queue uses private/no-store responses and current effective authorization. Initial moderator/admin grants are an explicit current product decision, so the presence of operational evidence there is not an unintended Owner-History privacy expansion.
10. The absence of cleanup for `forum_attachment_security_events` is **not duplicated in L3**: unbounded durable security-event growth under repeated rejected uploads is already owned by Block K as `ATTACH-SECURITY-EVENT-SPAM-01`. L3 found no separate confidentiality or attribution defect caused by retention itself.
11. System observation change semantics were rechecked. The original System writer compares the current fingerprint and suppresses only an unchanged fresh sample; a changed System state is inserted even within the 15-minute window. Therefore the documented SA-01 “meaningful changes remain available” contract is preserved.
12. Other Monitoring snapshots use an explicit 15-minute sampling gate and are documented as sampled/non-exhaustive evidence. Where exact domain transitions matter, adjacent/global History projects their native source facts instead of relying on snapshots. This is intentional coverage semantics, not silent event loss.
13. SA-08 Overview does not weaken System semantics: it uses the general batch sampler for non-System candidates but records System monitors afterward through `PostgresOwnerSystemHistory.recordObservation()`, preserving the fingerprint-aware System rule.
14. No new privacy leak was established from Watch #345: watcher-driven notifications remain in the existing notification source and do not add new retained security identity fields.
15. The existing factual documentation drift remains outside L: `PROJECT_STATE.md` says repository migrations through `0067` while current `main` contains `0068_topic_watch`. It does not affect the L3 security verdict.
16. No production data inspection, retention deletion, external incident drill, provider call, deployment or settings mutation was performed. Tests were inspected, not executed during L3.
17. #315 aggregate remains **34 current findings + 4 deferred Stage-6 blockers**. Current severity remains **13 Moderate/P2 + 21 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
18. Next bounded slice: **L4 — Alertability / failure signals**.

## L4 — результат

1. Audit target: current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. System dependency/current-read failure is not converted into false health. A classified monitoring-storage/DB outage produces protected `503`/unavailable behavior; SA-08 partial-source composition keeps neighboring measured areas while marking failed sources partial/unavailable and does not synthesize zeroes.
4. Observation persistence failure is separately visible as `recording="unavailable"` on System/Accounts/Security current-state surfaces. A successful current read therefore remains usable while the operator is told its retained observation could not be recorded.
5. Security auth/access monitoring exposes retained attributed attempts, rate-limited attempts, unknown source counts, capacity overflow, explicit recording gaps, last-seen time and current-hour pool usage. The UI explicitly states that telemetry is coalesced/best-effort, that it is not a complete security audit or exact 24-hour count, and that zero does not prove absence of attacks.
6. Attachment security evidence has a current signal path: exact Owner Security Monitoring exposes total / previous-24-hour / latest-event time and links to the existing permission-gated Needs attention → Security → Attachments queue. Ordinary actors with `forum.attachmentSecurity.read` receive the same canonical queue entry through current Attention navigation; no duplicate security mutation/action backend is needed.
7. System request-failure monitoring is deliberately narrow and truthfully labeled. The backend stores only successfully recorded 5xx response events, the current page says “recorded 5xx responses; not continuous uptime or provider monitoring”, and History says only retained events/observations are shown. This does not claim a complete error-rate monitor.
8. A candidate gap was checked end-to-end: an exception thrown out of `applicationFetch()` on an Owner-only path can be converted by the outer protected failure wrapper into a safe 500/503 after the inner `recordRequestFailure()` hook has been bypassed. This is **not counted as an L4 finding** because the approved/current `system.requests` contract is explicitly best-effort recorded failures only, not all emitted 5xx outcomes; the UI exposes that limited coverage rather than asserting completeness.
9. The same distinction prevents an alerting false-negative from being presented as healthy state: System current UI has a page-level coverage disclaimer; attempt telemetry has explicit gap/overflow counters; Overview source status distinguishes measured/partial/unavailable/placeholder; History coverage warnings remain separate from zero-valued current counters.
10. Current contextual action discoverability is sufficient for the pre-release contract: Monitoring cards link to their adjacent History and canonical action destinations where such actions actually exist. Read-only monitors are not required to invent mutations, acknowledgement states or incident tickets.
11. No outbound pager/email/SMS/SIEM/on-call alert delivery is implemented or claimed. Its absence alone is not a current finding because Vico remains pre-release, Stage 6 is paused, Infrastructure is explicitly a Stage-6 placeholder, and ROADMAP Stage 6 separately requires deployed logs/observability/external-failure-path acceptance.
12. Before public release, deployed Stage-6/Stage-7 acceptance must re-evaluate real runtime logs/observability and whether operational alert delivery/thresholds are required for the production environment. This is an acceptance gate, not a new repository defect established by L4.
13. Exact deployed Cloudflare logging/alerting, WAF/Bot signals, Neon/Hyperdrive provider dashboards and external on-call integrations are **Информация не проверена**; they were not required to classify current repository behavior and were not mutated.
14. No external alert delivery, production probe, fault injection, provider call, deployment or settings mutation was performed. Existing repository/browser acceptance evidence was inspected; tests were not executed during L4.
15. #315 aggregate remains **34 current findings + 4 deferred Stage-6 blockers**. Current severity remains **13 Moderate/P2 + 21 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
16. Next bounded slice: **L5 — Audit / History integrity**.

## L5 — результат

1. Audit target: current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Global/scoped/target Owner History preserves original source identity instead of copying facts into a second journal. Ordering identity is the original `(origin, source_id)` plus authoritative source time; one source fact may belong to several monitor scopes without becoming several global facts.
4. Current global/scoped pagination uses exact six-digit PostgreSQL timestamps plus origin/source-id tie-breakers. Filters are closed allowlists, validated before private SQL and bound into v2 cursors together with scope/time/kind/page-size; a cursor from another filter/scope is rejected rather than silently reused.
5. Exact microsecond native-source pagination is covered by the current implementation path. A potential legacy-cursor precision defect was separately checked and rejected: the original SA-01 `owner_events`, `owner_monitor_observations` and ordinary `admin_history` timestamps are physically `timestamp(3)`, so the accepted historical three-part cursor did not discard hidden source microseconds. New native sources use the exact microsecond cursor format.
6. Target-person History applies person attribution before branch-local LIMIT. Multi-role cases where the same source row proves more than one relation to the same person are deduplicated by the same original `(origin, source_id)`; unattributed observations/gap slots remain excluded.
7. Mandatory administrative evidence is not confused with best-effort telemetry. Ordinary `admin_history` writes are in the same authoritative mutation transaction as authorization/forum/measure/settings changes, and failure rolls back the mutation. SA-05 deactivation appends its original `account.deactivated` Owner event in the same lifecycle transaction. Complaint lifecycle events are inserted transactionally with the domain command.
8. Forum title/post revision History uses the immutable revision rows themselves as native source facts. Web runtime privileges are INSERT/SELECT only on those revision tables; complaint events and ordinary Admin History are likewise INSERT/SELECT-only for the web capability.
9. Owner `owner_events` and `owner_monitor_observations` are append-only for the web runtime (SELECT/INSERT, no UPDATE/DELETE). Their identity sequences are not exposed as a mutation surface. This preserves retained event/observation provenance after insertion.
10. Attempt-pattern/state rows are intentionally mutable because coalescing increments retained counters/last-seen state. History labels them as coalesced state rather than immutable individual events and orders them by immutable admission identity, so later count growth does not reposition the retained fact.
11. Notification first-read History is derived from the native notification row. The only normal read mutation uses `read_at=coalesce(read_at, statement_timestamp())`, so repeated reads cannot rewrite the first-read time. Creation and first-read deliberately use separate origins while retaining the same notification ID.
12. Help-signal terminal and measure-appeal-moot projections come from mutable domain rows because those domains require UPDATE. Current application writers move only pending rows into terminal states and reject later normal re-resolution; accepted/rejected administrative review also has its mandatory `admin_history` event. No generic client-controlled History rewrite/delete route was found.
13. Legacy/unproven measure-appeal terminal time is not fabricated: invalid/missing terminal chronology appears as coverage metadata (`moot-terminal-time-unproven`) instead of a chronological event with guessed time/actor.
14. Current runtime ACL intentionally does not make every domain source table append-only; that is necessary for the domain lifecycle and is not itself an L5 defect. L5 found no current application path that can rewrite/delete already-retained mandatory journals or silently re-key History identity.
15. Best-effort monitoring facts remain explicitly marked as such: sampled observations, coalesced attempts and operational facts are not presented as complete mandatory audit evidence. This distinction is preserved in History source/quality/coverage presentation.
16. The existing factual documentation drift remains outside L: `PROJECT_STATE.md` still says repository migrations through `0067` while current `main` contains `0068_topic_watch`. It does not affect the L5 History-integrity verdict.
17. No production History mutation, destructive DB test, migration, deployment or external incident action was performed. Existing repository/database/browser tests and source contracts were inspected; tests were not executed during L5.
18. #315 aggregate remains **34 current findings + 4 deferred Stage-6 blockers**. Current severity remains **13 Moderate/P2 + 21 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
19. Next bounded slice: **L6 — Revocation / containment / recovery actions**.

## Finding criteria

1. Concrete current/prepared monitoring or incident-response path.
2. A security-relevant fact can be materially spoofed, lost/misclassified, hidden as healthy, over-retained, exposed, or made unusable for an operator under the current contract.
3. Impact follows from current repository/runtime semantics, not only a hypothetical future SOC/on-call platform.
4. Root cause belongs L rather than A–K.
5. Current Stage affected, or a concrete prepared Stage-6/release path requires a deferred correction gate.

## Ограничения

1. Не выполнять production incident drill/fault injection.
2. Не менять Cloudflare/Neon/provider/GitHub alerting/logging/settings.
3. Не создавать external logging/SIEM/on-call resources.
4. Не исправлять findings во время audit.
5. Пока над #315 работает одна Мира, PR comments для внутреннего обсуждения не использовать.

## Следующий шаг

1. После продолжения владельца выполнить **L6 — Revocation / containment / recovery actions** на current main и остановиться после результата.
2. Remediation существующих findings/blockers Blocks B–L не начинать без отдельного назначения.
