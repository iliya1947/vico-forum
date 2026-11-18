# Безопасность Vico Forum — communication

Служебный PR: #315. Оперативное состояние: [workflow.md](./workflow.md). Общая карта: [SECURITY_IMPLEMENTATION_PLAN.md](../SECURITY_IMPLEMENTATION_PLAN.md).

## Назначение

1. #315 — общий служебный канал направления безопасности Vico Forum.
2. Каждый security-блок хранится отдельно; общий plan остаётся картой и маршрутом.
3. Реализация выполняется только отдельными bounded implementation PR.
4. Stage 6 external activation остаётся paused без отдельного решения владельца.

## Block-файлы

1. [A — Super-admin / Owner control plane](../SECURITY_BLOCK_A_SUPER_ADMIN.md)
2. [B — Authentication & sessions](../SECURITY_BLOCK_B_AUTH_SESSIONS.md)
3. [C — Authorization & privilege escalation](../SECURITY_BLOCK_C_AUTHORIZATION.md)
4. [D — Ordinary Admin & moderation](../SECURITY_BLOCK_D_ADMIN_MODERATION.md)
5. [E — Public forum / application](../SECURITY_BLOCK_E_PUBLIC_APPLICATION.md)
6. [F — Files & attachments](../SECURITY_BLOCK_F_FILES_ATTACHMENTS.md)
7. [G — Database & migrations](../SECURITY_BLOCK_G_DATABASE_MIGRATIONS.md)
8. [H — Cloudflare / Workers / runtime](../SECURITY_BLOCK_H_CLOUDFLARE_WORKERS_RUNTIME.md)
9. [I — Secrets & supply chain](../SECURITY_BLOCK_I_SECRETS_SUPPLY_CHAIN.md)
10. [J — External integrations](../SECURITY_BLOCK_J_EXTERNAL_INTEGRATIONS.md)
11. [K — Abuse & availability](../SECURITY_BLOCK_K_ABUSE_AVAILABILITY.md)
12. [L — Security monitoring & incident response](../SECURITY_BLOCK_L_MONITORING_INCIDENT_RESPONSE.md)

## Текущее подтверждённое состояние

1. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`. Последующее изменение `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8` меняло только `AGENTS.md`, не audited application code.
2. Block A: target architecture/foundation boundaries зафиксированы; Stage-6 activation не выполнялась. **SA-02 #319 delta-recheck на current main PASS — 0 новых current-scope A findings**.
3. Block B: аудит завершён; **8 current-scope findings**. **SA-02 #319 delta-recheck PASS — 0 новых B findings; все 8 прежних findings остаются открытыми/неисправленными.** Remediation не назначена.
4. Block C: аудит завершён; **1 current-scope finding — `AUTHZ-FAIL-01 Low/P3`**. Remediation не назначена.
5. Block D: аудит D1–D12 завершён; подтверждены **3 findings — `COMPLAINT-PRIV-01`, `HELP-SIGNAL-PRIV-01`, `HISTORY-PRIV-01` (все Low/P3)**.
6. D12 corrected closeout: official React Router Framework/SSR docs и exact `react-router@8.3.1` source подтвердили default skip loader revalidation после 4xx/5xx; Vico explicit recovery refreshes loaders and does not automatically replay mutations.
7. Block E audit завершён: E2 PASS; E5 — **`FORUM-PUB-01 Moderate/P2`**; E6 — 0 additional; E7 — **`READSTATE-CACHE-01 Low/P3`**; E3 — **`PUBLIC-PROJECTION-01 Low/P3`**; E4 — **`DISCOVERY-BOUNDS-01 Low/P3`, `SEARCH-CONTROL-01 Low/P3`**; E8 PASS; E1 — **`LOCALE-DEGRADED-WRITE-01 Low/P3`** + расширение `READSTATE-CACHE-01`; E9 PASS; E10 — **`FORUM-READ-BOUNDS-01 Moderate/P2`, `FORM-BODY-BOUNDS-01 Moderate/P2`**. Block E total: **8 findings**. E10 проверен на current `main` `4248fed23925e4a23e48485d419ceaf0ce337def`; compare с предыдущим target подтвердил отсутствие изменений core Forum/translation E2–E9.
8. Block F на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`: **ЗАВЕРШЁН. Итог — 1 current-scope finding: `ATTACH-TEXT-TAIL-01 Low/P3`; F1/F2/F4/F5/F6/F7/F8 дополнительных findings не дали.** F8 перепроверил upload → publication → read → edit/remove → cleanup → evidence, включая lost ACK, measures, complaint evidence и runtime failures.
9. **Block G — Database & migrations ЗАВЕРШЁН. Final current-scope: 3 findings — `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`, `DB-TEST-TARGET-01 Low/P3`.** G8 дал 0 новых findings и исправил Stage-классификацию `DB-RUNTIME-EVIDENCE-01 Low/P3`: технический defect подтверждён, но это **Stage-6 blocker, не current-scope**, пока external integration paused. Descendant delta до current `main` `5992885e78b1642e41c9805116fcc256002b649c` (SA-03 #324, index-only migration `0064`) перепроверен и итог не изменил.
10. **Block H — Cloudflare / Workers / runtime ЗАВЕРШЁН** на current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Final: **0 current-scope findings; 2 deferred Stage-6 blockers — `WORKER-VERSION-URL-01 Moderate/P2`, `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2`**. H8 cross-chain дал 0 additional findings и подтвердил отсутствие дублей с A–G.
11. **Block I — Secrets & supply chain ЗАВЕРШЁН.** Final: **4 current findings — `REPO-MAIN-GATE-01 Moderate/P2`, `CI-PYPI-PROVENANCE-01 Low/P3`, `CI-POSTGRES-IMAGE-PROVENANCE-01 Low/P3`, `PAGES-ACCEPTANCE-PROVENANCE-01 Low/P3`; 0 Block-I deferred blockers.** I8 cross-chain PASS, 0 additional. `REPO-MAIN-GATE-01` — обязательный gate перед любым будущим Stage-6 production DB/credential/Worker dispatch; `CI-POSTGRES-IMAGE-PROVENANCE-01` — до доверия Worker verify. Exact mutable GitHub Environment secret inventory/policy и complete Secret Scanning state — **Информация не проверена**.
12. **Block J — External integrations ЗАВЕРШЁН. Final: 0 current findings + 1 deferred Stage-6 blocker — `GOOGLE-OAUTH-SCOPE-01 Low/P3`.** J8 cross-chain PASS, 0 additional: Google request→provider→callback→durable-account and translation task→provider→validated-publication chains do not create a second J root cause. Block B/H/I ownership remains intact; Stage-6 external settings/retention/Queue acceptance remain future checks.
13. **Block K — Abuse & availability ЗАВЕРШЁН. Final: 5 current findings — `FORUM-EDIT-SPAM-01 Moderate/P2`, `PUBLIC-READ-COST-01 Moderate/P2`, `ATTACH-SECURITY-EVENT-SPAM-01 Moderate/P2`, `MENTION-FANOUT-01 Moderate/P2`, `DB-CLEANUP-FLOAT-01 Low/P3`; 0 deferred blockers.** K8 cross-chain PASS, 0 additional; B/E/F/H/J ownership remains intact and generic monitoring/incident-response policy remains Block L.
14. **Block L — Security monitoring & incident response ЗАВЕРШЁН. Final: 1 current finding — `MON-AUTH-OUTCOME-01 Low/P3`; 0 deferred blockers.** L8 cross-chain PASS, 0 additional: source/evidence/History/operator chains remain truthful outside the already-recorded 409 outcome-label defect; degraded in-app telemetry and external observability boundaries are explicitly limited rather than presented as complete audit. A–K ownership remains intact.
15. Aggregate #315: **34 current-scope findings + 4 deferred Stage-6 blockers**. Severity current: **13 Moderate/P2 + 21 Low/P3; current P0/P1 нет**. Deferred: **2 Moderate/P2 + 2 Low/P3**.
16. Implementation PR, technical planner и implementer для remediation сейчас не назначены.
17. Cloudflare/Neon/production/GitHub-settings/provider mutation по #315 не разрешена и не выполнялась.

## Индекс подтверждённых current-scope findings

1. `AUTH-LINK-01` — Moderate/P2.
2. `AUTH-SESSION-01` — Moderate/P2.
3. `AUTH-SESSION-02` — Low/P3.
4. `AUTH-SESSION-03` — Moderate/P2.
5. `AUTH-ENUM-01` — Moderate/P2.
6. `AUTH-OAUTH-01` — Low/P3.
7. `AUTH-REG-01` — Moderate/P2.
8. `AUTH-CACHE-01` — Low/P3.
9. `AUTHZ-FAIL-01` — Low/P3.
10. `COMPLAINT-PRIV-01` — Low/P3.
11. `HELP-SIGNAL-PRIV-01` — Low/P3.
12. `HISTORY-PRIV-01` — Low/P3.
13. `FORUM-PUB-01` — Moderate/P2; missing application-level upper bound для topic title / post body в create/reply/edit.
14. `READSTATE-CACHE-01` — Low/P3; shared `/:locale` parent/session projection plus unread/read-state public GET surfaces lack explicit `private, no-store`.
15. `PUBLIC-PROJECTION-01` — Low/P3; moderator-only Help `needs-review` / pending `disputed` metadata остаётся в public loader projection.
16. `DISCOVERY-BOUNDS-01` — Low/P3; Unanswered/Tags/Tag/Unread result sets не имеют page/cursor/limit.
17. `SEARCH-CONTROL-01` — Low/P3; NUL в public search query достигает PostgreSQL text parameter и уходит в generic 500 path.
18. `LOCALE-DEGRADED-WRITE-01` — Low/P3; canonical `/en/*` localized actions can execute while LocaleRegistry health is degraded instead of fail-closed.
19. `FORUM-READ-BOUNDS-01` — Moderate/P2; canonical public section/topic reads grow without page/row bounds and amplify DB/translation/SSR work with persistent forum growth.
20. `FORM-BODY-BOUNDS-01` — Moderate/P2; ordinary member forum/profile/presence POST paths fully parse form bodies without an application byte ceiling before semantic validation.
21. `ATTACH-TEXT-TAIL-01` — Low/P3; text classification checks only the first 4096 bytes, so a later binary tail can still become `type-checked`/publishable without attachment security evidence.
22. `DB-SEARCHPATH-01` — Low/P3; Complaint predecessor trigger uses unqualified relation names under caller search path, so a current web-capability session with TEMP can shadow its validation tables and persist an unrelated predecessor Case.
23. `DB-ACL-USER-DELETE-01` — Low/P3; current web DB capability grants `DELETE` on `public.user`, but current Vico/Better Auth configuration has no enabled physical user-deletion operation, so the credential has unnecessary destructive authority.
24. `DB-TEST-TARGET-01` — Low/P3; destructive DB test guards validate WHATWG URL `hostname`/pathname but pass the original connection string to node-postgres, whose pinned parser accepts query-level `host` override, so an external `*_test` database can pass the claimed local-only guard and be destructively reset.
25. `REPO-MAIN-GATE-01` — Moderate/P2; default `main` has no active branch/ruleset enforcement while a delegated repository integration has Contents-write authority; PR-only CI therefore can be bypassed by a direct trusted-branch update, and main push also feeds the public Pages deployment path.
26. `CI-PYPI-PROVENANCE-01` — Low/P3; browser acceptance фиксирует только `playwright==1.62.0`, но compatible Python transitives online-resolve без repository-owned full pin/hash set, поэтому unchanged workflow может исполнить другой compatible external package code.
27. `CI-POSTGRES-IMAGE-PROVENANCE-01` — Low/P3; CI/browser service jobs используют mutable `postgres:17`, поэтому exact executed image digest выбирается registry во время run без repository review.
28. `PAGES-ACCEPTANCE-PROVENANCE-01` — Low/P3; один canonical Pages URL разделяется `main`, broad `chatgpt/ui-*` pushes и manual dispatch, поэтому visual acceptance не доказывает stable exact implementation head.
29. `FORUM-EDIT-SPAM-01` — Moderate/P2; own topic-title/post edit paths create immutable revision rows without cooldown/quota, so one authenticated account can repeatedly alternate small valid edits and grow durable revision storage/index/history work without a time/count bound.
30. `PUBLIC-READ-COST-01` — Moderate/P2; public Homepage/Popular/Search have bounded or small responses but corpus-proportional DB/Worker computation with no application-level cache/admission bound, enabling unauthenticated repeated backend amplification as forum data grows.
31. `ATTACH-SECURITY-EVENT-SPAM-01` — Moderate/P2; distinct suspicious rejected attachment attempts can persist separate durable security-event rows while the event path has only exact-event deduplication and no per-actor budget/retention boundary, allowing unbounded DB/index/monitoring growth.
32. `MENTION-FANOUT-01` — Moderate/P2; published mention extraction has no independent distinct-recipient ceiling, so one ordinary authenticated publication can perform recipient-proportional user lookup and create one durable inbox row per matching recipient.
33. `DB-CLEANUP-FLOAT-01` — Low/P3; shared web DB cleanup starts async client/pool `end()` but does not await or attach it to Worker lifetime, so request-scoped teardown completion is not guaranteed before invocation termination.
34. `MON-AUTH-OUTCOME-01` — Low/P3; canonical stale-identity `/link-social` 409 is a denied auth attempt but generic HTTP attempt telemetry retains it as outcome `failed`, so Owner Security History misclassifies the event.

Ключевая causal path, impact и границы каждого finding находятся в соответствующем Block-файле.

## Подтверждённые deferred Stage-6 blockers

1. `DB-RUNTIME-EVIDENCE-01` — Low/P3; technical defect подтверждён: manual Worker rollout принимает historical `0020` evidence при current runtime dependency как минимум на `0058`. G8 установил, что verifier используется только paused Stage-6 rollout path, поэтому это не current-scope finding. Исправление обязательно до возобновления schema-dependent Worker rollout.
2. `WORKER-VERSION-URL-01` — Moderate/P2; manual Worker rollout создаёт Version URL для version с production `WEB_HYPERDRIVE`/auth configuration и использует его как unauthenticated pre-traffic smoke surface. Enabled Version URLs public and use production resources; `promote=false` оставляет uploaded version без cleanup. Current Stage не затронут, пока rollout paused. Correction gate — до следующего Stage-6 Worker upload с private/write production capability.
3. `WORKER-ROLLBACK-FINALIZER-01` — Moderate/P2; promotion и rollback/reconciliation зависят от lifetime одного GitHub runner/job. Timeout/cancel/runner loss после accepted 100% promotion может убить job до rollback и final status proof, оставив unaccepted version активной на 100%. Current Stage не затронут, пока rollout paused. Correction gate — до следующего production traffic promotion.
4. `GOOGLE-OAUTH-SCOPE-01` — Low/P3; prepared Better Auth Google surface принимает caller-selected additional scopes и по умолчанию использует incremental authorization, хотя approved Vico Google scope — authentication/linking only. После consent Vico может удерживать own-account bearer authority, не нужную продукту. Stage 6 paused; correction gate — до real Google OAuth activation.

## Отдельный подтверждённый review

1. Security review PR #317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`: **PASS — 0 current-scope security defects**.
2. Review не подтвердил изменение ingress/auth/authz/DB/secrets/Stage-6 topology; PR добавлял outgoing AdministrativeRouting seam.
3. Future cross-origin producer/absolute-origin activation требует отдельного Stage-6 security design/acceptance; это не current defect.

## Открыто

1. **Block F закрыт: 1 finding — `ATTACH-TEXT-TAIL-01 Low/P3`.** Remediation не назначена.
2. **Block G закрыт: 3 current-scope findings — `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`, `DB-TEST-TARGET-01 Low/P3`; `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как Stage-6 blocker.** Детальные causal chain и G8 reclassification находятся в `SECURITY_BLOCK_G_DATABASE_MIGRATIONS.md`.
3. Current H closeout target: **`593a03964b8407b249f7c9f5eb117ddb8b07736d`**. Delta `ce62e783… → 593a0396…` — SA-04 A1 #327 migration/schema/tests only; H runtime/topology code unchanged. Source-of-truth docs пока всё ещё фиксируют `0064`/SA-04+ not implemented; это отдельный documentation drift вне H.
4. **Block H закрыт:** 0 current-scope findings; 2 deferred Stage-6 blockers; H8 0 additional and no A–G duplicates.
5. **Block I закрыт:** 4 current findings, 0 собственных deferred blockers; I8 дал 0 additional. Final mutable recheck: `main.protected=false`, `Protect main.enforcement=disabled`. Current-stage acceptance gates остаются `CI-PYPI-PROVENANCE-01` и `PAGES-ACCEPTANCE-PROVENANCE-01`; `CI-POSTGRES-IMAGE-PROVENANCE-01` также используется future Worker verify. `REPO-MAIN-GATE-01` обязательно закрыть до любого Stage-6 DB/credential/Worker dispatch.
6. **Block J J1–J8 ЗАВЕРШЁН:** J1 PASS; J2 добавил только deferred `GOOGLE-OAUTH-SCOPE-01 Low/P3`; J3–J8 PASS. J8 подтвердил отсутствие новой external-integration cross-chain root cause и сохранил dedup с B/H/I. Final J = 0 current + 1 deferred.
7. **Block K K1–K8 ЗАВЕРШЁН:** K1–K2 PASS; K3–K7 дали 5 current findings; K8 cross-chain PASS, 0 additional. Final K = 4 Moderate/P2 + 1 Low/P3, 0 deferred blockers.
8. **Block L L1–L8 ЗАВЕРШЁН:** L1 PASS; L2 = `MON-AUTH-OUTCOME-01 Low/P3`; L3–L8 PASS, 0 additional / 0 deferred blockers. L8 cross-chain preserved A–K ownership and confirmed no new monitoring/incident-response root cause. Final L = 1 Low/P3 current, 0 deferred. **Audit areas A–L complete.** Aggregate #315 = 34 current + 4 deferred. Next after developer continuation — bounded remediation decomposition/prioritization; implementation remains separate.
9. Exact `pg@8.23.0` query-timeout semantics и exact `drizzle-orm 0.45.2` transaction wrapper подтверждают, что lost/late COMMIT ACK возможен; current writers не auto-retry его. Locale отдельно reconciles; measures/Complaints/publication используют replay/CAS/idempotency.
10. `AuthorizationRepository.mutate()` rollback-error preservation слабее новых helpers, но current fail-open/security impact не доказан — finding не создаётся.
11. Advisory-lock compatibility с будущим real web Hyperdrive остаётся Stage-6 acceptance boundary; production web binding сейчас inactive/paused, поэтому это не current G5 finding.
12. Лира, Лёва и Марк сейчас не имеют активного назначения по #315.
