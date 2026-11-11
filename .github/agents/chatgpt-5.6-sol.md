# Мира — безопасность Vico Forum

## Текущая задача

1. Служебный PR: **#315**.
2. Моя текущая работа: audit/coordination only; remediation и implementation не назначены.
3. Текущий этап: **Block G scope prepared; аудит ещё не начат; следующий bounded slice — G1 Migration history integrity**.
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
30. Аудит Block G ещё не начат; production/Neon mutation не разрешена.
31. Подтверждённые findings не исправлять автоматически: сначала отдельная bounded remediation-задача по решению владельца и текущему Stage.

## Ограничения

1. Stage 6 external activation остаётся paused.
2. Cloudflare/Neon/production changes по #315 не разрешены.
3. Пока над #315 работаю одна, комментарии PR для внутреннего обсуждения не нужны.
4. Не дублировать подробные audit-логи в этом файле: устойчивые результаты хранятся в соответствующем Block-файле и communication.
5. Каждый следующий security-блок оформлять отдельным файлом, чтобы общий план и личные файлы не разрастались.

## Следующий шаг

1. После продолжения владельца выполнить **G1 — Migration history integrity** на current main и остановиться после результата.
2. Findings только фиксировать; remediation не начинать.
