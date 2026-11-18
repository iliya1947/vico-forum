# Мира — безопасность Vico Forum

## Текущая задача

1. Служебный PR: **#315**.
2. Моя текущая работа: audit/coordination only; remediation и implementation не назначены.
3. Текущий этап: **Block J active. J1 PASS; J2 = deferred `GOOGLE-OAUTH-SCOPE-01 Low/P3`; J3 Email provider boundary PASS, 0 new findings / 0 deferred blockers; следующий bounded slice — J4 Translation provider data egress.** Overall #315 = 28 current findings + 4 deferred Stage-6 blockers. Stage 6 paused; provider activation не выполнялась.
4. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`.
5. Current `main` — `7cc23edede57994cdedab49c1556ddb55034dd29`. Delta от I1 target включает SA-04/SA-05–SA-08 и topic-title work; I2 отдельно re-read current workflows and source-of-truth.
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
   - [Block I — Secrets & supply chain](../../SECURITY_BLOCK_I_SECRETS_SUPPLY_CHAIN.md)
   - [Block J — External integrations](../../SECURITY_BLOCK_J_EXTERNAL_INTEGRATIONS.md)

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
150. Block I scope prepared against `593a03964b8407b249f7c9f5eb117ddb8b07736d` in separate `SECURITY_BLOCK_I_SECRETS_SUPPLY_CHAIN.md`; I1–I8 not executed.
151. Prep facts only, not findings: repository public; main protected=false; Protect main ruleset enforcement disabled; current main commit verified=true.
152. Workflow scan: no pull_request_target/workflow_run/repository_dispatch; all current GitHub Action uses refs full-SHA pinned; PostgreSQL services use mutable `postgres:17`.
153. package.json direct versions and pnpm are exact; CI uses frozen lockfile. Current tree has pnpm-lock but no .npmrc, Dependabot/Renovate config or CODEOWNERS.
154. .gitignore excludes .env* and .dev.vars* except empty .env.example. Secret values were not read.
155. Codex service bridge has issue_comment + contents:write and exact bot/PR filter; Pages workflow has pages:write/id-token:write. Both are I2 audit surfaces, not findings at prep.
156. Production workflows use named Environments; exact reviewers/ref policy/admin bypass/actor access and secret inventory: **Информация не проверена**.
157. I plan: I1 repository authority; I2 workflow token/event authority; I3 Environments; I4 secret custody; I5 dependency provenance; I6 Actions/tools/containers; I7 release supply-chain; I8 closeout.
158. main/ruleset lead must not become finding until I1 proves a less-trusted write path and security impact.
159. I1: **`REPO-MAIN-GATE-01 Moderate/P2` current-scope** confirmed on `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
160. main branch metadata: protected=false. Ruleset Protect main targets default branch but enforcement=disabled; configured rules include PR requirement, block deletion/non-fast-forward and strict required checks checks+database.
161. Repository merge mode only allows squash PR merges, but no active branch gate prevents direct default-branch update.
162. CI is pull_request-only; direct main update does not run those PR CI jobs as an enforced precondition.
163. Connected GitHub repository integration has actual repository write ability (service-branch writes succeeded); installation repo metadata reports push=true/admin=true. Official Contents API requires Contents(write) and defaults omitted branch to default branch, so same delegated writer can technically target main when unprotected.
164. Last 100 main commits: all verified=true, 96 PR-like subjects, 4 direct owner GitHub web edits of AGENTS.md. This proves direct-main path exists; verified signature alone does not prove PR/CI provenance.
165. Current main push also triggers ui-preview-pages workflow, so unreviewed main content has current external Pages-deploy path. No automatic Worker/DB production rollout from push; Stage 6 paused; severity Moderate/P2.
166. Exact human collaborator roster could not be enumerated with available connector surface. Owner permission admin; chatgpt-codex-connector[bot] user permission none. **Информация не проверена** for other human collaborators; finding does not depend on them because delegated write path is independently confirmed.
167. No separate findings for CODEOWNERS, review count, signed-commit policy or verified-commit absence; one root cause only.
168. I1 remediation not started. I2 must test workflow-event/token write paths and reference REPO-MAIN-GATE-01 instead of duplicating generic main protection.
169. I2: **PASS, 0 new current-scope findings** on current main `7cc23edede57994cdedab49c1556ddb55034dd29`.
170. Current workflows have no pull_request_target, workflow_run or repository_dispatch. PR/browser workflows explicitly set contents:read and use only disposable/local synthetic resources; no production secrets.
171. GitHub current permissions semantics rechecked: explicit permissions make unspecified GITHUB_TOKEN scopes none. PR code therefore has no repo write/Pages/OIDC/Actions-write authority through current workflow token declarations.
172. github.event.pull_request.head.sha in browser jobs is passed via env, not direct shell source interpolation; no script-injection root cause.
173. Codex bridge issue_comment event runs from default-branch workflow context. Job filters exact PR #147/open PR/exact bot login; comment body/metadata are intermediate env vars and quoted printf data; fixed service branch/file only, no branch code/package execution. No comment→shell/arbitrary-ref path.
174. Bridge contents:write is not a second REPO-MAIN-GATE-01: current script only pushes service branch. Generic delegated writer→unprotected main remains I1 root cause.
175. Pages workflow has contents:read/pages:write/id-token:write and runs branch-controlled build for main/chatgpt-ui branches/manual dispatch. OIDC current docs: id-token write only permits JWT request, not external resource write by itself. No production secret or external OIDC trust was established; no separate finding.
176. Pages workflow-level permission is broader than strict per-job least privilege, but current proven impact is only its intended public Pages deployment. I7 may revisit only if a trusted release/external identity chain consumes it.
177. workflow_dispatch requires write access and can select refs; production workflows additionally require main and use contents:read or actions:read+contents:read. Inputs are environment variables before shell validation.
178. All current production secrets references are in jobs with named production-db/production-worker Environments. Exact Environment reviewers/ref rules/admin bypass are **Информация не проверена** and are I3 scope.
179. Actions-global default/fork policy was not needed for I2 verdict because sensitive workflows explicitly declare permissions. No dispatch/deploy/event/settings mutation performed; tests read, not run.
180. REPO-MAIN-GATE-01 persists on 7cc23ede: main protected=false and Protect main enforcement disabled. Aggregate stays 25 current findings + 3 deferred blockers.
181. I3: **PASS по repository-side Environment admission chain, 0 new current findings, 0 new deferred technical blockers** on `7cc23edede57994cdedab49c1556ddb55034dd29`.
182. All production secret jobs are `workflow_dispatch`, main-gated and bound to `production-db` or `production-worker`; pre-Environment one-shot/Worker guards do not receive production secrets.
183. Current GitHub docs confirm manual dispatch requires repository write access; selected refs are possible, but Vico jobs independently reject non-main before protected work.
184. Current GitHub docs confirm Environment protection rules pass before runner admission and Environment secrets are available only after that gate.
185. Exact `production-db` / `production-worker` reviewers, prevent-self-review, deployment ref policy, admin bypass, custom protection rules and secret inventory/location are **Информация не проверена**: connector endpoint unavailable and Browser connector had no originating browser context.
186. No secret values read; no dispatch, approval, GitHub setting, Cloudflare, Neon or production mutation performed.
187. Unknown mutable Environment policy is not a finding by itself while Stage 6 is paused; it is a mandatory recheck immediately before any future production dispatch.
188. I3 does not duplicate `REPO-MAIN-GATE-01`; aggregate remains 25 current findings + 3 deferred blockers.
189. I4: **PASS, 0 new current findings, 0 new deferred blockers** on `7cc23edede57994cdedab49c1556ddb55034dd29`.
190. Current-tree secret scan found empty placeholders plus synthetic/local/example fixtures only; no committed real credential established. `.env*` / `.dev.vars*` are ignored except `.env.example`.
191. Historical production bootstrap/diagnostic/recovery/recovery-v2/Worker/migration job logs were read: no PostgreSQL URI or SCRAM verifier; GitHub secrets masked; Vico output bounded. Checked production runs expose no uploaded artifacts.
192. Worker secrets file uses `$RUNNER_TEMP`, `umask 077`, mode 0600 and EXIT cleanup. GitHub current docs confirm temp cleanup and fresh hosted VM/decommission lifecycle; no concrete temp persistence path.
193. Exact successful Pages artifact for current main `7cc23ede…` was downloaded/unpacked and scanned: no credential value, DB URL, SCRAM verifier, Owner binding or production secret. Only dependency code string-name `BETTER_AUTH_SECRET` appears, without value.
194. Vite current docs confirm default client env exposure only for `VITE_` prefix; UI-preview config does not widen envPrefix and audited artifact contains no `VITE_*` secret material.
195. Live Neon read-only recheck: `vico_forum_web` is LOGIN, non-superuser/non-CREATEDB/non-CREATEROLE/non-replication/non-BYPASSRLS, and `rolvaliduntil=NULL` = no password expiration under PostgreSQL 17 semantics.
196. Current Neon project member query returned one effective Admin member only. Recorded plaintext SQL Editor history therefore has no proven less-trusted Neon reader; abstract Owner-account compromise is outside finding criteria. No rotation finding created.
197. Exact current GitHub Environment secret inventory/location, consumed-temp-secret existence and complete Secret Scanning open-alert/history state remain **Информация не проверена**; unknown state is not leak evidence.
198. I4 no dispatch/settings/rotation/production write. Neon reads only. Aggregate remains 25 current findings + 3 deferred blockers.
199. I5: **`CI-PYPI-PROVENANCE-01 Low/P3`, 0 new deferred blockers** on current main `7cc23edede57994cdedab49c1556ddb55034dd29`.
200. Node/pnpm dependency chain PASS: package.json direct versions/packageManager exact; workflows use `pnpm install --frozen-lockfile`; pnpm lock has 9 package-manager + 544 app registry entries, all with sha512 integrity; no VCS/tarball/file/link/workspace dependencies.
201. No `.npmrc`, pnpmfile hook or repository registry override found. `pnpm-workspace.yaml` allows dependency builds only for `esbuild` and `workerd`. pnpm 12 current defaults retain 1-day minimumReleaseAge/blockExoticSubdeps supply-chain controls.
202. Exact Pages run 44286477786 log: `Verifying lockfile against supply-chain policies (544 entries)` -> PASS; lockfile up-to-date; resolution skipped. No Node dependency finding.
203. 14 PR browser workflow files run fresh venv `pip install playwright==1.62.0` without repository Python lock/hashes or `--require-hashes`; they have contents:read only, no production Environment/secrets and synthetic/local resources.
204. Current successful SA08 run 44295360463 actually resolved/downloaded `pyee 13.0.1`, `greenlet 3.5.6`, `typing-extensions 4.16.0` online. PyPI Playwright 1.62.0 metadata permits `pyee<14,>=13` and `greenlet<4.0.0,>=3.1.1`; full installed set is therefore not repository-fixed.
205. Official pip secure-install contract says default pip does not protect against remote tampering and hash-checking requires hashes for all dependencies plus pinned requirements. Current Python browser install lacks that boundary.
206. Exact Playwright 1.62.0 release is old/fixed and has PyPI wheel hashes; finding does not claim same-version wheel replacement. Current risk is fresh compatible transitive resolution without repository hash verification.
207. Impact is acceptance-evidence integrity: changed/malicious compatible dependency code executes before browser acceptance and can distort/falsify its result. No repo-write, production mutation or secret exfiltration proven, so Low/P3.
208. Distinct from I1 direct-main authority and I2 token/secret privilege chain. Lack of Dependabot/SBOM/trustPolicy is not separately classified.
209. I5 no package/workflow/settings mutation and no install was initiated by audit; only current repository and existing workflow logs were read. Aggregate now 26 current findings + 3 deferred blockers.
210. I6: **`CI-POSTGRES-IMAGE-PROVENANCE-01 Low/P3`, 0 new deferred blockers** on current main `7cc23edede57994cdedab49c1556ddb55034dd29`.
211. All 28 current workflow files checked for Action/container/tool provenance. Seven unique external Actions are used; every top-level ref is a full 40-hex commit SHA.
212. Exact pinned action.yml files checked for all seven. checkout/action-setup/setup-node/upload-artifact/configure-pages/deploy-pages have no nested uses; upload-pages-artifact composite pins its sole nested upload-artifact dependency to full SHA `ea165f8d…`. No mutable Action ref found.
213. Current remote tool path has no wget/git clone/npx/apt-get/docker-run code retrieval; curl is local/production smoke or GitHub API JSON. GitHub-hosted runner software updates weekly but remains the selected GitHub CI trust root; no separate less-trusted execution path proven.
214. The only external service image is `postgres:17`, used by 19 service jobs across 16 workflow files. Current SA08 run 44295360463 executed `docker pull postgres:17` and resolved digest `sha256:0d938e975177bef9f1f61f3f9dbcf2e0aa0a139568f66d3415ed8892eb97f6ac` at runtime.
215. Docker current docs confirm tags are mutable and digest references immutable. Repository therefore does not review/authorize the exact PostgreSQL image bytes that current CI/browser acceptance executes.
216. Current database CI/browser acceptance depends on that service for migrations/SQL/runtime behavior; changed/compromised same-tag image can alter acceptance evidence without repository change.
217. Inspected service docker-create command receives synthetic POSTGRES_*, GITHUB_ACTIONS/CI only; no repository token, production secret or workspace mount. PR/browser jobs remain contents:read/no production Environment. Impact bounded to acceptance integrity -> Low/P3.
218. production-worker verify also uses same mutable tag, but Stage 6 is paused. Same root cause should be corrected before Stage-6 verification resumes; no duplicate deferred blocker and no severity increase from future path.
219. No separate finding for missing workflow dependency lockfile, exact runner image snapshot or action allowlist: current Action refs/transitive ref are exact SHAs and no independent exploit chain was proven.
220. I6 no workflow/image pull/settings/production mutation; existing files/logs read only. Aggregate now 27 current findings + 3 deferred blockers.
221. I7: **`PAGES-ACCEPTANCE-PROVENANCE-01 Low/P3`, 0 new deferred blockers** on current main `7cc23edede57994cdedab49c1556ddb55034dd29`.
222. Repository has 0 GitHub Releases. Current release/deployment cross-check therefore covers Pages preview plus prepared/manual production DB/Worker chains.
223. Exact main Pages run 44286477786 uploaded artifact ID 14420170192 with SHA-256 `a736eb3863be9c7fab1c7d43cad82914376e61380b2d829e3e3aecf574288403`; deploy job fetched artifact metadata **in this workflow run**, found one artifact and deployed that exact ID for main SHA 7cc23ede. Per-run Pages artifact integrity PASS.
224. Workflow deploys one canonical `github-pages` target from `main`, every `chatgpt/ui-*` except `chatgpt/ui-ux-product-pass`, and manual dispatch; global concurrency group cancels/replaces in-flight preview runs. Branch search currently returns 28 matching UI branches, 27 eligible after exclusion.
225. Real branch run 44298738205 from `chatgpt/ui-preview-interactions` SHA `4b3e5f3de1ba9f5de0d4755339751e17aa07f00a` deployed artifact ID 14424697488 to the same `https://iliya1947.github.io/vico-forum/` URL. Later UI-branch runs were queued/cancelled in same group. Canonical URL therefore does not identify stable exact head.
226. AGENTS requires applicable Pages/browser + owner visual acceptance for stable exact head before whole-PR review. Shared mutable Pages alias can therefore make acceptance observe a different branch than the recorded implementation head. Current impact is acceptance-evidence integrity only -> Low/P3.
227. This is not REPO-MAIN-GATE-01: even protected main would not stop allowed non-main UI branch deployments. Individual artifact/run/SHA binding itself is correct; defect is mutable acceptance-target provenance.
228. Production DB chain PASS apart from existing findings: exact github.sha checkout, no cross-workflow artifacts; runtime migration evidence binds actual successful workflow run path/event/main/head SHA plus journal hash/ancestor. DB-RUNTIME-EVIDENCE-01 remains coverage-only and is not duplicated.
229. Worker chain PASS apart from existing findings: expected_sha==GITHUB_SHA, independent exact checkouts, pinned/frozen Node chain, unique returned Worker Version ID, existence check, exact Version URL smoke and promotion of same ID. Rebuild between verify/rollout did not yield independent artifact substitution because actual uploaded version is directly identified/smoked. I6 postgres tag and H Version-URL/finalizer blockers remain separate.
230. Cross-chain impact of REPO-MAIN-GATE-01 strengthened: exact SHA proves selected main content, not reviewed provenance. Delegated Contents writer can alter ordinary `.github/scripts/*`, package.json, Worker or migration code; future authorized Environment jobs execute repository-controlled code with DB/Cloudflare credentials. Environment admission cannot replace source review.
231. Therefore REPO-MAIN-GATE-01 is an explicit correction gate before any future Stage-6 production DB/credential/Worker dispatch. No duplicate deferred blocker: same root cause already current and already counted.
232. Exact mutable Environment policy/secret inventory, Actions actor policy and complete Secret Scanning state remain `Информация не проверена`. I7 performed no dispatch/deploy/settings/production mutation. Aggregate now 28 current findings + 3 deferred blockers.
233. I8: **PASS, 0 new current findings, 0 new deferred blockers; Block I complete** on current main `7cc23edede57994cdedab49c1556ddb55034dd29`.
234. Final mutable repository recheck immediately before closeout: main `protected=false`; `Protect main` ruleset still `enforcement=disabled`, targeting default branch with configured PR requirement, deletion/non-fast-forward protection and strict required checks `checks` + `database`. REPO-MAIN-GATE-01 remains live.
235. Cross-chain source→install→CI→acceptance→secret admission→external mutation produced no fifth I root cause. Node/pnpm and full-SHA Actions paths remain PASS; Python transitives, postgres image and shared Pages alias remain the three Low/P3 provenance defects alongside Moderate/P2 main authority defect.
236. I2–I4 remain PASS: no privileged PR token chain, no observed secret leakage, repository-side Environment admission structure remains main/manual/named-Environment. Exact mutable Environment reviewers/ref policy/admin bypass/secret inventory and complete Secret Scanning state remain unverified.
237. Production DB/Worker exact-SHA/version identity does not duplicate I1 and does not compensate for it. REPO-MAIN-GATE-01 is mandatory before any future Stage-6 secret-bearing DB/credential/Worker dispatch.
238. Worker verify also depends on mutable postgres:17; current CI-POSTGRES-IMAGE-PROVENANCE-01 must be closed before Stage-6 relies on that verify job. No duplicate deferred blocker.
239. Existing deferred correction order retained: REPO-MAIN-GATE-01 → DB-RUNTIME-EVIDENCE-01 → CI-POSTGRES-IMAGE-PROVENANCE-01 → WORKER-VERSION-URL-01 → WORKER-ROLLBACK-FINALIZER-01, with live Environment/topology recheck immediately before external action.
240. Dedup A–H/J/L PASS: no finding moved or duplicated. Provider/callback semantics remain future Block J; monitoring/incident response remains later scope unless actual secret exposure is found.
241. Final Block I = 4 current findings, 0 I deferred blockers. Overall #315 = 28 current + 3 deferred; severity current 9 Moderate/P2 + 19 Low/P3, no P0/P1; deferred 2 Moderate/P2 + 1 Low/P3.
242. I8 performed no dispatch/install/image pull/settings/ruleset/secret/production mutation. Remediation remains unassigned.
243. Block J created on current main `7cc23edede57994cdedab49c1556ddb55034dd29`; J1 **PASS, 0 new findings / 0 deferred blockers**.
244. J1 inventory: Better Auth Google provider foundation exists with server-side GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, but PROJECT_STATE/ROADMAP say real Google OAuth configuration + interactive smoke remain Stage 6 and production Worker rollout with real auth is not complete.
245. Resend/Brevo/sendEmail/forgotPassword/resetPassword implementation is absent from current main; email/password registration/sign-in exists with requireEmailVerification=false and Settings explicitly excludes password recovery.
246. Translation provider abstraction and Cloudflare M2M100 local/CI adapter exist, but current Worker uses DISABLED_CONTENT_GENERATION_ACTION_RUNTIME and publishes providerWired=false/enqueuerWired=false/consumerWired=false; wrangler has no Workers AI or Queue binding.
247. Current Queue transport is not active; durable task model remains PostgreSQL/domain foundation. Real Queue/provider credentials/calls/acceptance remain Stage 6.
248. AdministrativeRouting defaults same-origin and no external producer is wired; prior #317 review already leaves cross-origin activation as future Stage-6 acceptance, no duplicate J finding.
249. J1 performed repository/source-of-truth inspection only: no OAuth client/provider account, external call, Queue dispatch, deploy or setting mutation. Next J2 audits Google provider trust/callback/configuration/data-exchange without duplicating Block B internal auth/session findings.
250. J2 target current main `7cc23edede57994cdedab49c1556ddb55034dd29`, installed Better Auth 1.7.7; exact upstream tag v1.7.7 commit `db02f233918ad1233bf0753e437e1c0da353273d` checked.
251. J2 verdict: **0 new current findings + deferred `GOOGLE-OAUTH-SCOPE-01 Low/P3`**.
252. Exact Better Auth state/PKCE PASS: DB verification state + signed browser cookie, bounded expiry, one-time deletion, callback/error URL trust validation; Vico does not disable origin/CSRF/state cookie checks.
253. Google provider identity PASS: fixed Google endpoints/default openid-email-profile scopes; provider account subject derives from raw Google `sub`; direct id-token path verifies signature/issuer/audience/max age.
254. Explicit link provider boundary PASS apart from existing Block B AUTH-LINK-01: Vico disableImplicitLinking; trustedProviders defaults empty; verified provider email + same-email required; provider account owned by another Vico user rejected; x-vico-link-user only stale expectation against authoritative session.
255. AUTH-OAUTH-01 remains Block B: provider error_description is forwarded to validated same-origin error URL but Vico UI renders generic error only. No duplicate J finding.
256. Own-account token APIs PASS against cross-user IDOR: session user wins over supplied userId and account rows are resolved only within that user. getAccessToken/refreshToken/accountInfo do not select foreign provider accounts.
257. Deferred root cause: Better Auth sign-in/social and link-social accept caller-selected `scopes[]`; Vico wildcard /api/auth/* forwards canonical endpoints and has no application allowlist because its UI itself requests no extra scopes. Google docs/Better Auth docs confirm incremental authorization and Google provider default includeGrantedScopes=true.
258. After explicit consent, Better Auth persists provider token/scope and own-account getAccessToken can return bearer authority. Vico currently does not set encryptOAuthTokens; this is not separately classified because no DB-only/cross-user exploit is proven.
259. Product only needs Google authentication/linking. Allowing direct HTTP to turn Vico OAuth client into arbitrary Google scope authorization unnecessarily expands provider authority and later compromise blast radius. Google consent required; no silent grant/takeover; real Google is not deployed -> deferred Low/P3.
260. J2 correction gate: constrain effective Google OAuth capability to product-approved authentication scope before Stage6 real Google activation. Exact implementation (scope allowlist, endpoint filtering, includeGrantedScopes policy, token storage hardening) deferred to remediation design.
261. Production Google client/config remains `Информация не проверена`; before activation verify exact BETTER_AUTH_URL, Web OAuth client, exact production `/api/auth/callback/google` redirect, secret placement and deployed OAuth/session/logout smoke. Absence now is not a finding.
262. J2 made no client/credential/provider call/login smoke/dispatch/deploy/settings mutation. Overall #315 now 28 current + 4 deferred. Next J3 email provider boundary.
263. J3 target current main `7cc23edede57994cdedab49c1556ddb55034dd29`, installed Better Auth 1.7.7. Verdict: **PASS, 0 new current findings / 0 deferred blockers**.
264. Current product/source-of-truth intentionally defers email verification, transactional sender and password recovery; first release requires email/password sign-up/sign-in only.
265. Repository search found no Resend/Brevo/SMTP/Nodemailer/Mailgun/Postmark/SendGrid/generic sendEmail integration, no email-provider dependency, sender module, provider API env, bounce/webhook receiver or sender credential.
266. Vico Better Auth config sets emailAndPassword enabled + requireEmailVerification=false + password length only; no sendResetPassword and no emailVerification.sendVerificationEmail.
267. Exact Better Auth v1.7.7 source: request-password-reset fails RESET_PASSWORD_DISABLED before user lookup/reset-token creation when sendResetPassword is absent; send-verification-email fails VERIFICATION_EMAIL_NOT_ENABLED when verification callback absent.
268. Current sign-up does not enter verification branch: Better Auth uses sendOnSignUp ?? requireEmailVerification, both false/undefined in Vico. Client/UI exposes sign-up/sign-in/Google only; no forgot/reset/verification route/control.
269. Wildcard /api/auth/* exposes built-in route family, but initiation endpoints are disabled and current flow creates no usable reset token. No external email trust/data-egress boundary exists.
270. AUTH-ENUM-01 remains Block B; no provider-specific duplicate. Future Better Auth reset can create credential account for a Google-only user, but sender/recovery is absent and explicitly deferred, so this is a recheck item for future recovery implementation, not current/deferred finding.
271. Resend/Brevo provider choice, sender-domain auth, API-key scope, bounce/webhook verification, token delivery/callback and data minimization remain `Информация не проверена` because no concrete integration exists. No current/Stage6 blocker follows.
272. J3 performed no account/key/domain/webhook/provider call/install/deploy/settings mutation. Aggregate stays 28 current + 4 deferred. Next J4 translation provider data egress.

## Ограничения

1. Stage 6 external activation остаётся paused.
2. Cloudflare/Neon/production changes по #315 не разрешены.
3. Пока над #315 работаю одна, комментарии PR для внутреннего обсуждения не нужны.
4. Не дублировать подробные audit-логи в этом файле: устойчивые результаты хранятся в соответствующем Block-файле и communication.
5. Каждый следующий security-блок оформлять отдельным файлом, чтобы общий план и личные файлы не разрастались.

## Следующий шаг

1. После продолжения владельца выполнить **J4 — Translation provider data egress** на current main и остановиться после результата.
2. Remediation findings/blockers Blocks B–J не начинать без отдельного назначения.
