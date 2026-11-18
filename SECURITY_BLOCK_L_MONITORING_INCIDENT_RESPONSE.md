# Block L — Security monitoring & incident response audit

## Статус

1. Scope создан 2026-11-18; current L1 audit target — `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Blocks A–K закрыты как audit blocks; их root causes в L не дублируются.
3. **L1 — Monitoring/incident-response inventory & ownership boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. Overall #315 остаётся **33 current findings + 4 deferred Stage-6 blockers**.
5. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
6. Production/Cloudflare/Neon/GitHub/provider mutation, external incident drill и destructive/fault-injection действия не разрешены и не выполнялись.

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

1. После продолжения владельца выполнить **L2 — Security source attribution / telemetry admission** на current main и остановиться после результата.
2. Remediation существующих findings/blockers Blocks B–L не начинать без отдельного назначения.
