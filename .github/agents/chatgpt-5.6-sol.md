# Мира — безопасность Vico Forum

## Текущая задача

1. Служебный PR: **#315**.
2. Моя текущая работа: audit/coordination only; remediation и implementation не назначены.
3. Текущий этап: **Block H ЗАКРЫТ: 0 current-scope findings; deferred Stage-6 blockers `WORKER-VERSION-URL-01 Moderate/P2`, `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2`; H8 PASS, 0 additional. Следующее security-направление после продолжения — Block I scope preparation.** Block G закрыт с 3 current-scope findings + deferred Stage-6 blocker `DB-RUNTIME-EVIDENCE-01`.
4. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`.
5. Current `main` — `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Delta `ce62e783… → 593a0396…` — SA-04 A1 #327 migration/schema/tests only; H runtime/topology code unchanged.
6. Лира, Марк и Лёва по #315 сейчас не назначены.

## Где читать состояние

1. Общая карта: [SECURITY_IMPLEMENTATION_PLAN.md](../../SECURITY_IMPLEMENTATION_PLAN.md).
2. Актуальные подтверждённые результаты и findings: [service-channel.md](../service-channel.md).
3. Только текущий operational state: [workflow.md](../workflow.md).
4. Детали блоков:
   - [Block A — Super-admin / Owner control plane](../../SECURITY_BLOCK_A_SUPER_ADMIN.md)
   - [Block B — Authentication & sessions](../../SECURITY_BLOCK_B_AUTH_SESSIONS.md)
   - [Block C — Authorization & privilege escalation](../../SECURITY_BLOCK_C_AUTHORIZATION.md)
   - [Block D — Ordinary Admin & moderation](../../SECURITY_BLOCK_D_ADMIN_MODERATION.md)
   - [Block E — Public forum / application](../../SECURITY_BLOCK_E_PUBLIC_APPLICATION.md)
   - [Block F — Files & attachments](../../SECURITY_BLOCK_F_FILES_ATTACHMENTS.md)
   - [Block G — Database & migrations](../../SECURITY_BLOCK_G_DATABASE_MIGRATIONS.md)
   - [Block H — Cloudflare / Workers / runtime](../../SECURITY_BLOCK_H_CLOUDFLARE_WORKERS_RUNTIME.md)

## Актуальные выводы Миры

1. Block A: архитектурная цель и pre-Stage-6 foundation зафиксированы; external activation не выполнялась.
2. Block B: аудит завершён; **8 current-scope findings**. Подробности находятся только в Block B / communication.
3. Block C: аудит завершён; **1 current-scope finding — `AUTHZ-FAIL-01 Low/P3`**.
4. Block D: D1–D12 завершены; подтверждены **3 Low/P3 findings** — `COMPLAINT-PRIV-01`, `HELP-SIGNAL-PRIV-01`, `HISTORY-PRIV-01`; дополнительных D12 findings нет.
5. D12 external claim исправлен и проверен: official React Router Framework/SSR docs и exact `react-router@8.3.1` source подтверждают default skip loader revalidation после failed 4xx/5xx submissions.
6. Vico recovery paths используют explicit loader revalidation и не выполняют automatic mutation replay.
7. Block E завершён с **8 current-scope findings**. E10 добавил **`FORUM-READ-BOUNDS-01 Moderate/P2`**: canonical public section/topic snapshots не имеют paging/row ceiling и усиливают DB/translation/SSR work по мере роста форума; и **`FORM-BODY-BOUNDS-01 Moderate/P2`**: обычные forum/profile/presence POST paths используют whole-form parsing без application byte ceiling. Typed failure handling, request isolation, replay/concurrency и новый SA-02 Worker telemetry seam в E10 дополнительных findings не дали.
8. SA-02 delta: exact Owner guards/private routes, bounded source-attributed attempt telemetry, committed auth-fact proof и telemetry failure isolation — PASS. Future isolated Owner Worker/Access/passkey/Owner DB plane остаётся Block A Stage-6 scope, не current SA-02 defect.
9. Block F F1: **PASS, 0 confirmed current-scope findings**. Private temporary read требует session owner + exact context/operation/ref; public read требует exact post/ref; retained Complaint evidence — отдельные permission + Case/asset membership checks. Object key остаётся server-side, revoked/missing refs не доходят до storage read.
10. Block F F2: **PASS, 0 additional current-scope findings**. POST/DELETE mutation admission использует session actor + same-origin + current editor permission/context; terminal generation проверяется до и после storage. Declared >50 MB/zero/invalid и actual short/long/read-error paths fail-closed, upload остаётся streaming через bounded sniff + FixedLengthStream. Stable-ID/lost-ACK/concurrency и DB/R2 failure paths не создают verified/live ref без authoritative metadata commit.
11. `FORUM-READ-BOUNDS-01` затрагивает topic-context authorization через `readTopicPage`, но это уже подтверждённый Block E root cause и F2 его не дублирует. Live R2/scheduling остаются Stage-6 external boundary.
12. Block F F3: подтверждён **`ATTACH-TEXT-TAIL-01 Low/P3`**. Text detector валидирует только первые 4096 байт, full-stream text validator отсутствует; binary tail после sniff window может получить `detectedType=text` + `type-checked`, пройти publication и не создать security evidence. Text preview остаётся inert (`text/plain`, sandbox, nosniff), поэтому XSS/active-content execution не подтверждён.
13. F3 остальные boundaries PASS: extension/MIME/signature consistency, raster inline isolation, HTML/SVG/script inert preview, bounded structural checks для binary/container families, archive inner-safety не заявляется, `.env` warning есть, evidence не хранит raw bytes/object key.
14. Block F F4: **PASS, 0 additional current-scope findings**. Publication context выводится server-side; selected refs проверяются по owner/context/operation + `type-checked` + active cleanup state. Topic/reply/edit refs, revision, generation retirement и receipt атомарны; exact replay idempotent, conflicting replay отклоняется.
15. F4 races PASS: publish/cancel/late-upload сериализуются owner+context advisory lock; stale-ref cleanup использует тот же lock; physical cleanup claim сериализуется с ref insertion через active-ref trigger `FOR SHARE` vs cleanup `FOR UPDATE` и повторную ref-проверку.
16. `ATTACH-TEXT-TAIL-01` не дублировать как F4 defect: F4 корректно доверяет `type-checked`, ошибочное присвоение этого статуса — root cause F3.
17. Block F F5: **PASS, 0 additional current-scope findings**. 24-hour stale-operation retirement, shared/published/complaint-evidence ref protection, durable delete claims/lease retry и fenced journal/reservation sweep не дали current defect.
18. Live background scheduling и external R2 cleanup acceptance остаются Stage 6; **Информация не проверена** для deployed cleanup execution. Это не current F5 finding по утверждённой границе.
19. Block F F6: **PASS, 0 additional current-scope findings**. Suspicious evidence имеет server-derived stable identity/dedupe, хранится отдельно от asset без raw bytes/object key, Attention читает его только после `forum.attachmentSecurity.read` и private/no-store boundary; web runtime не имеет UPDATE/DELETE на evidence.
20. SA-02 `security.attachments` current projection содержит только агрегаты, exact-Owner History — сокращённый metadata subset. Hard evidence-store outage fail-closed возвращает 503 без attachment/publication; отдельный second sink при полном DB outage не является current requirement.
21. `ATTACH-TEXT-TAIL-01` не дублировать в F6: accepted misclassification из F3 не активирует suspicious-event path.
22. Block F F7: **PASS, 0 additional current-scope findings**. Physical R2 key остаётся server-only; Workers adapter ограничен reserve/list/put/get/delete, upload/download/publication dependency failures fail-closed, attachment Hyperdrive классифицирует только availability/timeouts, runtime DB capabilities не дают generic asset UPDATE/DELETE.
23. Актуальные Cloudflare R2/Workers docs 2026-11-11 подтверждают используемые assumptions: known-length R2 stream, FixedLengthStream exact-byte contract, conditional writes/strong consistency и 1 write/sec same-key limit.
24. External/live `ATTACHMENT_R2`, real bucket policy, production route fail mode и deployed isolation — **Информация не проверена**; это Stage 6, не current F7 finding.
25. `ATTACH-TEXT-TAIL-01` не дублировать в F7: root cause остаётся F3 content classification.
26. Block F F8: **PASS, 0 additional current-scope findings**. Cross-chain upload → publication → read → edit/remove → cleanup → evidence перепроверена; measures/lost ACK/complaint evidence/runtime failures не добавили отдельного root cause.
27. Final Block F result: **1 finding — `ATTACH-TEXT-TAIL-01 Low/P3`**. Его end-to-end chain подтверждена повторно; downstream sandbox/download/ref/cleanup boundaries не устраняют F3 classification gap и не повышают severity.
28. Block F remediation не назначена.
29. Block G scope подготовлен против current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`: G1–G8, current/Stage-6 boundary, anti-duplication и code seams зафиксированы. Repository `0000–0063` vs external evidence `0000–0020` само по себе не finding.
30. Block G G1: **PASS, 0 current-scope findings**. Journal имеет 64 contiguous entries; 64 root SQL files exact-match journal tags; 64 snapshots `0000–0063` существуют без gaps/extra и образуют непрерывную unique `id → prevId` chain. Accepted SQL/snapshot rewrite и journal delete/rewrite/reorder/duplicate/new-SQL mismatch закрываются repository guard; CI дополнительно содержит db:check/schema-parity/clean PostgreSQL 17 replay. Tests в этом audit-срезе прочитаны, но не запускались.
31. Mutable production DB state: **Информация не проверена**; paused Stage 6, не G1 finding.
32. Block G G2: подтверждён **`DB-SEARCHPATH-01 Low/P3`**. Final Complaint predecessor INSERT guard в `0050` — SECURITY INVOKER без fixed search path и читает `forum_complaint_cases`/`forum_complaint_targets` unqualified. Current web capability принимает database TEMP; PostgreSQL `pg_temp` relation lookup может shadow-нуть эти reads, тогда как public self-FK проверит только существование predecessor ID. Результат — возможный persistent unrelated predecessor Case через direct web-capability SQL.
33. G2 остальные проверенные schema boundaries не дали отдельного finding: revision/complaint evidence immutability, attachment SECURITY DEFINER fixed-search-path gate, Owner/Admin retention, measure RESTRICT and current cascade semantics. Translation task trigger search-path hardening относится к future background Stage-6 capability, не current defect.
34. G2 tests/probes прочитаны, но не запускались. Live production exploitability `DB-SEARCHPATH-01`: **Информация не проверена**; Worker web binding rollout paused Stage 6.
35. Block G G3: подтверждён **`DB-ACL-USER-DELETE-01 Low/P3`**. Current `web` relation contract даёт `public.user` full CRUD, включая DELETE, хотя current Vico не реализует account deletion, Better Auth `1.7.7` `/delete-user` выключен без `user.deleteUser.enabled=true`, а ordinary/OAuth creation rollback transactional и не требует hard user DELETE.
36. Остальной G3 least-privilege sweep дополнительных findings не дал: role attributes/membership/ownership, database CREATE, schema ACL, exact relation grants, column/sequence/function/default grants и negative probes fail closed по repository contract. `PUBLIC TEMPORARY` — уже часть `DB-SEARCHPATH-01`, не duplicate. Legacy editor-draft grants после external accepted `0020` — future Stage-6 cleanup, не current finding сами по себе.
37. G3 tests/probes прочитаны, но не запускались. Exact mutable live production ACL: **Информация не проверена**.
38. Block G G4 technical defect **`DB-RUNTIME-EVIDENCE-01 Low/P3`** подтверждён: current runtime evidence фиксирует только `0020_translation_generation_permission`, а current Worker core create-topic/reply уже обращается к measure tables из `0058_user_measures`; после SA-03 current schema manifest targets `0064_sa03_profile_history_indexes`. Worker rollout verifier проверяет evidence только до repository-authored required tag и не выводит minimum required schema из exact runtime revision.
39. G8 исправил Stage-классификацию G4: единственный consumer verifier — manual `production-worker-rollout.yml` Stage-6 path; Stage 6 paused, local/CI product development этот gate не использует. Поэтому `DB-RUNTIME-EVIDENCE-01` — **deferred Stage-6 blocker, not current-scope**, с сохранённой Low/P3 severity.
40. Остальные G4 gates дополнительных findings не дали: migration pre/post ledger+manifest fail closed, dedicated migrator identity отделена, relation grants derived from shared contract and verified before commit. Provisioning наследует G3 `user.DELETE` — duplicate не создаётся. Old workflow rerun сохраняет original SHA/ref и не доказал downgrade path.
41. G4 workflow/tests/probes прочитаны, но не запускались; external dispatch/prod mutation не выполнялись. Exact live GitHub Environment protection и current production schema/ACL: **Информация не проверена**.
42. Block G G5: **PASS, 0 additional current-scope findings**. Exact `pg@8.23.0` source подтверждает client `query_timeout` ambiguity для уже отправленного query/COMMIT; exact `drizzle-orm 0.45.2` NodePg transaction wrapper на COMMIT error пытается ROLLBACK. Этот outcome-class реален, но current writers не делают blind auto-retry.
43. Security-sensitive replay boundaries: authorization — singleton mutex + atomic History + desired-state/no-op/identity constraints; registration — singleton lock + expectedVersion CAS; privacy — same-user lock + idempotent boolean save; AP-10 — stable IDs/operation IDs/fingerprints; Complaints — actor/case locks + operationId/fingerprint event replay; Forum/attachments — ранее подтверждённые CAS/publication receipts; locale — explicit ambiguous-COMMIT reconciliation и retry только 40001/40P01.
44. Lock-order sweep не подтвердил current cycle до authority/evidence corruption: authz/AP-10 берут authz mutex first; Complaints actor mutex precedes Case lock; forum history order lock appended after domain locks, inverse history→domain chain не найден.
45. `AuthorizationRepository.mutate()` rollback failure может заменить original error — robustness inconsistency, но fail-open/security impact не доказан, finding не создаётся. Future real WEB_HYPERDRIVE advisory-lock acceptance остаётся Stage 6, не current G5 defect.
46. G5 source/tests прочитаны, не запускались; external DB/Hyperdrive mutation не выполнялась.
47. Block G G6: подтверждён **`DB-TEST-TARGET-01 Low/P3`**. Destructive DB tests проверяют WHATWG URL как `localhost/127.0.0.1 + *_test`, но затем передают исходный connection string в pinned `pg@8.23.0`; exact `pg-connection-string@2.14.0` принимает query `host` раньше URL hostname и тем самым позволяет фактическому target быть внешним.
48. Наиболее тяжёлый подтверждённый impact: `tests/database/migrations.test.ts` после такого bypass выполняет `DROP SCHEMA drizzle CASCADE` и `DROP SCHEMA public CASCADE`. Нужен внешний DB target с именем `*_test` и контроль process `DATABASE_URL`; public/production auto-path не установлен, поэтому Low/P3.
49. PR CI и Worker pre-rollout verification задают фиксированный loopback `vico_forum_test`; production migration workflow destructive test helpers не вызывает. `db:migrate` отдельным finding не считается: external target появляется только из явно переданного URL, а production path обёрнут dedicated pre/post gates.
50. G6 tests не запускались и external DB mutation не выполнялась. Live external applicability: **Информация не проверена**.
51. Block G G7: **PASS, 0 additional findings**. Structural manifest deep-compares 69 tables + 9 trigger functions + 18 triggers for current repository schema; current accepted external `0000–0020` range has no additional view/type/RLS/policy/rule/explicit-sequence object outside that captured model.
52. Runtime privilege verifier compares complete end state for localization/web roles and PUBLIC, including unexpected grants, memberships, ownership, columns/functions/default ACLs and sequences.
53. Live GitHub evidence run `36270353184` rechecked: manual production-db migration on main, exact SHA `b172264…`, attempt 1, success. Its journal ends at `0020`, prefix equals current `0000–0020`, and the SHA is ancestor of current main by 163 commits.
54. G7 повторно подтверждает technical evidence-gap `DB-RUNTIME-EVIDENCE-01`; duplicate не создаётся. Final Stage classification выполнена в G8.
55. Current source-of-truth не заявляет, что production соответствует repository `0064`; mutable production schema/ACL: **Информация не проверена**. Post-`0020` schema acceptance вернуть в scope перед external rollout; сейчас это future Stage-6 boundary, не finding.
56. G7 repository tests не запускались; production/Cloudflare/Neon mutation не выполнялась.
57. Block G G8: **closeout завершён, 0 additional findings, 1 reclassification**. Final current-scope Block G = `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`, `DB-TEST-TARGET-01 Low/P3`.
58. G8 повторно прошёл migration → final schema → runtime grants → representative direct SQL → application adapter chains. Три retained findings имеют distinct DB root causes и не дублируют Blocks B–F.
59. `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как **Stage-6 blocker**: technical gap доказан, но текущего pre-release execution path вне paused Stage 6 нет.
60. Ordinary CI всё ещё вызывает `pnpm db:test`, поэтому `DB-TEST-TARGET-01` остаётся current tooling defect; стандартный fixed loopback CI URL сам bypass не активирует.
61. PostgreSQL 17 official docs повторно подтверждают `pg_temp` priority для unqualified relation lookup; `DB-SEARCHPATH-01` causal chain остаётся действующей.
62. G8 tests не запускались; production/Cloudflare/Neon mutation и workflow dispatch не выполнялись. Mutable live external state: **Информация не проверена**.
63. G8 descendant delta `538084fd… → 5992885…` перепроверен: SA-03 добавил только migration `0064` с шестью indexes; journal `idx=64`, snapshot `0063→0064`, manifest target и clean-replay count=65 согласованы. Runtime ACL contract не изменён; new Owner readers используют уже granted relations.
64. На descendant `5992885…` Better Auth всё ещё не включает `deleteUser`; Complaint `0050` guard остаётся unqualified; destructive `db:test` guard/schema-drop path не изменены. Новых Block G root causes нет.
65. Block G закрыт. Подтверждённые current findings не исправлять автоматически: сначала отдельная bounded remediation-задача по решению владельца и текущему Stage.
66. Block H scope подготовлен против current main `5992885e78b1642e41c9805116fcc256002b649c`: H1–H8, current-vs-Stage-6 boundary, anti-duplication, code seams и finding criteria зафиксированы в отдельном `SECURITY_BLOCK_H_CLOUDFLARE_WORKERS_RUNTIME.md`.
67. H current scope: Worker composition, `HYPERDRIVE`/`WEB_HYPERDRIVE` isolation, ingress trust, runtime binding failures, preview/version repository boundary, rollout/version/rollback gates и Worker-wide failure/observability behavior.
68. Future-only boundaries не считать current findings сами по себе: deployed `WEB_HYPERDRIVE`, mutable Cloudflare topology, separate Owner Worker/Access/Owner plane, real routes/domains/preview isolation acceptance, real providers/Queues.
69. Block H H1: **PASS, 0 current-scope findings** на `5992885e78b1642e41c9805116fcc256002b649c`.
70. `HYPERDRIVE` и `WEB_HYPERDRIVE` resolve'ятся отдельно и fail closed при missing/blank; fallback отсутствует.
71. Worker mapping проверен полностью: registry/UI translations → localization connection; auth/forum/admin/settings/measures/Complaints/Owner/profile/telemetry/auth facts/content presentation+admission → web connection.
72. Web adapters используют passed connection string через `createWebClient/createWebPool`; runtime не читает `DATABASE_URL`, `NEON_OWNER_DATABASE_URL` или migration credential. Migrator/admin DB capability в Worker composition не входит.
73. Content generation action runtime explicitly disabled; generation status reader не bind'ится; action/loader не доходят до generation capability/status path при disabled runtime.
74. Existing binding/runtime tests и CI smoke были прочитаны, но в H1 не запускались. Local CI uses one disposable superuser URL for both binding names, поэтому integration smoke сам по себе не доказывает prod privilege isolation; static/source wiring подтверждает current composition. Finding не создаётся.
75. Mutable deployed Worker/Hyperdrive bindings/roles: **Информация не проверена**; Stage 6 paused. Live mutation/check не выполнялся.
76. Перед H2 current main продвинулся `5992885… → ce62e783…` только documentation-only SA-03 closeout #326; H ingress/runtime source не менялся.
77. H2: **PASS, 0 current-scope findings** на `ce62e783e71433a00c2fe4874ee26dfc54614628`.
78. Current official Cloudflare docs подтверждают: incoming `request.cf` — platform global-network metadata; direct visitor `CF-Connecting-IP` — client IP, direct `x-real-ip` stripped; same-zone Worker subrequest derives `CF-Connecting-IP` from mutable `x-real-ip` but gets `CF-Worker`; cross-zone gets fixed `2a06:98c0:3600::103` + Worker marker.
79. Vico qualifies source only with valid `request.cf.colo`; any `x-real-ip` or `CF-Worker`, cross-zone fixed IP, invalid IP, missing metadata and Class-E Pseudo IPv4 degrade to `unknown`. Browser XFF/True-Client-IP are not used for source identity.
80. Pseudo IPv4 Overwrite current Cloudflare contract maps IPv6 to Class-E `CF-Connecting-IP` and preserves IPv6 in `CF-Connecting-IPv6`; Vico intentionally rejects Class-E instead of guessing from alternate header. Safe degradation, no false attribution.
81. Collector actor attribution is independent and comes only from resolved session; network source is telemetry-only and never grants application/Owner authority.
82. `captureAttemptIngressSource` production caller is only `workers/app.ts`; repository search found network source use in retained attempt telemetry/history, not authorization.
83. Better Auth `cf-connecting-ip` rate-limit semantics remain Block B; H2 only checked ingress trust assumptions and found no separate runtime root cause.
84. Direct client-supplied `CF-Worker` is not positive trust evidence. If visible, current behavior can only force telemetry to `unknown`; current contract permits unknown source, so no current finding.
85. H2 tests read, not run. Mutable production Pseudo IPv4/Transform Rules/routes/subrequest topology: **Информация не проверена**; Stage 6 paused.
86. H3: **PASS, 0 current-scope findings** на `ce62e783e71433a00c2fe4874ee26dfc54614628`.
87. Required `HYPERDRIVE`/`WEB_HYPERDRIVE` remain fail closed before Router; missing/blank values throw config error and never fallback across capabilities.
88. Optional `ATTACHMENT_R2` maps to null context; upload/download/Complaint evidence physical-byte paths return bounded 503 with no fallback. Upload missing-bucket test confirms no draft asset creation.
89. Missing/invalid `VICO_OWNER_USER_ID` normalizes to undefined; Owner authority disappears and authorization writes do not fallback to ordinary manager.
90. Production Worker rollout explicitly validates auth secret/baseURL/Google inputs before upload and passes secret values via temporary secrets file; repository does not rely on Better Auth missing-config defaults for production rollout.
91. Current official Cloudflare Vite/Hyperdrive docs rechecked: local vars come from ignored .dev.vars/.env, preview can use build-copied local vars without deployment, local Hyperdrive needs explicit local connection override. Vico connected auth/Owner CI supplies synthetic values and both DB overrides.
92. No `secrets.required` declaration exists, but current rollout has own pre-upload validation and local auth acceptance explicit vars; no current exploit path established.
93. Current rollout still does not perform real Owner binding or R2 deployment acceptance; source-of-truth places those in paused Stage 6. Missing Owner fails closed, missing R2 is unavailable. No H3 finding/duplicate.
94. H3 tests read, not run. Mutable deployed Worker env/secrets/bindings, live R2 and real Owner binding: **Информация не проверена**.
95. H4: **0 current-scope findings + `WORKER-VERSION-URL-01 Moderate/P2` deferred Stage-6 blocker** на `ce62e783e71433a00c2fe4874ee26dfc54614628`.
96. Current rollout uses `wrangler versions upload` with top-level production `HYPERDRIVE` + `WEB_HYPERDRIVE` and production auth vars/secrets; returned Version URL is then used for pre-traffic smoke.
97. Current official Cloudflare docs: Worker version captures bindings/configuration; Version URL uses the version's existing/production resources; when enabled Version URLs are publicly available unless separately protected by Access.
98. Current Vico contract requires preview/non-production path isolation before any auth/forum write/private production capability. Public-capable Version URL with `WEB_HYPERDRIVE` therefore violates that Stage-6 boundary.
99. Smoke script is GET-only but does not constrain external visitors. It has no Access token/session; workflow therefore does not verify a protected Version URL boundary.
100. `promote=false` leaves the uploaded version and Version URL without cleanup; exposure can outlive the workflow run.
101. Entire Worker route table is addressable on Version URL, not only smoke endpoints. Separate authz bypass/Owner compromise was not proven; severity remains Moderate/P2.
102. This is not current-scope because activation requires paused manual Stage-6 rollout. Correction gate: before next Worker upload with private/write production capability.
103. New isolated Worker Previews are distinct from Version URLs and require Wrangler >=4.135.0; repo pinned 4.130.0. This is solution space, not a separate finding.
104. Mutable live Version URL/Access/Previews Base state: **Информация не проверена**; no external upload/deploy/smoke performed.
105. H5: **0 current-scope findings + `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2` deferred Stage-6 blocker** на `ce62e783e71433a00c2fe4874ee26dfc54614628`.
106. Exact dispatch/SHA gate PASS: workflow_dispatch `GITHUB_SHA` + exact main ref + expected SHA + attempt 1; verify/rollout re-check exact checkout. Upload ID comes from one structured pinned-Wrangler record and exact ID is promoted.
107. Baseline/status gate PASS: exact one baseline UUID, current 100% baseline required before upload; post-promotion and rollback status both require one expected version at 100%.
108. Exact tagged Wrangler 4.130.0 source read: `versions deploy` creates Cloudflare deployment for explicit Version ID; `deployments status --json` returns latest deployment object. Current parser matches its version_id/percentage shape.
109. Deferred blocker root cause: promotion + smoke + status + rollback are one 20-minute job/step lifetime. After Cloudflare accepted 100% deployment, GitHub timeout/cancel/runner loss can kill execution before rollback/reconciliation.
110. Production smoke curl calls lack overall max-time, so a stalled post-promotion request can consume the job timeout. GitHub docs confirm job timeout auto-cancels and cancellation signals/kills running process tree.
111. Result: unaccepted new version can remain on 100% production traffic while workflow ends timed-out/cancelled/unknown. Correction gate before next production traffic promotion.
112. Ordinary command/smoke/status failures that return control are handled and rollback to exact baseline; blocker is specifically loss of execution control after external promotion.
113. Current migration rollback contract requires backward application compatibility with applied forward schema; no later ALTER of baseline localization relations after 0020 found. No duplicate DB blocker.
114. Wrangler 4.130.0 `versions deploy` also patches non-versioned configured settings (current observability) from current config; H6 must assess this, not H5.
115. GitHub API: current main `protected=false`, repository `Protect main` ruleset enforcement disabled. This is Block I supply-chain scope, not H5; exact collaborators/Actions actor policy/production-worker Environment protection: **Информация не проверена**.
116. H6: **PASS, 0 current-scope findings, 0 new deferred blockers** на `ce62e783e71433a00c2fe4874ee26dfc54614628`.
117. Auth-session/storage classified outages → generic 503/no-store before Router; registration-policy storage outages and account-security unavailable paths similarly fail closed. Unexpected schema/config/programming failures are not downgraded to false success/denial.
118. Super-admin controlled responses stay private,no-store. Route/SSR application diagnostics strip exception messages/causes/query/body and emit only allowlisted error kind/database code/source frames.
119. 5xx telemetry stores only status + bounded latency; auth facts/attempt telemetry are bounded request-local writers. Sink/create/append/close failures never replace original HTTP/auth/authz outcome.
120. Cloudflare current docs rechecked: waitUntil is intended for non-response-critical logging/analytics and has up-to-30s post-response lifetime. Current monitoring contract is best-effort/limited coverage, not lossless audit; no waitUntil durability finding.
121. Early auth-session 503 does not traverse recordRequestFailure, but system.requests is explicitly recorded-5xx/limited-coverage and the same web DB sink may be unavailable; no H6 finding. Full durable incident coverage remains later monitoring scope.
122. Workers Logs config: enabled, 100% head sampling, redact_query_string=true. Cloudflare current docs confirm default invocation logs contain request/response metadata and query redaction strips query strings. Production custom console logging is sanitized only.
123. Platform Workers Logs can retain uncaught exceptions, but no concrete current secret-bearing uncaught path was established; classified DB/auth outages are sanitized and React Router route/SSR errors use safe hooks. No speculative leak finding.
124. Exact tagged Wrangler 4.130.0 confirms versions deploy patches observability as non-versioned setting after deployment. Current exact observability config is not shown to weaken security; rollback/reconciliation ambiguity remains covered by existing WORKER-ROLLBACK-FINALIZER-01, no duplicate.
125. Existing AUTH-CACHE-01 / READSTATE-CACHE-01 remain Blocks B/E; H6 found no additional Worker-wide cache root cause.
126. Live Workers Logs access/retention/destinations/dashboard overrides: **Информация не проверена**; no external state read/mutation. Tests read, not run.
127. H7: **PASS, 0 current-scope findings, 0 new deferred technical blockers** на `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
128. Ordinary CI has no Cloudflare deploy path; repository search found no wrangler deploy/preview, cf previews deploy, Deploy Hook, Builds-connect or direct Cloudflare API mutation outside manual production-worker-rollout.
129. Current wrangler config has no env/previews/routes/r2/queues/vars/workers_dev/preview_urls. Official Cloudflare semantics: workers_dev defaults true with no routes; omitted preview_urls preserves existing setting. Repo therefore cannot prove mutable live endpoint state.
130. Historical source-of-truth says native Builds disabled, production/preview workers.dev enabled, no custom routes/domains, Previews Base zero bindings/vars/secrets. Exact live state now: **Информация не проверена** and must be re-read before Stage 6.
131. Official Builds docs: connected production branch can auto build/deploy; Preview builds are separate mutable configuration. New Worker Previews use separate preview settings/resources; existing Workers may remain on previous preview model until explicit switch.
132. H4 owns public production-resource Version URL defect; H7 does not duplicate it. Missing live topology recheck today is not current defect because Stage 6 paused and source-of-truth already requires the recheck before activation.
133. Stage-6 topology acceptance must establish Builds/auto-deploy, active deployment, bindings/vars/secrets, Preview model/resources/URLs, custom routes/domains, workers.dev settings and alternate deployment entrypoints before external rollout.
134. WEB_HYPERDRIVE repository config remains preparation, not proof of deployed binding. Real R2/OAuth/Owner binding/Queues/providers and separate Owner Worker/Access remain explicit Stage-6 boundaries, not current H findings.
135. app/routes.ts still cohosts Admin/Super-admin/public app in one Worker; AdministrativeRouting changes outgoing addresses only. Separate Owner runtime isolation remains Block A/Stage-6 and is not duplicated.
136. Non-H source-of-truth drift observed: current main includes migration 0065 SA-04 account-state foundation, while PROJECT_STATE/ROADMAP/SUPER_ADMIN still describe 0064/SA-04+ not implemented. H7 does not resolve that documentation state; shared Stage-6-paused topology boundary is consistent.
137. Existing correction gates unchanged: DB-RUNTIME-EVIDENCE-01 before schema-dependent rollout, WORKER-VERSION-URL-01 before write/private-capable upload, WORKER-ROLLBACK-FINALIZER-01 before production traffic promotion.
138. H8 cross-chain: **PASS, 0 additional findings; Block H complete** на current main `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
139. Re-run chain ingress → binding resolution/composition → auth/request context → response/telemetry → repository rollout did not reveal a new root cause. H1–H7 conclusions remain internally consistent.
140. Dedup A: separate Owner Worker/Access/auth/session/DB isolation is future Block-A/Stage-6 scope; H4 blocker concerns public Worker Version URL carrying production web/auth resources, so no duplicate.
141. Dedup B/E: AUTH-CACHE-01 and READSTATE-CACHE-01 are route/private projection cache roots; H6 found no Worker-wide cache root cause. Other auth/public findings likewise remain application-level.
142. Dedup C: AUTHZ-FAIL-01 is DB/app authorization transaction rollback misclassification; WORKER-ROLLBACK-FINALIZER-01 is loss of external Cloudflare deployment reconciliation after promotion. Distinct state machines.
143. Dedup D/F: Complaint/Help/History privacy and attachment text-tail validation do not share H root cause.
144. Dedup G: DB-RUNTIME-EVIDENCE-01 is pre-upload schema-proof insufficiency; WORKER-VERSION-URL-01 is pre-traffic public ingress with production resources; WORKER-ROLLBACK-FINALIZER-01 is post-promotion runner-loss reconciliation. Distinct correction gates.
145. #315 aggregate unchanged: 24 current-scope findings + 3 deferred Stage-6 blockers total (G1 + H2). Block H contributes 0 current findings and exactly 2 deferred blockers.
146. Stage-6 gate order recorded: DB runtime evidence before schema-dependent upload; Version URL isolation before write/private-capable upload; independent rollback/reconciliation before traffic promotion; live topology recheck immediately before external action.
147. main unprotected / disabled Protect-main ruleset remains only a confirmed factual lead for future Block I Secrets & supply chain; H did not classify it as finding without full actor/provenance chain.
148. Exact mutable Cloudflare topology, Environment protection/actors and production DB state in H8: **Информация не проверена**. Tests/workflows not run; no external mutation/read.
149. Non-H docs drift remains: main contains migration 0065 SA-04 account-state foundation while PROJECT_STATE/ROADMAP/SUPER_ADMIN still say 0064/SA-04+ not implemented. Do not fix inside #315 H audit.

## Ограничения

1. Stage 6 external activation остаётся paused.
2. Cloudflare/Neon/production changes по #315 не разрешены.
3. Пока над #315 работаю одна, комментарии PR для внутреннего обсуждения не нужны.
4. Не дублировать подробные audit-логи в этом файле: устойчивые результаты хранятся в соответствующем Block-файле и communication.
5. Каждый следующий security-блок оформлять отдельным файлом, чтобы общий план и личные файлы не разрастались.

## Следующий шаг

1. После продолжения владельца подготовить **Block I — Secrets & supply chain** как отдельный scope/file, зарегистрировать его в #315 и остановиться до I1.
2. При scope preparation перенести confirmed factual lead про main/ruleset как candidate для проверки, но не объявлять finding заранее.
