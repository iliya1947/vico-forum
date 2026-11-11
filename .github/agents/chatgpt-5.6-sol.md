# Мира — безопасность Vico Forum

## Текущая задача

1. Служебный PR: **#315**.
2. Моя текущая работа: audit/coordination only; remediation и implementation не назначены.
3. Текущий этап: **Block G G1 PASS; G2 `DB-SEARCHPATH-01 Low/P3`; G3 `DB-ACL-USER-DELETE-01 Low/P3`; G4 `DB-RUNTIME-EVIDENCE-01 Low/P3`; G5 PASS; G6 `DB-TEST-TARGET-01 Low/P3`; G7 PASS; следующий bounded slice — G8 Cross-chain closeout**.
4. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`.
5. Current `main` — `538084fd472c65459ad55ab30a0f96fbfdd68e56`. SA-02 docs closeout merged; compare с `4248fed…` показывает только 8 Markdown changes, attachment runtime/schema unchanged.
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
38. Block G G4: подтверждён **`DB-RUNTIME-EVIDENCE-01 Low/P3`**. Current runtime evidence фиксирует только `0020_translation_generation_permission`, а current Worker core create-topic/reply уже обращается к measure tables из `0058_user_measures`; current schema manifest targets `0063_owner_attempt_telemetry`. Worker rollout verifier проверяет evidence только до вручную зафиксированного required tag и не выводит minimum required schema из exact runtime revision.
39. G4 impact: current-main Worker может пройти migration-evidence gate и local full-schema checks при target schema лишь через `0020`; production/version smoke не выполняет authenticated topic/reply writes, поэтому missing `0058` relations могут проявиться уже после promotion. Это availability/incompatibility, не authz bypass; Stage 6 paused, поэтому Low/P3.
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
54. G7 повторно подтверждает `DB-RUNTIME-EVIDENCE-01`: current evidence verifier proves only the repository-authored required tag, not exact runtime minimum schema/current manifest target. Duplicate finding не создаётся.
55. Current source-of-truth не заявляет, что production соответствует `0063`; mutable production schema/ACL: **Информация не проверена**. Identity/sequence properties, появившиеся после `0020`, вернуть в acceptance scope перед их external rollout; сейчас это future Stage-6 boundary, не finding.
56. G7 repository tests не запускались; production/Cloudflare/Neon mutation не выполнялась.
57. Подтверждённые findings не исправлять автоматически: сначала отдельная bounded remediation-задача по решению владельца и текущему Stage.

## Ограничения

1. Stage 6 external activation остаётся paused.
2. Cloudflare/Neon/production changes по #315 не разрешены.
3. Пока над #315 работаю одна, комментарии PR для внутреннего обсуждения не нужны.
4. Не дублировать подробные audit-логи в этом файле: устойчивые результаты хранятся в соответствующем Block-файле и communication.
5. Каждый следующий security-блок оформлять отдельным файлом, чтобы общий план и личные файлы не разрастались.

## Следующий шаг

1. После продолжения владельца выполнить **G8 — Cross-chain closeout** на current main и остановиться после результата.
2. Findings только фиксировать; remediation не начинать.
