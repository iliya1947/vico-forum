# TASK.md — цель, границы и критерий завершения stale/legacy audit и cleanup

## Цель

Сохранить единый системный stale/legacy audit Vico Forum, актуализировать его относительно текущего main и последовательно устранить только подтверждённые stale tails текущего Stage отдельными bounded implementation PR.

## Исходное состояние

- Первый системный audit выполнен на main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- После fresh review подтверждено 80 A-элементов; B/C/D/E отделены от cleanup.
- Владелец затем разрешил cleanup.
- C1 для прежних A-011…A-026 открыт как Draft #377.
- Current main при переносе задачи: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; он изменился после audit baseline.

## Scope

1. Полный baseline registry A–E и метод аудита.
2. Current-main reconciliation только по реальным изменениям, способным изменить классификацию/основание элементов.
3. Cleanup подтверждённых A-элементов небольшими bounded пакетами.
4. Review/CI каждого implementation PR по действующему AGENTS.md.

## Вне scope

1. #384 full-forum audit.
2. Исправление B/C/D/E только потому, что они перечислены в registry.
3. Stage 6 external integration, deploy и production.
4. Несвязанный UI/UX redesign или новые product capabilities.
5. Возврат рабочей задачи в завершённый #342.

## Критерий завершения

1. Baseline registry reconciled с текущим main; для каждого прежнего A установлено актуальное состояние.
2. Каждый подтверждённый current A либо закрыт отдельным reviewed/merged implementation PR, либо явно reclassified с проверяемым основанием.
3. Нет открытого current-stage stale finding в рабочем registry.
4. Все implementation/docs PR задачи закрыты по требуемому review cycle.
5. Финальный status/context сохранён в этом служебном PR; он сам не merge в main.
