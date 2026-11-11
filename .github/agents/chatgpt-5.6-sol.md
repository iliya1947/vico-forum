# Мира — безопасность Vico Forum

## Текущая задача

1. Служебный PR: **#315**.
2. Моя текущая работа: audit/coordination only; remediation и implementation не назначены.
3. Текущий этап: **Block F F1 completed — PASS, 0 confirmed current-scope findings; awaiting F2 Upload admission and request bounds**.
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
10. Completed Cancel/Publish generation отклоняется как gone; abandoned temporary refs закрываются bounded 24-hour cleanup. Реальное scheduling/live R2/AV остаются Stage-6 external boundary и сами по себе не являются current defect.
11. Подтверждённые findings не исправлять автоматически: сначала отдельная bounded remediation-задача по решению владельца и текущему Stage.

## Ограничения

1. Stage 6 external activation остаётся paused.
2. Cloudflare/Neon/production changes по #315 не разрешены.
3. Пока над #315 работаю одна, комментарии PR для внутреннего обсуждения не нужны.
4. Не дублировать подробные audit-логи в этом файле: устойчивые результаты хранятся в соответствующем Block-файле и communication.
5. Каждый следующий security-блок оформлять отдельным файлом, чтобы общий план и личные файлы не разрастались.

## Следующий шаг

1. После продолжения владельца выполнить **F2 — Upload admission and request bounds** на current main и остановиться после результата.
2. Findings только фиксировать; remediation не начинать.
