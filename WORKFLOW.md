# WORKFLOW.md — текущее оперативное состояние, назначения, PR/head, блокеры и следующий переход

## Текущее состояние

1. Service PR: **#320**.
2. Service branch: `service/authentication-lifecycle`.
3. Planning baseline: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
4. Независимая revalidation Лены / GPT-6.2: **PASS — product scope**. AUTH-01–AUTH-07 сохранены; актуальные зависимости зафиксированы в `COMMUNICATION.md`.
5. Мира независимо проверила основания, необходимые для следующего handoff: подтверждены mandatory verification=false, отсутствие recovery/mail lifecycle, существующий AccountState protection, native unlink path и неполное покрытие новых flows текущими auth facts/attempt telemetry. Противоречий, блокирующих следующий этап, не найдено.
6. Активная фаза: **полное техническое планирование всей authentication lifecycle задачи**.
7. Текущий исполнитель: **Лёва / Codex-6.1 Sol**.
8. Реализатор не назначен; implementation PR/head отсутствует.
9. Старый AUTH-01 technical plan superseded и может использоваться только как исторический материал.
10. Stage 6 external activation остаётся отдельно заблокированной.

## Следующий переход

Лёва готовит **полный технический план AUTH-01–AUTH-07 до начала реализации** против текущего main, учитывая `TASK.md`, `DECISIONS.md`, `COMMUNICATION.md` и существующие auth/AccountState/Monitoring/History boundaries. План должен определить этапы, зависимости, изменения contracts/schema/dependencies только при необходимости, security/race/failure invariants, acceptance каждого этапа и границы, по которым Мира затем выберет independent или stacked delivery mode.

После завершения Лёва фиксирует полный план в `PLAN.md`, обновляет свой личный файл и передаёт результат Мире. Implementation не начинать.
