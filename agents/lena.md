# agents/lena.md — личная рабочая память Лены

## Текущее назначение

**AUTH-07-CORRECTION-2 — исполнитель.**

1. Основание: final technical review Лёвы на #388 exact `5b29469fe51e716b483d4e610dd90705f5409029` — HOLD с F-B2-03 и F-B2-04.
2. Мира независимо подтвердила оба finding как current-scope; technical-plan correction не требуется.
3. Рабочий маршрут: `WORKFLOW.md` → `stages/AUTH-07-CORRECTION-2/PLAN.md` → при необходимости `stages/AUTH-07/FINAL-TECHNICAL-REVIEW.md`.
4. Correction выполнять в assembled PR #388; новый implementation PR не создавать.
5. Scope ограничен guest reset same-document proof capture, safe returnTo retry preservation и необходимыми regressions.
6. Не менять previous AUTH-07 correction, K5, schema/dependencies/provider/Stage-6 без нового основания.
7. После реализации: author self-check, необходимые exact-head checks, записать `stages/AUTH-07-CORRECTION-2/RESULT.md` и STOP.
8. Затем corrected head проверяет Лёва. Лена собственную correction не review.

## Correction-2 entry checkpoint

D1: восстановлено текущее назначение; прочитаны AGENTS, RULES, TASK, WORKFLOW, собственный файл, CORRECTION-2 PLAN, FINAL-TECHNICAL-REVIEW и AUTH-03 PLAN. #388 exact 5b29469fe51e716b483d4e610dd90705f5409029. Оба findings подтверждены по исходникам: reset-password.tsx mount-only capture и unconditional ready=false после POST; retry link теряет уже validated returnTo, forgot loader применяет verificationReturnPath и отправляет redirectTo. D2: после чтения обязательных актуальных main docs реализовать оба исправления и focused regressions единым пакетом; учесть replacement при in-flight POST и безопасный fallback, не менять backend/предыдущую correction/K5. D3: substantive author self-check всего delta, RESULT и handoff Лёве. Прежний прямой запрет владельца запускать тесты Леной действует; не запускать. D1 завершён, код ещё не изменён. Следующая команда продолжения — D2.
