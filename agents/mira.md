# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. #320 переведён на новый служебный регламент и синхронизирован с `main 9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Старый AUTH-01 technical plan и handoff Лире не являются текущим планом исполнения.
3. Текущая продуктовая модель и owner decisions сохранены в `TASK.md` и `DECISIONS.md`.
4. После старого плана появились AccountState/deactivation, Owner auth monitoring/facts/telemetry/History и другие изменения auth runtime.

## Текущее назначение

После завершения этой структурной миграции — отдельно проверить актуальность AUTH-01–AUTH-07 против текущего `main` и обновить task context. После завершения этого bounded шага остановиться перед передачей Лёве полного технического планирования всей задачи.
